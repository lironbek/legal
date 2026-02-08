import { useState, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Edit,
  Trash2,
  Users,
  Shield,
  Building2,
  AlertTriangle,
  Eye,
  EyeOff,
  Key,
  Plus,
  X,
  CheckCheck,
  XCircle,
  RotateCcw
} from 'lucide-react'
import { UserProfile, UserPermission } from '@/lib/supabase'
import { useUsers } from '@/hooks/useUsers'
import { toast } from 'sonner'
import {
  Company,
  UserCompanyAssignment,
  getCompanies,
  getUserCompanyAssignments,
  addUserCompanyAssignment,
  removeUserCompanyAssignment,
  updateUserCompanyRole,
} from '@/lib/dataManager'

interface UsersTableProps {
  className?: string
}

export function UsersTable({ className }: UsersTableProps) {
  const {
    users,
    permissions,
    permissionGroups,
    loading,
    updateUser,
    updatePermissions,
    applyPermissionGroup,
    ensureUserPermissions,
    getDefaultPermissionsForRole,
    changeUserPassword,
    deleteUser,
    toggleUserStatus
  } = useUsers()

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [editingPermissions, setEditingPermissions] = useState<UserPermission | null>(null)
  const [permissionsUserName, setPermissionsUserName] = useState('')
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null)
  const [userToChangePassword, setUserToChangePassword] = useState<UserProfile | null>(null)
  const [selectedPermissionGroup, setSelectedPermissionGroup] = useState<string>('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [userAssignments, setUserAssignments] = useState<UserCompanyAssignment[]>([])
  const [allCompanies, setAllCompanies] = useState<Company[]>([])
  const [assignCompanyId, setAssignCompanyId] = useState('')
  const [assignRole, setAssignRole] = useState<UserCompanyAssignment['role']>('viewer')
  const [editDialogTab, setEditDialogTab] = useState('basic')

  // Load companies list for table display
  useEffect(() => {
    setAllCompanies(getCompanies())
  }, [users])

  const handleEditUser = (user: UserProfile) => {
    setEditingUser({ ...user })
    setAllCompanies(getCompanies())
    setUserAssignments(getUserCompanyAssignments(user.id))
    setAssignCompanyId('')
    setAssignRole('viewer')
    setEditDialogTab('basic')
    setIsEditDialogOpen(true)
  }

  const handleAssignCompany = (user: UserProfile) => {
    setEditingUser({ ...user })
    setAllCompanies(getCompanies())
    setUserAssignments(getUserCompanyAssignments(user.id))
    setAssignCompanyId('')
    setAssignRole('viewer')
    setEditDialogTab('companies')
    setIsEditDialogOpen(true)
  }

  const handleAddCompanyAssignment = () => {
    if (!assignCompanyId || !editingUser) return
    addUserCompanyAssignment(editingUser.id, assignCompanyId, assignRole)
    setUserAssignments(getUserCompanyAssignments(editingUser.id))
    setAssignCompanyId('')
    toast.success('המשתמש שויך למשרד')
  }

  const handleRemoveCompanyAssignment = (companyId: string) => {
    if (!editingUser) return
    removeUserCompanyAssignment(editingUser.id, companyId)
    setUserAssignments(getUserCompanyAssignments(editingUser.id))
    toast.success('השיוך בוטל')
  }

  const handleUpdateCompanyRole = (companyId: string, role: UserCompanyAssignment['role']) => {
    if (!editingUser) return
    updateUserCompanyRole(editingUser.id, companyId, role)
    setUserAssignments(getUserCompanyAssignments(editingUser.id))
  }

  const handleEditPermissions = async (user: UserProfile) => {
    let userPerms = permissions.find(p => p.user_id === user.id)
    if (!userPerms) {
      // Auto-create default permissions for this user
      userPerms = await ensureUserPermissions(user.id, user.role)
      if (!userPerms) {
        toast.error('שגיאה ביצירת הרשאות למשתמש')
        return
      }
    }
    setEditingPermissions({ ...userPerms })
    setPermissionsUserName(user.full_name)
    setSelectedPermissionGroup(userPerms.permission_group_id || '')
    setIsPermissionsDialogOpen(true)
  }

  const handleDeleteUser = (user: UserProfile) => {
    setUserToDelete(user)
    setIsDeleteDialogOpen(true)
  }

  const handleChangePassword = (user: UserProfile) => {
    setUserToChangePassword(user)
    setNewPassword('')
    setConfirmPassword('')
    setIsPasswordDialogOpen(true)
  }

  const confirmDeleteUser = async () => {
    if (userToDelete) {
      const success = await deleteUser(userToDelete.id)
      if (success) {
        setIsDeleteDialogOpen(false)
        setUserToDelete(null)
      }
    }
  }

  const confirmChangePassword = async () => {
    if (userToChangePassword && newPassword && confirmPassword) {
      if (newPassword !== confirmPassword) {
        toast.error('הסיסמאות אינן תואמות')
        return
      }
      if (newPassword.length < 8) {
        toast.error('הסיסמה חייבת להיות באורך של לפחות 8 תווים')
        return
      }

      const success = await changeUserPassword(userToChangePassword.id, newPassword)
      if (success) {
        setIsPasswordDialogOpen(false)
        setUserToChangePassword(null)
        setNewPassword('')
        setConfirmPassword('')
      }
    }
  }

  const saveUserChanges = async () => {
    if (editingUser) {
      const success = await updateUser(editingUser.id, editingUser)
      if (success) {
        setIsEditDialogOpen(false)
        setEditingUser(null)
      }
    }
  }

  const savePermissionChanges = async () => {
    if (editingPermissions) {
      const success = await updatePermissions(editingPermissions.user_id, editingPermissions)
      if (success) {
        setIsPermissionsDialogOpen(false)
        setEditingPermissions(null)
      }
    }
  }

  const handleApplyPermissionGroup = async () => {
    if (editingPermissions && selectedPermissionGroup) {
      const success = await applyPermissionGroup(editingPermissions.user_id, selectedPermissionGroup)
      if (success) {
        setIsPermissionsDialogOpen(false)
        setEditingPermissions(null)
      }
    }
  }

  // Permission toggle with dependency logic
  const setPermission = (key: string, value: boolean) => {
    if (!editingPermissions) return
    const updated = { ...editingPermissions, [key]: value }

    // Auto-enable view when enabling edit
    if (value && key.startsWith('can_edit_')) {
      const viewKey = key.replace('can_edit_', 'can_view_')
      if (viewKey in updated) {
        ;(updated as any)[viewKey] = true
      }
    }
    // Auto-disable edit when disabling view
    if (!value && key.startsWith('can_view_')) {
      const editKey = key.replace('can_view_', 'can_edit_')
      if (editKey in updated) {
        ;(updated as any)[editKey] = false
      }
      // Also handle can_delete_ for cases
      const deleteKey = key.replace('can_view_', 'can_delete_')
      if (deleteKey in updated) {
        ;(updated as any)[deleteKey] = false
      }
    }

    setEditingPermissions(updated)
  }

  // Select all / deselect all / reset to defaults
  const handleSelectAll = () => {
    if (!editingPermissions) return
    const updated = { ...editingPermissions }
    const permKeys = Object.keys(updated).filter(k => k.startsWith('can_'))
    for (const key of permKeys) {
      ;(updated as any)[key] = true
    }
    setEditingPermissions(updated)
  }

  const handleDeselectAll = () => {
    if (!editingPermissions) return
    const updated = { ...editingPermissions }
    const permKeys = Object.keys(updated).filter(k => k.startsWith('can_'))
    for (const key of permKeys) {
      ;(updated as any)[key] = false
    }
    setEditingPermissions(updated)
  }

  const handleResetToDefaults = () => {
    if (!editingPermissions) return
    const user = users.find(u => u.id === editingPermissions.user_id)
    if (!user) return
    const defaults = getDefaultPermissionsForRole(user.role)
    setEditingPermissions({ ...editingPermissions, ...defaults })
    toast.success('הרשאות אופסו לברירת המחדל של התפקיד')
  }

  const formatAddress = (user: UserProfile) => {
    const parts = [user.address, user.city, user.postal_code].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : 'לא צוין'
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'לא צוין'
    try {
      return new Date(dateString).toLocaleDateString('he-IL')
    } catch {
      return 'לא צוין'
    }
  }

  const getUserCompanies = (userId: string) => {
    const assignments = getUserCompanyAssignments(userId)
    return assignments.map(a => {
      const company = allCompanies.find(c => c.id === a.company_id)
      return company ? company.name : null
    }).filter(Boolean) as string[]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>טוען משתמשים...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={className} dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-end">
            <Users className="h-5 w-5" />
            ניהול משתמשים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">שם מלא</TableHead>
                <TableHead className="text-right">אימייל</TableHead>
                <TableHead className="text-right">תפקיד</TableHead>
                <TableHead className="text-right">משרד</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
                <TableHead className="text-right">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">אין משתמשים במערכת</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">הוסף משתמש חדש באמצעות הטופס למעלה</p>
                  </TableCell>
                </TableRow>
              )}
              {users.map((user) => {
                const companies = getUserCompanies(user.id)
                return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium text-right">{user.full_name}</TableCell>
                  <TableCell className="text-right">{user.email}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                      {user.role === 'admin' && 'מנהל'}
                      {user.role === 'lawyer' && 'עורך דין'}
                      {user.role === 'assistant' && 'עוזר'}
                      {user.role === 'client' && 'לקוח'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {user.role === 'admin' ? (
                      <Badge variant="outline" className="text-xs">כל המשרדים</Badge>
                    ) : companies.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {companies.map((name, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            <Building2 className="h-3 w-3 ml-1" />
                            {name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">לא משויך</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <Switch
                        checked={user.is_active}
                        onCheckedChange={(checked) => toggleUserStatus(user.id, checked)}
                      />
                      <Badge variant={user.is_active ? 'default' : 'secondary'}>
                        {user.is_active ? 'פעיל' : 'לא פעיל'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>עריכת משתמש</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => handleEditPermissions(user)}>
                            <Shield className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>עריכת הרשאות</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => handleAssignCompany(user)}>
                            <Building2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>שיוך למשרד</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => handleChangePassword(user)}>
                            <Key className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>שינוי סיסמה</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>מחיקת משתמש</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>עריכת משתמש</DialogTitle>
            <DialogDescription>ערוך את פרטי המשתמש, כתובת, פרטים אישיים ושיוך למשרדים</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <Tabs value={editDialogTab} onValueChange={setEditDialogTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basic">מידע בסיסי</TabsTrigger>
                <TabsTrigger value="address">כתובת</TabsTrigger>
                <TabsTrigger value="personal">אישי</TabsTrigger>
                <TabsTrigger value="emergency">חירום</TabsTrigger>
                <TabsTrigger value="companies" className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  משרדים
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">שם מלא</Label>
                    <Input
                      id="full_name"
                      value={editingUser.full_name}
                      onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">אימייל</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editingUser.email}
                      onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">תפקיד</Label>
                    <Select
                      value={editingUser.role}
                      onValueChange={(value) => setEditingUser({ ...editingUser, role: value as UserProfile['role'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">מנהל</SelectItem>
                        <SelectItem value="lawyer">עורך דין</SelectItem>
                        <SelectItem value="assistant">עוזר</SelectItem>
                        <SelectItem value="client">לקוח</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="phone">טלפון</Label>
                    <Input
                      id="phone"
                      value={editingUser.phone || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">מחלקה</Label>
                    <Input
                      id="department"
                      value={editingUser.department || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="address" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="address">כתובת</Label>
                    <Input
                      id="address"
                      value={editingUser.address || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, address: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">עיר</Label>
                    <Input
                      id="city"
                      value={editingUser.city || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="postal_code">מיקוד</Label>
                    <Input
                      id="postal_code"
                      value={editingUser.postal_code || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, postal_code: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="birth_date">תאריך לידה</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={editingUser.birth_date || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, birth_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="id_number">תעודת זהות</Label>
                    <Input
                      id="id_number"
                      value={editingUser.id_number || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, id_number: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="emergency" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergency_contact">איש קשר לחירום</Label>
                    <Input
                      id="emergency_contact"
                      value={editingUser.emergency_contact || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, emergency_contact: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergency_phone">טלפון חירום</Label>
                    <Input
                      id="emergency_phone"
                      value={editingUser.emergency_phone || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, emergency_phone: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="notes">הערות</Label>
                    <Textarea
                      id="notes"
                      value={editingUser.notes || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="companies" className="space-y-4">
                {editingUser.role === 'admin' && (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
                    <Badge variant="destructive" className="mb-1">מנהל על</Badge>
                    <p className="text-muted-foreground">למשתמש זה גישה לכל המשרדים במערכת.</p>
                  </div>
                )}

                {/* Current assignments */}
                {userAssignments.length > 0 && (
                  <div className="space-y-2">
                    <Label>משרדים משויכים:</Label>
                    {userAssignments.map((assignment) => {
                      const company = allCompanies.find(c => c.id === assignment.company_id)
                      return (
                        <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{company?.name || 'משרד לא ידוע'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={assignment.role}
                              onValueChange={(value) => handleUpdateCompanyRole(assignment.company_id, value as UserCompanyAssignment['role'])}
                            >
                              <SelectTrigger className="w-28 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="owner">בעלים</SelectItem>
                                <SelectItem value="admin">מנהל</SelectItem>
                                <SelectItem value="lawyer">עורך דין</SelectItem>
                                <SelectItem value="assistant">עוזר</SelectItem>
                                <SelectItem value="viewer">צופה</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveCompanyAssignment(assignment.company_id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {userAssignments.length === 0 && editingUser.role !== 'admin' && (
                  <p className="text-sm text-muted-foreground">משתמש זה לא משויך לאף משרד.</p>
                )}

                {/* Add new assignment */}
                <Separator />
                <div className="space-y-2">
                  <Label>שייך למשרד נוסף:</Label>
                  <div className="flex gap-2">
                    <Select value={assignCompanyId} onValueChange={setAssignCompanyId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="בחר משרד" />
                      </SelectTrigger>
                      <SelectContent>
                        {allCompanies
                          .filter(c => c.is_active && !userAssignments.find(a => a.company_id === c.id))
                          .map(company => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Select value={assignRole} onValueChange={(v) => setAssignRole(v as UserCompanyAssignment['role'])}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">בעלים</SelectItem>
                        <SelectItem value="admin">מנהל</SelectItem>
                        <SelectItem value="lawyer">עורך דין</SelectItem>
                        <SelectItem value="assistant">עוזר</SelectItem>
                        <SelectItem value="viewer">צופה</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAddCompanyAssignment} disabled={!assignCompanyId} size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={saveUserChanges}>
              שמור שינויים
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>עריכת הרשאות - {permissionsUserName}</DialogTitle>
            <DialogDescription>הגדר הרשאות גישה לכל מודול במערכת</DialogDescription>
          </DialogHeader>
          {editingPermissions && (
            <div className="space-y-6">
              {/* Quick actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  <CheckCheck className="h-4 w-4 ml-1" />
                  בחר הכל
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                  <XCircle className="h-4 w-4 ml-1" />
                  בטל הכל
                </Button>
                <Button variant="outline" size="sm" onClick={handleResetToDefaults}>
                  <RotateCcw className="h-4 w-4 ml-1" />
                  איפוס לברירת מחדל
                </Button>
                {permissionGroups.length > 0 && (
                  <>
                    <Separator orientation="vertical" className="h-6" />
                    <Select
                      value={selectedPermissionGroup}
                      onValueChange={setSelectedPermissionGroup}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="החל קבוצת הרשאות" />
                      </SelectTrigger>
                      <SelectContent>
                        {permissionGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={handleApplyPermissionGroup} disabled={!selectedPermissionGroup}>
                      החל קבוצה
                    </Button>
                  </>
                )}
              </div>

              <Separator />

              {/* Individual Permissions */}
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">דשבורד ותיקים</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_view_dashboard}
                        onCheckedChange={(checked) => setPermission('can_view_dashboard', checked)}
                      />
                      <Label>צפייה בדשבורד</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_view_cases}
                        onCheckedChange={(checked) => setPermission('can_view_cases', checked)}
                      />
                      <Label>צפייה בתיקים</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_edit_cases}
                        onCheckedChange={(checked) => setPermission('can_edit_cases', checked)}
                      />
                      <Label>עריכת תיקים</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_delete_cases}
                        onCheckedChange={(checked) => setPermission('can_delete_cases', checked)}
                      />
                      <Label>מחיקת תיקים</Label>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">לקוחות ומסמכים</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_view_clients}
                        onCheckedChange={(checked) => setPermission('can_view_clients', checked)}
                      />
                      <Label>צפייה בלקוחות</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_edit_clients}
                        onCheckedChange={(checked) => setPermission('can_edit_clients', checked)}
                      />
                      <Label>עריכת לקוחות</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_view_documents}
                        onCheckedChange={(checked) => setPermission('can_view_documents', checked)}
                      />
                      <Label>צפייה במסמכים</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_edit_documents}
                        onCheckedChange={(checked) => setPermission('can_edit_documents', checked)}
                      />
                      <Label>עריכת מסמכים</Label>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">יומן וחיוב</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_view_calendar}
                        onCheckedChange={(checked) => setPermission('can_view_calendar', checked)}
                      />
                      <Label>צפייה ביומן</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_edit_calendar}
                        onCheckedChange={(checked) => setPermission('can_edit_calendar', checked)}
                      />
                      <Label>עריכת יומן</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_view_billing}
                        onCheckedChange={(checked) => setPermission('can_view_billing', checked)}
                      />
                      <Label>צפייה בחיוב</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_edit_billing}
                        onCheckedChange={(checked) => setPermission('can_edit_billing', checked)}
                      />
                      <Label>עריכת חיוב</Label>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">תזרים ותקציב</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_view_cash_flow}
                        onCheckedChange={(checked) => setPermission('can_view_cash_flow', checked)}
                      />
                      <Label>צפייה בתזרים מזומנים</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_edit_cash_flow}
                        onCheckedChange={(checked) => setPermission('can_edit_cash_flow', checked)}
                      />
                      <Label>עריכת תזרים מזומנים</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_view_budget}
                        onCheckedChange={(checked) => setPermission('can_view_budget', checked)}
                      />
                      <Label>צפייה בתקציב</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_edit_budget}
                        onCheckedChange={(checked) => setPermission('can_edit_budget', checked)}
                      />
                      <Label>עריכת תקציב</Label>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">דוחות ומעקב זמן</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_view_reports}
                        onCheckedChange={(checked) => setPermission('can_view_reports', checked)}
                      />
                      <Label>צפייה בדוחות</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_edit_reports}
                        onCheckedChange={(checked) => setPermission('can_edit_reports', checked)}
                      />
                      <Label>עריכת דוחות</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_view_time_tracking}
                        onCheckedChange={(checked) => setPermission('can_view_time_tracking', checked)}
                      />
                      <Label>צפייה במעקב זמן</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_edit_time_tracking}
                        onCheckedChange={(checked) => setPermission('can_edit_time_tracking', checked)}
                      />
                      <Label>עריכת מעקב זמן</Label>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">ספריה משפטית ומחשבון נכות</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_view_legal_library}
                        onCheckedChange={(checked) => setPermission('can_view_legal_library', checked)}
                      />
                      <Label>צפייה בספריה משפטית</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_edit_legal_library}
                        onCheckedChange={(checked) => setPermission('can_edit_legal_library', checked)}
                      />
                      <Label>עריכת ספריה משפטית</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_view_disability_calculator}
                        onCheckedChange={(checked) => setPermission('can_view_disability_calculator', checked)}
                      />
                      <Label>צפייה במחשבון נכות</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_edit_disability_calculator}
                        onCheckedChange={(checked) => setPermission('can_edit_disability_calculator', checked)}
                      />
                      <Label>עריכת מחשבון נכות</Label>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">הרשאות מערכת</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_manage_users}
                        onCheckedChange={(checked) => setPermission('can_manage_users', checked)}
                      />
                      <Label>ניהול משתמשים</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_manage_permission_groups}
                        onCheckedChange={(checked) => setPermission('can_manage_permission_groups', checked)}
                      />
                      <Label>ניהול קבוצות הרשאות</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_manage_system_settings}
                        onCheckedChange={(checked) => setPermission('can_manage_system_settings', checked)}
                      />
                      <Label>ניהול הגדרות מערכת</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPermissions.can_view_audit_logs}
                        onCheckedChange={(checked) => setPermission('can_view_audit_logs', checked)}
                      />
                      <Label>צפייה ביומן פעילות</Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsPermissionsDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={savePermissionChanges}>
              שמור הרשאות
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>שינוי סיסמה</DialogTitle>
            <DialogDescription>הזן סיסמה חדשה למשתמש</DialogDescription>
          </DialogHeader>
          {userToChangePassword && (
            <div className="space-y-4">
              <div>
                <Label>משתמש: {userToChangePassword.full_name}</Label>
              </div>
              <div>
                <Label htmlFor="new_password">סיסמה חדשה</Label>
                <div className="relative">
                  <Input
                    id="new_password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="הכנס סיסמה חדשה (לפחות 8 תווים)"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirm_password">אישור סיסמה</Label>
                <div className="relative">
                  <Input
                    id="confirm_password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="אשר סיסמה חדשה"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={confirmChangePassword}>
              שנה סיסמה
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>מחיקת משתמש</DialogTitle>
            <DialogDescription>פעולה זו אינה ניתנת לביטול</DialogDescription>
          </DialogHeader>
          {userToDelete && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span>האם אתה בטוח שברצונך למחוק את המשתמש?</span>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p><strong>שם:</strong> {userToDelete.full_name}</p>
                <p><strong>אימייל:</strong> {userToDelete.email}</p>
                <p><strong>תפקיד:</strong> {userToDelete.role}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                פעולה זו תמחק את המשתמש לחלוטין מהמערכת, כולל כל הנתונים הקשורים אליו.
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              ביטול
            </Button>
            <Button variant="destructive" onClick={confirmDeleteUser}>
              מחק משתמש
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
