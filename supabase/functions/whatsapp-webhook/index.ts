// PRCBO AI LeadGen - Supabase Edge Function: whatsapp-webhook
// Securely handles Meta WhatsApp Cloud API webhooks:
// 1. GET: Webhook verification challenge (hub.mode, hub.verify_token, hub.challenge)
// 2. POST: Signature verification (X-Hub-Signature-256) and delivery status tracking (sent, delivered, read, failed)
// Runtime: Deno (Supabase Edge Runtime) / Web Standard Request & Response

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-hub-signature-256, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

/**
 * Constant-time string comparison to prevent timing attack side-channels
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Computes HMAC-SHA256 hex string using the Web Crypto API
 */
export async function computeHmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  const hashArray = Array.from(new Uint8Array(sigBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verifies Meta X-Hub-Signature-256 header against raw request body
 */
export async function verifyMetaWebhookSignature(params: {
  appSecret: string;
  signatureHeader?: string | null;
  rawBody: string;
}): Promise<{ isValid: boolean; error?: string }> {
  const { appSecret, signatureHeader, rawBody } = params;

  if (!appSecret || !appSecret.trim()) {
    return { isValid: false, error: "WHATSAPP_APP_SECRET not configured on server." };
  }

  if (!signatureHeader || !signatureHeader.trim()) {
    return { isValid: false, error: "Missing required X-Hub-Signature-256 header." };
  }

  const expectedPrefix = "sha256=";
  if (!signatureHeader.startsWith(expectedPrefix)) {
    return { isValid: false, error: "Invalid signature format: Expected 'sha256=<hex>'." };
  }

  const receivedHex = signatureHeader.slice(expectedPrefix.length).trim().toLowerCase();
  const computedHex = (await computeHmacSha256Hex(appSecret.trim(), rawBody)).toLowerCase();

  if (!timingSafeCompare(receivedHex, computedHex)) {
    return { isValid: false, error: "Meta webhook signature verification failed (hash mismatch)." };
  }

  return { isValid: true };
}

/**
 * Computes status transitions preventing regression
 */
export function calculateWhatsAppStatusTransition(
  currentStatus: string,
  incomingMetaStatus: string
): {
  targetStatus: string;
  isDuplicate: boolean;
  shouldRegress: boolean;
} {
  const STATUS_PRIORITY: Record<string, number> = {
    Logged: 1,
    Drafted: 1,
    Pending: 2,
    Sent: 3,
    Dispatched: 3,
    Delivered: 4,
    Read: 5,
    Opened: 5,
    Replied: 6,
    Completed: 7,
    Failed: 10
  };

  const currentWeight = STATUS_PRIORITY[currentStatus] || 1;

  switch (incomingMetaStatus.toLowerCase()) {
    case "sent": {
      if (currentStatus === "Sent" || currentStatus === "Dispatched") {
        return { targetStatus: "Sent", isDuplicate: true, shouldRegress: false };
      }
      if (currentWeight >= STATUS_PRIORITY["Sent"]) {
        return { targetStatus: currentStatus, isDuplicate: false, shouldRegress: true };
      }
      return { targetStatus: "Sent", isDuplicate: false, shouldRegress: false };
    }

    case "delivered": {
      if (currentStatus === "Delivered") {
        return { targetStatus: "Delivered", isDuplicate: true, shouldRegress: false };
      }
      if (currentWeight > STATUS_PRIORITY["Delivered"]) {
        // e.g. already Read or Replied
        return { targetStatus: currentStatus, isDuplicate: false, shouldRegress: true };
      }
      return { targetStatus: "Delivered", isDuplicate: false, shouldRegress: false };
    }

    case "read": {
      if (currentStatus === "Read") {
        return { targetStatus: "Read", isDuplicate: true, shouldRegress: false };
      }
      if (currentWeight > STATUS_PRIORITY["Read"]) {
        return { targetStatus: currentStatus, isDuplicate: false, shouldRegress: true };
      }
      return { targetStatus: "Read", isDuplicate: false, shouldRegress: false };
    }

    case "failed": {
      if (currentStatus === "Failed") {
        return { targetStatus: "Failed", isDuplicate: true, shouldRegress: false };
      }
      return { targetStatus: "Failed", isDuplicate: false, shouldRegress: false };
    }

    default:
      return { targetStatus: currentStatus, isDuplicate: false, shouldRegress: false };
  }
}

/**
 * Main Webhook Handler
 */
export async function handleWhatsAppWebhookRequest(
  req: Request,
  options?: {
    env?: Record<string, string>;
    fetchFn?: typeof fetch;
  }
): Promise<Response> {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const getEnv = (key: string): string | undefined => {
    if (options?.env?.[key]) return options.env[key];
    if (typeof Deno !== "undefined") return Deno.env.get(key);
    if (typeof process !== "undefined") return process.env?.[key];
    return undefined;
  };

  const url = new URL(req.url);

  // 1. Meta Webhook Verification Handshake (GET)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const expectedToken = getEnv("WHATSAPP_VERIFY_TOKEN");

    if (mode === "subscribe" && token && expectedToken && token === expectedToken) {
      console.log("[whatsapp-webhook] Verification handshake successful!");
      return new Response(challenge || "", {
        status: 200,
        headers: { "Content-Type": "text/plain" }
      });
    }

    console.warn("[whatsapp-webhook] Verification handshake failed: Invalid or missing token.");
    return new Response("Forbidden: Verification token mismatch.", {
      status: 403,
      headers: { "Content-Type": "text/plain" }
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Only GET and POST are supported." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 2. Read raw request body as text
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Failed to read request body stream." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 3. Cryptographic Signature Verification (POST)
  const appSecret = getEnv("WHATSAPP_APP_SECRET");
  if (appSecret && appSecret.trim()) {
    const signatureHeader = req.headers.get("x-hub-signature-256");
    const verification = await verifyMetaWebhookSignature({
      appSecret,
      signatureHeader,
      rawBody
    });

    if (!verification.isValid) {
      console.warn(`[whatsapp-webhook] Signature verification failed: ${verification.error}`);
      return new Response(
        JSON.stringify({ error: verification.error || "Invalid Meta webhook signature." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // 4. Parse Meta Webhook Event JSON
  let bodyJson: any;
  try {
    bodyJson = JSON.parse(rawBody);
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON payload." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = getEnv("SUPABASE_URL");
  const supabaseKey = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_ANON_KEY");
  const customFetch = options?.fetchFn || fetch;

  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({ error: "Supabase database connection not configured in Edge Runtime." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const entries = Array.isArray(bodyJson?.entry) ? bodyJson.entry : [];
  const processedStatuses: any[] = [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const statuses = Array.isArray(change?.value?.statuses) ? change.value.statuses : [];
      for (const statusObj of statuses) {
        const wamid = statusObj?.id;
        const metaStatus = statusObj?.status; // 'sent', 'delivered', 'read', 'failed'
        const timestampSec = statusObj?.timestamp ? parseInt(statusObj.timestamp, 10) : Math.floor(Date.now() / 1000);
        const eventIsoTime = new Date(timestampSec * 1000).toISOString();

        if (!wamid || !metaStatus) continue;

        console.log(`[whatsapp-webhook] Processing status "${metaStatus}" for message ID: ${wamid}`);

        try {
          // Look up matching outreach log by provider_message_id
          const lookupRes = await customFetch(
            `${supabaseUrl}/rest/v1/outreach_logs?provider_message_id=eq.${encodeURIComponent(wamid)}&select=*&order=created_at.desc&limit=1`,
            {
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`
              }
            }
          );

          if (!lookupRes.ok) {
            console.warn(`[whatsapp-webhook] Lookup failed for ${wamid} with HTTP ${lookupRes.status}`);
            continue;
          }

          const records = await lookupRes.json();
          if (!Array.isArray(records) || records.length === 0) {
            console.warn(`[whatsapp-webhook] No outreach log found for WhatsApp message ID: ${wamid}`);
            processedStatuses.push({ id: wamid, status: metaStatus, found: false });
            continue;
          }

          const existingLog = records[0];
          const currentStatus = existingLog.status || "Sent";
          const { targetStatus, isDuplicate, shouldRegress } = calculateWhatsAppStatusTransition(currentStatus, metaStatus);

          const existingMeta = typeof existingLog.metadata === "object" && existingLog.metadata !== null
            ? existingLog.metadata
            : {};
          const existingEvents = Array.isArray(existingMeta.events) ? existingMeta.events : [];

          const updatedEvents = [
            ...existingEvents,
            {
              channel: "WhatsApp",
              status: metaStatus,
              timestamp: eventIsoTime,
              receivedAt: new Date().toISOString()
            }
          ].slice(-25);

          const patchPayload: Record<string, any> = {
            metadata: {
              ...existingMeta,
              events: updatedEvents,
              lastWebhookStatus: metaStatus,
              lastWebhookAt: eventIsoTime
            }
          };

          if (metaStatus === "delivered") {
            patchPayload.delivered_at = eventIsoTime;
            patchPayload.metadata.openStatus = "Delivered to device";
          } else if (metaStatus === "read") {
            patchPayload.read_at = eventIsoTime;
            if (!existingLog.delivered_at) {
              patchPayload.delivered_at = eventIsoTime;
            }
            patchPayload.metadata.openStatus = "Read by recipient (Blue ticks)";
          } else if (metaStatus === "failed") {
            const errDetail = statusObj.errors?.[0]?.message || statusObj.errors?.[0]?.title || "WhatsApp message delivery failed.";
            patchPayload.error_message = errDetail;
            patchPayload.metadata.errors = statusObj.errors || [];
            patchPayload.metadata.openStatus = "Delivery Failed";
          }

          if (!shouldRegress) {
            patchPayload.status = targetStatus;
          }

          // Patch database record
          const patchRes = await customFetch(
            `${supabaseUrl}/rest/v1/outreach_logs?id=eq.${encodeURIComponent(existingLog.id)}`,
            {
              method: "PATCH",
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
                Prefer: "return=minimal"
              },
              body: JSON.stringify(patchPayload)
            }
          );

          if (patchRes.ok) {
            processedStatuses.push({
              id: wamid,
              logId: existingLog.id,
              status: shouldRegress ? currentStatus : targetStatus,
              isDuplicate,
              isIgnoredDueToProgress: shouldRegress
            });
          }
        } catch (itemErr) {
          console.error(`[whatsapp-webhook] Exception processing status item ${wamid}:`, itemErr);
        }
      }
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      processed: processedStatuses.length,
      statuses: processedStatuses
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Supabase Edge Runtime entry point
if (typeof Deno !== "undefined" && typeof (Deno as any).serve === "function") {
  (Deno as any).serve(handleWhatsAppWebhookRequest);
}
