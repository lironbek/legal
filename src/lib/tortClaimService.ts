// Tort Claim Service - CRUD operations with localStorage
// Follows the same pattern as dataManager.ts

import { getCurrentCompany } from './dataManager';
import type { TortClaim } from './tortClaimTypes';

const STORAGE_KEY = 'tortClaims';
const AUTOSAVE_KEY = 'tortClaim_autosave';

const generateId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).substring(2);

const readAll = (): TortClaim[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const writeAll = (claims: TortClaim[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(claims));
};

export const getTortClaims = (): TortClaim[] => {
  const companyId = getCurrentCompany();
  if (!companyId) return [];
  return readAll().filter(c => c.company_id === companyId);
};

export const getTortClaimById = (id: string): TortClaim | undefined => {
  return readAll().find(c => c.id === id);
};

export const getTortClaimsByCase = (caseId: string): TortClaim[] => {
  const companyId = getCurrentCompany();
  if (!companyId) return [];
  return readAll().filter(c => c.company_id === companyId && c.case_id === caseId);
};

export const addTortClaim = (claim: Omit<TortClaim, 'id'>): TortClaim => {
  const all = readAll();
  const now = new Date().toISOString();
  const newClaim: TortClaim = {
    ...claim,
    id: generateId(),
    created_at: now,
    updated_at: now,
  };
  all.push(newClaim);
  writeAll(all);
  clearAutosave();
  return newClaim;
};

export const updateTortClaim = (id: string, updates: Partial<TortClaim>): TortClaim | null => {
  const all = readAll();
  const index = all.findIndex(c => c.id === id);
  if (index === -1) return null;
  all[index] = {
    ...all[index],
    ...updates,
    id,
    updated_at: new Date().toISOString(),
  };
  writeAll(all);
  return all[index];
};

export const deleteTortClaim = (id: string): boolean => {
  const all = readAll();
  const filtered = all.filter(c => c.id !== id);
  if (filtered.length === all.length) return false;
  writeAll(filtered);
  return true;
};

// ============ Auto-save for wizard ============

export const saveAutosave = (data: Partial<TortClaim>) => {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
      data,
      savedAt: new Date().toISOString(),
    }));
  } catch { /* ignore quota errors */ }
};

export const loadAutosave = (): { data: Partial<TortClaim>; savedAt: string } | null => {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearAutosave = () => {
  localStorage.removeItem(AUTOSAVE_KEY);
};
