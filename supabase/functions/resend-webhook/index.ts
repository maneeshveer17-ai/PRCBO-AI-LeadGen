// PRCBO AI LeadGen - Supabase Edge Function: resend-webhook
// Securely receives Resend webhook events (delivered, bounced, complained, sent, opened)
// Verifies Svix signatures, matches by provider_message_id, and handles out-of-order/duplicate events.
// Runtime: Deno (Supabase Edge Runtime) / Web Standard Request & Response

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "svix-id, svix-timestamp, svix-signature, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

export interface ResendWebhookPayload {
  type: string;
  created_at?: string;
  data: {
    email_id?: string;
    id?: string;
    to?: string[];
    from?: string;
    subject?: string;
    created_at?: string;
    bounce?: {
      message?: string;
      type?: string;
      subType?: string;
    };
    [key: string]: any;
  };
}

/**
 * Decodes a base64 string into a Uint8Array byte array safely in all environments
 */
export function decodeBase64ToUint8Array(b64Str: string): Uint8Array {
  const clean = b64Str.trim().replace(/-/g, "+").replace(/_/g, "/");
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(clean, "base64"));
  }
  const binaryStr = atob(clean);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encodes a Uint8Array byte array into a standard base64 string
 */
export function encodeUint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binaryStr = "";
  for (let i = 0; i < bytes.length; i++) {
    binaryStr += String.fromCharCode(bytes[i]);
  }
  return btoa(binaryStr);
}

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
 * Computes HMAC-SHA256 signature using the Web Crypto API
 */
export async function computeHmacSha256(secretBytes: Uint8Array, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return encodeUint8ArrayToBase64(new Uint8Array(sigBuffer));
}

/**
 * Verifies Svix webhook signatures used by Resend
 */
export async function verifyResendWebhookSignature(params: {
  secret: string;
  svixId?: string | null;
  svixTimestamp?: string | null;
  svixSignature?: string | null;
  rawBody: string;
  skipTimestampCheck?: boolean;
}): Promise<{ isValid: boolean; error?: string }> {
  const { secret, svixId, svixTimestamp, svixSignature, rawBody, skipTimestampCheck } = params;

  if (!secret || !secret.trim()) {
    return { isValid: false, error: "Signing secret not provided." };
  }

  if (!svixId || !svixTimestamp || !svixSignature) {
    return {
      isValid: false,
      error: "Missing required svix headers: svix-id, svix-timestamp, or svix-signature."
    };
  }

  // 1. Verify timestamp freshness (within 5 minutes = 300 seconds)
  const timestampSec = parseInt(svixTimestamp, 10);
  if (isNaN(timestampSec)) {
    return { isValid: false, error: "Invalid svix-timestamp header format." };
  }

  if (!skipTimestampCheck) {
    const nowSec = Math.floor(Date.now() / 1000);
    const diffSec = Math.abs(nowSec - timestampSec);
    if (diffSec > 300) {
      return {
        isValid: false,
        error: `Webhook timestamp expired or outside tolerance window (${diffSec}s difference).`
      };
    }
  }

  // 2. Extract key bytes (strip 'whsec_' prefix if present, then base64 decode)
  let secretBytes: Uint8Array;
  try {
    const rawSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    secretBytes = decodeBase64ToUint8Array(rawSecret);
  } catch (err: any) {
    return { isValid: false, error: `Invalid secret format: ${err.message}` };
  }

  // 3. Construct signed message and compute expected signature
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  const computedBase64 = await computeHmacSha256(secretBytes, signedContent);

  // 4. Compare with signatures in the svix-signature header (e.g. "v1,abc v1,def")
  const signatures = svixSignature.split(" ").map(s => s.trim()).filter(Boolean);
  const match = signatures.some(sigHeader => {
    const commaIndex = sigHeader.indexOf(",");
    if (commaIndex === -1) return false;
    const version = sigHeader.slice(0, commaIndex);
    const signatureValue = sigHeader.slice(commaIndex + 1);
    if (version !== "v1") return false;
    return timingSafeCompare(signatureValue, computedBase64);
  });

  if (!match) {
    return { isValid: false, error: "Webhook signature verification failed (hash mismatch)." };
  }

  return { isValid: true };
}

/**
 * Determine lifecycle status transitions avoiding regressions
 */
