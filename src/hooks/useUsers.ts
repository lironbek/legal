import { useState, useEffect } from 'react'
import { supabase, supabaseAdmin, UserProfile, UserPermission, PermissionGroup } from '@/lib/supabase'
import { toast } from 'sonner'

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
      
      // Check if we have a real Supabase connection
      if (!supabase) {
        // Mock mode - load from localStorage
        const mockUsers = JSON.parse(localStorage.getItem('mock-users') || '[]')
        setUsers(mockUsers)
        setLoading(false)
        return
      }

      // Test connection first
      try {
        const { data: testData, error: testError } = await supabase.from('profiles').select('id').limit(1)
        if (testError) {
          console.warn('Supabase connection test failed, falling back to mock mode:', testError)
          // Fall back to mock mode
          const mockUsers = JSON.parse(localStorage.getItem('mock-users') || '[]')
          setUsers(mockUsers)
          setLoading(false)
          return
        }
      } catch (testErr) {
        console.warn('Supabase connection test failed, falling back to mock mode:', testErr)
        // Fall back to mock mode
        const mockUsers = JSON.parse(localStorage.getItem('mock-users') || '[]')
        setUsers(mockUsers)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setUsers(data || [])
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת משתמשים')
      toast.error('שגיאה בטעינת משתמשים')
      
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
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')

      if (error) throw error
      setPermissions(data || [])
    } catch (err) {
      console.error('Error fetching permissions:', err)
    }
  }

  // Fetch permission groups
  const fetchPermissionGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('permission_groups')
        .select('*')
        .order('name')

      if (error) throw error
      setPermissionGroups(data || [])
    } catch (err) {
      console.error('Error fetching permission groups:', err)
    }
  }

  // Create new user
  const createUser = async (userData: Omit<UserProfile, 'id' | 'created_at'>, password: string) => {
    try {
      // First create auth user using admin client
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: password,
        email_confirm: true
      })

      if (authError) throw authError

      // Then create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ ...userData, id: authData.user.id }])

      if (profileError) throw profileError

      // Create default permissions based on role
      const defaultPermissions = getDefaultPermissionsForRole(userData.role)
      const { error: permError } = await supabase
        .from('user_permissions')
        .insert([{
          user_id: authData.user.id,
          ...defaultPermissions
        }])

      if (permError) throw permError

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

  // Update user
  const updateUser = async (id: string, updates: Partial<UserProfile>) => {
    try {
      const { error } = await supabase
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

  // Update user permissions
  const updatePermissions = async (userId: string, permissionUpdates: Partial<UserPermission>) => {
    try {
      const { error } = await supabase
        .from('user_permissions')
        .update(permissionUpdates)
        .eq('user_id', userId)

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
      const group = permissionGroups.find(g => g.id === groupId)
      if (!group) throw new Error('קבוצת הרשאות לא נמצאה')

      // Get group permissions (you'll need to implement this based on your schema)
      const groupPermissions = await getGroupPermissions(groupId)
      
      const { error } = await supabase
        .from('user_permissions')
        .update({
          permission_group_id: groupId,
          ...groupPermissions
        })
        .eq('user_id', userId)

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

  // Get group permissions (placeholder - implement based on your schema)
  const getGroupPermissions = async (groupId: string) => {
    // This would typically query a group_permissions table
    // For now, return empty permissions
    return {}
  }

  // Change user password
  const changeUserPassword = async (userId: string, newPassword: string) => {
    try {
      // Update password in Supabase Auth using admin client
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
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
      // Check if we have a real Supabase connection
      if (!supabaseAdmin || !supabase) {
        console.log('Using mock mode - no Supabase connection available')
        // Mock mode - delete from localStorage
        const existingUsers = JSON.parse(localStorage.getItem('mock-users') || '[]')
        const filteredUsers = existingUsers.filter((u: UserProfile) => u.id !== id)
        localStorage.setItem('mock-users', JSON.stringify(filteredUsers))
        
        const existingPermissions = JSON.parse(localStorage.getItem('mock-permissions') || '[]')
        const filteredPermissions = existingPermissions.filter((p: any) => p.user_id !== id)
        localStorage.setItem('mock-permissions', JSON.stringify(filteredPermissions))
        
        toast.success('משתמש נמחק בהצלחה (מצב Mock)')
        fetchUsers()
        fetchPermissions()
        return true
      }

      // Test connection first
      try {
        const { data: testData, error: testError } = await supabase.from('profiles').select('id').limit(1)
        if (testError) {
          console.warn('Supabase connection test failed, falling back to mock mode:', testError)
          // Fall back to mock mode
          const existingUsers = JSON.parse(localStorage.getItem('mock-users') || '[]')
          const filteredUsers = existingUsers.filter((u: UserProfile) => u.id !== id)
          localStorage.setItem('mock-users', JSON.stringify(filteredUsers))
          
          const existingPermissions = JSON.parse(localStorage.getItem('mock-permissions') || '[]')
          const filteredPermissions = existingPermissions.filter((p: any) => p.user_id !== id)
          localStorage.setItem('mock-permissions', JSON.stringify(filteredPermissions))
          
          toast.success('משתמש נמחק בהצלחה (מצב Mock - חיבור Supabase נכשל)')
          fetchUsers()
          fetchPermissions()
          return true
        }
      } catch (testErr) {
        console.warn('Supabase connection test failed, falling back to mock mode:', testErr)
        // Fall back to mock mode
        const existingUsers = JSON.parse(localStorage.getItem('mock-users') || '[]')
        const filteredUsers = existingUsers.filter((u: UserProfile) => u.id !== id)
        localStorage.setItem('mock-users', JSON.stringify(filteredUsers))
        
        const existingPermissions = JSON.parse(localStorage.getItem('mock-permissions') || '[]')
        const filteredPermissions = existingPermissions.filter((p: any) => p.user_id !== id)
        localStorage.setItem('mock-permissions', JSON.stringify(filteredPermissions))
        
        toast.success('משתמש נמחק בהצלחה (מצב Mock - חיבור Supabase נכשל)')
        fetchUsers()
        fetchPermissions()
        return true
      }

      // Real Supabase mode - try to delete, but fall back to mock if it fails
      try {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
        
        if (error) {
          console.warn('Supabase delete failed, falling back to mock mode:', error)
          // Fall back to mock mode
          const existingUsers = JSON.parse(localStorage.getItem('mock-users') || '[]')
          const filteredUsers = existingUsers.filter((u: UserProfile) => u.id !== id)
          localStorage.setItem('mock-users', JSON.stringify(filteredUsers))
          
          const existingPermissions = JSON.parse(localStorage.getItem('mock-permissions') || '[]')
          const filteredPermissions = existingPermissions.filter((p: any) => p.user_id !== id)
          localStorage.setItem('mock-permissions', JSON.stringify(filteredPermissions))
          
          toast.success('משתמש נמחק בהצלחה (מצב Mock - Supabase נכשל)')
          fetchUsers()
          fetchPermissions()
          return true
        }

        toast.success('משתמש נמחק בהצלחה')
        fetchUsers()
        fetchPermissions()
        return true
      } catch (supabaseErr) {
        console.warn('Supabase delete operation failed, falling back to mock mode:', supabaseErr)
        // Fall back to mock mode
        const existingUsers = JSON.parse(localStorage.getItem('mock-users') || '[]')
        const filteredUsers = existingUsers.filter((u: UserProfile) => u.id !== id)
        localStorage.setItem('mock-users', JSON.stringify(filteredUsers))
        
        const existingPermissions = JSON.parse(localStorage.getItem('mock-permissions') || '[]')
        const filteredPermissions = existingPermissions.filter((p: any) => p.user_id !== id)
        localStorage.setItem('mock-permissions', JSON.stringify(filteredPermissions))
        
        toast.success('משתמש נמחק בהצלחה (מצב Mock - Supabase נכשל)')
        fetchUsers()
        fetchPermissions()
        return true
      }
    } catch (err) {
      console.error('Error deleting user:', err)
      const message = err instanceof Error ? err.message : 'שגיאה במחיקת משתמש'
      setError(message)
      toast.error(message)
      return false
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
