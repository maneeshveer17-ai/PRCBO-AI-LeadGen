// PRCBO AI LeadGen - Supabase Edge Function: analyze-lead
// Runtime: Deno (Supabase Edge Runtime) / Web Standard Request & Response

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

interface LeadPayload {
  businessName?: string;
  name?: string;
  category?: string;
  location?: string;
  website?: string;
  contactPerson?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  rating?: number | null;
  reviewCount?: number | null;
  recommendedService?: string;
  status?: string;
}

export async function handleRequest(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { lead, action = "all", tone = "consultative" } = await req.json() as {
      lead: LeadPayload;
      action?: "outreach" | "analysis" | "all";
      tone?: string;
    };

    if (!lead) {
      return new Response(
        JSON.stringify({ error: "A valid lead record is required in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiApiKey = typeof Deno !== "undefined"
      ? Deno.env.get("GEMINI_API_KEY")
      : (typeof process !== "undefined" ? process.env?.GEMINI_API_KEY : undefined);
    const openaiApiKey = typeof Deno !== "undefined"
      ? Deno.env.get("OPENAI_API_KEY")
      : (typeof process !== "undefined" ? process.env?.OPENAI_API_KEY : undefined);

    const hasGeminiKey = Boolean(geminiApiKey && geminiApiKey.trim());
    console.log(`[analyze-lead] GEMINI_API_KEY configured: ${hasGeminiKey}`);

    let geminiFailureReason: string | null = null;

    // 1. If Gemini API key is available in Supabase secrets, invoke Gemini
    if (hasGeminiKey) {
      try {
        const promptText = `Evaluate this commercial lead for PRCBO Tech and generate ${action === "outreach" ? "personalized multi-channel outreach drafts" : "opportunity analysis and outreach"}:
- Business Name: ${lead.businessName || lead.name || "Enterprise"}
- Category: ${lead.category || "Commercial"}
- Location: ${lead.location || "India"}
- Website: ${lead.website || "No official website"}
- Contact: ${lead.contactPerson || lead.contact_person || "Unassigned"}
- Recommended Service: ${lead.recommendedService || "Web Development"}
- Tone: ${tone}

Return strictly valid JSON with keys:
{
  "email": { "subject": "string", "body": "string" },
  "whatsapp": { "message": "string" },
  "initialMessage": "string",
  "whyThisLeadMatters": "string",
  "businessOpportunity": "string",
  "nextBestAction": "string",
  "recommendedService": "string"
}`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiApiKey!.trim()}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptText }] }],
              generationConfig: {
                temperature: 0.3,
                responseMimeType: "application/json"
              }
            })
          }
        );

        if (!geminiRes.ok) {
          let grpcStatus = "";
          try {
            const errorJson = await geminiRes.json();
            if (errorJson?.error?.status && typeof errorJson.error.status === "string") {
              const sanitized = errorJson.error.status.replace(/[^A-Z0-9_]/g, "");
              if (sanitized) {
                grpcStatus = ` (${sanitized})`;
              }
            }
          } catch {
            // Non-JSON response body, ignore
          }

          geminiFailureReason = `HTTP ${geminiRes.status}${grpcStatus}`;
          console.warn(`[analyze-lead] Gemini API returned HTTP status ${geminiRes.status}${grpcStatus}`);
        } else {
          const geminiData = await geminiRes.json();
          const candidate = geminiData.candidates?.[0];
          const finishReason = candidate?.finishReason;
          const rawJsonText = candidate?.content?.parts?.[0]?.text;

          if (rawJsonText) {
            try {
              const parsed = JSON.parse(rawJsonText);
              return new Response(
                JSON.stringify({
                  ...parsed,
                  provider: "google-gemini",
                  isLlmPowered: true
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            } catch {
              geminiFailureReason = "Model output was not valid JSON";
              console.warn("[analyze-lead] Gemini returned text that failed JSON parsing");
            }
          } else {
            const reasonDetail = finishReason ? `finishReason: ${finishReason}` : "no candidate parts";
            geminiFailureReason = `Model response contained no text (${reasonDetail})`;
            console.warn(`[analyze-lead] Gemini response contained no text (${reasonDetail})`);
          }
        }
      } catch {
        geminiFailureReason = "Network or runtime exception";
        console.warn("[analyze-lead] Gemini request failed due to network or runtime exception");
      }
    }

    // 2. If OpenAI API key is available in Supabase secrets, invoke OpenAI
    if (openaiApiKey && openaiApiKey.trim()) {
      try {
        const promptText = `Generate personalized outreach and opportunity analysis for this lead for PRCBO Tech:
${JSON.stringify(lead, null, 2)}
Return strictly JSON matching { email: { subject, body }, whatsapp: { message }, initialMessage, whyThisLeadMatters, businessOpportunity, nextBestAction }`;

        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiApiKey.trim()}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "You are a B2B sales strategist for PRCBO Tech. Return strictly JSON." },
              { role: "user", content: promptText }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3
          })
        });

        if (openaiRes.ok) {
          const openaiData = await openaiRes.json();
          const parsed = JSON.parse(openaiData.choices?.[0]?.message?.content || "{}");
          return new Response(
            JSON.stringify({
              ...parsed,
              provider: "openai",
              isLlmPowered: true
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          console.warn(`[analyze-lead] OpenAI API returned HTTP status ${openaiRes.status}`);
        }
      } catch {
        console.warn("[analyze-lead] OpenAI invocation failed due to network or runtime exception");
      }
    }

    // 3. Fallback: Generate structured deterministic response when no LLM API key is provisioned or LLM calls fail
    const businessName = lead.businessName || lead.name || "your enterprise";
    const contact = lead.contactPerson || lead.contact_person || "there";
    const location = lead.location || "your region";
    const service = lead.recommendedService || "Web Development";

    let fallbackNote = "To enable live LLM generation, set GEMINI_API_KEY or OPENAI_API_KEY in Supabase secrets.";
    if (geminiFailureReason) {
      fallbackNote = `Gemini generation attempted but did not succeed (${geminiFailureReason}); utilizing deterministic fallback.`;
    }

    return new Response(
      JSON.stringify({
        email: {
          subject: `Digital Transformation & Strategic Offerings for ${businessName}`,
          body: `Dear ${contact},\n\nWe noticed ${businessName}'s strong commercial operations in ${location}. PRCBO Tech specializes in high-impact ${service} tailored for regional enterprises.\n\nWe would welcome an opportunity to share a quick prototype.\n\nBest regards,\nPRCBO Tech`
        },
        whatsapp: {
          message: `Hello ${contact}! Greetings from PRCBO Tech to ${businessName}. We noticed opportunities to optimize your digital presence in ${location}. Open to a quick 2-minute overview?`
        },
        initialMessage: `Hi ${contact}, exploring digital modernization opportunities for ${businessName}. Let's connect!`,
        whyThisLeadMatters: `Commercial prospect in ${location} exhibiting readiness for ${service}.`,
        businessOpportunity: `Accelerate customer acquisition with modern ${service}.`,
        nextBestAction: `Dispatch personalized introductory message to ${contact}.`,
        recommendedService: service,
        provider: "deterministic-engine",
        isLlmPowered: false,
        note: fallbackNote
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

// Supabase Edge Functions execution entry point
if (typeof Deno !== "undefined" && typeof (Deno as any).serve === "function") {
  (Deno as any).serve(handleRequest);
}
