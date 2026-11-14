import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  handleSendEmailRequest,
  extractJwtPayload,
  verifyOperatorClaims
} from '../../../supabase/functions/send-email/index.ts';
import {
  mapDbRowToFrontendOutreachLog,
  sendEmailOutreachViaEdgeFunction
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

describe('Supabase Edge Function: send-email (Phase 1 Real Email Delivery via Resend)', () => {
  const validPayload = {
    leadId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    to: 'founder@maduraiapex.com',
    subject: 'PRCBO Tech - Digital Modernization Proposal',
    body: 'Dear Founder, We noticed great growth opportunities for your digital platform.',
    template: 'Digital Modernization Pitch',
    idempotencyKey: 'test-idemp-001'
  };

  describe('1. CORS & Preflight Handling', () => {
    test('OPTIONS request returns status 200 with CORS headers', async () => {
      const req = new Request('http://localhost/send-email', { method: 'OPTIONS' });
      const res = await handleSendEmailRequest(req);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), '*');
      assert.ok(res.headers.get('Access-Control-Allow-Methods').includes('POST'));
    });
  });

  describe('2. Operator Authentication & Authorization Enforcement', () => {
    test('Missing Authorization header is rejected with HTTP 401', async () => {
      const req = new Request('http://localhost/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload)
      });
      const res = await handleSendEmailRequest(req);
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.ok(data.error.includes('Authentication required'));
    });

    test('Non-operator token is rejected with HTTP 403', async () => {
      const req = new Request('http://localhost/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: unauthorizedUserToken
        },
        body: JSON.stringify(validPayload)
      });
      const res = await handleSendEmailRequest(req);
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.ok(data.error.includes('approved PRCBO operator'));
    });

    test('Expired operator token is rejected with HTTP 403', async () => {
      const req = new Request('http://localhost/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: expiredOperatorToken
        },
        body: JSON.stringify(validPayload)
      });
      const res = await handleSendEmailRequest(req);
      assert.strictEqual(res.status, 403);
    });

    test('verifyOperatorClaims recognizes admin and prcbo_operator roles', () => {
      assert.strictEqual(
        verifyOperatorClaims({ app_metadata: { role: 'admin' } }).isAuthorized,
        true
      );
      assert.strictEqual(
        verifyOperatorClaims({ app_metadata: { role: 'prcbo_operator' } }).isAuthorized,
        true
      );
      assert.strictEqual(
        verifyOperatorClaims({ app_metadata: { role: 'guest' } }).isAuthorized,
        false
      );
    });
  });

  describe('3. Server-Side Payload Validation', () => {
    test('Missing leadId returns HTTP 400', async () => {
      const req = new Request('http://localhost/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validOperatorToken
        },
        body: JSON.stringify({ ...validPayload, leadId: '' })
      });
      const res = await handleSendEmailRequest(req);
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('leadId'));
    });

    test('Invalid recipient email address returns HTTP 400', async () => {
      const req = new Request('http://localhost/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validOperatorToken
        },
        body: JSON.stringify({ ...validPayload, to: 'not-an-email' })
      });
      const res = await handleSendEmailRequest(req);
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('recipient email address'));
    });

    test('Empty subject line returns HTTP 400', async () => {
      const req = new Request('http://localhost/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validOperatorToken
        },
        body: JSON.stringify({ ...validPayload, subject: '   ' })
      });
      const res = await handleSendEmailRequest(req);
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('subject'));
    });

    test('Empty email body returns HTTP 400', async () => {
      const req = new Request('http://localhost/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validOperatorToken
        },
        body: JSON.stringify({ ...validPayload, body: '' })
      });
      const res = await handleSendEmailRequest(req);
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('body'));
    });
  });

  describe('4. Missing Secrets & Error Diagnostics', () => {
    test('Missing RESEND_API_KEY returns HTTP 500 without leaking secrets', async () => {
      const req = new Request('http://localhost/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validOperatorToken
        },
        body: JSON.stringify(validPayload)
      });

      const res = await handleSendEmailRequest(req, {
        env: {
          RESEND_API_KEY: '',
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'test-key'
        }
      });
      assert.strictEqual(res.status, 500);
      const data = await res.json();
      assert.ok(data.error.includes('RESEND_API_KEY is missing'));
    });
  });

  describe('5. Resend Provider Failure Handling', () => {
    test('Resend non-2xx error returns HTTP 502 with sanitized error details', async () => {
      const req = new Request('http://localhost/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validOperatorToken
        },
        body: JSON.stringify(validPayload)
      });

      const mockFetch = async (url, opts) => {
        const urlStr = String(url);
        // Idempotency check returns empty
        if (urlStr.includes('/rest/v1/outreach_logs')) {
          return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        // Resend API returns failure
        if (urlStr.includes('api.resend.com')) {
          return new Response(
            JSON.stringify({
              statusCode: 422,
              name: 'validation_error',
              message: 'The domain does not have MX records configured.'
            }),
            { status: 422, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('ok', { status: 200 });
      };

      const res = await handleSendEmailRequest(req, {
        env: {
          RESEND_API_KEY: 're_test_dummy_key',
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'test-key'
        },
        fetchFn: mockFetch
      });

      assert.strictEqual(res.status, 502);
      const data = await res.json();
      assert.strictEqual(data.status, 'Failed');
      assert.ok(data.details.includes('MX records'));
    });
  });

  describe('6. Idempotency Strategy (Double-Send Prevention)', () => {
    test('Idempotency replay returns existing message ID without calling Resend API again', async () => {
      const req = new Request('http://localhost/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validOperatorToken
        },
        body: JSON.stringify(validPayload)
      });

      let resendCalled = false;
      const mockFetch = async (url, opts) => {
        const urlStr = String(url);
        if (urlStr.includes('/rest/v1/outreach_logs')) {
          // Return existing record with same idempotency key
          return new Response(
            JSON.stringify([
              {
                id: 'log-existing-123',
                provider_message_id: 're_msg_existing_999',
                status: 'Sent',
                idempotency_key: 'test-idemp-001'
              }
            ]),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (urlStr.includes('api.resend.com')) {
          resendCalled = true;
          return new Response(JSON.stringify({ id: 're_msg_new' }), { status: 200 });
        }
        return new Response('ok', { status: 200 });
      };

      const res = await handleSendEmailRequest(req, {
        env: {
          RESEND_API_KEY: 're_test_key',
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'test-key'
        },
        fetchFn: mockFetch
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(resendCalled, false); // Resend was NOT called twice
      const data = await res.json();
      assert.strictEqual(data.isIdempotentReplay, true);
      assert.strictEqual(data.messageId, 're_msg_existing_999');
      assert.strictEqual(data.status, 'Sent');
    });
  });

  describe('7. Successful Dispatch & Database Status Discipline', () => {
    test('Successful Resend dispatch sets status Sent (never Delivered), records log, and updates lead to Contacted', async () => {
      const req = new Request('http://localhost/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validOperatorToken
        },
        body: JSON.stringify(validPayload)
      });

      let resendHeaders = {};
      let loggedStatus = null;
      let updatedLeadStatus = null;

      const mockFetch = async (url, opts) => {
        const urlStr = String(url);
        // Idempotency check: not found
        if (urlStr.includes('/rest/v1/outreach_logs') && opts?.method !== 'POST') {
          return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        // Resend API call
        if (urlStr.includes('api.resend.com')) {
          resendHeaders = opts?.headers || {};
          return new Response(
            JSON.stringify({ id: 're_msg_accepted_456' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        // DB log insertion
        if (urlStr.includes('/rest/v1/outreach_logs') && opts?.method === 'POST') {
          const body = JSON.parse(opts.body);
          loggedStatus = body.status;
          return new Response(
            JSON.stringify([{ id: 'log-created-789', ...body }]),
            { status: 201, headers: { 'Content-Type': 'application/json' } }
          );
        }
        // DB lead update
        if (urlStr.includes('/rest/v1/leads') && opts?.method === 'PATCH') {
          const body = JSON.parse(opts.body);
          updatedLeadStatus = body.status;
          return new Response(JSON.stringify({}), { status: 200 });
        }
        return new Response('ok', { status: 200 });
      };

      const res = await handleSendEmailRequest(req, {
        env: {
          RESEND_API_KEY: 're_test_key_valid',
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'test-key'
        },
        fetchFn: mockFetch
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.messageId, 're_msg_accepted_456');
      assert.strictEqual(data.status, 'Sent');
      assert.strictEqual(data.provider, 'resend');
      assert.strictEqual(data.recipient, 'founder@maduraiapex.com');

      // Verify Idempotency-Key header was sent to Resend
      assert.strictEqual(resendHeaders['Idempotency-Key'], 'test-idemp-001');

      // Verify database log status is strictly 'Sent' (NEVER 'Delivered')
      assert.strictEqual(loggedStatus, 'Sent');
      assert.notStrictEqual(loggedStatus, 'Delivered');

      // Verify lead was marked 'Contacted' only on success
      assert.strictEqual(updatedLeadStatus, 'Contacted');
    });
  });

  describe('8. Frontend Data Mapping & Validation', () => {
    test('mapDbRowToFrontendOutreachLog correctly maps delivery fields', () => {
      const dbRow = {
        id: 'out-1',
        lead_id: 'lead-1',
        channel: 'Email',
        template: 'Executive Pitch',
        message_content: 'Subject: Hello\n\nContent',
        status: 'Sent',
        recipient_email: 'ceo@techcorp.in',
        provider_message_id: 're_123',
        provider_name: 'resend',
        idempotency_key: 'idemp-1',
        error_message: null,
        sent_at: '2026-10-18T18:00:00.000Z',
        created_at: '2026-10-18T18:00:00.000Z',
        operator_name: 'Maneesh Operator',
        leads: {
          business_name: 'Tech Corp',
          contact_person: 'R. Sharma',
          recommended_service: 'Web Development'
        }
      };

      const mapped = mapDbRowToFrontendOutreachLog(dbRow);
      assert.strictEqual(mapped.recipientEmail, 'ceo@techcorp.in');
      assert.strictEqual(mapped.providerMessageId, 're_123');
      assert.strictEqual(mapped.providerName, 'resend');
      assert.strictEqual(mapped.idempotencyKey, 'idemp-1');
      assert.strictEqual(mapped.status, 'Sent');
      assert.strictEqual(mapped.openStatus, 'Sent via Resend');
    });

    test('sendEmailOutreachViaEdgeFunction validates input client-side', async () => {
      const missingLead = await sendEmailOutreachViaEdgeFunction({
        leadId: '',
        to: 'test@example.com',
        subject: 'Sub',
        body: 'Body'
      });
      assert.ok(missingLead.error.message.includes('valid leadId'));

      const invalidEmail = await sendEmailOutreachViaEdgeFunction({
        leadId: 'lead-1',
        to: 'invalid-email',
        subject: 'Sub',
        body: 'Body'
      });
      assert.ok(invalidEmail.error.message.includes('valid recipient email'));

      const emptySubject = await sendEmailOutreachViaEdgeFunction({
        leadId: 'lead-1',
        to: 'test@example.com',
        subject: '',
        body: 'Body'
      });
      assert.ok(emptySubject.error.message.includes('subject cannot be empty'));
    });
  });
});
