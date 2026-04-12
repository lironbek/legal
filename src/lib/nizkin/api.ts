// Nizkin API Service - wraps Supabase Edge Functions with localStorage fallback
// All operations go through this layer so pages don't need to know the data source.

import { supabase, isSupabaseReachable } from '../supabase';
import {
  getTortClaims,
  getTortClaimById,
  addTortClaim,
  updateTortClaim,
  deleteTortClaim,
} from '../tortClaimService';
import { generateClaimDraft, analyzeAttachment } from './claim-generator';
import type { ClaimDraftResult, AttachmentAnalysis, AttachmentAnalysisResult } from './claim-generator';
import { calculateStatuteOfLimitations, calculateTotalDamages } from './questionnaire-engine';
import type { StatuteResult } from './questionnaire-engine';
import type { TortClaim, TortClaimStatus } from '../tortClaimTypes';

// ============================================================================
// Types
// ============================================================================

export interface NizkinListParams {
  status?: TortClaimStatus;
  claimType?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface NizkinListResult {
  success: boolean;
  data: TortClaim[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

export interface NizkinSingleResult {
  success: boolean;
  data?: TortClaim;
  error?: string;
}

export interface NizkinApproveResult {
  success: boolean;
  data?: TortClaim;
  error?: string;
  missing_fields?: string[];
}

export interface NizkinStatuteResult {
  success: boolean;
  data?: StatuteResult;
  error?: string;
}

export interface NizkinGenerateResult extends ClaimDraftResult {
  latency_ms?: number;
  usage?: { input_tokens: number; output_tokens: number };
}

// ============================================================================
// Activity log (in-memory + localStorage for this session)
// ============================================================================

interface ActivityLogEntry {
  timestamp: string;
  action: string;
  claimId?: string;
  details?: Record<string, unknown>;
}

const ACTIVITY_LOG_KEY = 'nizkin_activity_log';

function logActivity(action: string, claimId?: string, details?: Record<string, unknown>) {
  const entry: ActivityLogEntry = {
    timestamp: new Date().toISOString(),
    action,
    claimId,
    details,
  };
  try {
    const existing: ActivityLogEntry[] = JSON.parse(localStorage.getItem(ACTIVITY_LOG_KEY) || '[]');
    existing.push(entry);
    // Keep last 500 entries
    if (existing.length > 500) existing.splice(0, existing.length - 500);
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(existing));
  } catch { /* quota */ }
}

export function getActivityLog(): ActivityLogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(ACTIVITY_LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

// ============================================================================
// Helpers
// ============================================================================

async function isOnline(): Promise<boolean> {
  return await isSupabaseReachable();
}

async function invokeEdgeFunction<T = unknown>(
  fnName: string,
  options: { method?: string; body?: unknown; params?: Record<string, string> } = {}
): Promise<{ data: T | null; error: string | null }> {
  if (!supabase) return { data: null, error: 'Supabase not configured' };

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: null, error: 'Not authenticated' };

  const queryStr = options.params
    ? '?' + new URLSearchParams(options.params).toString()
    : '';

  const response = await supabase.functions.invoke(`${fnName}${queryStr}`, {
    body: options.body ?? undefined,
    method: options.method as 'POST' | 'GET' | undefined,
  });

  if (response.error) {
    return { data: null, error: response.error.message };
  }
  return { data: response.data as T, error: null };
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * List claims with optional filters and pagination.
 * Falls back to localStorage when offline.
 */
export async function listClaims(params: NizkinListParams = {}): Promise<NizkinListResult> {
  const online = await isOnline();

  if (online) {
    const queryParams: Record<string, string> = {};
    if (params.status) queryParams.status = params.status;
    if (params.claimType) queryParams.claim_type = params.claimType;
    if (params.search) queryParams.search = params.search;
    if (params.page) queryParams.page = String(params.page);
    if (params.limit) queryParams.limit = String(params.limit);

    const { data, error } = await invokeEdgeFunction<NizkinListResult>('nizkin-claims', {
      method: 'GET',
      params: queryParams,
    });

    if (!error && data?.success) {
      return data;
    }
    // Fall through to localStorage on error
  }

  // Offline fallback
  let claims = getTortClaims();
  if (params.status) claims = claims.filter(c => c.status === params.status);
  if (params.claimType) claims = claims.filter(c => c.claim_type === params.claimType);
  if (params.search) {
    const s = params.search.toLowerCase();
    claims = claims.filter(c =>
      c.plaintiff_name.toLowerCase().includes(s) ||
      c.court_name.toLowerCase().includes(s) ||
      c.defendants.some(d => d.name.toLowerCase().includes(s))
    );
  }

  const page = params.page || 1;
  const limit = params.limit || 50;
  const total = claims.length;
  const start = (page - 1) * limit;
  const paged = claims.slice(start, start + limit);

  return {
    success: true,
    data: paged,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * Get a single claim by ID.
 */
export async function getClaim(id: string): Promise<NizkinSingleResult> {
  const online = await isOnline();

  if (online) {
    const { data, error } = await invokeEdgeFunction<NizkinSingleResult>('nizkin-claims', {
      method: 'GET',
      params: { id },
    });
    if (!error && data?.success) return data;
  }

  const claim = getTortClaimById(id);
  if (!claim) return { success: false, error: 'Claim not found' };
  return { success: true, data: claim };
}

/**
 * Create a new claim.
 */
export async function createClaim(claim: Omit<TortClaim, 'id'>): Promise<NizkinSingleResult> {
  // Always save locally first
  const saved = addTortClaim(claim);
  logActivity('create', saved.id, { claim_type: saved.claim_type, plaintiff: saved.plaintiff_name });

  const online = await isOnline();
  if (online) {
    await invokeEdgeFunction('nizkin-claims', {
      method: 'POST',
      body: { ...saved },
    });
  }

  return { success: true, data: saved };
}

/**
 * Update a claim (partial).
 */
export async function patchClaim(id: string, updates: Partial<TortClaim>): Promise<NizkinSingleResult> {
  const updated = updateTortClaim(id, updates);
  if (!updated) return { success: false, error: 'Claim not found' };

  logActivity('update', id, { fields: Object.keys(updates) });

  const online = await isOnline();
  if (online) {
    await invokeEdgeFunction('nizkin-claims', {
      method: 'PATCH',
      body: { id, ...updates },
    });
  }

  return { success: true, data: updated };
}

/**
 * Delete a claim.
 */
export async function removeClaim(id: string): Promise<{ success: boolean; error?: string }> {
  const deleted = deleteTortClaim(id);
  if (!deleted) return { success: false, error: 'Claim not found' };

  logActivity('delete', id);

  const online = await isOnline();
  if (online) {
    await invokeEdgeFunction('nizkin-claims', {
      method: 'DELETE',
      params: { id },
    });
  }

  return { success: true };
}

/**
 * Approve a claim (validate required fields, change status).
 */
export async function approveClaim(id: string): Promise<NizkinApproveResult> {
  const claim = getTortClaimById(id);
  if (!claim) return { success: false, error: 'Claim not found' };

  // Client-side validation
  const missing: string[] = [];
  if (!claim.plaintiff_name) missing.push('plaintiff_name');
  if (!claim.incident_date) missing.push('incident_date');
  if (!claim.court_name) missing.push('court_name');
  if (!claim.defendants || claim.defendants.length === 0) missing.push('defendants');
  if (!claim.incident_description) missing.push('incident_description');

  if (missing.length > 0) {
    return { success: false, error: 'Missing required fields', missing_fields: missing };
  }

  const updated = updateTortClaim(id, { status: 'approved' });
  logActivity('approve', id);

  const online = await isOnline();
  if (online) {
    await invokeEdgeFunction('nizkin-claims', {
      method: 'POST',
      params: { action: 'approve', id },
    });
  }

  return { success: true, data: updated || undefined };
}

/**
 * Change claim status.
 */
export async function changeStatus(id: string, status: TortClaimStatus): Promise<NizkinSingleResult> {
  logActivity('status_change', id, { status });
  return patchClaim(id, { status });
}

/**
 * Generate AI draft for a claim.
 */
export async function generateDraft(
  claim: TortClaim,
  attachmentTexts?: AttachmentAnalysis[],
  additionalInstructions?: string
): Promise<NizkinGenerateResult> {
  const startTime = Date.now();

  logActivity('generate_start', claim.id, {
    claim_type: claim.claim_type,
    has_additional_instructions: !!additionalInstructions,
  });

  const modifiedClaim = additionalInstructions
    ? { ...claim, legal_arguments: (claim.legal_arguments || '') + '\n\nהנחיות נוספות: ' + additionalInstructions }
    : claim;

  const result = await generateClaimDraft(modifiedClaim, attachmentTexts);
  const latency = Date.now() - startTime;

  logActivity('generate_complete', claim.id, {
    success: result.success,
    latency_ms: latency,
    draft_length: result.draft?.length || 0,
    model: result.model,
  });

  if (result.success && result.draft) {
    // Save draft locally
    updateTortClaim(claim.id, { generated_draft: result.draft });

    // Merge causes_of_action and relevant_laws
    if (result.causes_of_action?.length) {
      const merged = [...new Set([...claim.causes_of_action, ...result.causes_of_action])];
      updateTortClaim(claim.id, { causes_of_action: merged });
    }
    if (result.relevant_laws?.length) {
      const merged = [...new Set([...claim.relevant_laws, ...result.relevant_laws])];
      updateTortClaim(claim.id, { relevant_laws: merged });
    }
  }

  return { ...result, latency_ms: latency };
}

/**
 * Analyze an attachment with AI.
 */
export async function analyzeClaimAttachment(
  file: File,
  attachmentType: AttachmentAnalysis['type'] = 'medical_opinion'
): Promise<AttachmentAnalysisResult> {
  logActivity('analyze_attachment', undefined, {
    filename: file.name,
    size: file.size,
    type: attachmentType,
  });

  const result = await analyzeAttachment(file, attachmentType);

  logActivity('analyze_complete', undefined, {
    filename: file.name,
    success: result.success,
    has_disability: !!result.analysis?.extractedData?.disabilityPercentage,
  });

  return result;
}

/**
 * Get statute of limitations for a claim.
 */
export function getStatuteWarning(id: string): NizkinStatuteResult {
  const claim = getTortClaimById(id);
  if (!claim) return { success: false, error: 'Claim not found' };

  const statute = calculateStatuteOfLimitations(claim.claim_type, claim.incident_date);
  if (!statute) return { success: true, data: undefined };

  return { success: true, data: statute };
}

/**
 * Get count of open (draft/review) claims for sidebar badge.
 */
export function getOpenClaimsCount(): number {
  const claims = getTortClaims();
  return claims.filter(c => c.status === 'draft' || c.status === 'review').length;
}

/**
 * Get claims at risk of statute expiry (< 90 days).
 */
export function getUrgentStatuteClaims(): (TortClaim & { statute: StatuteResult })[] {
  const claims = getTortClaims();
  const results: (TortClaim & { statute: StatuteResult })[] = [];

  for (const claim of claims) {
    if (claim.status === 'filed') continue; // already filed, no risk
    const statute = calculateStatuteOfLimitations(claim.claim_type, claim.incident_date);
    if (statute && !statute.isExpired && statute.daysRemaining < 90) {
      results.push({ ...claim, statute });
    }
  }

  return results.sort((a, b) => a.statute.daysRemaining - b.statute.daysRemaining);
}

/**
 * Download helper: get claim data for document generation.
 * Returns the claim data (generation happens client-side).
 */
export async function getClaimForDownload(id: string): Promise<NizkinSingleResult> {
  logActivity('download', id);
  return getClaim(id);
}