export function calculateStatusTransition(
  currentStatus: string,
  incomingEventType: string
): {
  targetStatus: string;
  isDuplicate: boolean;
  shouldRegress: boolean;
} {
  // Priority ordering: Higher weights cannot be overwritten by lower weights
  const STATUS_PRIORITY: Record<string, number> = {
    Logged: 1,
    Drafted: 1,
    Pending: 2,
    Sent: 3,
    Dispatched: 3,
    Delivered: 4,
    Opened: 5,
    Replied: 6,
    Completed: 7,
    Failed: 9,
    Bounced: 10,
    Complained: 10
  };

  const currentWeight = STATUS_PRIORITY[currentStatus] || 1;

  switch (incomingEventType) {
    case "email.delivered": {
      if (currentStatus === "Delivered") {
        return { targetStatus: "Delivered", isDuplicate: true, shouldRegress: false };
      }
      if (currentWeight > STATUS_PRIORITY["Delivered"]) {
        // e.g. Opened, Replied, Bounced: do not downgrade
        return { targetStatus: currentStatus, isDuplicate: false, shouldRegress: true };
      }
      return { targetStatus: "Delivered", isDuplicate: false, shouldRegress: false };
    }

    case "email.bounced": {
      if (currentStatus === "Bounced") {
        return { targetStatus: "Bounced", isDuplicate: true, shouldRegress: false };
      }
      // Bounced is terminal (weight 10), overrides earlier states
      return { targetStatus: "Bounced", isDuplicate: false, shouldRegress: false };
    }

    case "email.complained": {
      if (currentStatus === "Complained") {
        return { targetStatus: "Complained", isDuplicate: true, shouldRegress: false };
      }
      // Complained is terminal (weight 10)
      return { targetStatus: "Complained", isDuplicate: false, shouldRegress: false };
    }

    case "email.opened": {
      if (currentStatus === "Opened") {
        return { targetStatus: "Opened", isDuplicate: true, shouldRegress: false };
      }
      if (currentWeight > STATUS_PRIORITY["Opened"]) {
        return { targetStatus: currentStatus, isDuplicate: false, shouldRegress: true };
      }
      return { targetStatus: "Opened", isDuplicate: false, shouldRegress: false };
    }

    case "email.sent": {
      if (currentStatus === "Sent" || currentStatus === "Dispatched") {
        return { targetStatus: "Sent", isDuplicate: true, shouldRegress: false };
      }
      if (currentWeight >= STATUS_PRIORITY["Sent"]) {
        // Already Delivered, Opened, Bounced etc.: do not regress
        return { targetStatus: currentStatus, isDuplicate: false, shouldRegress: true };
      }
      return { targetStatus: "Sent", isDuplicate: false, shouldRegress: false };
    }

    default:
      return { targetStatus: currentStatus, isDuplicate: false, shouldRegress: false };
  }
}

/**
 * Main Webhook Request Handler
 */
