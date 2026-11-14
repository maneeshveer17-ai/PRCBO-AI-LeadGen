import { describe, test } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import {
  handleSendWhatsAppRequest,
  normalizePhoneNumber,
  extractJwtPayload,
  verifyOperatorClaims,
  redactSecrets,
  inFlightDispatches
} from '../../../supabase/functions/send-whatsapp/index.ts';
import {
  handleWhatsAppWebhookRequest,
  verifyMetaWebhookSignature,
  calculateWhatsAppStatusTransition,
  timingSafeCompare
} from '../../../supabase/functions/whatsapp-webhook/index.ts';
import {
  mapDbRowToFrontendOutreachLog,
  sendWhatsAppOutreachViaEdgeFunction
} from '../services/leadService.js';

// Helper to construct simulated JWTs
const createMockJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = 'mock-signature';
  return `Bearer ${header}.${body}.${sig}`;
};

const validOperatorToken = createMockJwt({
  sub: 'usr-operator-001',
  email: 'operator@prcbo.in',
  app_metadata: {
    is_operator: true,
    role: 'operator'
  },
  user_metadata: {
    full_name: 'K. Maneesh'
  },
  exp: Math.floor(Date.now() / 1000) + 7200
});

const unauthorizedUserToken = createMockJwt({
  sub: 'usr-viewer-002',
  email: 'guest@prcbo.in',
  app_metadata: {
    is_operator: false,
    role: 'viewer'
  },
  exp: Math.floor(Date.now() / 1000) + 7200
});

const expiredOperatorToken = createMockJwt({
  sub: 'usr-operator-001',
  email: 'operator@prcbo.in',
  app_metadata: {
    is_operator: true,
    role: 'operator'
  },
  exp: Math.floor(Date.now() / 1000) - 300 // 5 minutes expired
});

// Helper for Meta X-Hub-Signature-256 header
const computeMetaSignatureHeader = (secret, payload) => {
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `sha256=${hmac}`;
};

