// PRCBO AI LeadGen - Supabase Edge Function: send-whatsapp
// Dispatches real WhatsApp messages via Meta WhatsApp Cloud API
// Supports approved templates (for business-initiated messages) & direct text messages.
// Runtime: Deno (Supabase Edge Runtime) / Web Standard Request & Response

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

export interface SendWhatsAppPayload {
  leadId: string;
  to: string; // Recipient mobile number
  message?: string; // Direct text body (for customer-service window)
  templateName?: string; // Approved Meta template name
  languageCode?: string; // Language code, defaults to 'en_US'
  templateParameters?: string[]; // Body template parameters [{{1}}, {{2}}, ...]
  idempotencyKey?: string;
}

/**
 * Normalizes phone numbers to Meta WhatsApp Cloud API requirements (E.164 digits only)
 */
export function normalizePhoneNumber(rawPhone: string): string | null {
  if (!rawPhone || typeof rawPhone !== "string") return null;
  // Remove spaces, hyphens, brackets, plus signs
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return null;

  // If 10 digits starting with 6, 7, 8, or 9, default to India country code 91
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `91${digits}`;
  }

  // Minimum valid phone number length internationally is 10 digits with country code
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }

  return digits;
}

/**
 * Safely redacts secrets (tokens, keys, authorization headers) from diagnostic log messages and responses.
 */
export function redactSecrets(input: any): any {
  if (input instanceof Error) {
    return redactSecrets(input.message || String(input));
  }
  if (typeof input === "string") {
    return input
      .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, "Bearer [REDACTED]")
      .replace(/EAAG[A-Za-z0-9_\-\.]+/gi, "[REDACTED_ACCESS_TOKEN]")
      .replace(/sb_[a-z0-9_]+/gi, "[REDACTED_KEY]")
      .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/gi, "[REDACTED_JWT]")
      .replace(/(access_token|api_?key|app_?secret|verify_?token|client_?secret|password|secret)=[^&\s]+/gi, "$1=[REDACTED]");
  }
  if (Array.isArray(input)) {
    return input.map(redactSecrets);
  }
  if (input !== null && typeof input === "object") {
    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(input)) {
      const lower = key.toLowerCase();
      if (
        lower.includes("token") ||
        lower.includes("secret") ||
        lower.includes("password") ||
        lower.includes("auth") ||
        (lower.includes("key") && !lower.includes("idempotency")) ||
        lower.includes("cookie") ||
        lower.includes("credential")
      ) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = redactSecrets(val);
      }
    }
    return sanitized;
  }
  return input;
}

/**
 * Extracts and decodes JWT payload claims safely without external libraries
 */
