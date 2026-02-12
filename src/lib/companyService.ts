// Company Service - Syncs companies & assignments between Supabase and localStorage
// Uses global_firm_settings table as persistent KV store

import { supabase } from './supabase';
import type { Company, UserCompanyAssignment } from './dataManager';

const COMPANIES_KEY = 'companies_list';
const ASSIGNMENTS_KEY = 'user_company_assignments_list';

// ============ Read from Supabase ============

async function readSetting<T>(key: string): Promise<T | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('global_firm_settings')
      .select('setting_value')
      .eq('setting_key', key)
      .maybeSingle();
    if (error || !data) return null;
    return data.setting_value as T;
  } catch {
    return null;
  }
}

async function writeSetting<T>(key: string, value: T): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('global_firm_settings')
      .upsert(
        { setting_key: key, setting_value: value, updated_at: new Date().toISOString() },
        { onConflict: 'setting_key' }
      );
    return !error;
  } catch {
    return false;
  }
}

// ============ Companies ============

export async function fetchCompaniesFromSupabase(): Promise<Company[] | null> {
  return readSetting<Company[]>(COMPANIES_KEY);
}

export async function saveCompaniesToSupabase(companies: Company[]): Promise<boolean> {
  return writeSetting(COMPANIES_KEY, companies);
}

// ============ Assignments ============

export async function fetchAssignmentsFromSupabase(): Promise<UserCompanyAssignment[] | null> {
  return readSetting<UserCompanyAssignment[]>(ASSIGNMENTS_KEY);
}

export async function saveAssignmentsToSupabase(assignments: UserCompanyAssignment[]): Promise<boolean> {
  return writeSetting(ASSIGNMENTS_KEY, assignments);
}

// ============ Sync: Supabase -> localStorage ============

export async function syncFromSupabase(): Promise<{ synced: boolean }> {
  if (!supabase) return { synced: false };

  try {
    const [remoteCompanies, remoteAssignments] = await Promise.all([
      fetchCompaniesFromSupabase(),
      fetchAssignmentsFromSupabase(),
    ]);

    let synced = false;

    if (remoteCompanies && remoteCompanies.length > 0) {
      // Merge: remote is source of truth, but preserve local-only entries
      const localCompanies: Company[] = JSON.parse(localStorage.getItem('companies') || '[]');
      const remoteIds = new Set(remoteCompanies.map(c => c.id));
      const remoteSlugs = new Set(remoteCompanies.map(c => c.slug));

      // Keep local companies that aren't in remote (by id AND slug)
      const localOnly = localCompanies.filter(
        c => !remoteIds.has(c.id) && !remoteSlugs.has(c.slug)
      );

      const merged = [...remoteCompanies, ...localOnly];
      localStorage.setItem('companies', JSON.stringify(merged));
      synced = true;
    }

    if (remoteAssignments && remoteAssignments.length > 0) {
      const localAssignments: UserCompanyAssignment[] = JSON.parse(
        localStorage.getItem('user-company-assignments') || '[]'
      );
      const remoteKeys = new Set(remoteAssignments.map(a => `${a.user_id}:${a.company_id}`));
      const localOnly = localAssignments.filter(
        a => !remoteKeys.has(`${a.user_id}:${a.company_id}`)
      );

      const merged = [...remoteAssignments, ...localOnly];
      localStorage.setItem('user-company-assignments', JSON.stringify(merged));
      synced = true;
    }

    return { synced };
  } catch (err) {
    console.warn('Failed to sync from Supabase:', err);
    return { synced: false };
  }
}

// ============ Sync: localStorage -> Supabase (fire-and-forget) ============

export function pushCompaniesToSupabase(): void {
  const companies: Company[] = JSON.parse(localStorage.getItem('companies') || '[]');
  saveCompaniesToSupabase(companies).catch(() => {});
}

export function pushAssignmentsToSupabase(): void {
  const assignments: UserCompanyAssignment[] = JSON.parse(
    localStorage.getItem('user-company-assignments') || '[]'
  );
  saveAssignmentsToSupabase(assignments).catch(() => {});
}

// ============ Seed initial data ============

export async function seedInitialCompanies(): Promise<void> {
  // Check if companies already exist in Supabase
  const existing = await fetchCompaniesFromSupabase();
  if (existing && existing.length > 0) return; // Already seeded

  const now = new Date().toISOString();

  const defaultCompanies: Company[] = [
    {
      id: 'company-main-001',
      slug: 'main',
      name: 'משרד ראשי',
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'company-sperger-002',
      slug: 'sperger-law',
      name: 'שפרגר ושות׳ משרד עורכי דין',
      legal_name: 'שפרגר ושות׳ משרד עורכי דין',
      email: 'ts@sperger-law.co.il',
      phone: '046208110',
      address: 'אקליטופס 1 רמת ישי',
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ];

  const defaultAssignments: UserCompanyAssignment[] = [
    // lironbek88@gmail.com -> both companies (admin)
    {
      id: 'assign-admin-main',
      user_id: '2a18ade1-0b1b-4fb7-8172-0321a37c38fa',
      company_id: 'company-main-001',
      role: 'admin',
      is_primary: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'assign-admin-sperger',
      user_id: '2a18ade1-0b1b-4fb7-8172-0321a37c38fa',
      company_id: 'company-sperger-002',
      role: 'admin',
      is_primary: false,
      created_at: now,
      updated_at: now,
    },
    // lior@sperger-law.co.il -> Sperger only
    {
      id: 'assign-lior-sperger',
      user_id: '08a4212e-b3be-438e-9ab1-5eb67049573f',
      company_id: 'company-sperger-002',
      role: 'viewer',
      is_primary: true,
      created_at: now,
      updated_at: now,
    },
  ];

  await Promise.all([
    saveCompaniesToSupabase(defaultCompanies),
    saveAssignmentsToSupabase(defaultAssignments),
  ]);

  // Also write to localStorage
  localStorage.setItem('companies', JSON.stringify(defaultCompanies));
  localStorage.setItem('user-company-assignments', JSON.stringify(defaultAssignments));
}
