import { describe, it, expect } from 'vitest';
import { buildClaimPrompt, CLAIM_TYPE_PROMPTS, BASE_SYSTEM_PROMPT } from '../claim-generator';
import { createEmptyTortClaim } from '../../tortClaimTypes';
import type { TortClaimType } from '../../tortClaimTypes';

// ============================================================================
// buildClaimPrompt
// ============================================================================

describe('buildClaimPrompt', () => {
  const baseClaim = {
    ...createEmptyTortClaim('company1', 'user1'),
    plaintiff_name: 'ישראל ישראלי',
    plaintiff_id: '123456789',
    plaintiff_address: 'רחוב הרצל 1',
    plaintiff_city: 'תל אביב',
    court_name: 'בית משפט השלום תל אביב',
    court_type: 'magistrate' as const,
    claim_type: 'general_negligence' as TortClaimType,
    incident_date: '2024-01-15',
    incident_location: 'חנות סופר',
    incident_description: 'התובע החליק על רצפה רטובה בחנות',
    defendants: [
      { id: '1', name: 'חנות בע"מ', type: 'company' as const, address: 'רחוב 5', city: 'ת"א', role: 'בעלים' },
    ],
    damage_heads: [
      { type: 'pain_suffering' as const, amount_estimated: 50000, description: 'כאב וסבל', evidence_reference: '' },
      { type: 'medical_expenses_past' as const, amount_estimated: 15000, description: 'הוצאות רפואיות', evidence_reference: '' },
    ],
    tort_elements: {
      duty_of_care: 'חובת זהירות של בעל חנות',
      breach_description: 'לא שם שלט אזהרה',
      causation: 'החלקה גרמה לפציעה',
      damages_description: 'שבר ברגל',
      contributing_negligence: '',
    },
    causes_of_action: ['עוולת הרשלנות'],
    relevant_laws: ['פקודת הנזיקין'],
    legal_arguments: 'הנתבע הפר חובת זהירות',
    requested_remedies: 'פיצוי בסך 65,000 ש"ח',
    plaintiff_contact: { phone: '050-1234567', email: 'test@test.com' },
    plaintiff_attorney: 'עו"ד כהן',
  };

  it('returns systemPrompt and userPrompt', () => {
    const { systemPrompt, userPrompt } = buildClaimPrompt({ claimData: baseClaim });
    expect(systemPrompt).toBeTruthy();
    expect(userPrompt).toBeTruthy();
  });

  it('includes base system prompt', () => {
    const { systemPrompt } = buildClaimPrompt({ claimData: baseClaim });
    expect(systemPrompt).toContain('עוזר משפטי מומחה');
    expect(systemPrompt).toContain('פקודת הנזיקין');
  });

  it('includes claim-type-specific prompt for general negligence', () => {
    const { systemPrompt } = buildClaimPrompt({ claimData: baseClaim });
    expect(systemPrompt).toContain('סעיפים 35-36');
  });

  it('includes road accident prompt for road_accident type', () => {
    const { systemPrompt } = buildClaimPrompt({
      claimData: { ...baseClaim, claim_type: 'road_accident' },
    });
    expect(systemPrompt).toContain('חוק פיצויים לנפגעי תאונות דרכים');
  });

  it('includes plaintiff info in user prompt', () => {
    const { userPrompt } = buildClaimPrompt({ claimData: baseClaim });
    expect(userPrompt).toContain('ישראל ישראלי');
    expect(userPrompt).toContain('123456789');
    expect(userPrompt).toContain('רחוב הרצל 1');
  });

  it('includes defendant info in user prompt', () => {
    const { userPrompt } = buildClaimPrompt({ claimData: baseClaim });
    expect(userPrompt).toContain('חנות בע"מ');
  });

  it('includes damage amounts in user prompt', () => {
    const { userPrompt } = buildClaimPrompt({ claimData: baseClaim });
    expect(userPrompt).toContain('50,000');
    expect(userPrompt).toContain('15,000');
    expect(userPrompt).toContain('65,000');
  });

  it('includes tort elements in user prompt', () => {
    const { userPrompt } = buildClaimPrompt({ claimData: baseClaim });
    expect(userPrompt).toContain('חובת זהירות של בעל חנות');
    expect(userPrompt).toContain('לא שם שלט אזהרה');
  });

  it('includes court page limit for magistrate', () => {
    const { systemPrompt } = buildClaimPrompt({ claimData: baseClaim });
    expect(systemPrompt).toContain('20 עמודים');
    expect(systemPrompt).toContain('בית משפט השלום');
  });

  it('includes court page limit for district', () => {
    const { systemPrompt } = buildClaimPrompt({
      claimData: { ...baseClaim, court_type: 'district' },
    });
    expect(systemPrompt).toContain('30 עמודים');
    expect(systemPrompt).toContain('בית המשפט המחוזי');
  });

  it('includes attachment analysis when provided', () => {
    const { userPrompt } = buildClaimPrompt({
      claimData: baseClaim,
      attachmentTexts: [
        {
          filename: 'חוות_דעת.pdf',
          type: 'medical_opinion',
          summary: 'נכות 15% בעמוד שדרה',
          extractedData: {
            disabilityPercentage: 15,
            diagnosis: 'פגיעה אורתופדית',
          },
        },
      ],
    });
    expect(userPrompt).toContain('חוות_דעת.pdf');
    expect(userPrompt).toContain('נכות: 15%');
    expect(userPrompt).toContain('פגיעה אורתופדית');
  });

  it('includes vehicle details for road accidents', () => {
    const { userPrompt } = buildClaimPrompt({
      claimData: {
        ...baseClaim,
        claim_type: 'road_accident',
        vehicle_details: { license_plate: '12-345-67', make: 'טויוטה', model: 'קורולה', year: '2020' },
        police_report_number: 'POL-123',
        insurance_policy_number: 'INS-456',
      },
    });
    expect(userPrompt).toContain('12-345-67');
    expect(userPrompt).toContain('טויוטה');
    expect(userPrompt).toContain('POL-123');
    expect(userPrompt).toContain('INS-456');
  });

  it('includes medical details for medical malpractice', () => {
    const { userPrompt } = buildClaimPrompt({
      claimData: {
        ...baseClaim,
        claim_type: 'medical_malpractice',
        medical_facility: 'בית חולים איכילוב',
        treating_physician: 'ד"ר כהן',
        treatment_dates: { start: '2024-01-01', end: '2024-06-01' },
      },
    });
    expect(userPrompt).toContain('בית חולים איכילוב');
    expect(userPrompt).toContain('ד"ר כהן');
  });
});

// ============================================================================
// CLAIM_TYPE_PROMPTS
// ============================================================================

describe('CLAIM_TYPE_PROMPTS', () => {
  it('has prompts for all 10 claim types', () => {
    const types: TortClaimType[] = [
      'general_negligence', 'road_accident', 'medical_malpractice',
      'professional_malpractice', 'property_damage', 'defamation',
      'assault', 'work_accident', 'product_liability', 'other',
    ];

    for (const type of types) {
      expect(CLAIM_TYPE_PROMPTS[type]).toBeTruthy();
      expect(CLAIM_TYPE_PROMPTS[type].length).toBeGreaterThan(20);
    }
  });
});

// ============================================================================
// BASE_SYSTEM_PROMPT
// ============================================================================

describe('BASE_SYSTEM_PROMPT', () => {
  it('includes key legal instructions', () => {
    expect(BASE_SYSTEM_PROMPT).toContain('פקודת הנזיקין');
    expect(BASE_SYSTEM_PROMPT).toContain('סדר הדין האזרחי');
    expect(BASE_SYSTEM_PROMPT).toContain('אל תמציא עובדות');
  });
});