export function extractJwtPayload(authHeader?: string | null): any {
  if (!authHeader || typeof authHeader !== "string") return null;
  const parts = authHeader.replace(/^Bearer\s+/i, "").trim().split(".");
  if (parts.length !== 3) return null;

  try {
    let raw = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (raw.length % 4 !== 0) {
      raw += "=";
    }
    const jsonStr = typeof atob === "function" 
      ? atob(raw) 
      : Buffer.from(raw, "base64").toString("utf-8");
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * Validates whether token claims belong to an approved PRCBO operator
 * Strictly matches the database security definer function is_authorized_operator()
 */
export function verifyOperatorClaims(claims: any): { isAuthorized: boolean; operatorName: string; operatorId?: string } {
  if (!claims || typeof claims !== "object") {
    return { isAuthorized: false, operatorName: "Unauthorized" };
  }

  if (claims.exp && typeof claims.exp === "number") {
    const nowSec = Math.floor(Date.now() / 1000);
    if (claims.exp < nowSec) {
      return { isAuthorized: false, operatorName: "Token Expired" };
    }
  }

  const appMeta = claims.app_metadata;
  if (!appMeta || typeof appMeta !== "object") {
    return { isAuthorized: false, operatorName: "Unprivileged" };
  }

  const isOp = appMeta.is_operator === true || appMeta.is_operator === "true" || appMeta.is_operator === 1;
  const role = typeof appMeta.role === "string" ? appMeta.role.toLowerCase().trim() : "";
  const isAuthorized = isOp || ["operator", "admin", "prcbo_operator"].includes(role);

  const userMeta = claims.user_metadata || {};
  const operatorName = userMeta.full_name || userMeta.name || claims.email?.split("@")[0] || "PRCBO Operator";

  return {
    isAuthorized,
    operatorName,
    operatorId: claims.sub || claims.id
  };
}

export const inFlightDispatches = new Set<string>();

export async function handleSendWhatsAppRequest(
  req: Request,
  options?: {
    env?: Record<string, string>;
    fetchFn?: typeof fetch;
  }
): Promise<Response> {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Authenticate & Authorize Operator
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required: Missing Authorization header." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const claims = extractJwtPayload(authHeader);
    const { isAuthorized, operatorName, operatorId } = verifyOperatorClaims(claims);

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Access denied: You must be an approved PRCBO operator to dispatch WhatsApp messages." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Parse & Validate Payload
    const payload = (await req.json()) as SendWhatsAppPayload;
    const { leadId, to, message, templateName, languageCode, templateParameters, idempotencyKey } = payload || {};

    if (!leadId || typeof leadId !== "string" || !leadId.trim()) {
      return new Response(
        JSON.stringify({ error: "Validation error: 'leadId' is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedPhone = normalizePhoneNumber(to);
    if (!normalizedPhone) {
      return new Response(
        JSON.stringify({ error: "Validation error: A valid recipient mobile number with country code is required in 'to'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Require either a template name or direct message text
    if ((!templateName || !templateName.trim()) && (!message || !message.trim())) {
      return new Response(
        JSON.stringify({ error: "Validation error: Either 'templateName' (for business-initiated messages) or 'message' text is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Guard against concurrent in-flight dispatches to the same lead and recipient
    const dispatchLockKey = `${leadId}:${normalizedPhone}`;
    if (inFlightDispatches.has(dispatchLockKey)) {
      console.log(`[send-whatsapp] Concurrent in-flight dispatch blocked for ${dispatchLockKey}`);
      return new Response(
        JSON.stringify({
          success: true,
          status: "Sent",
          isDuplicateSuppressed: true,
          message: "A WhatsApp dispatch for this recipient is already in progress."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    inFlightDispatches.add(dispatchLockKey);

    try {
      // Read environment secrets
    const getEnv = (key: string): string | undefined => {
      if (options?.env?.[key]) return options.env[key];
      if (typeof Deno !== "undefined") return Deno.env.get(key);
      if (typeof process !== "undefined") return process.env?.[key];
      return undefined;
    };

    const accessToken = getEnv("WHATSAPP_ACCESS_TOKEN");
    const phoneNumberId = getEnv("WHATSAPP_PHONE_NUMBER_ID");

    if (!accessToken || !accessToken.trim() || !phoneNumberId || !phoneNumberId.trim()) {
      console.error("[send-whatsapp] Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID in environment secrets.");
      return new Response(
        JSON.stringify({
          error: "WhatsApp delivery service unconfigured: WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID missing from Supabase secrets."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseKey = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_ANON_KEY");
    const customFetch = options?.fetchFn || fetch;

    const timeBucket = Math.floor(Date.now() / 120000);
    const safeIdempotencyKey = idempotencyKey?.trim() || `wa-${leadId}-${normalizedPhone}-${timeBucket}`;

    let reservationLogId: string | null = null;

    // 3. Idempotency Check & Duplicate Prevention
    if (supabaseUrl && supabaseKey) {
      try {
        // 3a. Exact Idempotency Key Match (handles retries & same-key requests)
        if (safeIdempotencyKey) {
          const checkRes = await customFetch(
            `${supabaseUrl}/rest/v1/outreach_logs?idempotency_key=eq.${encodeURIComponent(safeIdempotencyKey)}&select=*`,
            {
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`
              }
            }
          );

          if (checkRes.ok) {
            const existing = await checkRes.json();
            if (Array.isArray(existing) && existing.length > 0) {
              const row = existing[0];
              // If already completed or delivered, return idempotent replay
              if (["Sent", "Dispatched", "Delivered", "Read", "Completed"].includes(row.status)) {
                console.log(`[send-whatsapp] Idempotent replay: Message already sent with key ${safeIdempotencyKey}`);
                return new Response(
                  JSON.stringify({
                    success: true,
                    messageId: row.provider_message_id,
                    status: row.status || "Sent",
                    isIdempotentReplay: true,
                    logId: row.id
                  }),
                  { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
              }

              // If Pending (and created within last 120s), another instance has active reservation
              if (row.status === "Pending") {
                console.log(`[send-whatsapp] Active reservation found for key ${safeIdempotencyKey}`);
                return new Response(
                  JSON.stringify({
                    success: true,
                    status: "Pending",
                    isDuplicateSuppressed: true,
                    logId: row.id,
                    message: "A WhatsApp dispatch for this request is currently in progress."
                  }),
                  { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
              }

              // If Failed, this is a legitimate retry of a previously failed dispatch!
              // Reuse this existing reservation row and update it back to Pending
              if (row.status === "Failed") {
                reservationLogId = row.id;
                try {
                  await customFetch(`${supabaseUrl}/rest/v1/outreach_logs?id=eq.${encodeURIComponent(row.id)}`, {
                    method: "PATCH",
                    headers: {
                      apikey: supabaseKey,
                      Authorization: `Bearer ${supabaseKey}`,
                      "Content-Type": "application/json",
                      "Prefer": "return=minimal"
                    },
                    body: JSON.stringify({
                      status: "Pending",
                      error_message: null,
                      created_at: new Date().toISOString()
                    })
                  });
                } catch {
                  // Non-fatal if patch fails
                }
              }
            }
          }
        }

        // 3b. Accidental Duplicate Suppression (window: 120 seconds to same lead & recipient)
        // Prevents double-clicks & repeated rapid submissions without blocking legitimate future outreach
        const deduplicationWindowSeconds = 120;
        const thresholdIso = new Date(Date.now() - deduplicationWindowSeconds * 1000).toISOString();
        const duplicateCheckUrl = `${supabaseUrl}/rest/v1/outreach_logs?lead_id=eq.${encodeURIComponent(leadId)}&recipient_phone=eq.${encodeURIComponent(normalizedPhone)}&channel=eq.WhatsApp&status=in.(Sent,Dispatched,Delivered,Read,Replied,Completed)&created_at=gte.${encodeURIComponent(thresholdIso)}&select=*&order=created_at.desc&limit=1`;

        const duplicateRes = await customFetch(duplicateCheckUrl, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`
          }
        });

        if (duplicateRes.ok) {
          const recentDuplicates = await duplicateRes.json();
          if (Array.isArray(recentDuplicates) && recentDuplicates.length > 0) {
            const recent = recentDuplicates[0];
            console.log(`[send-whatsapp] Duplicate outreach suppressed: An outreach was already dispatched to +${normalizedPhone} for lead ${leadId} within the last ${deduplicationWindowSeconds}s (provider ID: ${recent.provider_message_id})`);
            return new Response(
              JSON.stringify({
                success: true,
                messageId: recent.provider_message_id,
                status: recent.status || "Sent",
                isDuplicateSuppressed: true,
                logId: recent.id,
                message: `Duplicate send suppressed: An outreach was already sent to this recipient within the last ${deduplicationWindowSeconds} seconds.`
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // 3c. Pre-Dispatch Atomic Reservation (Status: 'Pending')
        // Atomically reserves this dispatch using PostgreSQL unique index idx_outreach_logs_idempotency_key
        if (!reservationLogId && safeIdempotencyKey) {
          const reservationRes = await customFetch(`${supabaseUrl}/rest/v1/outreach_logs`, {
            method: "POST",
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=representation"
            },
            body: JSON.stringify({
              lead_id: leadId,
              channel: "WhatsApp",
              template: templateName || "WhatsApp Direct Outreach",
              message_content: message || (templateParameters?.length ? `Template: ${templateName} (Params: ${templateParameters.join(", ")})` : `Template: ${templateName}`),
              recipient_phone: normalizedPhone,
              status: "Pending",
              operator_id: operatorId || null,
              operator_name: operatorName,
              idempotency_key: safeIdempotencyKey,
              provider_name: "whatsapp",
              metadata: {
                openStatus: "Dispatch in progress...",
                template: templateName || null,
                languageCode: languageCode || "en_US"
              }
            })
          });

          if (reservationRes.status === 409) {
            // Unique key conflict: another distributed Edge Function instance inserted this key concurrently!
            console.warn(`[send-whatsapp] Distributed reservation conflict (409) for key ${safeIdempotencyKey}`);
            return new Response(
              JSON.stringify({
                success: true,
                status: "Pending",
                isDuplicateSuppressed: true,
                message: "A WhatsApp dispatch with this key is already in progress or has been processed."
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          if (reservationRes.ok) {
            const inserted = await reservationRes.json();
            if (Array.isArray(inserted) && inserted.length > 0) {
              reservationLogId = inserted[0].id;
            }
          }
        }
      } catch (checkErr) {
        console.warn("[send-whatsapp] Idempotency/reservation error:", checkErr);
      }
    }

    // 4. Construct Meta WhatsApp Cloud API Payload
    const metaApiUrl = `https://graph.facebook.com/v21.0/${phoneNumberId.trim()}/messages`;
    let metaRequestBody: Record<string, any>;

    if (templateName && templateName.trim()) {
      const cleanTemplate = templateName.trim();
      const lang = languageCode?.trim() || "en_US";
      const params = Array.isArray(templateParameters) ? templateParameters : [];

      const templatePayload: Record<string, any> = {
        name: cleanTemplate,
        language: { code: lang }
      };

      if (params.length > 0) {
        templatePayload.components = [
          {
            type: "body",
            parameters: params.map(p => ({ type: "text", text: String(p) }))
          }
        ];
      }

      metaRequestBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizedPhone,
        type: "template",
        template: templatePayload
      };
    } else {
      metaRequestBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizedPhone,
        type: "text",
        text: {
          preview_url: false,
          body: (message || "").trim()
        }
      };
    }

    console.log(`[send-whatsapp] Dispatching WhatsApp message to +${normalizedPhone} via Meta Cloud API...`);

    let metaRes: Response;
    try {
      metaRes = await customFetch(metaApiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken.trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(metaRequestBody)
      });
    } catch (networkErr: any) {
      const netMsg = networkErr?.message || "Unknown network error";
      const isTimeout =
        netMsg.toLowerCase().includes("timeout") ||
        netMsg.toLowerCase().includes("abort") ||
        netMsg.toLowerCase().includes("reset") ||
        netMsg.toLowerCase().includes("etimedout") ||
        netMsg.toLowerCase().includes("esockettimedout");

      console.error(`[send-whatsapp] Network failure contacting Meta Graph API: ${redactSecrets(netMsg)} (isTimeout: ${isTimeout})`);

      // Ambiguous network timeout: Meta might have accepted the message even if the response was lost
      // Do NOT automatically resend; mark for safe reconciliation
      if (isTimeout) {
        if (supabaseUrl && supabaseKey && reservationLogId) {
          try {
            await customFetch(`${supabaseUrl}/rest/v1/outreach_logs?id=eq.${encodeURIComponent(reservationLogId)}`, {
              method: "PATCH",
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
              },
              body: JSON.stringify({
                status: "Pending",
                error_message: `Ambiguous network timeout contacting Meta Cloud API: ${redactSecrets(netMsg)}. Dispatch status uncertain; requires investigation or reconciliation before resending.`,
                metadata: {
                  ambiguousTimeout: true,
                  reconciliationRequired: true,
                  networkError: redactSecrets(netMsg),
                  timeoutAt: new Date().toISOString()
                }
              })
            });
          } catch {
            // Ignore secondary DB error
          }
        }

        return new Response(
          JSON.stringify({
            error: "Meta Graph API network connection timeout (Status Uncertain)",
            details: "A network timeout occurred while waiting for Meta Cloud API response. The message may have been accepted. Automatic resend is suppressed to prevent duplicate sending. Please verify delivery status or investigate before retrying.",
            status: "Pending",
            isAmbiguousTimeout: true,
            reconciliationRequired: true,
            logId: reservationLogId
          }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Definite pre-connection network failure (e.g. ECONNREFUSED):
      if (supabaseUrl && supabaseKey && reservationLogId) {
        try {
          await customFetch(`${supabaseUrl}/rest/v1/outreach_logs?id=eq.${encodeURIComponent(reservationLogId)}`, {
            method: "PATCH",
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=minimal"
            },
            body: JSON.stringify({
              status: "Failed",
              error_message: `Network connection failure: ${redactSecrets(netMsg)}`,
              metadata: {
                networkError: redactSecrets(netMsg),
                definiteFailure: true
              }
            })
          });
        } catch {
          // Ignore secondary DB error
        }
      }

      return new Response(
        JSON.stringify({
          error: "Meta Graph API network connection failure",
          details: "Failed to establish a network connection to Meta Cloud API. Please verify network connectivity and try again.",
          status: "Failed"
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Handle Meta Cloud API Failure (Definite Rejection)
    if (!metaRes.ok) {
      let rawErrorBody = "";
      let parsedErrorBody: any = null;

      try {
        rawErrorBody = await metaRes.text();
        if (rawErrorBody && rawErrorBody.trim()) {
          parsedErrorBody = JSON.parse(rawErrorBody);
        }
      } catch {
        // Non-JSON or unreadable error body
      }

      // Safe diagnostic logging (guaranteed no secrets leaked)
      const safeLoggedBody = parsedErrorBody 
        ? JSON.stringify(redactSecrets(parsedErrorBody))
        : redactSecrets(rawErrorBody.slice(0, 500));

      console.warn(`[send-whatsapp] Meta Cloud API HTTP ${metaRes.status} response: ${safeLoggedBody}`);

      let failureDetail = "";
      let safeMetaError: Record<string, any> | null = null;

      if (parsedErrorBody?.error) {
        const err = parsedErrorBody.error;
        safeMetaError = redactSecrets({
          message: err.message,
          type: err.type,
          code: err.code,
          error_subcode: err.error_subcode,
          details: err.error_data?.details,
          user_title: err.error_user_title,
          user_msg: err.error_user_msg,
          fbtrace_id: err.fbtrace_id
        });

        const codeParts: string[] = [];
        if (err.code) codeParts.push(`Code ${err.code}`);
        if (err.error_subcode) codeParts.push(`Subcode ${err.error_subcode}`);
        const codePrefix = codeParts.length ? `[${codeParts.join(", ")}] ` : "";

        failureDetail = `${codePrefix}${err.message || "Meta API error"}`;
        if (err.error_data?.details) {
          failureDetail += ` (${err.error_data.details})`;
        }
        if (err.error_user_msg) {
          failureDetail += ` - ${err.error_user_msg}`;
        }
      } else if (rawErrorBody && rawErrorBody.trim()) {
        failureDetail = `HTTP ${metaRes.status}: ${redactSecrets(rawErrorBody.trim().slice(0, 300))}`;
      } else {
        failureDetail = `HTTP ${metaRes.status} response from Meta Cloud API`;
      }

      // Record definite failure in Supabase (updating reservation if present, else inserting)
      if (supabaseUrl && supabaseKey) {
        try {
          if (reservationLogId) {
            await customFetch(`${supabaseUrl}/rest/v1/outreach_logs?id=eq.${encodeURIComponent(reservationLogId)}`, {
              method: "PATCH",
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
              },
              body: JSON.stringify({
                status: "Failed",
                error_message: failureDetail,
                metadata: {
                  metaStatus: metaRes.status,
                  metaError: safeMetaError,
                  template: templateName || null,
                  languageCode: languageCode || "en_US",
                  failureType: "definite_rejection"
                }
              })
            });
          } else {
            await customFetch(`${supabaseUrl}/rest/v1/outreach_logs`, {
              method: "POST",
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
              },
              body: JSON.stringify({
                lead_id: leadId,
                channel: "WhatsApp",
                template: templateName || "Direct WhatsApp Message",
                message_content: message || `Template: ${templateName}`,
                recipient_phone: normalizedPhone,
                status: "Failed",
                error_message: failureDetail,
                operator_id: operatorId || null,
                operator_name: operatorName,
                idempotency_key: safeIdempotencyKey,
                provider_name: "whatsapp",
                metadata: {
                  metaStatus: metaRes.status,
                  metaError: safeMetaError,
                  template: templateName || null,
                  languageCode: languageCode || "en_US"
                }
              })
            });
          }
        } catch {
          // Ignore secondary DB log error
        }
      }

      // Do NOT mark lead as Contacted on failure
      return new Response(
        JSON.stringify({
          error: "WhatsApp delivery failed",
          details: failureDetail,
          status: "Failed",
          metaStatus: metaRes.status,
          metaError: safeMetaError
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Handle Meta Cloud API Success
    let metaData: any = null;
    try {
      metaData = await metaRes.json();
    } catch {
      console.warn("[send-whatsapp] Failed to parse successful Meta JSON response");
    }
    const providerMessageId = metaData?.messages?.[0]?.id;

    if (!providerMessageId) {
      console.warn("[send-whatsapp] Meta returned success but missing message ID in response");
    }

    console.log(`[send-whatsapp] WhatsApp message accepted by Meta with ID: ${providerMessageId}`);

    let savedLogId: string | undefined = reservationLogId || undefined;

    // 7. Persist Outreach Log (Update reservation to 'Sent' - NEVER 'Delivered' or 'Read' upon send!)
    if (supabaseUrl && supabaseKey) {
      try {
        if (reservationLogId) {
          const patchRes = await customFetch(`${supabaseUrl}/rest/v1/outreach_logs?id=eq.${encodeURIComponent(reservationLogId)}`, {
            method: "PATCH",
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=representation"
            },
            body: JSON.stringify({
              status: "Sent",
              provider_message_id: providerMessageId,
              sent_at: new Date().toISOString(),
              metadata: {
                openStatus: "Sent via WhatsApp Cloud API",
                replyStatus: "Awaiting Response",
                providerMessageId,
                template: templateName || null,
                languageCode: languageCode || "en_US"
              }
            })
          });

          if (patchRes.ok) {
            const patched = await patchRes.json();
            if (Array.isArray(patched) && patched.length > 0) {
              savedLogId = patched[0].id;
            }
          }
        } else {
          const insertRes = await customFetch(`${supabaseUrl}/rest/v1/outreach_logs`, {
            method: "POST",
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=representation"
            },
            body: JSON.stringify({
              lead_id: leadId,
              channel: "WhatsApp",
              template: templateName || "WhatsApp Direct Outreach",
              message_content: message || (templateParameters?.length ? `Template: ${templateName} (Params: ${templateParameters.join(", ")})` : `Template: ${templateName}`),
              recipient_phone: normalizedPhone,
              provider_message_id: providerMessageId,
              provider_name: "whatsapp",
              status: "Sent",
              sent_at: new Date().toISOString(),
              operator_id: operatorId || null,
              operator_name: operatorName,
              idempotency_key: safeIdempotencyKey,
              metadata: {
                openStatus: "Sent via WhatsApp Cloud API",
                replyStatus: "Awaiting Response",
                providerMessageId,
                template: templateName || null,
                languageCode: languageCode || "en_US"
              }
            })
          });

          if (insertRes.ok) {
            const inserted = await insertRes.json();
            if (Array.isArray(inserted) && inserted.length > 0) {
              savedLogId = inserted[0].id;
            }
          }
        }

        // 8. Update Lead Status to 'Contacted' in Supabase
        await customFetch(`${supabaseUrl}/rest/v1/leads?id=eq.${encodeURIComponent(leadId)}`, {
          method: "PATCH",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
          },
          body: JSON.stringify({
            status: "Contacted",
            updated_at: new Date().toISOString()
          })
        });
      } catch (dbErr) {
        console.warn("[send-whatsapp] Post-send database persistence error:", dbErr);
      }
    }

      return new Response(
        JSON.stringify({
          success: true,
          messageId: providerMessageId,
          provider: "whatsapp",
          status: "Sent",
          recipient: normalizedPhone,
          logId: savedLogId
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } finally {
      inFlightDispatches.delete(dispatchLockKey);
    }
  } catch (err: any) {
    console.error("[send-whatsapp] Unhandled exception:", err?.message);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error during WhatsApp dispatch." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

// Supabase Edge Functions execution entry point
if (typeof Deno !== "undefined" && typeof (Deno as any).serve === "function") {
  (Deno as any).serve(handleSendWhatsAppRequest);
}
