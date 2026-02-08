import { createClient } from '@supabase/supabase-js'

// Use environment variables or fallback to development values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'

// Only create main client if we have valid credentials
let supabase: any = null

if (supabaseUrl && supabaseAnonKey &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseAnonKey !== 'placeholder-key') {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    console.warn('Failed to create Supabase client:', error)
  }
}

// Admin client is lazy-initialized to avoid "Multiple GoTrueClient" warning
let _supabaseAdmin: any = null
let _adminInitialized = false

function getSupabaseAdmin() {
  if (_adminInitialized) return _supabaseAdmin
  _adminInitialized = true

  if (supabaseUrl && supabaseServiceRoleKey &&
      supabaseUrl !== 'https://placeholder.supabase.co' &&
      supabaseServiceRoleKey !== 'placeholder-service-key') {
    try {
      _supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
          storageKey: 'supabase-admin-auth'
        }
      })
    } catch (error) {
      console.warn('Failed to create Supabase admin client:', error)
    }
  }
  return _supabaseAdmin
}

// supabaseAdmin is a getter that lazy-initializes on first access
const supabaseAdmin = new Proxy({} as any, {
  get(_target, prop) {
    const admin = getSupabaseAdmin()
    if (!admin) return undefined
    return admin[prop]
  }
})

// Check if admin client would be available (without initializing)
export function hasAdminCredentials(): boolean {
  return !!(supabaseUrl && supabaseServiceRoleKey &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseServiceRoleKey !== 'placeholder-service-key')
}

export { supabase, supabaseAdmin }

// ============================================================
// Shared Supabase connectivity check (cached, with 3s timeout)
// Use: const reachable = await isSupabaseReachable()
// ============================================================
let _connectivityPromise: Promise<boolean> | null = null

export function isSupabaseReachable(): Promise<boolean> {
  if (_connectivityPromise !== null) return _connectivityPromise
  if (!supabase) {
    _connectivityPromise = Promise.resolve(false)
    return _connectivityPromise
  }
  _connectivityPromise = Promise.race([
    supabase.from('profiles').select('id').limit(1).then((res: any) => !res.error),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 15000))
  ]).catch(() => false)
  return _connectivityPromise
}

// Types for user management
export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: 'client' | 'assistant' | 'lawyer' | 'admin'
  phone?: string
  department?: string
  address?: string
  city?: string
  postal_code?: string
  birth_date?: string
  id_number?: string
  emergency_contact?: string
  emergency_phone?: string
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PermissionGroup {
  id: string
  name: string
  description: string
  created_at: string
  updated_at: string
}

export interface UserPermission {
  id: string
  user_id: string
  permission_group_id?: string
  can_view_dashboard: boolean
  can_view_cases: boolean
  can_edit_cases: boolean
  can_delete_cases: boolean
  can_view_clients: boolean
  can_edit_clients: boolean
  can_view_reports: boolean
  can_edit_reports: boolean
  can_view_documents: boolean
  can_edit_documents: boolean
  can_view_calendar: boolean
  can_edit_calendar: boolean
  can_view_billing: boolean
  can_edit_billing: boolean
  can_view_time_tracking: boolean
  can_edit_time_tracking: boolean
  can_view_legal_library: boolean
  can_edit_legal_library: boolean
  can_view_disability_calculator: boolean
  can_edit_disability_calculator: boolean
  can_view_cash_flow: boolean
  can_edit_cash_flow: boolean
  can_view_budget: boolean
  can_edit_budget: boolean
  can_manage_users: boolean
  can_manage_permission_groups: boolean
  can_manage_system_settings: boolean
  can_view_audit_logs: boolean
  created_at: string
  updated_at: string
}

export interface MenuItem {
  id: string
  name: string
  path: string
  icon: string
  category: 'main' | 'management' | 'tools' | 'reports'
  requires_permission: keyof Omit<UserPermission, 'id' | 'user_id' | 'created_at' | 'updated_at'>
}
