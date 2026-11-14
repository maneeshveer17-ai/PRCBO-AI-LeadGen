// PRCBO AI LeadGen - Supabase Edge Function: send-email
// Dispatches real transactional/outreach emails via Resend API
// Runtime: Deno (Supabase Edge Runtime) / Web Standard Request & Response

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SendEmailPayload {
  leadId: string;
  to: string;
  subject: string;
  body: string;
  template?: string;
  idempotencyKey?: string;
}

/**
 * Extracts and decodes JWT payload claims safely without external libraries
 */
export function extractJwtPayload(authHeader?: string | null): any {
  if (!authHeader || typeof authHeader !== "string") return null;
  const parts = authHeader.replace(/^Bearer\s+/i, "").trim().split(".");
  if (parts.length !== 3) return null;

  try {
    const raw = parts[1].replace(/-/g, "+").replace(/_/g, "/");
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

  // Check expiration if present
  if (claims.exp && typeof claims.exp === "number") {
    const nowSec = Math.floor(Date.now() / 1000);
    if (claims.exp < nowSec) {
      return { isAuthorized: false, operatorName: "Token Expired" };
    }
  }

  // Strictly check trusted app_metadata (cannot be tampered with by client users)
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

/**
 * Converts plain text email body to clean HTML preserving line breaks
 */
function formatPlainTextToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${escaped}</div>`;
}

export async function handleSendEmailRequest(
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
        JSON.stringify({ error: "Access denied: You must be an approved PRCBO operator to dispatch emails." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Parse & Validate Payload
    const payload = (await req.json()) as SendEmailPayload;
    const { leadId, to, subject, body, template, idempotencyKey } = payload || {};

    if (!leadId || typeof leadId !== "string" || !leadId.trim()) {
      return new Response(
        JSON.stringify({ error: "Validation error: 'leadId' is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!to || typeof to !== "string" || !EMAIL_REGEX.test(to.trim())) {
      return new Response(
        JSON.stringify({ error: "Validation error: A valid recipient email address is required in 'to'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return new Response(
        JSON.stringify({ error: "Validation error: 'subject' must not be empty." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body || typeof body !== "string" || !body.trim()) {
      return new Response(
        JSON.stringify({ error: "Validation error: 'body' must not be empty." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read environment secrets
    const getEnv = (key: string): string | undefined => {
      if (options?.env?.[key]) return options.env[key];
      if (typeof Deno !== "undefined") return Deno.env.get(key);
      if (typeof process !== "undefined") return process.env?.[key];
      return undefined;
    };

    const resendApiKey = getEnv("RESEND_API_KEY");
    if (!resendApiKey || !resendApiKey.trim()) {
      console.error("[send-email] Missing RESEND_API_KEY in environment secrets.");
      return new Response(
        JSON.stringify({
          error: "Email delivery service unconfigured: RESEND_API_KEY is missing from Supabase secrets."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fromEmail = getEnv("RESEND_FROM_EMAIL") || "PRCBO Tech <onboarding@resend.dev>";
    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseKey = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_ANON_KEY");
    const customFetch = options?.fetchFn || fetch;

    const safeIdempotencyKey = idempotencyKey?.trim() || `email-${leadId}-${Date.now()}`;

    // 3. Idempotency Check (Check if already sent with this key)
    if (supabaseUrl && supabaseKey && safeIdempotencyKey) {
      try {
        const checkRes = await customFetch(
          `${supabaseUrl}/rest/v1/outreach_logs?idempotency_key=eq.${encodeURIComponent(safeIdempotencyKey)}&status=eq.Sent&select=*`,
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
            console.log(`[send-email] Idempotent replay: Message already sent with key ${safeIdempotencyKey}`);
            return new Response(
              JSON.stringify({
                success: true,
                messageId: existing[0].provider_message_id,
                status: "Sent",
                isIdempotentReplay: true,
                logId: existing[0].id
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch (checkErr) {
        console.warn("[send-email] Idempotency check skipped due to query error");
      }
    }

    // 4. Dispatch Email to Resend API
    console.log(`[send-email] Dispatching email to ${to.trim()} via Resend...`);

    const resendHeaders: Record<string, string> = {
      "Authorization": `Bearer ${resendApiKey.trim()}`,
      "Content-Type": "application/json",
      "Idempotency-Key": safeIdempotencyKey
    };

    const resendRes = await customFetch("https://api.resend.com/emails", {
      method: "POST",
      headers: resendHeaders,
      body: JSON.stringify({
        from: fromEmail,
        to: [to.trim()],
        subject: subject.trim(),
        text: body.trim(),
        html: formatPlainTextToHtml(body.trim())
      })
    });

    // 5. Handle Resend Failure
    if (!resendRes.ok) {
      let failureDetail = `HTTP ${resendRes.status}`;
      try {
        const errJson = await resendRes.json();
        if (errJson?.message && typeof errJson.message === "string") {
          failureDetail = errJson.message;
        }
      } catch {
        // Non-JSON response, ignore
      }

      console.warn(`[send-email] Resend API rejected dispatch: HTTP ${resendRes.status}`);

      // Record failed log entry in Supabase if database access is available
      if (supabaseUrl && supabaseKey) {
        try {
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
              channel: "Email",
              template: template || "Outreach Email",
              message_content: `Subject: ${subject.trim()}\n\n${body.trim()}`,
              recipient_email: to.trim(),
              status: "Failed",
              error_message: failureDetail,
              operator_id: operatorId || null,
              operator_name: operatorName,
              idempotency_key: safeIdempotencyKey,
              provider_name: "resend"
            })
          });
        } catch {
          // Ignore secondary DB log error
        }
      }

      // Do NOT mark lead as Contacted on failure
      return new Response(
        JSON.stringify({
          error: "Email delivery failed",
          details: failureDetail,
          status: "Failed"
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Handle Resend Success
    const resendData = await resendRes.json();
    const providerMessageId = resendData?.id;

    if (!providerMessageId) {
      console.warn("[send-email] Resend succeeded but did not return message id");
    }

    console.log(`[send-email] Email accepted by Resend with ID: ${providerMessageId}`);

    let savedLogId: string | undefined;

    // 7. Persist Outreach Log (Status: 'Sent' - NEVER 'Delivered')
    if (supabaseUrl && supabaseKey) {
      try {
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
            channel: "Email",
            template: template || "Outreach Email",
            message_content: `Subject: ${subject.trim()}\n\n${body.trim()}`,
            recipient_email: to.trim(),
            provider_message_id: providerMessageId,
            provider_name: "resend",
            status: "Sent",
            sent_at: new Date().toISOString(),
            operator_id: operatorId || null,
            operator_name: operatorName,
            idempotency_key: safeIdempotencyKey,
            metadata: {
              openStatus: "Sent via Resend",
              replyStatus: "Awaiting Response",
              providerMessageId
            }
          })
        });

        if (insertRes.ok) {
          const inserted = await insertRes.json();
          if (Array.isArray(inserted) && inserted.length > 0) {
            savedLogId = inserted[0].id;
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
        console.warn("[send-email] Post-send database persistence error:", dbErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: providerMessageId,
        provider: "resend",
        status: "Sent",
        recipient: to.trim(),
        logId: savedLogId
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[send-email] Unhandled exception:", err?.message);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error during email dispatch." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

// Supabase Edge Functions execution entry point
if (typeof Deno !== "undefined" && typeof (Deno as any).serve === "function") {
  (Deno as any).serve(handleSendEmailRequest);
}
