import { describe, test } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import {
  handleResendWebhookRequest,
  verifyResendWebhookSignature,
  calculateStatusTransition,
  decodeBase64ToUint8Array,
  timingSafeCompare
} from '../../../supabase/functions/resend-webhook/index.ts';

// Test secret in standard Svix/Resend format
const TEST_WEBHOOK_SECRET = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw=';

// Helper to construct real Svix headers and signatures
const generateSvixHeaders = (secret, body, options = {}) => {
  const svixId = options.svixId || `msg_${Date.now()}`;
  const timestamp = options.timestamp !== undefined ? String(options.timestamp) : String(Math.floor(Date.now() / 1000));
  const rawSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  const secretBytes = Buffer.from(rawSecret, 'base64');
  const signedContent = `${svixId}.${timestamp}.${body}`;
  const signature = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');

  return {
    'Content-Type': 'application/json',
    'svix-id': svixId,
    'svix-timestamp': timestamp,
    'svix-signature': options.signatureHeader || `v1,${signature}`
  };
};

describe('Supabase Edge Function: resend-webhook (Resend Delivery Status Tracking)', () => {
  const sampleEmailId = '56761188-7520-42d8-8898-ff6fc54ce618';
  const sampleDeliveredPayload = JSON.stringify({
    type: 'email.delivered',
    created_at: '2026-10-18T20:30:00.000Z',
    data: {
      email_id: sampleEmailId,
      to: ['founder@apexcorp.com'],
      from: 'PRCBO Tech <onboarding@resend.dev>',
      subject: 'Digital Transformation Proposal'
    }
  });

  describe('1. Svix Cryptographic Signature Verification', () => {
    test('Valid signature with whsec_ secret returns isValid: true', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const headers = generateSvixHeaders(TEST_WEBHOOK_SECRET, sampleDeliveredPayload, { timestamp: nowSec });

      const result = await verifyResendWebhookSignature({
        secret: TEST_WEBHOOK_SECRET,
        svixId: headers['svix-id'],
        svixTimestamp: headers['svix-timestamp'],
        svixSignature: headers['svix-signature'],
        rawBody: sampleDeliveredPayload
      });

      assert.strictEqual(result.isValid, true);
    });

    test('Tampered body causes signature mismatch and returns isValid: false', async () => {
      const headers = generateSvixHeaders(TEST_WEBHOOK_SECRET, sampleDeliveredPayload);
      const tamperedBody = sampleDeliveredPayload + ' ';

      const result = await verifyResendWebhookSignature({
        secret: TEST_WEBHOOK_SECRET,
        svixId: headers['svix-id'],
        svixTimestamp: headers['svix-timestamp'],
        svixSignature: headers['svix-signature'],
        rawBody: tamperedBody
      });

      assert.strictEqual(result.isValid, false);
      assert.ok(result.error.includes('hash mismatch'));
    });

    test('Missing svix headers returns isValid: false with descriptive error', async () => {
      const result = await verifyResendWebhookSignature({
        secret: TEST_WEBHOOK_SECRET,
        svixId: null,
        svixTimestamp: null,
        svixSignature: null,
        rawBody: sampleDeliveredPayload
      });

      assert.strictEqual(result.isValid, false);
      assert.ok(result.error.includes('Missing required svix headers'));
    });

    test('Expired timestamp (> 300s window) returns isValid: false to prevent replay attacks', async () => {
      const tenMinutesAgo = Math.floor(Date.now() / 1000) - 600;
      const headers = generateSvixHeaders(TEST_WEBHOOK_SECRET, sampleDeliveredPayload, { timestamp: tenMinutesAgo });

      const result = await verifyResendWebhookSignature({
        secret: TEST_WEBHOOK_SECRET,
        svixId: headers['svix-id'],
        svixTimestamp: headers['svix-timestamp'],
        svixSignature: headers['svix-signature'],
        rawBody: sampleDeliveredPayload
      });

      assert.strictEqual(result.isValid, false);
      assert.ok(result.error.includes('tolerance window'));
    });

    test('Multiple signatures in svix-signature header succeeds if any v1 matches', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const headers = generateSvixHeaders(TEST_WEBHOOK_SECRET, sampleDeliveredPayload, { timestamp: nowSec });
      const multiSigHeader = `v1,invalid_dummy_sig v1,${headers['svix-signature'].replace('v1,', '')}`;

      const result = await verifyResendWebhookSignature({
        secret: TEST_WEBHOOK_SECRET,
        svixId: headers['svix-id'],
        svixTimestamp: headers['svix-timestamp'],
        svixSignature: multiSigHeader,
        rawBody: sampleDeliveredPayload
      });

      assert.strictEqual(result.isValid, true);
    });
  });

  describe('2. HTTP Request Handling & Validation', () => {
    test('OPTIONS request returns CORS headers with status 200', async () => {
      const req = new Request('http://localhost/resend-webhook', { method: 'OPTIONS' });
      const res = await handleResendWebhookRequest(req);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), '*');
    });

    test('GET request is rejected with HTTP 405 Method Not Allowed', async () => {
      const req = new Request('http://localhost/resend-webhook', { method: 'GET' });
      const res = await handleResendWebhookRequest(req);
      assert.strictEqual(res.status, 405);
    });

    test('Missing RESEND_WEBHOOK_SECRET returns HTTP 500 without exposing secrets', async () => {
      const req = new Request('http://localhost/resend-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: sampleDeliveredPayload
      });

      const res = await handleResendWebhookRequest(req, {
        env: { RESEND_WEBHOOK_SECRET: '' }
      });
      assert.strictEqual(res.status, 500);
      const data = await res.json();
      assert.ok(data.error.includes('Webhook secret not configured'));
    });

    test('Missing svix headers in POST returns HTTP 400', async () => {
      const req = new Request('http://localhost/resend-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: sampleDeliveredPayload
      });

      const res = await handleResendWebhookRequest(req, {
        env: { RESEND_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET }
      });
      assert.strictEqual(res.status, 400);
    });

    test('Missing email_id in payload returns HTTP 400', async () => {
      const payloadWithoutId = JSON.stringify({ type: 'email.delivered', data: {} });
      const headers = generateSvixHeaders(TEST_WEBHOOK_SECRET, payloadWithoutId);

      const req = new Request('http://localhost/resend-webhook', {
        method: 'POST',
        headers,
        body: payloadWithoutId
      });

      const res = await handleResendWebhookRequest(req, {
        env: {
          RESEND_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'test-key'
        }
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('Missing required provider message identifier'));
    });
  });

  describe('3. Database Record Matching & Lookup', () => {
    test('Unknown provider_message_id returns HTTP 404', async () => {
      const headers = generateSvixHeaders(TEST_WEBHOOK_SECRET, sampleDeliveredPayload);
      const req = new Request('http://localhost/resend-webhook', {
        method: 'POST',
        headers,
        body: sampleDeliveredPayload
      });

      const mockFetch = async (url) => {
        // Return empty array for outreach_logs query
        if (String(url).includes('/rest/v1/outreach_logs')) {
          return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response('ok', { status: 200 });
      };

      const res = await handleResendWebhookRequest(req, {
        env: {
          RESEND_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'test-key'
        },
        fetchFn: mockFetch
      });

      assert.strictEqual(res.status, 404);
      const data = await res.json();
      assert.ok(data.error.includes('Outreach log record not found'));
    });
  });

  describe('4. Status Transitions & Out-of-Order Lifecycle Discipline', () => {
    test('calculateStatusTransition: email.delivered transitions Sent to Delivered', () => {
      const result = calculateStatusTransition('Sent', 'email.delivered');
      assert.strictEqual(result.targetStatus, 'Delivered');
      assert.strictEqual(result.isDuplicate, false);
      assert.strictEqual(result.shouldRegress, false);
    });

    test('calculateStatusTransition: duplicate email.delivered is flagged as duplicate', () => {
      const result = calculateStatusTransition('Delivered', 'email.delivered');
      assert.strictEqual(result.targetStatus, 'Delivered');
      assert.strictEqual(result.isDuplicate, true);
    });

    test('calculateStatusTransition: out-of-order email.sent does NOT regress Delivered to Sent', () => {
      const result = calculateStatusTransition('Delivered', 'email.sent');
      assert.strictEqual(result.targetStatus, 'Delivered');
      assert.strictEqual(result.shouldRegress, true); // Prevent regression
    });

    test('calculateStatusTransition: email.bounced transitions Sent to Bounced', () => {
      const result = calculateStatusTransition('Sent', 'email.bounced');
      assert.strictEqual(result.targetStatus, 'Bounced');
      assert.strictEqual(result.shouldRegress, false);
    });

    test('calculateStatusTransition: out-of-order email.delivered does NOT override Bounced', () => {
      const result = calculateStatusTransition('Bounced', 'email.delivered');
      assert.strictEqual(result.targetStatus, 'Bounced');
      assert.strictEqual(result.shouldRegress, true);
    });

    test('calculateStatusTransition: email.complained marks Complained', () => {
      const result = calculateStatusTransition('Sent', 'email.complained');
      assert.strictEqual(result.targetStatus, 'Complained');
      assert.strictEqual(result.shouldRegress, false);
    });
  });

  describe('5. End-to-End Webhook Execution & Database Persistence', () => {
    test('email.delivered updates record status to Delivered, sets delivered_at and appends event history', async () => {
      const headers = generateSvixHeaders(TEST_WEBHOOK_SECRET, sampleDeliveredPayload);
      const req = new Request('http://localhost/resend-webhook', {
        method: 'POST',
        headers,
        body: sampleDeliveredPayload
      });

      let patchedPayload = null;

      const mockFetch = async (url, opts) => {
        const urlStr = String(url);
        // Lookup
        if (urlStr.includes('/rest/v1/outreach_logs') && opts?.method !== 'PATCH') {
          return new Response(
            JSON.stringify([
              {
                id: 'log-uuid-101',
                provider_message_id: sampleEmailId,
                status: 'Sent',
                metadata: { events: [{ type: 'email.sent' }] }
              }
            ]),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        // Update
        if (urlStr.includes('/rest/v1/outreach_logs') && opts?.method === 'PATCH') {
          patchedPayload = JSON.parse(opts.body);
          return new Response(JSON.stringify([{ id: 'log-uuid-101', ...patchedPayload }]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response('ok', { status: 200 });
      };

      const res = await handleResendWebhookRequest(req, {
        env: {
          RESEND_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'test-key'
        },
        fetchFn: mockFetch
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.status, 'Delivered');
      assert.strictEqual(data.eventType, 'email.delivered');

      // Verify DB patch payload
      assert.strictEqual(patchedPayload.status, 'Delivered');
      assert.ok(patchedPayload.delivered_at);
      assert.strictEqual(patchedPayload.metadata.openStatus, 'Delivered to mail server');
      assert.strictEqual(patchedPayload.metadata.events.length, 2);
      assert.strictEqual(patchedPayload.metadata.events[1].type, 'email.delivered');
    });

    test('email.bounced sets status to Bounced, records bounced_at and captures bounce error message', async () => {
      const bouncePayload = JSON.stringify({
        type: 'email.bounced',
        created_at: '2026-10-18T20:35:00.000Z',
        data: {
          email_id: sampleEmailId,
          bounce: {
            message: 'Mailbox does not exist (550 User unknown)',
            type: 'Permanent'
          }
        }
      });

      const headers = generateSvixHeaders(TEST_WEBHOOK_SECRET, bouncePayload);
      const req = new Request('http://localhost/resend-webhook', {
        method: 'POST',
        headers,
        body: bouncePayload
      });

      let patchedPayload = null;
      const mockFetch = async (url, opts) => {
        const urlStr = String(url);
        if (urlStr.includes('/rest/v1/outreach_logs') && opts?.method !== 'PATCH') {
          return new Response(
            JSON.stringify([
              {
                id: 'log-uuid-101',
                provider_message_id: sampleEmailId,
                status: 'Sent',
                metadata: {}
              }
            ]),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (urlStr.includes('/rest/v1/outreach_logs') && opts?.method === 'PATCH') {
          patchedPayload = JSON.parse(opts.body);
          return new Response(JSON.stringify([{ id: 'log-uuid-101', ...patchedPayload }]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response('ok', { status: 200 });
      };

      const res = await handleResendWebhookRequest(req, {
        env: {
          RESEND_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'test-key'
        },
        fetchFn: mockFetch
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(patchedPayload.status, 'Bounced');
      assert.ok(patchedPayload.bounced_at);
      assert.strictEqual(patchedPayload.error_message, 'Mailbox does not exist (550 User unknown)');
      assert.strictEqual(patchedPayload.metadata.openStatus, 'Delivery Bounced');
    });
  });
});
