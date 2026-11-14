import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  generatePersonalizedOutreach,
  generateBusinessOpportunityAnalysis
} from '../../../ai/lead_analysis/personalizedOutreach.js';
import {
  generateAnalysisForLead,
  generateOutreachForLead
} from '../services/aiOutreachService.js';
import {
  buildAnalysisPrompt,
  buildOutreachPrompt,
  SYSTEM_ANALYSIS_PROMPT,
  SYSTEM_OUTREACH_PROMPT
} from '../../../ai/prompts/leadAnalysisPrompts.js';
import { handleRequest } from '../../../supabase/functions/analyze-lead/index.ts';

describe('AI Lead Analysis & Personalized Outreach Subsystem', () => {

  describe('1. Prompt Construction & Zero-Fabrication Constraints', () => {
    test('buildAnalysisPrompt includes verified lead details and system rules', () => {
      const lead = {
        businessName: 'Vasantha Healthcare Clinic',
        category: 'Healthcare',
        location: 'Madurai, Tamil Nadu',
        website: 'https://vasanthahealth.in',
        contactPerson: 'Dr. Vasantha Kumar',
        rating: 4.8,
        reviewCount: 120,
        lat: 9.9252,
        lng: 78.1198
      };

      const prompt = buildAnalysisPrompt(lead);
      assert.strictEqual(typeof prompt.system, 'string');
      assert.ok(prompt.system.includes('STRICT GROUNDING RULES'));
      assert.ok(prompt.system.includes('NEVER invent fake testimonials'));
      assert.ok(prompt.user.includes('Vasantha Healthcare Clinic'));
      assert.ok(prompt.user.includes('Healthcare'));
      assert.ok(prompt.user.includes('Madurai, Tamil Nadu'));
      assert.ok(prompt.user.includes('Dr. Vasantha Kumar'));
    });

    test('buildOutreachPrompt constructs channel-tailored prompts safely', () => {
      const prompt = buildOutreachPrompt({
        businessName: 'Apex Precision Tools',
        category: 'Manufacturing',
        location: 'Coimbatore, Tamil Nadu'
      }, { tone: 'executive' });

      assert.ok(prompt.system.includes('PRCBO Tech'));
      assert.ok(prompt.user.includes('Apex Precision Tools'));
      assert.ok(prompt.user.includes('Manufacturing'));
      assert.ok(prompt.user.includes('executive'));
    });

    test('Handles null or empty lead in prompt builders without throwing', () => {
      assert.doesNotThrow(() => buildAnalysisPrompt(null));
      assert.doesNotThrow(() => buildOutreachPrompt(undefined));
      const p1 = buildAnalysisPrompt(null);
      assert.ok(p1.user.includes('NO WEBSITE ON RECORD'));
    });
  });

  describe('2. Multi-Channel Personalized Outreach Generation', () => {
    test('Missing website directs email & WhatsApp angle to web presence & capture', () => {
      const lead = {
        businessName: 'Madurai Spice Traders',
        category: 'Commercial',
        location: 'Madurai, Tamil Nadu',
        website: '',
        contactPerson: 'S. Ramanathan'
      };

      const outreach = generatePersonalizedOutreach(lead);

      assert.ok(outreach.email.subject.includes('Madurai Spice Traders'));
      assert.ok(outreach.email.body.includes('Dear S. Ramanathan,'));
      assert.ok(outreach.email.body.toLowerCase().includes('web presence'));
      assert.ok(outreach.whatsapp.message.includes('S. Ramanathan'));
      assert.ok(outreach.whatsapp.message.length <= 400);
      assert.ok(outreach.initialMessage.includes('Madurai Spice Traders'));
    });

    test('Insecure HTTP website targets security, SSL and UI/UX modernization', () => {
      const lead = {
        businessName: 'Southern Diagnostic Labs',
        category: 'Healthcare',
        location: 'Chennai, Tamil Nadu',
        website: 'http://southerndiagnostics.in',
        contactPerson: 'Dr. Priya'
      };

      const outreach = generatePersonalizedOutreach(lead);

      assert.ok(outreach.email.subject.toLowerCase().includes('security'));
      assert.ok(outreach.email.body.toLowerCase().includes('https'));
      assert.ok(outreach.whatsapp.message.includes('Dr. Priya'));
    });

    test('Manufacturing lead receives Industrial IoT telemetry proposition', () => {
      const lead = {
        businessName: 'Kovai CNC Tech Ltd',
        category: 'Manufacturing',
        location: 'Coimbatore, Tamil Nadu',
        website: 'https://kovaicnc.com',
        contactPerson: 'K. Anand'
      };

      const outreach = generatePersonalizedOutreach(lead);

      assert.ok(outreach.email.subject.toLowerCase().includes('telemetry') || outreach.email.subject.toLowerCase().includes('iot'));
      assert.ok(outreach.email.body.toLowerCase().includes('iot') || outreach.email.body.toLowerCase().includes('sensor'));
      assert.ok(outreach.whatsapp.message.toLowerCase().includes('iot'));
    });

    test('IT/Software company receives AI workflow automation proposition', () => {
      const lead = {
        businessName: 'NextWave Cloud Solutions',
        category: 'IT / Tech',
        location: 'Bengaluru, Karnataka',
        website: 'https://nextwavecloud.io',
        contactPerson: 'Vikram Mehta'
      };

      const outreach = generatePersonalizedOutreach(lead);

      assert.ok(outreach.email.subject.toLowerCase().includes('ai'));
      assert.ok(outreach.email.body.toLowerCase().includes('workflow automation') || outreach.email.body.toLowerCase().includes('ai'));
    });

    test('Unassigned contact person defaults to professional respectful business greeting', () => {
      const lead = {
        businessName: 'Balaji Hardware',
        category: 'Retail',
        location: 'Trichy, Tamil Nadu',
        contactPerson: 'Unassigned (OSM Data)'
      };

      const outreach = generatePersonalizedOutreach(lead);

      assert.ok(outreach.email.body.includes('Dear Business Leader,'));
      assert.ok(!outreach.email.body.includes('Dear Unassigned'));
    });

    test('Handles null/empty lead objects gracefully without throwing', () => {
      assert.doesNotThrow(() => generatePersonalizedOutreach(null));
      const res = generatePersonalizedOutreach(null);
      assert.ok(res.email.subject);
      assert.ok(res.email.body);
      assert.ok(res.whatsapp.message);
    });
  });

  describe('3. Business Opportunity Analysis', () => {
    test('Generates structured technical analysis without fabrication', () => {
      const lead = {
        businessName: 'Heritage Textiles Madurai',
        category: 'Textile',
        location: 'Madurai, Tamil Nadu',
        website: 'https://heritagetextiles.in',
        phone: '+91 94433 11223'
      };

      const analysis = generateBusinessOpportunityAnalysis(lead);

      assert.ok(analysis.whyThisLeadMatters);
      assert.ok(analysis.businessOpportunity);
      assert.ok(analysis.nextBestAction);
      assert.strictEqual(analysis.recommendedService, 'IoT Solutions');
      assert.ok(analysis.aiAnalysis.iotOpportunity.level === 'CRITICAL');
      assert.ok(analysis.aiAnalysis.businessType.toLowerCase().includes('textile'));
    });

    test('Safe handling of empty inputs in generateBusinessOpportunityAnalysis', () => {
      assert.doesNotThrow(() => generateBusinessOpportunityAnalysis({}));
      const res = generateBusinessOpportunityAnalysis({});
      assert.ok(res.recommendedService);
      assert.ok(res.aiAnalysis);
    });

    test('generateAnalysisForLead returns complete opportunity analysis for client integration', async () => {
      const lead = {
        businessName: 'Vasantha Healthcare Clinic',
        category: 'Healthcare',
        location: 'Madurai, Tamil Nadu',
        website: 'https://vasanthahealth.in'
      };

      const analysis = await generateAnalysisForLead(lead);
      assert.ok(analysis);
      assert.ok(analysis.whyThisLeadMatters);
      assert.ok(analysis.businessOpportunity);
      assert.ok(analysis.nextBestAction);
      assert.ok(analysis.recommendedService);
      assert.ok(analysis.aiAnalysis);
      assert.ok(analysis.analyzedAt);
    });

    test('generateOutreachForLead returns multi-channel drafts for client integration', async () => {
      const lead = {
        businessName: 'Apex Precision Tools',
        category: 'Manufacturing',
        location: 'Coimbatore, Tamil Nadu',
        contactPerson: 'K. Anand'
      };

      const drafts = await generateOutreachForLead(lead);
      assert.ok(drafts);
      assert.ok(drafts.email.subject);
      assert.ok(drafts.email.body);
      assert.ok(drafts.whatsapp.message);
      assert.ok(drafts.initialMessage);
      assert.ok(drafts.generatedAt);
    });
  });

  describe('4. Edge Function Fallback & Diagnostic Integrity (analyze-lead)', () => {
    const sampleLead = {
      businessName: 'Apex Precision Tools',
      category: 'Manufacturing',
      location: 'Coimbatore, Tamil Nadu',
      recommendedService: 'IoT Solutions',
      contactPerson: 'K. Anand'
    };

    test('OPTIONS request returns CORS headers with status 200', async () => {
      const req = new Request('http://localhost/analyze-lead', { method: 'OPTIONS' });
      const res = await handleRequest(req);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), '*');
    });

    test('Missing lead payload returns HTTP 400 with descriptive error', async () => {
      const req = new Request('http://localhost/analyze-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const res = await handleRequest(req);
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('valid lead record is required'));
    });

    test('Missing GEMINI_API_KEY returns deterministic fallback with standard secret note', async () => {
      const origKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      try {
        const req = new Request('http://localhost/analyze-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead: sampleLead, action: 'outreach' })
        });
        const res = await handleRequest(req);
        assert.strictEqual(res.status, 200);
        const data = await res.json();

        assert.strictEqual(data.provider, 'deterministic-engine');
        assert.strictEqual(data.isLlmPowered, false);
        assert.ok(data.note.includes('set GEMINI_API_KEY or OPENAI_API_KEY in Supabase secrets'));
        assert.ok(data.email?.subject.includes('Apex Precision Tools'));
      } finally {
        if (origKey !== undefined) process.env.GEMINI_API_KEY = origKey;
      }
    });

    test('Gemini HTTP non-2xx error captures status and uses deterministic fallback with accurate note', async () => {
      const origKey = process.env.GEMINI_API_KEY;
      const origFetch = globalThis.fetch;
      process.env.GEMINI_API_KEY = 'test-mock-key';

      try {
        globalThis.fetch = async () => new Response(
          JSON.stringify({ error: { code: 403, message: 'API key not valid', status: 'PERMISSION_DENIED' } }),
          { status: 403, statusText: 'Forbidden', headers: { 'Content-Type': 'application/json' } }
        );

        const req = new Request('http://localhost/analyze-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead: sampleLead, action: 'outreach' })
        });
        const res = await handleRequest(req);
        assert.strictEqual(res.status, 200);
        const data = await res.json();

        assert.strictEqual(data.provider, 'deterministic-engine');
        assert.strictEqual(data.isLlmPowered, false);
        assert.ok(data.note.includes('HTTP 403 (PERMISSION_DENIED)'));
        assert.ok(data.note.includes('utilizing deterministic fallback'));
      } finally {
        globalThis.fetch = origFetch;
        if (origKey !== undefined) process.env.GEMINI_API_KEY = origKey;
        else delete process.env.GEMINI_API_KEY;
      }
    });

    test('Gemini empty/safety-filtered candidate response triggers accurate diagnostic fallback', async () => {
      const origKey = process.env.GEMINI_API_KEY;
      const origFetch = globalThis.fetch;
      process.env.GEMINI_API_KEY = 'test-mock-key';

      try {
        globalThis.fetch = async () => new Response(
          JSON.stringify({
            candidates: [{ finishReason: 'SAFETY', content: { parts: [] } }]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

        const req = new Request('http://localhost/analyze-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead: sampleLead, action: 'outreach' })
        });
        const res = await handleRequest(req);
        assert.strictEqual(res.status, 200);
        const data = await res.json();

        assert.strictEqual(data.provider, 'deterministic-engine');
        assert.strictEqual(data.isLlmPowered, false);
        assert.ok(data.note.includes('finishReason: SAFETY'));
      } finally {
        globalThis.fetch = origFetch;
        if (origKey !== undefined) process.env.GEMINI_API_KEY = origKey;
        else delete process.env.GEMINI_API_KEY;
      }
    });

    test('Successful Gemini API invocation returns live model response', async () => {
      const origKey = process.env.GEMINI_API_KEY;
      const origFetch = globalThis.fetch;
      process.env.GEMINI_API_KEY = 'test-mock-key';

      try {
        const mockPayload = {
          email: { subject: 'Customized IoT modernizing proposal', body: 'Dear K. Anand, ...' },
          whatsapp: { message: 'Greetings K. Anand!' },
          initialMessage: 'Connect on IoT modernizing',
          whyThisLeadMatters: 'Key Coimbatore manufacturing player',
          businessOpportunity: 'Industrial telemetry dashboard integration',
          nextBestAction: 'Schedule technical discovery call'
        };

        let capturedUrl = '';
        globalThis.fetch = async (url) => {
          capturedUrl = String(url);
          return new Response(
            JSON.stringify({
              candidates: [{
                finishReason: 'STOP',
                content: { parts: [{ text: JSON.stringify(mockPayload) }] }
              }]
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        };

        const req = new Request('http://localhost/analyze-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead: sampleLead, action: 'outreach' })
        });
        const res = await handleRequest(req);
        assert.strictEqual(res.status, 200);
        const data = await res.json();

        assert.ok(capturedUrl.includes('models/gemini-3.8-flash:generateContent'));
        assert.ok(capturedUrl.startsWith('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent'));
        assert.strictEqual(data.provider, 'google-gemini');
        assert.strictEqual(data.isLlmPowered, true);
        assert.strictEqual(data.email.subject, 'Customized IoT modernizing proposal');
        assert.strictEqual(data.whyThisLeadMatters, 'Key Coimbatore manufacturing player');
      } finally {
        globalThis.fetch = origFetch;
        if (origKey !== undefined) process.env.GEMINI_API_KEY = origKey;
        else delete process.env.GEMINI_API_KEY;
      }
    });
  });
});

