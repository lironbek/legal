import { createClient } from '@supabase/supabase-js'

// Use environment variables or fallback to development values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'

// Only create client if we have valid credentials
let supabase: any = null
let supabaseAdmin: any = null

if (supabaseUrl && supabaseAnonKey && 
    supabaseUrl !== 'https://placeholder.supabase.co' && 
    supabaseAnonKey !== 'placeholder-key') {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    console.warn('Failed to create Supabase client:', error)
  }
}

// Create admin client with service role key for admin operations
if (supabaseUrl && supabaseServiceRoleKey &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseServiceRoleKey !== 'placeholder-service-key') {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        storageKey: 'supabase-admin-auth'
      }
    })
  } catch (error) {
    console.warn('Failed to create Supabase admin client:', error)
  }
}

export { supabase, supabaseAdmin }

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