export async function handleResendWebhookRequest(
  req: Request,
  options?: {
    env?: Record<string, string>;
    fetchFn?: typeof fetch;
    skipTimestampCheck?: boolean;
  }
): Promise<Response> {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Only POST is accepted." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const getEnv = (key: string): string | undefined => {
    if (options?.env?.[key]) return options.env[key];
    if (typeof Deno !== "undefined") return Deno.env.get(key);
    if (typeof process !== "undefined") return process.env?.[key];
    return undefined;
  };

  const webhookSecret = getEnv("RESEND_WEBHOOK_SECRET");
  if (!webhookSecret || !webhookSecret.trim()) {
    console.error("[resend-webhook] RESEND_WEBHOOK_SECRET is not configured in environment secrets.");
    return new Response(
      JSON.stringify({ error: "Webhook secret not configured on server." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 1. Read raw body as text for cryptographic signature check
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Failed to read request body stream." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 2. Verify Svix signature
  const svixId = req.headers.get("svix-id") || req.headers.get("webhook-id");
  const svixTimestamp = req.headers.get("svix-timestamp") || req.headers.get("webhook-timestamp");
  const svixSignature = req.headers.get("svix-signature") || req.headers.get("webhook-signature");

  const verification = await verifyResendWebhookSignature({
    secret: webhookSecret,
    svixId,
    svixTimestamp,
    svixSignature,
    rawBody,
    skipTimestampCheck: options?.skipTimestampCheck
  });

  if (!verification.isValid) {
    console.warn(`[resend-webhook] Verification failed: ${verification.error}`);
    return new Response(
      JSON.stringify({ error: verification.error || "Invalid webhook signature." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 3. Parse JSON event payload
  let payload: ResendWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON payload." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const eventType = payload?.type;
  const eventData = payload?.data;
  const emailId = eventData?.email_id || eventData?.id;

  if (!emailId || typeof emailId !== "string" || !emailId.trim()) {
    return new Response(
      JSON.stringify({ error: "Missing required provider message identifier (email_id) in event payload." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const cleanEmailId = emailId.trim();
  console.log(`[resend-webhook] Received verified event "${eventType}" for message ID: ${cleanEmailId}`);

  const supabaseUrl = getEnv("SUPABASE_URL");
  const supabaseKey = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_ANON_KEY");
  const customFetch = options?.fetchFn || fetch;

  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({ error: "Supabase database connection not configured in Edge Runtime." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 4. Match event to outreach_logs by provider_message_id
  let existingLog: any = null;
  try {
    const lookupRes = await customFetch(
      `${supabaseUrl}/rest/v1/outreach_logs?provider_message_id=eq.${encodeURIComponent(cleanEmailId)}&select=*&order=created_at.desc&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`
        }
      }
    );

    if (lookupRes.ok) {
      const records = await lookupRes.json();
      if (Array.isArray(records) && records.length > 0) {
        existingLog = records[0];
      }
    } else {
      console.error(`[resend-webhook] DB lookup failed with HTTP ${lookupRes.status}`);
      return new Response(
        JSON.stringify({ error: `Database lookup error: HTTP ${lookupRes.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err: any) {
    console.error("[resend-webhook] Exception querying outreach_logs:", err);
    return new Response(
      JSON.stringify({ error: "Failed to query outreach_logs." }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!existingLog) {
    console.warn(`[resend-webhook] No outreach log found for provider_message_id: ${cleanEmailId}`);
    return new Response(
      JSON.stringify({
        error: `Outreach log record not found for provider_message_id: ${cleanEmailId}`,
        acknowledged: false
      }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 5. Evaluate status transition, duplicates, and out-of-order deliveries
  const currentStatus = existingLog.status || "Sent";
  const { targetStatus, isDuplicate, shouldRegress } = calculateStatusTransition(currentStatus, eventType);

  const existingMeta = typeof existingLog.metadata === "object" && existingLog.metadata !== null
    ? existingLog.metadata
    : {};

  const existingEvents: any[] = Array.isArray(existingMeta.events) ? existingMeta.events : [];
  const eventTimestamp = payload.created_at || eventData?.created_at || new Date().toISOString();

  // Audit event history (capped to last 25 events)
  const updatedEvents = [
    ...existingEvents,
    {
      type: eventType,
      timestamp: eventTimestamp,
      receivedAt: new Date().toISOString()
    }
  ].slice(-25);

  const patchPayload: Record<string, any> = {
    metadata: {
      ...existingMeta,
      events: updatedEvents,
      lastWebhookEvent: eventType,
      lastWebhookAt: eventTimestamp
    }
  };

  // Set appropriate timestamps and descriptive metadata based on event type
  if (eventType === "email.delivered") {
    patchPayload.delivered_at = eventTimestamp;
    patchPayload.metadata.openStatus = "Delivered to mail server";
  } else if (eventType === "email.bounced") {
    patchPayload.bounced_at = eventTimestamp;
    const bounceDetail = eventData?.bounce?.message || "Email address rejected or suppressed by mail server.";
    patchPayload.error_message = bounceDetail;
    patchPayload.metadata.bounce = eventData?.bounce || {};
    patchPayload.metadata.openStatus = "Delivery Bounced";
  } else if (eventType === "email.complained") {
    patchPayload.error_message = "Recipient marked email as spam / spam complaint registered.";
    patchPayload.metadata.openStatus = "Marked as Spam";
  } else if (eventType === "email.opened") {
    patchPayload.metadata.openStatus = "Opened";
  }

  // Only apply targetStatus if it doesn't regress existing progress
  if (!shouldRegress) {
    patchPayload.status = targetStatus;
  }

  // 6. Update outreach_logs in Supabase
  try {
    const updateRes = await customFetch(
      `${supabaseUrl}/rest/v1/outreach_logs?id=eq.${encodeURIComponent(existingLog.id)}`,
      {
        method: "PATCH",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify(patchPayload)
      }
    );

    if (!updateRes.ok) {
      console.error(`[resend-webhook] Update failed with HTTP ${updateRes.status}`);
      return new Response(
        JSON.stringify({ error: `Database update failed: HTTP ${updateRes.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err: any) {
    console.error("[resend-webhook] Exception updating outreach_logs:", err);
    return new Response(
      JSON.stringify({ error: "Exception updating outreach_logs record." }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log(`[resend-webhook] Successfully processed ${eventType} for log ${existingLog.id}. Status: ${shouldRegress ? currentStatus : targetStatus}`);

  return new Response(
    JSON.stringify({
      success: true,
      logId: existingLog.id,
      providerMessageId: cleanEmailId,
      eventType,
      status: shouldRegress ? currentStatus : targetStatus,
      isDuplicate,
      isIgnoredDueToProgress: shouldRegress
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Supabase Edge Runtime entry point
if (typeof Deno !== "undefined" && typeof (Deno as any).serve === "function") {
  (Deno as any).serve(handleResendWebhookRequest);
}
