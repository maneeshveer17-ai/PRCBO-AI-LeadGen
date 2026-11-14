import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLeadScore,
  getScoreTier,
  getQualificationLevel,
  recommendServiceForLead
} from './scoringEngine.js';
import {
  SCORING_WEIGHTS,
  TIER_THRESHOLDS
} from './scoringRules.js';

describe('Deterministic Lead Scoring Engine', () => {

  describe('1. Score Boundaries & Clamping', () => {
    test('Empty lead record produces score between 0 and 100', () => {
      const result = calculateLeadScore({});
      assert.ok(result.score >= 0, 'Score should be >= 0');
      assert.ok(result.score <= 100, 'Score should be <= 100');
      assert.strictEqual(typeof result.score, 'number');
      assert.ok(Number.isInteger(result.score), 'Score should be an integer');
    });

    test('Null/undefined inputs handled safely without throwing', () => {
      assert.doesNotThrow(() => calculateLeadScore(null));
      assert.doesNotThrow(() => calculateLeadScore(undefined));
      const res = calculateLeadScore(null);
      assert.ok(res.score >= 0 && res.score <= 100);
    });

    test('Maximum possible lead with all attributes scores strictly 100 (clamped)', () => {
      const perfectLead = {
        businessName: 'Apex Precision Engineering Ltd',
        category: 'Manufacturing',
        location: 'Madurai, Tamil Nadu',
        website: 'https://apexprecision.com',
        phone: '+91 94431 11223',
        email: 'md@apexprecision.com',
        contactPerson: 'K. S. Narayanan',
        rating: 5.0,
        reviewCount: 250,
        lat: 9.9252,
        lng: 78.1198
      };

      const result = calculateLeadScore(perfectLead);
      assert.strictEqual(result.score, 100, 'Perfect lead should score 100');
      assert.strictEqual(result.tier, 'HOT');
      assert.strictEqual(result.missingFields.length, 0);
    });

    test('Subsystem score breakdown does not exceed defined weights', () => {
      const result = calculateLeadScore({
        website: 'https://example.com',
        rating: 5.0,
        reviewCount: 500,
        lat: 13.0827,
        lng: 80.2707,
        category: 'Manufacturing',
        phone: '+91 98400 12345',
        email: 'info@test.com',
        contactPerson: 'John Doe',
        location: 'Chennai, Tamil Nadu'
      });

      const b = result.scoringBreakdown;
      assert.ok(b.website.score <= SCORING_WEIGHTS.WEBSITE);
      assert.ok(b.commercialVitality.score <= SCORING_WEIGHTS.COMMERCIAL_VITALITY);
      assert.ok(b.categoryReadiness.score <= SCORING_WEIGHTS.CATEGORY_READINESS);
      assert.ok(b.reachability.score <= SCORING_WEIGHTS.REACHABILITY);
      assert.ok(b.geographicClustering.score <= SCORING_WEIGHTS.GEOGRAPHY);
    });
  });

  describe('2. Missing Fields & Transparent Breakdown', () => {
    test('Missing reviews must not be fabricated and must be transparently reported', () => {
      const osmLead = {
        businessName: 'Sri Balaji Store',
        category: 'Commercial',
        location: 'Madurai, Tamil Nadu',
        lat: 9.9252,
        lng: 78.1198,
        rating: null,
        reviewCount: null
      };

      const result = calculateLeadScore(osmLead);
      // Coordinates gave 5 pts, but rating and reviewCount are 0
      assert.strictEqual(result.scoringBreakdown.commercialVitality.score, 5);
      assert.strictEqual(result.scoringBreakdown.commercialVitality.rating, null);
      assert.strictEqual(result.scoringBreakdown.commercialVitality.reviewCount, null);

      assert.ok(result.missingFields.includes('rating'));
      assert.ok(result.missingFields.includes('reviewCount'));
      assert.ok(result.missingInfo.some(m => m.field === 'rating' && m.impact === -10));
      assert.ok(result.missingInfo.some(m => m.field === 'reviewCount' && m.impact === -10));
    });

    test('Missing website scores 0 and is reported in missingFields and missingInfo', () => {
      const leadNoWeb = {
        businessName: 'Madurai Cold Storage',
        category: 'Industrial',
        location: 'Madurai, Tamil Nadu',
        website: ''
      };

      const result = calculateLeadScore(leadNoWeb);
      assert.strictEqual(result.scoringBreakdown.website.score, 0);
      assert.strictEqual(result.scoringBreakdown.website.status, 'ABSENT');
      assert.ok(result.missingFields.includes('website'));
      assert.ok(result.missingInfo.some(m => m.field === 'website' && m.impact === -30));
    });

    test('Missing phone, email, and contact person are transparently tracked', () => {
      const bareLead = {
        businessName: 'Uncontacted Entity',
        category: 'Retail',
        location: 'Chennai, Tamil Nadu',
        phone: null,
        email: '',
        contactPerson: 'Unassigned (OSM Data)'
      };

      const result = calculateLeadScore(bareLead);
      assert.strictEqual(result.scoringBreakdown.reachability.score, 0);
      assert.ok(result.missingFields.includes('phone'));
      assert.ok(result.missingFields.includes('email'));
      assert.ok(result.missingFields.includes('contactPerson'));
    });
  });

  describe('3. Tier Threshold Mapping', () => {
    test('getScoreTier maps scores correctly across all 4 tiers', () => {
      assert.strictEqual(getScoreTier(100), 'HOT');
      assert.strictEqual(getScoreTier(88), 'HOT');
      assert.strictEqual(getScoreTier(87), 'HIGH');
      assert.strictEqual(getScoreTier(70), 'HIGH');
      assert.strictEqual(getScoreTier(69), 'MEDIUM');
      assert.strictEqual(getScoreTier(50), 'MEDIUM');
      assert.strictEqual(getScoreTier(49), 'LOW');
      assert.strictEqual(getScoreTier(0), 'LOW');
    });

    test('getQualificationLevel returns expected titles per tier', () => {
      assert.ok(getQualificationLevel(94, 'HOT').includes('Enterprise Ready'));
      assert.ok(getQualificationLevel(75, 'HIGH').includes('Qualified Lead'));
      assert.ok(getQualificationLevel(55, 'MEDIUM').includes('Actionable Prospect'));
      assert.ok(getQualificationLevel(20, 'LOW').includes('Requires Contact Enrichment'));
      assert.ok(getQualificationLevel(0, 'LOW').includes('Unqualified'));
    });
  });

  describe('4. Website Security & Protocol Valuation', () => {
    test('HTTPS website yields maximum website points (30)', () => {
      const res = calculateLeadScore({ website: 'https://secure-business.in' });
      assert.strictEqual(res.scoringBreakdown.website.score, 30);
      assert.strictEqual(res.scoringBreakdown.website.status, 'SECURE');
    });

    test('HTTP legacy website receives partial points (15) and modernization alert', () => {
      const res = calculateLeadScore({ website: 'http://legacy-business.in' });
      assert.strictEqual(res.scoringBreakdown.website.score, 15);
      assert.strictEqual(res.scoringBreakdown.website.status, 'INSECURE');
      assert.ok(res.scoringBreakdown.website.notes.toLowerCase().includes('ssl'));
    });
  });

  describe('5. Deterministic Service Recommendations', () => {
    test('Missing website directs recommendedService to Web Development', () => {
      const res = calculateLeadScore({
        category: 'Healthcare',
        website: ''
      });
      assert.strictEqual(res.recommendedService, 'Web Development');
    });

    test('Manufacturing with secure website recommends IoT Solutions', () => {
      const res = calculateLeadScore({
        category: 'Manufacturing',
        website: 'https://valvemfg.com'
      });
      assert.strictEqual(res.recommendedService, 'IoT Solutions');
    });

    test('IT company recommends AI Development', () => {
      const res = calculateLeadScore({
        category: 'IT / Tech',
        website: 'https://cloudtech.in'
      });
      assert.strictEqual(res.recommendedService, 'AI Development');
    });
  });

  describe('6. Geographic Clustering', () => {
    test('Tier-1 operational hubs receive 10 points', () => {
      assert.strictEqual(calculateLeadScore({ location: 'Madurai, Tamil Nadu' }).scoringBreakdown.geographicClustering.score, 10);
      assert.strictEqual(calculateLeadScore({ location: 'Chennai, Tamil Nadu' }).scoringBreakdown.geographicClustering.score, 10);
      assert.strictEqual(calculateLeadScore({ location: 'Coimbatore, Tamil Nadu' }).scoringBreakdown.geographicClustering.score, 10);
      assert.strictEqual(calculateLeadScore({ location: 'Bengaluru, Karnataka' }).scoringBreakdown.geographicClustering.score, 10);
    });

    test('Tier-2 cities receive 8 points', () => {
      assert.strictEqual(calculateLeadScore({ location: 'Trichy, Tamil Nadu' }).scoringBreakdown.geographicClustering.score, 8);
      assert.strictEqual(calculateLeadScore({ location: 'Hyderabad, Telangana' }).scoringBreakdown.geographicClustering.score, 8);
    });

    test('Missing location receives 0 points', () => {
      const res = calculateLeadScore({ location: '' });
      assert.strictEqual(res.scoringBreakdown.geographicClustering.score, 0);
      assert.ok(res.missingFields.includes('location'));
    });
  });
});
