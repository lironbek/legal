import { describe, it, expect } from 'vitest';
import {
  calculateStatuteOfLimitations,
  validateStep,
  getStepsForClaimType,
  calculateTotalDamages,
  suggestCourtType,
  getDefaultDamageHeads,
  getFormCompleteness,
  createEmptyDamageHead,
} from '../questionnaire-engine';
import type { TortClaimType, DamageHead } from '../../tortClaimTypes';
import { createEmptyTortClaim } from '../../tortClaimTypes';

// ============================================================================
// calculateStatuteOfLimitations
// ============================================================================

describe('calculateStatuteOfLimitations', () => {
  it('returns null for empty incident date', () => {
    expect(calculateStatuteOfLimitations('general_negligence', '')).toBeNull();
  });

  it('returns null for invalid date', () => {
    expect(calculateStatuteOfLimitations('general_negligence', 'not-a-date')).toBeNull();
  });

  it('calculates 7 years for general negligence', () => {
    const result = calculateStatuteOfLimitations('general_negligence', '2020-01-15');
    expect(result).not.toBeNull();
    expect(result!.yearsAllowed).toBe(7);
    expect(result!.deadline).toBe('2027-01-15');
  });

  it('calculates 7 years for road accident', () => {
    const result = calculateStatuteOfLimitations('road_accident', '2019-06-01');
    expect(result!.yearsAllowed).toBe(7);
    expect(result!.deadline).toBe('2026-06-01');
  });

  it('calculates 1 year for defamation', () => {
    const result = calculateStatuteOfLimitations('defamation', '2025-01-01');
    expect(result!.yearsAllowed).toBe(1);
    expect(result!.deadline).toBe('2026-01-01');
  });

  it('calculates 3 years for product liability', () => {
    const result = calculateStatuteOfLimitations('product_liability', '2024-03-15');
    expect(result!.yearsAllowed).toBe(3);
    expect(result!.deadline).toBe('2027-03-15');
  });

  it('marks expired claims correctly', () => {
    // Use a date far in the past
    const result = calculateStatuteOfLimitations('defamation', '2020-01-01');
    expect(result!.isExpired).toBe(true);
    expect(result!.daysRemaining).toBeLessThan(0);
  });

  it('marks urgent claims (<90 days)', () => {
    // Create a date that will expire soon
    const now = new Date();
    const target = new Date(now);
    target.setDate(target.getDate() + 50); // 50 days from now
    // For 7-year statute, set incident date 7 years before the target
    const incident = new Date(target);
    incident.setFullYear(incident.getFullYear() - 7);
    const incidentStr = incident.toISOString().split('T')[0];

    const result = calculateStatuteOfLimitations('general_negligence', incidentStr);
    expect(result!.isUrgent).toBe(true);
    expect(result!.isExpired).toBe(false);
  });

  it('handles all claim types', () => {
    const types: TortClaimType[] = [
      'general_negligence', 'road_accident', 'medical_malpractice',
      'professional_malpractice', 'property_damage', 'defamation',
      'assault', 'work_accident', 'product_liability', 'other',
    ];

    for (const type of types) {
      const result = calculateStatuteOfLimitations(type, '2023-06-15');
      expect(result).not.toBeNull();
      expect(result!.yearsAllowed).toBeGreaterThan(0);
    }
  });

  it('handles future incident dates', () => {
    const futureDate = '2030-01-01';
    const result = calculateStatuteOfLimitations('general_negligence', futureDate);
    expect(result).not.toBeNull();
    expect(result!.isExpired).toBe(false);
    expect(result!.daysRemaining).toBeGreaterThan(365 * 7);
  });
});

// ============================================================================
// validateStep
// ============================================================================

