import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeLeadMetadata,
  mapFrontendLeadToDbRow,
  mapDbRowToFrontendLead,
  extractMissingInfoFromBreakdown,
  updateLeadInDatabase,
  mapDbRowToFrontendOutreachLog,
  insertOutreachLogInDatabase,
  fetchOutreachLogsFromDatabase
} from '../services/leadService.js';
import { enrichLeadWithScore, scoreLead } from '../services/leadScoringService.js';

describe('Supabase Lead Metadata Persistence & Merge Engine', () => {

  test('Preserves existing unrelated metadata when updating score fields', () => {
    const existingMeta = {
      osmId: 'node-987654',
      osmType: 'node',
      osmUrl: 'https://www.openstreetmap.org/node/987654',
      designation: 'Managing Partner',
      rating: 4.6,
      reviewCount: 38,
      address: '22 Cross Cut Road, Gandhipuram, Coimbatore'
    };

    const incomingUpdates = {
      aiScore: 89,
      scoreTier: 'HOT',
      confidence: '95%',
      qualificationLevel: 'Enterprise Ready',
      whyThisLeadMatters: 'Strategic regional engineering footprint'
    };

    const merged = mergeLeadMetadata(existingMeta, incomingUpdates);

    // Unrelated fields must be preserved
    assert.strictEqual(merged.osmId, 'node-987654');
    assert.strictEqual(merged.osmType, 'node');
    assert.strictEqual(merged.designation, 'Managing Partner');
    assert.strictEqual(merged.rating, 4.6);
    assert.strictEqual(merged.reviewCount, 38);
    assert.strictEqual(merged.address, '22 Cross Cut Road, Gandhipuram, Coimbatore');

    // Updated fields must be properly applied
    assert.strictEqual(merged.scoreTier, 'HOT');
    assert.strictEqual(merged.confidence, '95%');
    assert.strictEqual(merged.qualificationLevel, 'Enterprise Ready');
    assert.strictEqual(merged.whyThisLeadMatters, 'Strategic regional engineering footprint');
  });

  test('Deep-merges nested aiAnalysis without overwriting existing opportunity facets', () => {
    const existingMeta = {
      aiAnalysis: {
        businessType: 'Healthcare Diagnostics',
        websiteOpportunity: { level: 'CRITICAL', note: 'Booking portal unavailable' },
        digitalMarketingOpportunity: { level: 'HIGH', note: 'SEO deficit' }
      }
    };

    const incomingUpdates = {
      aiAnalysis: {
        iotOpportunity: { level: 'LOW', note: 'Standard clinical telemetry' },
        aiOpportunity: { level: 'HIGH', note: 'Patient intake automation' }
      }
    };

    const merged = mergeLeadMetadata(existingMeta, incomingUpdates);

    assert.strictEqual(merged.aiAnalysis.businessType, 'Healthcare Diagnostics');
    assert.strictEqual(merged.aiAnalysis.websiteOpportunity.level, 'CRITICAL');
    assert.strictEqual(merged.aiAnalysis.digitalMarketingOpportunity.level, 'HIGH');
    assert.strictEqual(merged.aiAnalysis.iotOpportunity.level, 'LOW');
    assert.strictEqual(merged.aiAnalysis.aiOpportunity.level, 'HIGH');
  });

  test('Deep-merges outreach drafts across channels without wiping drafts', () => {
    const existingMeta = {
      outreachDrafts: {
        email: { subject: 'Modernizing Operations', body: 'Dear Director...' }
      }
    };

    const incomingUpdates = {
      outreachDrafts: {
        whatsapp: { message: 'Greetings from PRCBO Tech!' }
      }
    };

    const merged = mergeLeadMetadata(existingMeta, incomingUpdates);

    assert.strictEqual(merged.outreachDrafts.email.subject, 'Modernizing Operations');
    assert.strictEqual(merged.outreachDrafts.whatsapp.message, 'Greetings from PRCBO Tech!');
  });

  test('Safely handles null or undefined inputs', () => {
    assert.doesNotThrow(() => mergeLeadMetadata(null, null));
    assert.doesNotThrow(() => mergeLeadMetadata(undefined, undefined));

    const result = mergeLeadMetadata(null, { scoreTier: 'HIGH' });
    assert.strictEqual(result.scoreTier, 'HIGH');
  });

  test('Handles metadata passed directly inside an incoming.metadata sub-object', () => {
    const existingMeta = { osmId: '12345' };
    const incomingUpdates = {
      metadata: {
        rating: 4.9,
        reviewCount: 110,
        scoreTier: 'HOT'
      }
    };

    const merged = mergeLeadMetadata(existingMeta, incomingUpdates);
    assert.strictEqual(merged.osmId, '12345');
    assert.strictEqual(merged.rating, 4.9);
    assert.strictEqual(merged.reviewCount, 110);
    assert.strictEqual(merged.scoreTier, 'HOT');
  });

  test('Normalizes missingFields to clean array of strings even with object elements', () => {
    const existingMeta = {};
    const incomingUpdates = {
      missingInfo: [
        { field: 'rating', label: 'Star Rating', impact: -10, reason: 'No rating' },
        { field: 'reviewCount', label: 'Review Count', impact: -10, reason: 'No reviews' }
      ]
    };

    const merged = mergeLeadMetadata(existingMeta, incomingUpdates);
    assert.ok(Array.isArray(merged.missingFields));
    assert.deepStrictEqual(merged.missingFields, ['rating', 'reviewCount']);
    assert.strictEqual(merged.missingInfo.length, 2);
  });

  test('Bidirectional roundtrip: mapFrontendLeadToDbRow -> mapDbRowToFrontendLead preserves evaluation & missingInfo', () => {
    const originalLead = {
      id: 'a0000000-0000-0000-0000-000000000001',
      businessName: 'Precision Tech Hub',
      category: 'Manufacturing',
      location: 'Madurai, Tamil Nadu',
      website: 'https://precisiontech.in',
      phone: '+91 98400 12345',
      email: 'contact@precisiontech.in',
      contactPerson: 'R. Subramanian',
      aiScore: 92,
      scoreTier: 'HOT',
      confidence: '95%',
      qualificationLevel: 'Enterprise Ready',
      recommendedService: 'IoT Solutions',
      secondaryService: 'Web Development',
      rating: 4.8,
      reviewCount: 42,
      lat: 9.9252,
      lng: 78.1198,
      scoringBreakdown: {
        totalScore: 92,
        maxScore: 100,
        website: { score: 30, maxScore: 30, status: 'SECURE' },
        commercialVitality: { score: 25, maxScore: 25 },
        categoryReadiness: { score: 20, maxScore: 20 },
        reachability: { score: 15, maxScore: 15 },
        geographicClustering: { score: 10, maxScore: 10 }
      },
      missingFields: [],
      missingInfo: [],
      lastEvaluatedAt: '2026-10-18T10:00:00.000Z'
    };

    const dbRow = mapFrontendLeadToDbRow(originalLead);

    assert.strictEqual(dbRow.business_name, 'Precision Tech Hub');
    assert.strictEqual(dbRow.ai_score, 92);
    assert.strictEqual(dbRow.recommended_service, 'IoT Solutions');
    assert.ok(dbRow.metadata.scoringBreakdown);
    assert.strictEqual(dbRow.metadata.scoringBreakdown.totalScore, 92);
    assert.strictEqual(dbRow.metadata.rating, 4.8);
    assert.strictEqual(dbRow.metadata.reviewCount, 42);

    // Map back to frontend object
    const restored = mapDbRowToFrontendLead(dbRow);

    assert.strictEqual(restored.businessName, 'Precision Tech Hub');
    assert.strictEqual(restored.aiScore, 92);
    assert.strictEqual(restored.scoreTier, 'HOT');
    assert.strictEqual(restored.recommendedService, 'IoT Solutions');
    assert.strictEqual(restored.rating, 4.8);
    assert.strictEqual(restored.reviewCount, 42);
    assert.ok(restored.scoringBreakdown);
    assert.strictEqual(restored.scoringBreakdown.totalScore, 92);
    assert.deepStrictEqual(restored.missingFields, []);
    assert.deepStrictEqual(restored.missingInfo, []);
    assert.strictEqual(restored.lastEvaluatedAt, '2026-10-18T10:00:00.000Z');
  });

  test('extractMissingInfoFromBreakdown extracts missing info items from breakdown', () => {
    const breakdown = {
      website: {
        score: 0,
        missing: { field: 'website', label: 'Official Website', impact: -30, reason: 'No website' }
      },
      commercialVitality: {
        score: 5,
        missing: [
          { field: 'rating', label: 'Star Rating', impact: -10, reason: 'No rating' }
        ]
      },
      reachability: {
        score: 7,
        missing: [
          { field: 'email', label: 'Email Address', impact: -5, reason: 'No email' }
        ]
      },
      geographicClustering: {
        score: 0,
        missing: { field: 'location', label: 'Geographical Location', impact: -10, reason: 'No location' }
      }
    };

    const extracted = extractMissingInfoFromBreakdown(breakdown);
    assert.strictEqual(extracted.length, 4);
    assert.ok(extracted.some(m => m.field === 'website'));
    assert.ok(extracted.some(m => m.field === 'rating'));
    assert.ok(extracted.some(m => m.field === 'email'));
    assert.ok(extracted.some(m => m.field === 'location'));
  });

  test('updateLeadInDatabase validates that leadId is provided', async () => {
    const resultEmpty = await updateLeadInDatabase('', { aiScore: 80 });
    assert.strictEqual(resultEmpty.data, null);
    assert.ok(resultEmpty.error.message.includes('valid leadId is required'));

    const resultNull = await updateLeadInDatabase(null, { aiScore: 80 });
    assert.strictEqual(resultNull.data, null);
    assert.ok(resultNull.error.message.includes('valid leadId is required'));
  });

  test('enrichLeadWithScore synchronizes evaluation across both root and metadata properties', () => {
    const rawLead = {
      id: 'lead-test-101',
      businessName: 'Cauvery Garments',
      category: 'Textile',
      location: 'Tirupur, Tamil Nadu',
      website: 'https://cauverygarments.com',
      phone: '+91 94432 99887'
    };

    const enriched = enrichLeadWithScore(rawLead);

    assert.strictEqual(typeof enriched.aiScore, 'number');
    assert.ok(enriched.scoreTier);
    assert.ok(enriched.recommendedService);
    assert.ok(enriched.scoringBreakdown);
    assert.ok(Array.isArray(enriched.missingFields));
    assert.ok(Array.isArray(enriched.missingInfo));

    // Verify metadata synchronization
    assert.strictEqual(enriched.metadata.scoreTier, enriched.scoreTier);
    assert.strictEqual(enriched.metadata.confidence, enriched.confidence);
    assert.strictEqual(enriched.metadata.qualificationLevel, enriched.qualificationLevel);
    assert.strictEqual(enriched.metadata.secondaryService, enriched.secondaryService);
    assert.strictEqual(enriched.metadata.whyThisLeadMatters, enriched.whyThisLeadMatters);
    assert.strictEqual(enriched.metadata.businessOpportunity, enriched.businessOpportunity);
    assert.strictEqual(enriched.metadata.nextBestAction, enriched.nextBestAction);
    assert.deepStrictEqual(enriched.metadata.scoringBreakdown, enriched.scoringBreakdown);
    assert.deepStrictEqual(enriched.metadata.missingFields, enriched.missingFields);
    assert.deepStrictEqual(enriched.metadata.missingInfo, enriched.missingInfo);
  });

  describe('Outreach Log Persistence & Safe Mapping Engine', () => {
    test('mapDbRowToFrontendOutreachLog transforms database row to clean camelCase model', () => {
      const dbRow = {
        id: 'out-uuid-1234',
        lead_id: 'lead-uuid-5678',
        channel: 'WhatsApp',
        template: 'Direct Booking Engine',
        message_content: 'Hello Sundarrajan! Greetings from PRCBO Tech...',
        status: 'Logged',
        operator_name: 'Lead Specialist Arun',
        created_at: '2026-10-18T14:30:00.000Z',
        metadata: {
          businessName: 'Sundar Forge Works',
          contactPerson: 'Sundarrajan A',
          openStatus: 'Logged as Draft',
          replyStatus: 'Awaiting Action',
          service: 'IoT Solutions'
        },
        leads: {
          business_name: 'Sundar Forge Works Ltd',
          contact_person: 'Sundarrajan Alagarsamy',
          recommended_service: 'IoT Solutions'
        }
      };

      const mapped = mapDbRowToFrontendOutreachLog(dbRow);

      assert.strictEqual(mapped.id, 'out-uuid-1234');
      assert.strictEqual(mapped.leadId, 'lead-uuid-5678');
      assert.strictEqual(mapped.channel, 'WhatsApp');
      assert.strictEqual(mapped.businessName, 'Sundar Forge Works Ltd');
      assert.strictEqual(mapped.contactPerson, 'Sundarrajan Alagarsamy');
      assert.strictEqual(mapped.status, 'Logged');
      assert.strictEqual(mapped.openStatus, 'Logged as Draft');
      assert.strictEqual(mapped.agent, 'Lead Specialist Arun');
      assert.ok(mapped.messageContent.includes('Hello Sundarrajan'));
    });

    test('mapDbRowToFrontendOutreachLog safely handles missing or null metadata/leads join', () => {
      const dbRow = {
        id: 'out-uuid-null-join',
        lead_id: 'lead-uuid-9999',
        channel: 'Email',
        template: null,
        message_content: null,
        status: 'Logged',
        operator_name: null,
        created_at: null,
        metadata: null,
        leads: null
      };

      const mapped = mapDbRowToFrontendOutreachLog(dbRow);
      assert.strictEqual(mapped.id, 'out-uuid-null-join');
      assert.strictEqual(mapped.businessName, 'Prospect');
      assert.strictEqual(mapped.contactPerson, 'Decision Maker');
      assert.strictEqual(mapped.agent, 'PRCBO Operator');
      assert.strictEqual(mapped.status, 'Logged');
    });

    test('insertOutreachLogInDatabase validates leadId presence and rejects empty input', async () => {
      const resNull = await insertOutreachLogInDatabase(null);
      assert.strictEqual(resNull.data, null);
      assert.ok(resNull.error.message.includes('valid leadId is required'));

      const resMissingLead = await insertOutreachLogInDatabase({ channel: 'Email' });
      assert.strictEqual(resMissingLead.data, null);
      assert.ok(resMissingLead.error.message.includes('valid leadId is required'));
    });

    test('insertOutreachLogInDatabase handles database failure and RLS unauthorized access', async () => {
      const res = await insertOutreachLogInDatabase({
        leadId: '00000000-0000-0000-0000-000000000000',
        channel: 'Email',
        messageContent: 'Test draft'
      });

      // When database throws or encounters error, it must return { data: null, error: ... } without throwing unhandled exceptions
      assert.strictEqual(res.data, null);
      assert.ok(res.error);
      assert.strictEqual(typeof res.error.message, 'string');
    });

    test('fetchOutreachLogsFromDatabase returns structured array or handled error without unhandled exception', async () => {
      const res = await fetchOutreachLogsFromDatabase();
      assert.ok(Array.isArray(res.data));
    });
  });
});