describe('Meta WhatsApp Cloud API Integration (PRCBO LeadGen)', () => {
  const mockEnv = {
    SUPABASE_URL: 'https://test-supabase-project.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'mock-service-role-key',
    WHATSAPP_ACCESS_TOKEN: 'EAAG_mock_access_token_12345',
    WHATSAPP_PHONE_NUMBER_ID: '109876543210987',
    WHATSAPP_VERIFY_TOKEN: 'prcbo_secure_verify_token_9988',
    WHATSAPP_APP_SECRET: 'test_app_secret_meta_987654321'
  };

  const validTemplatePayload = {
    leadId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    to: '+91 98400 12345',
    templateName: 'prcbo_lead_outreach',
    languageCode: 'en_US',
    templateParameters: ['Ramesh Kumar', 'Madurai Textiles', 'Cloud ERP Modernization'],
    idempotencyKey: 'test-wa-idemp-001'
  };

  const validDirectTextPayload = {
    leadId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    to: '9840012345',
    message: 'Hello Ramesh, greetings from PRCBO Tech regarding your digital modernization.',
    idempotencyKey: 'test-wa-idemp-002'
  };

  /* -------------------------------------------------------------------------- */
  /* 1. Phone Number Normalization Tests                                        */
  /* -------------------------------------------------------------------------- */
  describe('1. Phone Number Normalization & Validation', () => {
    test('Normalizes 10-digit Indian mobile numbers starting with 6-9 by prepending 91', () => {
      assert.strictEqual(normalizePhoneNumber('9840012345'), '919840012345');
      assert.strictEqual(normalizePhoneNumber('8765432109'), '918765432109');
      assert.strictEqual(normalizePhoneNumber('7234567890'), '917234567890');
      assert.strictEqual(normalizePhoneNumber('6345678901'), '916345678901');
    });

    test('Strips spaces, brackets, hyphens, and leading plus sign', () => {
      assert.strictEqual(normalizePhoneNumber('+91 98400-12345'), '919840012345');
      assert.strictEqual(normalizePhoneNumber('+1 (415) 555-2671'), '14155552671');
      assert.strictEqual(normalizePhoneNumber('  91-9840012345  '), '919840012345');
    });

    test('Rejects empty, non-string, or invalid length phone numbers', () => {
      assert.strictEqual(normalizePhoneNumber(''), null);
      assert.strictEqual(normalizePhoneNumber('12345'), null); // too short
      assert.strictEqual(normalizePhoneNumber('12345678901234567890'), null); // too long (> 15 digits)
      assert.strictEqual(normalizePhoneNumber('not-a-number'), null);
      assert.strictEqual(normalizePhoneNumber(null), null);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 2. Operator Authorization & Claims Verification                           */
  /* -------------------------------------------------------------------------- */
  describe('2. Operator Authorization & Claims Verification', () => {
    test('Missing Authorization header is rejected with HTTP 401', async () => {
      const req = new Request('http://localhost/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validTemplatePayload)
      });
      const res = await handleSendWhatsAppRequest(req, { env: mockEnv });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.ok(data.error.includes('Authentication required'));
    });

    test('Non-operator token is rejected with HTTP 403', async () => {
      const req = new Request('http://localhost/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: unauthorizedUserToken
        },
        body: JSON.stringify(validTemplatePayload)
      });
      const res = await handleSendWhatsAppRequest(req, { env: mockEnv });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.ok(data.error.includes('approved PRCBO operator'));
    });

    test('Expired operator token is rejected with HTTP 403', async () => {
      const req = new Request('http://localhost/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: expiredOperatorToken
        },
        body: JSON.stringify(validTemplatePayload)
      });
      const res = await handleSendWhatsAppRequest(req, { env: mockEnv });
      assert.strictEqual(res.status, 403);
    });

    test('OPTIONS request returns status 200 with CORS headers', async () => {
      const req = new Request('http://localhost/send-whatsapp', { method: 'OPTIONS' });
      const res = await handleSendWhatsAppRequest(req, { env: mockEnv });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), '*');
      assert.ok(res.headers.get('Access-Control-Allow-Methods').includes('POST'));
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 3. Payload Validation & Required Fields                                   */
  /* -------------------------------------------------------------------------- */
  describe('3. Payload Validation & Template Requirements', () => {
    test('Missing leadId returns HTTP 400', async () => {
      const req = new Request('http://localhost/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validOperatorToken
        },
        body: JSON.stringify({ ...validTemplatePayload, leadId: '' })
      });
      const res = await handleSendWhatsAppRequest(req, { env: mockEnv });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes("'leadId' is required"));
    });

    test('Invalid recipient phone number returns HTTP 400', async () => {
      const req = new Request('http://localhost/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validOperatorToken
        },
        body: JSON.stringify({ ...validTemplatePayload, to: '123' })
      });
      const res = await handleSendWhatsAppRequest(req, { env: mockEnv });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('valid recipient mobile number'));
    });

    test('Missing both templateName and message returns HTTP 400', async () => {
      const req = new Request('http://localhost/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validOperatorToken
        },
        body: JSON.stringify({
          leadId: validTemplatePayload.leadId,
          to: validTemplatePayload.to
        })
      });
      const res = await handleSendWhatsAppRequest(req, { env: mockEnv });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('Either'));
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 4. Missing Secrets Handling                                               */
  /* -------------------------------------------------------------------------- */
  describe('4. Server Secrets & Environment Configuration', () => {
    test('Missing WHATSAPP_ACCESS_TOKEN returns HTTP 500 without leaking secret names or values', async () => {
      const incompleteEnv = { ...mockEnv, WHATSAPP_ACCESS_TOKEN: '' };
      const req = new Request('http://localhost/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validOperatorToken
        },
        body: JSON.stringify(validTemplatePayload)
      });
      const res = await handleSendWhatsAppRequest(req, { env: incompleteEnv });
      assert.strictEqual(res.status, 500);
      const data = await res.json();
      assert.ok(data.error.includes('WHATSAPP_ACCESS_TOKEN'));
    });

    test('Missing WHATSAPP_PHONE_NUMBER_ID returns HTTP 500', async () => {
      const incompleteEnv = { ...mockEnv, WHATSAPP_PHONE_NUMBER_ID: '' };
      const req = new Request('http://localhost/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validOperatorToken
        },
        body: JSON.stringify(validTemplatePayload)
      });
      const res = await handleSendWhatsAppRequest(req, { env: incompleteEnv });
      assert.strictEqual(res.status, 500);
      const data = await res.json();
      assert.ok(data.error.includes('WHATSAPP_PHONE_NUMBER_ID'));
    });

    test('redactSecrets sanitizes Bearer tokens, Meta access tokens, and API keys without leaking', () => {
      const rawString = 'Authorization: Bearer my_secret_token and EAAG_secret_access_token_12345 with sb_publishable_key_abc and https://api.meta.com?access_token=EAAG987654321';
      const sanitizedString = redactSecrets(rawString);
      assert.ok(!sanitizedString.includes('my_secret_token'));
      assert.ok(!sanitizedString.includes('EAAG_secret_access_token_12345'));
      assert.ok(!sanitizedString.includes('EAAG987654321'));
      assert.ok(!sanitizedString.includes('sb_publishable_key_abc'));
      assert.ok(sanitizedString.includes('[REDACTED]'));

      const rawObj = {
        authorization: 'Bearer secret_token',
        accessToken: 'EAAG_access_123',
        safeProperty: 'hello_world',
        nested: {
          secret_key: 'top_secret',
          publicInfo: 'safe'
        }
      };
      const sanitizedObj = redactSecrets(rawObj);
      assert.strictEqual(sanitizedObj.authorization, '[REDACTED]');
      assert.strictEqual(sanitizedObj.accessToken, '[REDACTED]');
      assert.strictEqual(sanitizedObj.safeProperty, 'hello_world');
      assert.strictEqual(sanitizedObj.nested.secret_key, '[REDACTED]');
      assert.strictEqual(sanitizedObj.nested.publicInfo, 'safe');

      // Test Error instances
      const testError = new Error('Failed to connect with token EAAG_err_secret_999');
      const sanitizedErr = redactSecrets(testError);
      assert.ok(!sanitizedErr.includes('EAAG_err_secret_999'));
      assert.ok(sanitizedErr.includes('[REDACTED_ACCESS_TOKEN]'));
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 5. Meta API Dispatch & Error Handling                                      */
  /* -------------------------------------------------------------------------- */
  describe('5. Meta Cloud API Dispatch & Error Safety', () => {
    test('When Meta API rejects request (e.g. #131030 24h window), records Failed and returns HTTP 502', async () => {
      let insertedLogStatus = null;
      let leadUpdatedStatus = null;

      const mockFetch = async (url, init) => {
        const urlStr = String(url);
        // Supabase REST calls
        if (urlStr.includes('/rest/v1/outreach_logs')) {
          if (init.method === 'POST' || init.method === 'PATCH') {
            const body = JSON.parse(init.body);
            insertedLogStatus = body.status;
            return new Response(JSON.stringify([{ id: 'log-uuid-fail-001', ...body }]), { status: 201 });
          }
          if (urlStr.includes('select=')) {
            return new Response(JSON.stringify([]), { status: 200 }); // no existing idempotency
          }
        }
        if (urlStr.includes('/rest/v1/leads')) {
          const body = JSON.parse(init.body);
          leadUpdatedStatus = body.status;
          return new Response(JSON.stringify([{ id: 'lead-001' }]), { status: 200 });
        }

        // Meta Graph API call
        if (urlStr.includes('graph.facebook.com')) {
          return new Response(JSON.stringify({
            error: {
              message: "(#131030) Message failed to send because more than 24 hours have passed since the customer last replied.",
              type: "OAuthException",
              code: 131030,
              fbtrace_id: "AcbDef12345"
            }
          }), { status: 400 });
        }

        return new Response('Not found', { status: 404 });
      };

      const req = new Request('http://localhost/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validOperatorToken
        },
        body: JSON.stringify(validDirectTextPayload)
      });

      const res = await handleSendWhatsAppRequest(req, { env: mockEnv, fetchFn: mockFetch });
      assert.strictEqual(res.status, 502);
      const data = await res.json();
      assert.strictEqual(data.status, 'Failed');
      assert.ok(data.details.includes('131030'));
      assert.strictEqual(data.metaStatus, 400);
      assert.strictEqual(data.metaError.code, 131030);

      // Critical requirement: lead MUST NOT be marked Contacted on provider failure
      assert.strictEqual(leadUpdatedStatus, null);
      assert.strictEqual(insertedLogStatus, 'Failed');
    });

    test('Network failure when contacting Meta API returns 502 with diagnostic details', async () => {
      const rejectingFetch = async (url) => {
        const urlStr = String(url);
        if (urlStr.includes('/rest/v1/outreach_logs')) {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (urlStr.includes('graph.facebook.com')) {
          throw new Error('connect ECONNREFUSED 157.240.22.53:443');
        }
        return new Response('Not found', { status: 404 });
      };

      const req = new Request('http://localhost/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validOperatorToken
        },
        body: JSON.stringify(validDirectTextPayload)
      });

      const res = await handleSendWhatsAppRequest(req, { env: mockEnv, fetchFn: rejectingFetch });
      assert.strictEqual(res.status, 502);
      const data = await res.json();
      assert.strictEqual(data.status, 'Failed');
      assert.ok(data.error.includes('network connection failure'));
      assert.ok(data.details.includes('Failed to establish a network connection'));
      // Raw socket details (e.g. ECONNREFUSED or IP addresses) MUST NOT leak to client
      assert.strictEqual(data.details.includes('ECONNREFUSED'), false);
      assert.strictEqual(data.details.includes('157.240.22.53'), false);
    });

    test('Successful template dispatch sends correct Graph API payload, sets status to Sent, and updates lead to Contacted', async () => {
      let metaRequestPayload = null;
      let metaRequestHeaders = null;
      let outreachLogRecord = null;
      let leadUpdated = false;

      const mockFetch = async (url, init) => {
        const urlStr = String(url);

        // Supabase REST calls
        if (urlStr.includes('/rest/v1/outreach_logs')) {
          if (init.method === 'POST') {
            outreachLogRecord = JSON.parse(init.body);
            return new Response(JSON.stringify([{ id: 'log-uuid-success-001', ...outreachLogRecord }]), { status: 201 });
          }
          if (init.method === 'PATCH') {
            const patchBody = JSON.parse(init.body);
            outreachLogRecord = { ...outreachLogRecord, ...patchBody };
            return new Response(JSON.stringify([{ id: 'log-uuid-success-001', ...outreachLogRecord }]), { status: 200 });
          }
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (urlStr.includes('/rest/v1/leads')) {
          leadUpdated = true;
          return new Response(JSON.stringify([{ id: 'lead-001', status: 'Contacted' }]), { status: 200 });
        }

        // Meta Graph API call
        if (urlStr.includes('graph.facebook.com')) {
          metaRequestHeaders = init.headers;
          metaRequestPayload = JSON.parse(init.body);
          return new Response(JSON.stringify({
            messaging_product: 'whatsapp',
            contacts: [{ input: '919840012345', wa_id: '919840012345' }],
            messages: [{ id: 'wamid.HBgMOTE5ODQwMDEyMzQ1FQIAERgSRTc1NDc5RTA2NUMwRDAxOAA=' }]
          }), { status: 200 });
        }

        return new Response('Not found', { status: 404 });
      };

      const req = new Request('http://localhost/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validOperatorToken
        },
        body: JSON.stringify(validTemplatePayload)
      });

      const res = await handleSendWhatsAppRequest(req, { env: mockEnv, fetchFn: mockFetch });
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.success, true);
      assert.strictEqual(data.status, 'Sent');
      assert.strictEqual(data.messageId, 'wamid.HBgMOTE5ODQwMDEyMzQ1FQIAERgSRTc1NDc5RTA2NUMwRDAxOAA=');

      // Verify payload sent to Meta
      assert.strictEqual(metaRequestPayload.messaging_product, 'whatsapp');
      assert.strictEqual(metaRequestPayload.to, '919840012345');
      assert.strictEqual(metaRequestPayload.type, 'template');
      assert.strictEqual(metaRequestPayload.template.name, 'prcbo_lead_outreach');
      assert.strictEqual(metaRequestPayload.template.language.code, 'en_US');
      assert.strictEqual(metaRequestPayload.template.components[0].parameters.length, 3);
      assert.strictEqual(metaRequestPayload.template.components[0].parameters[0].text, 'Ramesh Kumar');

      // Verify Bearer token was passed in Authorization header to Meta
      assert.strictEqual(metaRequestHeaders['Authorization'], `Bearer ${mockEnv.WHATSAPP_ACCESS_TOKEN}`);

      // Verify status logged in DB is strictly 'Sent' (NEVER 'Delivered' upon send!)
      assert.strictEqual(outreachLogRecord.status, 'Sent');
      assert.strictEqual(outreachLogRecord.channel, 'WhatsApp');
      assert.strictEqual(outreachLogRecord.recipient_phone, '919840012345');
      assert.strictEqual(outreachLogRecord.provider_name, 'whatsapp');
      assert.ok(leadUpdated);
    });

    test('Zero-parameter template dispatch (e.g. hello_world) completely omits components from Meta payload', async () => {
      let metaRequestPayload = null;
      let metaRequestHeaders = null;
      let outreachLogRecord = null;
      let leadUpdated = false;

      const mockFetch = async (url, init) => {
        const urlStr = String(url);

        if (urlStr.includes('/rest/v1/outreach_logs')) {
          if (init.method === 'POST') {
            outreachLogRecord = JSON.parse(init.body);
            return new Response(JSON.stringify([{ id: 'log-uuid-hello-001', ...outreachLogRecord }]), { status: 201 });
          }
          if (init.method === 'PATCH') {
            const patchBody = JSON.parse(init.body);
            outreachLogRecord = { ...outreachLogRecord, ...patchBody };
            return new Response(JSON.stringify([{ id: 'log-uuid-hello-001', ...outreachLogRecord }]), { status: 200 });
          }
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (urlStr.includes('/rest/v1/leads')) {
          leadUpdated = true;
          return new Response(JSON.stringify([{ id: 'lead-001', status: 'Contacted' }]), { status: 200 });
        }

        if (urlStr.includes('graph.facebook.com')) {
          metaRequestHeaders = init.headers;
          metaRequestPayload = JSON.parse(init.body);
          return new Response(JSON.stringify({
            messaging_product: 'whatsapp',
            contacts: [{ input: '919840012345', wa_id: '919840012345' }],
            messages: [{ id: 'wamid.HBgMOTE5ODQwMDEyMzQ1FQIAERgSRTc1NDc5RTA2NUMwRDAxOAA=' }]
          }), { status: 200 });
        }

        return new Response('Not found', { status: 404 });
      };

      const helloWorldPayload = {
        leadId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        to: '+91 98400 12345',
        templateName: 'hello_world',
        languageCode: 'en_US',
        templateParameters: [],
        idempotencyKey: 'test-wa-hello-001'
      };

      const req = new Request('http://localhost/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validOperatorToken
        },
        body: JSON.stringify(helloWorldPayload)
      });

      const res = await handleSendWhatsAppRequest(req, { env: mockEnv, fetchFn: mockFetch });
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.success, true);
      assert.strictEqual(data.status, 'Sent');

      // Verify payload sent to Meta has NO components property
      assert.strictEqual(metaRequestPayload.messaging_product, 'whatsapp');
      assert.strictEqual(metaRequestPayload.to, '919840012345');
      assert.strictEqual(metaRequestPayload.type, 'template');
      assert.strictEqual(metaRequestPayload.template.name, 'hello_world');
      assert.strictEqual(metaRequestPayload.template.language.code, 'en_US');
      assert.strictEqual('components' in metaRequestPayload.template, false);

      // Verify DB outreach log has template: 'hello_world' and message_content without empty params
      assert.strictEqual(outreachLogRecord.status, 'Sent');
      assert.strictEqual(outreachLogRecord.template, 'hello_world');
      assert.strictEqual(outreachLogRecord.message_content, 'Template: hello_world');
      assert.ok(leadUpdated);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 5b. WhatsApp Deduplication, Idempotency & Double-Send Prevention           */
  /* -------------------------------------------------------------------------- */
  describe('5b. Deduplication, Idempotency & Double-Send Prevention', () => {
    test('Exact idempotency key match returns existing provider message ID without calling Meta Graph API', async () => {
      let metaApiCalled = false;
      const existingKey = 'idemp-exact-replay-001';
      const existingProviderId = 'wamid.HBgMOTE5ODQwMDEyMzQ1FQIAERgSRTc1NDc5RTAy';

      const mockFetch = async (url, init) => {
        const urlStr = String(url);
        if (urlStr.includes('/rest/v1/outreach_logs')) {
          if (urlStr.includes(`idempotency_key=eq.${encodeURIComponent(existingKey)}`)) {
            return new Response(JSON.stringify([{
              id: 'log-uuid-replay-001',
              lead_id: validTemplatePayload.leadId,
              channel: 'WhatsApp',
              provider_message_id: existingProviderId,
              status: 'Sent',
              recipient_phone: '919840012345'
            }]), { status: 200 });
          }
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (urlStr.includes('graph.facebook.com')) {
          metaApiCalled = true;
          return new Response(JSON.stringify({ messages: [{ id: 'wamid.new' }] }), { status: 200 });
        }
        return new Response('Not found', { status: 404 });
      };

      const req = new Request('http://localhost/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validOperatorToken
        },
        body: JSON.stringify({
          ...validTemplatePayload,
          idempotencyKey: existingKey
        })
      });

      const res = await handleSendWhatsAppRequest(req, { env: mockEnv, fetchFn: mockFetch });
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.success, true);
      assert.strictEqual(data.isIdempotentReplay, true);
      assert.strictEqual(data.messageId, existingProviderId);
      assert.strictEqual(metaApiCalled, false, 'Meta API must NOT be called for an idempotent replay');
    });

    test('Sequential duplicate request with identical idempotency key makes zero additional Meta API calls', async () => {
      let metaApiCallCount = 0;
      const testKey = 'seq-idemp-key-repeat-test';
      const fakeProviderId = 'wamid.HBgMOTE5ODQwMDEyMzQ1FQIAERgSRTc1NDc5U0VRIQ==';
      const logsDb = [];

      const statefulMockFetch = async (url, init) => {
        const urlStr = String(url);
        if (urlStr.includes('/rest/v1/outreach_logs')) {
          if (init?.method === 'POST') {
            const body = JSON.parse(init.body);
            const newRow = { id: `log-${Date.now()}-${Math.random()}`, created_at: new Date().toISOString(), ...body };
            logsDb.push(newRow);
            return new Response(JSON.stringify([newRow]), { status: 201 });
          }
          if (init?.method === 'PATCH') {
            const body = JSON.parse(init.body);
            if (logsDb.length > 0) {
              Object.assign(logsDb[logsDb.length - 1], body);
              return new Response(JSON.stringify([logsDb[logsDb.length - 1]]), { status: 200 });
            }
          }
          if (urlStr.includes('idempotency_key=eq.')) {
            const match = logsDb.filter(r => r.idempotency_key === testKey);
            return new Response(JSON.stringify(match), { status: 200 });
          }
          if (urlStr.includes('channel=eq.WhatsApp') && urlStr.includes('created_at=gte.')) {
            const match = logsDb.filter(r => r.channel === 'WhatsApp' && ['Sent', 'Dispatched', 'Delivered', 'Read'].includes(r.status));
            return new Response(JSON.stringify(match), { status: 200 });
          }
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (urlStr.includes('/rest/v1/leads')) {
          return new Response(JSON.stringify([{ id: validTemplatePayload.leadId, status: 'Contacted' }]), { status: 200 });
        }
        if (urlStr.includes('graph.facebook.com')) {
          metaApiCallCount++;
          return new Response(JSON.stringify({
            messaging_product: 'whatsapp',
            messages: [{ id: fakeProviderId }]
          }), { status: 200 });
        }
        return new Response('Not found', { status: 404 });
      };

      const makeReq = () => new Request('http://localhost/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validOperatorToken
        },
        body: JSON.stringify({
          ...validTemplatePayload,
          idempotencyKey: testKey
        })
      });

      // Request 1: Initial dispatch
      const res1 = await handleSendWhatsAppRequest(makeReq(), { env: mockEnv, fetchFn: statefulMockFetch });
      assert.strictEqual(res1.status, 200);
      const data1 = await res1.json();
      assert.strictEqual(data1.success, true);
      assert.strictEqual(data1.messageId, fakeProviderId);
      assert.strictEqual(metaApiCallCount, 1, 'Initial request must call Meta API once');

      // Request 2: Repeated identical request with identical idempotency key
      const res2 = await handleSendWhatsAppRequest(makeReq(), { env: mockEnv, fetchFn: statefulMockFetch });
      assert.strictEqual(res2.status, 200);
      const data2 = await res2.json();
      assert.strictEqual(data2.success, true);
      assert.strictEqual(data2.isIdempotentReplay, true, 'Second request must be recognized as idempotent replay');
      assert.strictEqual(data2.messageId, fakeProviderId, 'Second request must return existing provider message ID');
      assert.strictEqual(metaApiCallCount, 1, 'Repeated request must make ZERO additional Meta API calls (total remains 1)');
    });

    test('Recent outreach within 120s window suppresses duplicate send without calling Meta Graph API', async () => {
      let metaApiCalled = false;
      const recentProviderId = 'wamid.HBgMOTE5ODQwMDEyMzQ1FQIAERgSRTc1NDc5UkVDRU5U';

      const mockFetch = async (url, init) => {
        const urlStr = String(url);
        if (urlStr.includes('/rest/v1/outreach_logs')) {
          // Idempotency query returns empty (e.g. different key or rapid re-click)
          if (urlStr.includes('idempotency_key=eq.')) {
            return new Response(JSON.stringify([]), { status: 200 });
          }
          // Duplicate check query (channel=eq.WhatsApp&status=in.(Sent,Dispatched,Delivered,Read)) returns recent send
          if (urlStr.includes('channel=eq.WhatsApp') && urlStr.includes('created_at=gte.')) {
            return new Response(JSON.stringify([{
              id: 'log-uuid-recent-001',
              lead_id: validTemplatePayload.leadId,
              recipient_phone: '919840012345',
              provider_message_id: recentProviderId,
              status: 'Sent',
              created_at: new Date(Date.now() - 30 * 1000).toISOString() // 30s ago
            }]), { status: 200 });
          }
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (urlStr.includes('graph.facebook.com')) {
          metaApiCalled = true;
          return new Response(JSON.stringify({ messages: [{ id: 'wamid.new' }] }), { status: 200 });
        }
        return new Response('Not found', { status: 404 });
      };

      const req = new Request('http://localhost/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validOperatorToken
        },
        body: JSON.stringify({
          ...validTemplatePayload,
          idempotencyKey: 'new-key-after-double-click'
        })
      });

      const res = await handleSendWhatsAppRequest(req, { env: mockEnv, fetchFn: mockFetch });
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.success, true);
      assert.strictEqual(data.isDuplicateSuppressed, true);
      assert.strictEqual(data.messageId, recentProviderId);
      assert.ok(data.message.includes('Duplicate send suppressed'));
      assert.strictEqual(metaApiCalled, false, 'Meta API must NOT be called when duplicate send is suppressed');
    });

    test('Legitimate later outreach (> 120s later) is NOT suppressed and dispatches to Meta Graph API', async () => {
      let metaApiCalled = false;
      let insertedLogRecord = null;
      const newProviderId = 'wamid.HBgMOTE5ODQwMDEyMzQ1FQIAERgSRTc1NDc5TEFURVI=';

      const mockFetch = async (url, init) => {
        const urlStr = String(url);
        if (urlStr.includes('/rest/v1/outreach_logs')) {
          if (init.method === 'POST') {
            insertedLogRecord = JSON.parse(init.body);
            return new Response(JSON.stringify([{ id: 'log-uuid-later-001', ...insertedLogRecord }]), { status: 201 });
          }
          if (init.method === 'PATCH') {
            const patchBody = JSON.parse(init.body);
            insertedLogRecord = { ...insertedLogRecord, ...patchBody };
            return new Response(JSON.stringify([{ id: 'log-uuid-later-001', ...insertedLogRecord }]), { status: 200 });
          }
          // Idempotency check: no match
          if (urlStr.includes('idempotency_key=eq.')) {
            return new Response(JSON.stringify([]), { status: 200 });
          }
          // Duplicate check: since earlier send was > 120s ago, the created_at=gte.<threshold> filter returns empty!
          if (urlStr.includes('channel=eq.WhatsApp') && urlStr.includes('created_at=gte.')) {
            return new Response(JSON.stringify([]), { status: 200 });
          }
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (urlStr.includes('/rest/v1/leads')) {
          return new Response(JSON.stringify([{ id: validTemplatePayload.leadId, status: 'Contacted' }]), { status: 200 });
        }
        if (urlStr.includes('graph.facebook.com')) {
          metaApiCalled = true;
          return new Response(JSON.stringify({
            messaging_product: 'whatsapp',
            contacts: [{ input: '919840012345', wa_id: '919840012345' }],
            messages: [{ id: newProviderId }]
          }), { status: 200 });
        }
        return new Response('Not found', { status: 404 });
      };

      const req = new Request('http://localhost/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validOperatorToken
        },
        body: JSON.stringify({
          ...validTemplatePayload,
          idempotencyKey: 'legitimate-future-outreach-key-002'
        })
      });

      const res = await handleSendWhatsAppRequest(req, { env: mockEnv, fetchFn: mockFetch });
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.success, true);
      assert.strictEqual(data.isDuplicateSuppressed, undefined);
      assert.strictEqual(data.messageId, newProviderId);
      assert.strictEqual(metaApiCalled, true, 'Meta API MUST be called for legitimate later outreach');
      assert.strictEqual(insertedLogRecord.status, 'Sent');
    });

    test('Retry after a Failed outreach is NOT blocked by deduplication check', async () => {
      let metaApiCalled = false;
      const retryProviderId = 'wamid.HBgMOTE5ODQwMDEyMzQ1FQIAERgSRTc1NDc5UkVUUlk=';

      const mockFetch = async (url, init) => {
        const urlStr = String(url);
        if (urlStr.includes('/rest/v1/outreach_logs')) {
          if (init.method === 'POST') {
            return new Response(JSON.stringify([{ id: 'log-uuid-retry-001' }]), { status: 201 });
          }
          // Idempotency check: previous key failed so it is not in Sent/Dispatched/Delivered/Read/Completed
          if (urlStr.includes('idempotency_key=eq.')) {
            return new Response(JSON.stringify([]), { status: 200 });
          }
          // Duplicate check filters status=in.(Sent,Dispatched,Delivered,Read) - Failed record does not match
          if (urlStr.includes('channel=eq.WhatsApp') && urlStr.includes('created_at=gte.')) {
            return new Response(JSON.stringify([]), { status: 200 });
          }
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (urlStr.includes('/rest/v1/leads')) {
          return new Response(JSON.stringify([{ id: validTemplatePayload.leadId, status: 'Contacted' }]), { status: 200 });
        }
        if (urlStr.includes('graph.facebook.com')) {
          metaApiCalled = true;
          return new Response(JSON.stringify({
            messaging_product: 'whatsapp',
            messages: [{ id: retryProviderId }]
          }), { status: 200 });
        }
        return new Response('Not found', { status: 404 });
      };

      const req = new Request('http://localhost/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validOperatorToken
        },
        body: JSON.stringify({
          ...validTemplatePayload,
          idempotencyKey: 'retry-after-failed-outreach'
        })
      });

      const res = await handleSendWhatsAppRequest(req, { env: mockEnv, fetchFn: mockFetch });
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.success, true);
      assert.strictEqual(metaApiCalled, true, 'Meta API MUST be called when retrying after a failed outreach');
      assert.strictEqual(data.messageId, retryProviderId);
    });

    test('Distributed atomic reservation conflict (409 Conflict) suppresses duplicate send before Meta is called', async () => {
      let metaApiCalled = false;

      const mockFetch = async (url, init) => {
        const urlStr = String(url);
        if (urlStr.includes('/rest/v1/outreach_logs')) {
          // Idempotency query returns empty (e.g. concurrent race)
          if (urlStr.includes('idempotency_key=eq.')) {
            return new Response(JSON.stringify([]), { status: 200 });
          }
          // Duplicate check query returns empty
          if (urlStr.includes('created_at=gte.')) {
            return new Response(JSON.stringify([]), { status: 200 });
          }
          // POST /rest/v1/outreach_logs hits unique constraint idx_outreach_logs_idempotency_key
          if (init.method === 'POST') {
            return new Response(JSON.stringify({
              code: '23505',
              message: 'duplicate key value violates unique constraint "idx_outreach_logs_idempotency_key"'
            }), { status: 409 });
          }
        }
        if (urlStr.includes('graph.facebook.com')) {
          metaApiCalled = true;
          return new Response(JSON.stringify({ messages: [{ id: 'wamid.should.never.send' }] }), { status: 200 });
        }
        return new Response('Not found', { status: 404 });
      };

      const req = new Request('http://localhost/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validOperatorToken
        },
        body: JSON.stringify({
          ...validTemplatePayload,
          idempotencyKey: 'concurrent-409-conflict-key'
        })
      });

      const res = await handleSendWhatsAppRequest(req, { env: mockEnv, fetchFn: mockFetch });
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.success, true);
      assert.strictEqual(data.status, 'Pending');
      assert.strictEqual(data.isDuplicateSuppressed, true);
      assert.strictEqual(metaApiCalled, false, 'Meta API MUST NOT be called when reservation hits a 409 conflict');
    });

    test('Ambiguous network timeout (ETIMEDOUT) marks reservation Pending and returns 504 for reconciliation', async () => {
      let patchedReservation = null;

      const mockFetch = async (url, init) => {
        const urlStr = String(url);
        if (urlStr.includes('/rest/v1/outreach_logs')) {
          if (urlStr.includes('idempotency_key=eq.')) {
            return new Response(JSON.stringify([]), { status: 200 });
          }
          if (init.method === 'POST') {
            return new Response(JSON.stringify([{ id: 'log-uuid-pending-timeout', status: 'Pending' }]), { status: 201 });
          }
          if (init.method === 'PATCH') {
            patchedReservation = JSON.parse(init.body);
            return new Response(JSON.stringify([{ id: 'log-uuid-pending-timeout', ...patchedReservation }]), { status: 200 });
          }
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (urlStr.includes('graph.facebook.com')) {
          // Simulate an ambiguous network socket timeout
          throw new Error('connect ETIMEDOUT 157.240.22.53:443');
        }
        return new Response('Not found', { status: 404 });
      };

      const req = new Request('http://localhost/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validOperatorToken
        },
        body: JSON.stringify({
          ...validTemplatePayload,
          idempotencyKey: 'timeout-test-key-001'
        })
      });

      const res = await handleSendWhatsAppRequest(req, { env: mockEnv, fetchFn: mockFetch });
      assert.strictEqual(res.status, 504);
      const data = await res.json();

      assert.strictEqual(data.isAmbiguousTimeout, true);
      assert.strictEqual(data.reconciliationRequired, true);
      assert.strictEqual(data.status, 'Pending');
      assert.ok(data.details.includes('timeout occurred'));

      // Check DB reservation was kept as Pending with reconciliationRequired metadata
      assert.strictEqual(patchedReservation.status, 'Pending');
      assert.strictEqual(patchedReservation.metadata.reconciliationRequired, true);
      assert.strictEqual(patchedReservation.metadata.ambiguousTimeout, true);
    });

    test('Concurrent in-flight dispatches for the same lead and phone are intercepted and blocked', async () => {
      let metaApiCallCount = 0;
      const leadId = 'test-concurrent-lead-001';
      const to = '+91 98400 99887';

      // Simulate a slow Meta API call (50ms)
      const mockFetch = async (url, init) => {
        const urlStr = String(url);
        if (urlStr.includes('/rest/v1/outreach_logs')) {
          if (init.method === 'POST') {
            return new Response(JSON.stringify([{ id: 'log-uuid-concurrent' }]), { status: 201 });
          }
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (urlStr.includes('/rest/v1/leads')) {
          return new Response(JSON.stringify([{ id: leadId }]), { status: 200 });
        }
        if (urlStr.includes('graph.facebook.com')) {
          metaApiCallCount++;
          await new Promise(resolve => setTimeout(resolve, 50));
          return new Response(JSON.stringify({
            messaging_product: 'whatsapp',
            messages: [{ id: 'wamid.concurrent.first' }]
          }), { status: 200 });
        }
        return new Response('Not found', { status: 404 });
      };

      const createReq = () => new Request('http://localhost/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validOperatorToken
        },
        body: JSON.stringify({
          leadId,
          to,
          templateName: 'hello_world',
          idempotencyKey: 'concurrent-test-key'
        })
      });

      // Dispatch two requests concurrently
      const [res1, res2] = await Promise.all([
        handleSendWhatsAppRequest(createReq(), { env: mockEnv, fetchFn: mockFetch }),
        handleSendWhatsAppRequest(createReq(), { env: mockEnv, fetchFn: mockFetch })
      ]);

      const [data1, data2] = await Promise.all([res1.json(), res2.json()]);

      // Exactly ONE request must reach Meta Graph API
      assert.strictEqual(metaApiCallCount, 1, 'Meta API should only be called once when two concurrent requests collide');

      // One request succeeds normally, the other is suppressed as in-flight duplicate
      const suppressedCount = [data1, data2].filter(d => d.isDuplicateSuppressed).length;
      assert.strictEqual(suppressedCount, 1, 'One of the concurrent requests must have isDuplicateSuppressed: true');
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 6. Meta Webhook Handshake (GET Verification)                              */
  /* -------------------------------------------------------------------------- */
  describe('6. Meta Webhook Handshake Verification (GET)', () => {
    test('Valid subscription challenge returns status 200 with hub.challenge body', async () => {
      const challengeToken = '1158201444';
      const url = `http://localhost/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=${mockEnv.WHATSAPP_VERIFY_TOKEN}&hub.challenge=${challengeToken}`;
      const req = new Request(url, { method: 'GET' });

      const res = await handleWhatsAppWebhookRequest(req, { env: mockEnv });
      assert.strictEqual(res.status, 200);
      const text = await res.text();
      assert.strictEqual(text, challengeToken);
    });

    test('Incorrect verify_token returns status 403 Forbidden', async () => {
      const url = `http://localhost/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=1158201444`;
      const req = new Request(url, { method: 'GET' });

      const res = await handleWhatsAppWebhookRequest(req, { env: mockEnv });
      assert.strictEqual(res.status, 403);
      const text = await res.text();
      assert.ok(text.includes('Forbidden'));
    });

    test('Missing hub.mode or token returns status 403', async () => {
      const url = `http://localhost/whatsapp-webhook?hub.challenge=1158201444`;
      const req = new Request(url, { method: 'GET' });

      const res = await handleWhatsAppWebhookRequest(req, { env: mockEnv });
      assert.strictEqual(res.status, 403);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 7. Meta Webhook Signature Verification (POST)                             */
  /* -------------------------------------------------------------------------- */
  describe('7. Meta Webhook Cryptographic Signature Verification (POST)', () => {
    const samplePayload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [{
        id: '109876543210987',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            statuses: [{
              id: 'wamid.test_001',
              status: 'delivered',
              timestamp: '1729278000',
              recipient_id: '919840012345'
            }]
          },
          field: 'messages'
        }]
      }]
    });

    test('Valid X-Hub-Signature-256 header returns isValid: true', async () => {
      const signatureHeader = computeMetaSignatureHeader(mockEnv.WHATSAPP_APP_SECRET, samplePayload);
      const result = await verifyMetaWebhookSignature({
        appSecret: mockEnv.WHATSAPP_APP_SECRET,
        signatureHeader,
        rawBody: samplePayload
      });
      assert.strictEqual(result.isValid, true);
    });

    test('Tampered body causes signature mismatch and returns isValid: false', async () => {
      const signatureHeader = computeMetaSignatureHeader(mockEnv.WHATSAPP_APP_SECRET, samplePayload);
      const result = await verifyMetaWebhookSignature({
        appSecret: mockEnv.WHATSAPP_APP_SECRET,
        signatureHeader,
        rawBody: samplePayload + ' ' // tampered
      });
      assert.strictEqual(result.isValid, false);
      assert.ok(result.error.includes('hash mismatch'));
    });

    test('Missing signature header is rejected with isValid: false', async () => {
      const result = await verifyMetaWebhookSignature({
        appSecret: mockEnv.WHATSAPP_APP_SECRET,
        signatureHeader: null,
        rawBody: samplePayload
      });
      assert.strictEqual(result.isValid, false);
      assert.ok(result.error.includes('Missing required X-Hub-Signature-256 header'));
    });

    test('Timing safe comparison prevents side-channel timing attacks', () => {
      assert.strictEqual(timingSafeCompare('abcdef', 'abcdef'), true);
      assert.strictEqual(timingSafeCompare('abcdef', 'abcdeg'), false);
      assert.strictEqual(timingSafeCompare('abcdef', 'abc'), false);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 8. Monotonic Status Transitions & Out-of-Order/Duplicate Events            */
  /* -------------------------------------------------------------------------- */
  describe('8. Monotonic WhatsApp Status Progression Engine', () => {
    test('Standard progression: Logged -> sent -> Delivered -> Read', () => {
      const step1 = calculateWhatsAppStatusTransition('Logged', 'sent');
      assert.strictEqual(step1.targetStatus, 'Sent');
      assert.strictEqual(step1.isDuplicate, false);
      assert.strictEqual(step1.shouldRegress, false);

      const step2 = calculateWhatsAppStatusTransition('Sent', 'delivered');
      assert.strictEqual(step2.targetStatus, 'Delivered');
      assert.strictEqual(step2.isDuplicate, false);
      assert.strictEqual(step2.shouldRegress, false);

      const step3 = calculateWhatsAppStatusTransition('Delivered', 'read');
      assert.strictEqual(step3.targetStatus, 'Read');
      assert.strictEqual(step3.isDuplicate, false);
      assert.strictEqual(step3.shouldRegress, false);
    });

    test('Duplicate delivered event is recognized as duplicate', () => {
      const res = calculateWhatsAppStatusTransition('Delivered', 'delivered');
      assert.strictEqual(res.targetStatus, 'Delivered');
      assert.strictEqual(res.isDuplicate, true);
      assert.strictEqual(res.shouldRegress, false);
    });

    test('Out-of-order events: late sent after delivered does not downgrade delivered status', () => {
      const res = calculateWhatsAppStatusTransition('Delivered', 'sent');
      assert.strictEqual(res.targetStatus, 'Delivered');
      assert.strictEqual(res.shouldRegress, true);
    });

    test('Out-of-order events: late delivered after read does not downgrade read status', () => {
      const res = calculateWhatsAppStatusTransition('Read', 'delivered');
      assert.strictEqual(res.targetStatus, 'Read');
      assert.strictEqual(res.shouldRegress, true);
    });

    test('Failed status transitions cleanly', () => {
      const res = calculateWhatsAppStatusTransition('Sent', 'failed');
      assert.strictEqual(res.targetStatus, 'Failed');
      assert.strictEqual(res.isDuplicate, false);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 9. End-to-End Webhook Event Processing                                    */
  /* -------------------------------------------------------------------------- */
  describe('9. Webhook Event Matching & Database Updates', () => {
    test('Processes "read" event: updates status to Read and sets read_at timestamp', async () => {
      const sampleWamid = 'wamid.HBgMOTE5ODQwMDEyMzQ1FQIAERgSRTc1NDc5RTA2NUMwRDAxOAA=';
      let dbUpdated = null;

      const mockFetch = async (url, init) => {
        const urlStr = String(url);
        // Supabase lookup for matching provider_message_id
        if (urlStr.includes('/rest/v1/outreach_logs') && urlStr.includes('select=')) {
          return new Response(JSON.stringify([{
            id: 'log-001',
            status: 'Delivered',
            delivered_at: '2026-10-18T20:30:00Z',
            read_at: null,
            metadata: { events: [{ type: 'delivered' }] }
          }]), { status: 200 });
        }
        // Supabase PATCH update
        if (urlStr.includes('/rest/v1/outreach_logs') && init.method === 'PATCH') {
          dbUpdated = JSON.parse(init.body);
          return new Response(JSON.stringify([{ id: 'log-001', ...dbUpdated }]), { status: 200 });
        }
        return new Response('Not found', { status: 404 });
      };

      const webhookBody = JSON.stringify({
        object: 'whatsapp_business_account',
        entry: [{
          id: '109876543210987',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              statuses: [{
                id: sampleWamid,
                status: 'read',
                timestamp: '1729278100',
                recipient_id: '919840012345'
              }]
            },
            field: 'messages'
          }]
        }]
      });

      const signature = computeMetaSignatureHeader(mockEnv.WHATSAPP_APP_SECRET, webhookBody);
      const req = new Request('http://localhost/whatsapp-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': signature
        },
        body: webhookBody
      });

      const res = await handleWhatsAppWebhookRequest(req, { env: mockEnv, fetchFn: mockFetch });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.processed, 1);

      assert.strictEqual(dbUpdated.status, 'Read');
      assert.ok(dbUpdated.read_at);
      assert.strictEqual(dbUpdated.metadata.openStatus, 'Read by recipient (Blue ticks)');
      assert.strictEqual(dbUpdated.metadata.events.length, 2);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 10. Frontend Data Mapping & Service Methods                               */
  /* -------------------------------------------------------------------------- */
  describe('10. Frontend Lead Service & DB Row Mapping', () => {
    test('mapDbRowToFrontendOutreachLog correctly maps WhatsApp fields, recipientPhone, and readAt', () => {
      const dbRow = {
        id: 'log-uuid-wa-001',
        lead_id: 'lead-uuid-001',
        channel: 'WhatsApp',
        template: 'prcbo_lead_outreach',
        message_content: 'Template: prcbo_lead_outreach',
        status: 'Read',
        recipient_phone: '919840012345',
        recipient_email: null,
        provider_message_id: 'wamid.HBgMOTE5ODQwMDEyMzQ1FQIA',
        provider_name: 'whatsapp',
        sent_at: '2026-10-18T20:00:00Z',
        delivered_at: '2026-10-18T20:01:00Z',
        read_at: '2026-10-18T20:02:00Z',
        created_at: '2026-10-18T20:00:00Z',
        metadata: {
          businessName: 'Madurai Textiles',
          contactPerson: 'Ramesh Kumar',
          service: 'Cloud ERP'
        }
      };

      const mapped = mapDbRowToFrontendOutreachLog(dbRow);
      assert.strictEqual(mapped.id, 'log-uuid-wa-001');
      assert.strictEqual(mapped.channel, 'WhatsApp');
      assert.strictEqual(mapped.status, 'Read');
      assert.strictEqual(mapped.recipientPhone, '919840012345');
      assert.strictEqual(mapped.providerName, 'whatsapp');
      assert.strictEqual(mapped.openStatus, 'Read by recipient (Blue ticks)');
      assert.ok(mapped.readAt);
      assert.ok(mapped.deliveredAt);
    });

    test('sendWhatsAppOutreachViaEdgeFunction validates input before dispatch', async () => {
      const resNoLead = await sendWhatsAppOutreachViaEdgeFunction({ to: '919840012345', templateName: 'test' });
      assert.ok(resNoLead.error.message.includes('leadId is required'));

      const resNoTo = await sendWhatsAppOutreachViaEdgeFunction({ leadId: 'lead-001', to: '' });
      assert.ok(resNoTo.error.message.includes('recipient phone number is required'));

      const resNoTemplateOrMsg = await sendWhatsAppOutreachViaEdgeFunction({ leadId: 'lead-001', to: '9840012345' });
      assert.ok(resNoTemplateOrMsg.error.message.includes('Either a templateName or message text is required'));
    });
  });
});