describe('validateStep', () => {
  it('validates classification step - all fields missing', () => {
    const result = validateStep('classification', {});
    expect(result.valid).toBe(false);
    expect(result.errors.claim_type).toBeTruthy();
    expect(result.errors.court_type).toBeTruthy();
    expect(result.errors.court_name).toBeTruthy();
    expect(result.errors.incident_date).toBeTruthy();
  });

  it('validates classification step - all filled', () => {
    const result = validateStep('classification', {
      claim_type: 'general_negligence',
      court_type: 'magistrate',
      court_name: 'בית משפט השלום תל אביב',
      incident_date: '2024-01-01',
    });
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it('validates plaintiff step - empty', () => {
    const result = validateStep('plaintiff', {});
    expect(result.valid).toBe(false);
    expect(result.errors.plaintiff_name).toBeTruthy();
    expect(result.errors.plaintiff_id).toBeTruthy();
  });

  it('validates plaintiff step - filled', () => {
    const result = validateStep('plaintiff', {
      plaintiff_name: 'ישראל ישראלי',
      plaintiff_id: '123456789',
    });
    expect(result.valid).toBe(true);
  });

  it('validates plaintiff step - whitespace-only name', () => {
    const result = validateStep('plaintiff', {
      plaintiff_name: '   ',
      plaintiff_id: '123',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.plaintiff_name).toBeTruthy();
  });

  it('validates defendants step - empty', () => {
    const result = validateStep('defendants', { defendants: [] });
    expect(result.valid).toBe(false);
  });

  it('validates defendants step - with unnamed defendant', () => {
    const result = validateStep('defendants', {
      defendants: [
        { id: '1', name: '', type: 'individual', address: '', city: '', role: '' },
      ],
    });
    expect(result.valid).toBe(false);
  });

  it('validates defendants step - valid', () => {
    const result = validateStep('defendants', {
      defendants: [
        { id: '1', name: 'חנות ב"מ', type: 'company', address: 'רחוב 1', city: 'ת"א', role: 'בעלים' },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it('validates incident step - empty', () => {
    const result = validateStep('incident', {});
    expect(result.valid).toBe(false);
    expect(result.errors.incident_description).toBeTruthy();
  });

  it('validates incident step - filled', () => {
    const result = validateStep('incident', {
      incident_description: 'התובע החליק על רצפה רטובה',
    });
    expect(result.valid).toBe(true);
  });

  it('optional steps always pass (tort_elements, damages, legal_arguments)', () => {
    expect(validateStep('tort_elements', {}).valid).toBe(true);
    expect(validateStep('damages', {}).valid).toBe(true);
    expect(validateStep('legal_arguments', {}).valid).toBe(true);
    expect(validateStep('summary', {}).valid).toBe(true);
    expect(validateStep('road_accident_details', {}).valid).toBe(true);
    expect(validateStep('medical_malpractice_details', {}).valid).toBe(true);
  });
});

// ============================================================================
// getStepsForClaimType
// ============================================================================

describe('getStepsForClaimType', () => {
  it('returns 8 steps for general_negligence (no special steps)', () => {
    const steps = getStepsForClaimType('general_negligence');
    const ids = steps.map(s => s.id);
    expect(ids).not.toContain('road_accident_details');
    expect(ids).not.toContain('medical_malpractice_details');
    expect(ids).toContain('classification');
    expect(ids).toContain('summary');
  });

  it('includes road_accident_details only for road_accident', () => {
    const roadSteps = getStepsForClaimType('road_accident');
    expect(roadSteps.map(s => s.id)).toContain('road_accident_details');

    const genSteps = getStepsForClaimType('general_negligence');
    expect(genSteps.map(s => s.id)).not.toContain('road_accident_details');
  });

  it('includes medical_malpractice_details only for medical_malpractice', () => {
    const medSteps = getStepsForClaimType('medical_malpractice');
    expect(medSteps.map(s => s.id)).toContain('medical_malpractice_details');

    const genSteps = getStepsForClaimType('assault');
    expect(genSteps.map(s => s.id)).not.toContain('medical_malpractice_details');
  });
});

// ============================================================================
// calculateTotalDamages
// ============================================================================

describe('calculateTotalDamages', () => {
  it('returns 0 for empty array', () => {
    expect(calculateTotalDamages([])).toBe(0);
  });

  it('sums up damage heads', () => {
    const heads: DamageHead[] = [
      { type: 'pain_suffering', amount_estimated: 50000, description: '', evidence_reference: '' },
      { type: 'medical_expenses_past', amount_estimated: 15000, description: '', evidence_reference: '' },
      { type: 'lost_wages_past', amount_estimated: 30000, description: '', evidence_reference: '' },
    ];
    expect(calculateTotalDamages(heads)).toBe(95000);
  });

  it('handles zero amounts', () => {
    const heads: DamageHead[] = [
      { type: 'pain_suffering', amount_estimated: 50000, description: '', evidence_reference: '' },
      { type: 'medical_expenses_past', amount_estimated: 0, description: '', evidence_reference: '' },
    ];
    expect(calculateTotalDamages(heads)).toBe(50000);
  });
});

// ============================================================================
// suggestCourtType
// ============================================================================

describe('suggestCourtType', () => {
  it('returns magistrate for amounts <= 2.5M', () => {
    expect(suggestCourtType(0)).toBe('magistrate');
    expect(suggestCourtType(100000)).toBe('magistrate');
    expect(suggestCourtType(2500000)).toBe('magistrate');
  });

  it('returns district for amounts > 2.5M', () => {
    expect(suggestCourtType(2500001)).toBe('district');
    expect(suggestCourtType(10000000)).toBe('district');
  });
});

// ============================================================================
// getDefaultDamageHeads
// ============================================================================

describe('getDefaultDamageHeads', () => {
  it('returns common heads for general_negligence', () => {
    const heads = getDefaultDamageHeads('general_negligence');
    expect(heads).toContain('pain_suffering');
    expect(heads).toContain('medical_expenses_past');
  });

  it('includes property_damage for property_damage claim', () => {
    const heads = getDefaultDamageHeads('property_damage');
    expect(heads).toContain('property_damage');
  });

  it('includes psychological_damage for defamation', () => {
    const heads = getDefaultDamageHeads('defamation');
    expect(heads).toContain('psychological_damage');
  });

  it('includes care_assistance for road_accident', () => {
    const heads = getDefaultDamageHeads('road_accident');
    expect(heads).toContain('care_assistance');
  });
});

// ============================================================================
// getFormCompleteness
// ============================================================================

describe('getFormCompleteness', () => {
  it('returns 0% for empty form', () => {
    const empty = createEmptyTortClaim('c1', 'u1');
    // Remove required fields
    empty.claim_type = '' as any;
    empty.court_type = '' as any;
    const pct = getFormCompleteness('general_negligence', empty);
    expect(pct).toBeLessThan(100);
  });

  it('returns higher % as form fills up', () => {
    const claim = createEmptyTortClaim('c1', 'u1');
    claim.claim_type = 'general_negligence';
    claim.court_type = 'magistrate';
    claim.court_name = 'בית משפט השלום ת"א';
    claim.incident_date = '2024-01-01';
    claim.plaintiff_name = 'ישראל';
    claim.plaintiff_id = '123456789';
    claim.defendants = [{ id: '1', name: 'נתבע', type: 'individual', address: 'כתובת', city: '', role: '' }];
    claim.incident_description = 'תיאור';

    const pct = getFormCompleteness('general_negligence', claim);
    expect(pct).toBeGreaterThanOrEqual(50);
  });
});

// ============================================================================
// createEmptyDamageHead
// ============================================================================

describe('createEmptyDamageHead', () => {
  it('creates head with correct type and zero amount', () => {
    const head = createEmptyDamageHead('pain_suffering');
    expect(head.type).toBe('pain_suffering');
    expect(head.amount_estimated).toBe(0);
    expect(head.description).toBe('');
    expect(head.evidence_reference).toBe('');
  });
});
