import { useState, useEffect } from 'react'
import { supabase, supabaseAdmin, isSupabaseReachable, UserProfile, UserPermission, PermissionGroup } from '@/lib/supabase'
import { toast } from 'sonner'
import { getCurrentCompany, addUserCompanyAssignment } from '@/lib/dataManager'

// After connectivity test completes, these are used synchronously
let _mockMode = true // default to mock until tested

async function ensureConnectivityTested(): Promise<void> {
  const reachable = await isSupabaseReachable()
  _mockMode = !reachable
  if (_mockMode && supabase) {
    console.warn('Supabase unreachable — using mock mode (localStorage)')
  }
}

/** True when we should use localStorage instead of Supabase */
function isMockMode(): boolean {
  return !supabase || _mockMode
}

/** True when admin operations should use mock mode */
function isAdminMockMode(): boolean {
  return isMockMode() || !supabaseAdmin
}

// ============================================================

export function useUsers() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [permissions, setPermissions] = useState<UserPermission[]>([])
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true)
      await ensureConnectivityTested()

      if (isMockMode()) {
        const mockUsers = JSON.parse(localStorage.getItem('mock-users') || '[]')
        setUsers(mockUsers)
        return
      }

      const { data, error } = await supabase!
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת משתמשים')
      // Fall back to mock mode on error
      try {
        const mockUsers = JSON.parse(localStorage.getItem('mock-users') || '[]')
        setUsers(mockUsers)
      } catch (mockErr) {
        console.error('Failed to load mock users:', mockErr)
      }
    } finally {
      setLoading(false)
    }
  }

  // Fetch user permissions
  const fetchPermissions = async () => {
    await ensureConnectivityTested()

    if (isMockMode()) {
      const mockPermissions = JSON.parse(localStorage.getItem('mock-permissions') || '[]')
      setPermissions(mockPermissions)
      return
    }
    try {
      const { data, error } = await supabase!
        .from('user_permissions')
        .select('*')

      if (error) throw error
      setPermissions(data || [])
    } catch (err) {
      console.error('Error fetching permissions:', err)
      const mockPermissions = JSON.parse(localStorage.getItem('mock-permissions') || '[]')
      setPermissions(mockPermissions)
    }
  }

  // Fetch permission groups
  const fetchPermissionGroups = async () => {
    await ensureConnectivityTested()

    if (isMockMode()) {
      const mockGroups = JSON.parse(localStorage.getItem('mock-permission-groups') || '[]')
      setPermissionGroups(mockGroups)
      return
    }
    try {
      const { data, error } = await supabase!
        .from('permission_groups')
        .select('*')
        .order('name')

      if (error) throw error
      setPermissionGroups(data || [])
    } catch (err) {
      console.error('Error fetching permission groups:', err)
      // Fall back to mock mode
      const mockGroups = JSON.parse(localStorage.getItem('mock-permission-groups') || '[]')
      setPermissionGroups(mockGroups)
    }
  }

  // Create new user
  const createUser = async (userData: Omit<UserProfile, 'id' | 'created_at'>, password: string) => {
    try {
      if (isAdminMockMode()) {
        // Mock mode - create user in localStorage
        const mockId = crypto.randomUUID()
        const newUser: UserProfile = {
          ...userData,
          id: mockId,
          created_at: new Date().toISOString()
        }

        const existingUsers = JSON.parse(localStorage.getItem('mock-users') || '[]')
        existingUsers.push(newUser)
        localStorage.setItem('mock-users', JSON.stringify(existingUsers))

        // Store password (use phone number as default if password is empty)
        const mockPasswords = JSON.parse(localStorage.getItem('mock-passwords') || '{}')
        mockPasswords[userData.email] = password || userData.phone || '123456'
        localStorage.setItem('mock-passwords', JSON.stringify(mockPasswords))

        // Create default permissions
        const defaultPermissions = getDefaultPermissionsForRole(userData.role)
        const existingPermissions = JSON.parse(localStorage.getItem('mock-permissions') || '[]')
        existingPermissions.push({
          id: crypto.randomUUID(),
          user_id: mockId,
          ...defaultPermissions,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        localStorage.setItem('mock-permissions', JSON.stringify(existingPermissions))

        // Auto-assign to current company
        const currentCompanyId = getCurrentCompany()
        if (currentCompanyId) {
          const roleMapping: Record<string, 'owner' | 'admin' | 'lawyer' | 'assistant' | 'viewer'> = {
            admin: 'admin',
            lawyer: 'lawyer',
            assistant: 'assistant',
            client: 'viewer',
          }
          addUserCompanyAssignment(mockId, currentCompanyId, roleMapping[userData.role] || 'viewer', true)
        }

        toast.success('משתמש נוצר בהצלחה')
        fetchUsers()
        fetchPermissions()
        return true
      }

      // Real Supabase mode - create auth user using admin client
      const { data: authData, error: authError } = await supabaseAdmin!.auth.admin.createUser({
        email: userData.email,
        password: password,
        email_confirm: true
      })

      if (authError) throw authError

      // Then create profile
      const { error: profileError } = await supabase!
        .from('profiles')
        .insert([{ ...userData, id: authData.user.id }])

      if (profileError) throw profileError

      // Create default permissions based on role
      const defaultPermissions = getDefaultPermissionsForRole(userData.role)
      const { error: permError } = await supabase!
        .from('user_permissions')
        .insert([{
          user_id: authData.user.id,
          ...defaultPermissions
        }])

      if (permError) throw permError

      // Auto-assign to current company
      const currentCompanyId = getCurrentCompany()
      if (currentCompanyId) {
        const roleMapping: Record<string, 'owner' | 'admin' | 'lawyer' | 'assistant' | 'viewer'> = {
          admin: 'admin',
          lawyer: 'lawyer',
          assistant: 'assistant',
          client: 'viewer',
        }
        addUserCompanyAssignment(authData.user.id, currentCompanyId, roleMapping[userData.role] || 'viewer', true)
      }

      toast.success('משתמש נוצר בהצלחה')
      fetchUsers()
      fetchPermissions()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'שגיאה ביצירת משתמש'
      setError(message)
      toast.error(message)
      return false
    }
  }

  // Get default permissions for role
  const getDefaultPermissionsForRole = (role: UserProfile['role']) => {
    switch (role) {
      case 'admin':
        return {
          can_view_dashboard: true,
          can_view_cases: true,
          can_edit_cases: true,
          can_delete_cases: true,
          can_view_clients: true,
          can_edit_clients: true,
          can_view_reports: true,
          can_edit_reports: true,
          can_view_documents: true,
          can_edit_documents: true,
          can_view_calendar: true,
          can_edit_calendar: true,
          can_view_billing: true,
          can_edit_billing: true,
          can_view_time_tracking: true,
          can_edit_time_tracking: true,
          can_view_legal_library: true,
          can_edit_legal_library: true,
          can_view_disability_calculator: true,
          can_edit_disability_calculator: true,
          can_view_cash_flow: true,
          can_edit_cash_flow: true,
          can_view_budget: true,
          can_edit_budget: true,
          can_manage_users: true,
          can_manage_permission_groups: true,
          can_manage_system_settings: true,
          can_view_audit_logs: true
        }
      case 'lawyer':
        return {
          can_view_dashboard: true,
          can_view_cases: true,
          can_edit_cases: true,
          can_delete_cases: false,
          can_view_clients: true,
          can_edit_clients: true,
          can_view_reports: true,
          can_edit_reports: false,
          can_view_documents: true,
          can_edit_documents: true,
          can_view_calendar: true,
          can_edit_calendar: true,
          can_view_billing: true,
          can_edit_billing: false,
          can_view_time_tracking: true,
          can_edit_time_tracking: true,
          can_view_legal_library: true,
          can_edit_legal_library: false,
          can_view_disability_calculator: true,
          can_edit_disability_calculator: false,
          can_view_cash_flow: true,
          can_edit_cash_flow: true,
          can_view_budget: true,
          can_edit_budget: false,
          can_manage_users: false,
          can_manage_permission_groups: false,
          can_manage_system_settings: false,
          can_view_audit_logs: false
        }
      case 'assistant':
        return {
          can_view_dashboard: true,
          can_view_cases: true,
          can_edit_cases: false,
          can_delete_cases: false,
          can_view_clients: true,
          can_edit_clients: false,
          can_view_reports: true,
          can_edit_reports: false,
          can_view_documents: true,
          can_edit_documents: false,
          can_view_calendar: true,
          can_edit_calendar: false,
          can_view_billing: false,
          can_edit_billing: false,
          can_view_time_tracking: true,
          can_edit_time_tracking: false,
          can_view_legal_library: true,
          can_edit_legal_library: false,
          can_view_disability_calculator: true,
          can_edit_disability_calculator: false,
          can_view_cash_flow: true,
          can_edit_cash_flow: false,
          can_view_budget: false,
          can_edit_budget: false,
          can_manage_users: false,
          can_manage_permission_groups: false,
          can_manage_system_settings: false,
          can_view_audit_logs: false
        }
      case 'client':
      default:
        return {
          can_view_dashboard: false,
          can_view_cases: false,
          can_edit_cases: false,
          can_delete_cases: false,
          can_view_clients: false,
          can_edit_clients: false,
          can_view_reports: false,
          can_edit_reports: false,
          can_view_documents: false,
          can_edit_documents: false,
          can_view_calendar: false,
          can_edit_calendar: false,
          can_view_billing: false,
          can_edit_billing: false,
          can_view_time_tracking: false,
          can_edit_time_tracking: false,
          can_view_legal_library: false,
          can_edit_legal_library: false,
          can_view_disability_calculator: false,
          can_edit_disability_calculator: false,
          can_view_cash_flow: false,
          can_edit_cash_flow: false,
          can_view_budget: false,
          can_edit_budget: false,
          can_manage_users: false,
          can_manage_permission_groups: false,
          can_manage_system_settings: false,
          can_view_audit_logs: false
        }
    }
  }

  // Ensure user has a permissions record, create default if missing
  const ensureUserPermissions = async (userId: string, role: UserProfile['role']): Promise<UserPermission | null> => {
    const existing = permissions.find(p => p.user_id === userId)
    if (existing) return existing

    const defaultPerms = getDefaultPermissionsForRole(role)
    const newPermission: UserPermission = {
      id: crypto.randomUUID(),
      user_id: userId,
      ...defaultPerms,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as UserPermission

    try {
      if (isMockMode()) {
        // Mock mode
        const existingPermissions = JSON.parse(localStorage.getItem('mock-permissions') || '[]')
        existingPermissions.push(newPermission)
        localStorage.setItem('mock-permissions', JSON.stringify(existingPermissions))
      } else {
        const { error } = await supabase!
          .from('user_permissions')
          .insert([{ user_id: userId, ...defaultPerms }])
        if (error) throw error
      }
      await fetchPermissions()
      // Return freshly fetched record
      return permissions.find(p => p.user_id === userId) || newPermission
    } catch (err) {
      console.error('Error creating permissions for user:', err)
      return null
    }
  }

  // Update user
  const updateUser = async (id: string, updates: Partial<UserProfile>) => {
    try {
      if (isMockMode()) {
        // Mock mode
        const existingUsers = JSON.parse(localStorage.getItem('mock-users') || '[]')
        const idx = existingUsers.findIndex((u: UserProfile) => u.id === id)
        if (idx !== -1) {
          existingUsers[idx] = { ...existingUsers[idx], ...updates, updated_at: new Date().toISOString() }
          localStorage.setItem('mock-users', JSON.stringify(existingUsers))
        }
        toast.success('משתמש עודכן בהצלחה')
        fetchUsers()
        return true
      }

      const { error } = await supabase!
        .from('profiles')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      toast.success('משתמש עודכן בהצלחה')
      fetchUsers()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'שגיאה בעדכון משתמש'
      setError(message)
      toast.error(message)
      return false
    }
  }

  // Update user permissions (upsert - insert if not found)
  const updatePermissions = async (userId: string, permissionUpdates: Partial<UserPermission>) => {
    try {
      if (isMockMode()) {
        // Mock mode
        const existingPermissions = JSON.parse(localStorage.getItem('mock-permissions') || '[]')
        const idx = existingPermissions.findIndex((p: any) => p.user_id === userId)
        if (idx !== -1) {
          existingPermissions[idx] = { ...existingPermissions[idx], ...permissionUpdates, updated_at: new Date().toISOString() }
        } else {
          // Insert new record if not found
          existingPermissions.push({
            id: crypto.randomUUID(),
            user_id: userId,
            ...permissionUpdates,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
        localStorage.setItem('mock-permissions', JSON.stringify(existingPermissions))
        toast.success('הרשאות עודכנו בהצלחה')
        fetchPermissions()
        return true
      }

      const { error } = await supabase!
        .from('user_permissions')
        .upsert({ user_id: userId, ...permissionUpdates, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

      if (error) throw error

      toast.success('הרשאות עודכנו בהצלחה')
      fetchPermissions()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'שגיאה בעדכון הרשאות'
      setError(message)
      toast.error(message)
      return false
    }
  }

  // Apply permission group to user
  const applyPermissionGroup = async (userId: string, groupId: string) => {
    try {
      const group = permissionGroups.find(g => g.id === groupId) as any
      if (!group) throw new Error('קבוצת הרשאות לא נמצאה')

      // Extract permission fields from the group
      const groupPermissions = getGroupPermissionValues(group)

      const permissionUpdates = {
        permission_group_id: groupId,
        ...groupPermissions
      }

      if (isMockMode()) {
        // Mock mode
        const existingPermissions = JSON.parse(localStorage.getItem('mock-permissions') || '[]')
        const idx = existingPermissions.findIndex((p: any) => p.user_id === userId)
        if (idx !== -1) {
          existingPermissions[idx] = { ...existingPermissions[idx], ...permissionUpdates, updated_at: new Date().toISOString() }
        } else {
          existingPermissions.push({
            id: crypto.randomUUID(),
            user_id: userId,
            ...permissionUpdates,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
        localStorage.setItem('mock-permissions', JSON.stringify(existingPermissions))
        toast.success('קבוצת הרשאות הוחלה בהצלחה')
        fetchPermissions()
        return true
      }

      const { error } = await supabase!
        .from('user_permissions')
        .upsert({ user_id: userId, ...permissionUpdates, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

      if (error) throw error

      toast.success('קבוצת הרשאות הוחלה בהצלחה')
      fetchPermissions()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'שגיאה בהחלת קבוצת הרשאות'
      setError(message)
      toast.error(message)
      return false
    }
  }

  // Extract permission boolean values from a group object
  const getGroupPermissionValues = (group: any) => {
    const permKeys = [
      'can_view_dashboard', 'can_view_cases', 'can_edit_cases', 'can_delete_cases',
      'can_view_clients', 'can_edit_clients', 'can_view_reports', 'can_edit_reports',
      'can_view_documents', 'can_edit_documents', 'can_view_calendar', 'can_edit_calendar',
      'can_view_billing', 'can_edit_billing', 'can_view_time_tracking', 'can_edit_time_tracking',
      'can_view_legal_library', 'can_edit_legal_library', 'can_view_disability_calculator', 'can_edit_disability_calculator',
      'can_view_cash_flow', 'can_edit_cash_flow', 'can_view_budget', 'can_edit_budget',
      'can_manage_users', 'can_manage_permission_groups', 'can_manage_system_settings', 'can_view_audit_logs'
    ]
    const result: Record<string, boolean> = {}
    for (const key of permKeys) {
      if (key in group) result[key] = group[key]
    }
    return result
  }

  // Permission group CRUD
  const createPermissionGroup = async (name: string, description: string, perms: Record<string, boolean>) => {
    try {
      const newGroup = {
        id: crypto.randomUUID(),
        name,
        description,
        ...perms,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      if (isMockMode()) {
        const existing = JSON.parse(localStorage.getItem('mock-permission-groups') || '[]')
        existing.push(newGroup)
        localStorage.setItem('mock-permission-groups', JSON.stringify(existing))
      } else {
        const { error } = await supabase!.from('permission_groups').insert([newGroup])
        if (error) throw error
      }

      toast.success('קבוצת הרשאות נוצרה בהצלחה')
      fetchPermissionGroups()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'שגיאה ביצירת קבוצת הרשאות'
      toast.error(message)
      return false
    }
  }

  const updatePermissionGroup = async (id: string, updates: { name?: string; description?: string } & Record<string, any>) => {
    try {
      if (isMockMode()) {
        const existing = JSON.parse(localStorage.getItem('mock-permission-groups') || '[]')
        const idx = existing.findIndex((g: any) => g.id === id)
        if (idx !== -1) {
          existing[idx] = { ...existing[idx], ...updates, updated_at: new Date().toISOString() }
          localStorage.setItem('mock-permission-groups', JSON.stringify(existing))
        }
      } else {
        const { error } = await supabase!.from('permission_groups').update(updates).eq('id', id)
        if (error) throw error
      }

      toast.success('קבוצת הרשאות עודכנה בהצלחה')
      fetchPermissionGroups()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'שגיאה בעדכון קבוצת הרשאות'
      toast.error(message)
      return false
    }
  }

  const deletePermissionGroup = async (id: string) => {
    try {
      if (isMockMode()) {
        const existing = JSON.parse(localStorage.getItem('mock-permission-groups') || '[]')
        const filtered = existing.filter((g: any) => g.id !== id)
        localStorage.setItem('mock-permission-groups', JSON.stringify(filtered))
      } else {
        const { error } = await supabase!.from('permission_groups').delete().eq('id', id)
        if (error) throw error
      }

      toast.success('קבוצת הרשאות נמחקה בהצלחה')
      fetchPermissionGroups()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'שגיאה במחיקת קבוצת הרשאות'
      toast.error(message)
      return false
    }
  }

  // Change user password
  const changeUserPassword = async (userId: string, newPassword: string) => {
    try {
      if (isAdminMockMode()) {
        // Mock mode - store the new password
        const mockUsers = JSON.parse(localStorage.getItem('mock-users') || '[]')
        const user = mockUsers.find((u: any) => u.id === userId)
        if (user) {
          const mockPasswords = JSON.parse(localStorage.getItem('mock-passwords') || '{}')
          mockPasswords[user.email] = newPassword
          localStorage.setItem('mock-passwords', JSON.stringify(mockPasswords))
        }
        toast.success('סיסמה שונתה בהצלחה')
        return true
      }

      // Update password in Supabase Auth using admin client
      const { error } = await supabaseAdmin!.auth.admin.updateUserById(userId, {
        password: newPassword
      })

      if (error) throw error

      toast.success('סיסמה שונתה בהצלחה')
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'שגיאה בשינוי סיסמה'
      setError(message)
      toast.error(message)
      return false
    }
  }

  // Delete user
  const deleteUser = async (id: string) => {
    try {
      if (isAdminMockMode()) {
        // Mock mode - delete from localStorage
        const existingUsers = JSON.parse(localStorage.getItem('mock-users') || '[]')
        const filteredUsers = existingUsers.filter((u: UserProfile) => u.id !== id)
        localStorage.setItem('mock-users', JSON.stringify(filteredUsers))

        const existingPermissions = JSON.parse(localStorage.getItem('mock-permissions') || '[]')
        const filteredPermissions = existingPermissions.filter((p: any) => p.user_id !== id)
        localStorage.setItem('mock-permissions', JSON.stringify(filteredPermissions))

        toast.success('משתמש נמחק בהצלחה')
        fetchUsers()
        fetchPermissions()
        return true
      }

      // Real Supabase mode - delete related records first, then delete auth user
      await supabase!.from('user_permissions').delete().eq('user_id', id)
      await supabase!.from('profiles').delete().eq('id', id)

      const { error } = await supabaseAdmin!.auth.admin.deleteUser(id)
      if (error) throw error

      toast.success('משתמש נמחק בהצלחה')
      fetchUsers()
      fetchPermissions()
      return true
    } catch (err) {
      console.error('Error deleting user:', err)
      // Fall back to mock mode on error
      try {
        const existingUsers = JSON.parse(localStorage.getItem('mock-users') || '[]')
        const filteredUsers = existingUsers.filter((u: UserProfile) => u.id !== id)
        localStorage.setItem('mock-users', JSON.stringify(filteredUsers))

        const existingPermissions = JSON.parse(localStorage.getItem('mock-permissions') || '[]')
        const filteredPermissions = existingPermissions.filter((p: any) => p.user_id !== id)
        localStorage.setItem('mock-permissions', JSON.stringify(filteredPermissions))

        toast.success('משתמש נמחק בהצלחה')
        fetchUsers()
        fetchPermissions()
        return true
      } catch (fallbackErr) {
        const message = err instanceof Error ? err.message : 'שגיאה במחיקת משתמש'
        setError(message)
        toast.error(message)
        return false
      }
    }
  }

  // Toggle user active status
  const toggleUserStatus = async (id: string, isActive: boolean) => {
    return updateUser(id, { is_active: isActive })
  }

  // Get user permissions
  const getUserPermissions = (userId: string): UserPermission | undefined => {
    return permissions.find(p => p.user_id === userId)
  }

  // Check if user has specific permission
  const hasPermission = (userId: string, permission: keyof Omit<UserPermission, 'id' | 'user_id' | 'permission_group_id' | 'created_at' | 'updated_at'>): boolean => {
    const userPerms = getUserPermissions(userId)
    return userPerms?.[permission] || false
  }

  // Get user's accessible menu items
  const getUserMenuItems = (userId: string) => {
    const userPerms = getUserPermissions(userId)
    if (!userPerms) return []

    // Define menu items based on permissions
    const menuItems = [
      { id: 'dashboard', name: 'דשבורד', path: '/dashboard', icon: 'LayoutDashboard', requires: 'can_view_dashboard' },
      { id: 'cases', name: 'תיקים', path: '/cases', icon: 'Briefcase', requires: 'can_view_cases' },
      { id: 'clients', name: 'לקוחות', path: '/clients', icon: 'Users', requires: 'can_view_clients' },
      { id: 'documents', name: 'מסמכים', path: '/documents', icon: 'FileText', requires: 'can_view_documents' },
      { id: 'calendar', name: 'יומן', path: '/calendar', icon: 'Calendar', requires: 'can_view_calendar' },
      { id: 'billing', name: 'חיוב', path: '/billing', icon: 'CreditCard', requires: 'can_view_billing' },
      { id: 'time-tracking', name: 'מעקב זמן', path: '/time-tracking', icon: 'Clock', requires: 'can_view_time_tracking' },
      { id: 'reports', name: 'דוחות', path: '/reports', icon: 'BarChart3', requires: 'can_view_reports' },
      { id: 'legal-library', name: 'ספריה משפטית', path: '/legal-library', icon: 'BookOpen', requires: 'can_view_legal_library' },
      { id: 'disability-calculator', name: 'מחשבון נכות', path: '/disability-calculator', icon: 'Calculator', requires: 'can_view_disability_calculator' },
      { id: 'cash-flow', name: 'תזרים מזומנים', path: '/cash-flow', icon: 'TrendingUp', requires: 'can_view_cash_flow' },
      { id: 'budget', name: 'תקציב', path: '/budget', icon: 'PieChart', requires: 'can_view_budget' },
    ]

    return menuItems.filter(item => userPerms[item.requires as keyof UserPermission])
  }

  useEffect(() => {
    fetchUsers()
    fetchPermissions()
    fetchPermissionGroups()
  }, [])

  return {
    users,
    permissions,
    permissionGroups,
    loading,
    error,
    createUser,
    updateUser,
    updatePermissions,
    applyPermissionGroup,
    ensureUserPermissions,
    getDefaultPermissionsForRole,
    createPermissionGroup,
    updatePermissionGroup,
    deletePermissionGroup,
    changeUserPassword,
    deleteUser,
    toggleUserStatus,
    getUserPermissions,
    hasPermission,
    getUserMenuItems,
    refreshUsers: fetchUsers,
    refreshPermissions: fetchPermissions,
    refreshPermissionGroups: fetchPermissionGroups
  }
}
