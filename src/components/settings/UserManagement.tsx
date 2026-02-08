import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Database, ExternalLink, Users, Shield, Settings, Plus, Edit, Trash2, AlertTriangle } from 'lucide-react'
import { AddUserForm } from './AddUserForm'
import { UsersTable } from './UsersTable'
import { UserStats } from './UserStats'
import { FirstUserSetup } from './FirstUserSetup'
import { SupabaseConnectionTest } from './SupabaseConnectionTest'
import { useUsers } from '@/hooks/useUsers'

export function UserManagement() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'permissions'>('overview')

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <Card className="bg-white border border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2 text-black justify-end">
            <Users className="h-5 w-5" />
            ניהול משתמשים והרשאות
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 bg-white">
          <div className="flex items-center justify-between">
            <p className="text-black text-right">
              ניהול משתמשים, הרשאות ותפריטים במערכת
            </p>
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'overview' ? 'default' : 'outline'}
                onClick={() => setActiveTab('overview')}
                size="sm"
              >
                סקירה כללית
              </Button>
              <Button
                variant={activeTab === 'users' ? 'default' : 'outline'}
                onClick={() => setActiveTab('users')}
                size="sm"
              >
                ניהול משתמשים
              </Button>
              <Button
                variant={activeTab === 'permissions' ? 'default' : 'outline'}
                onClick={() => setActiveTab('permissions')}
                size="sm"
              >
                קבוצות הרשאות
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content based on active tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Supabase Connection Test */}
          <SupabaseConnectionTest />

          {/* First User Setup */}
          <FirstUserSetup />

          {/* User Statistics */}
          <UserStats />

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-end">
                <Shield className="h-5 w-5" />
                פעולות מהירות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors">
                  <CardContent className="p-6 text-center">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="font-medium mb-2">הוסף משתמש חדש</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      צור משתמש חדש עם הרשאות מותאמות
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab('users')}
                      className="w-full"
                    >
                      הוסף משתמש
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors">
                  <CardContent className="p-6 text-center">
                    <Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="font-medium mb-2">צור קבוצת הרשאות</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      הגדר קבוצת הרשאות לשימוש חוזר
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab('permissions')}
                      className="w-full"
                    >
                      צור קבוצה
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors">
                  <CardContent className="p-6 text-center">
                    <Settings className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="font-medium mb-2">הגדרות מערכת</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      הגדר הגדרות כלליות למערכת
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                    >
                      הגדרות
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-end">
                <Database className="h-5 w-5" />
                מידע על המערכת
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed border-gray-300 text-center">
                <Database className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-black mb-2">
                  נדרש חיבור למסד נתונים
                </h3>
                <p className="text-black mb-4">
                  כדי לנהל משתמשים והרשאות, יש צורך בחיבור ל-Supabase לאחסון המידע במסד הנתונים
                </p>
                <div className="space-y-3">
                  <div className="bg-white p-4 rounded-lg border border-gray-200 text-right">
                    <h4 className="font-medium text-black">תכונות זמינות עם Supabase:</h4>
                    <ul className="text-sm text-black mt-2 space-y-1">
                      <li>• מערכת התחברות (email/password)</li>
                      <li>• ניהול משתמשים והרשאות מתקדם</li>
                      <li>• קבוצות הרשאות לשימוש חוזר</li>
                      <li>• מסד נתונים לאחסון פרטי משתמשים</li>
                      <li>• בטיחות מידע ואבטחה</li>
                      <li>• APIs לניהול המשתמשים</li>
                    </ul>
                  </div>
                  <Button variant="outline" className="flex items-center gap-2 bg-white text-black border-gray-300 hover:bg-gray-50">
                    <ExternalLink className="h-4 w-4" />
                    חיבור ל-Supabase
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Add User Form */}
          <AddUserForm />

          {/* Users Table */}
          <UsersTable />
        </div>
      )}

      {activeTab === 'permissions' && (
        <PermissionGroupsManager />
      )}
    </div>
  )
}

// Permission Groups Manager Component
function PermissionGroupsManager() {
  const {
    permissionGroups,
    createPermissionGroup,
    updatePermissionGroup,
    deletePermissionGroup,
    getDefaultPermissionsForRole
  } = useUsers()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<any>(null)
  const [groupToDelete, setGroupToDelete] = useState<any>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [perms, setPerms] = useState<Record<string, boolean>>({})

  const allPermKeys = [
    'can_view_dashboard', 'can_view_cases', 'can_edit_cases', 'can_delete_cases',
    'can_view_clients', 'can_edit_clients', 'can_view_documents', 'can_edit_documents',
    'can_view_calendar', 'can_edit_calendar', 'can_view_billing', 'can_edit_billing',
    'can_view_time_tracking', 'can_edit_time_tracking', 'can_view_reports', 'can_edit_reports',
    'can_view_legal_library', 'can_edit_legal_library', 'can_view_disability_calculator', 'can_edit_disability_calculator',
    'can_view_cash_flow', 'can_edit_cash_flow', 'can_view_budget', 'can_edit_budget',
    'can_manage_users', 'can_manage_permission_groups', 'can_manage_system_settings', 'can_view_audit_logs'
  ]

  const permLabels: Record<string, string> = {
    can_view_dashboard: 'צפייה בדשבורד',
    can_view_cases: 'צפייה בתיקים', can_edit_cases: 'עריכת תיקים', can_delete_cases: 'מחיקת תיקים',
    can_view_clients: 'צפייה בלקוחות', can_edit_clients: 'עריכת לקוחות',
    can_view_documents: 'צפייה במסמכים', can_edit_documents: 'עריכת מסמכים',
    can_view_calendar: 'צפייה ביומן', can_edit_calendar: 'עריכת יומן',
    can_view_billing: 'צפייה בחיוב', can_edit_billing: 'עריכת חיוב',
    can_view_time_tracking: 'צפייה במעקב זמן', can_edit_time_tracking: 'עריכת מעקב זמן',
    can_view_reports: 'צפייה בדוחות', can_edit_reports: 'עריכת דוחות',
    can_view_legal_library: 'צפייה בספריה משפטית', can_edit_legal_library: 'עריכת ספריה משפטית',
    can_view_disability_calculator: 'צפייה במחשבון נכות', can_edit_disability_calculator: 'עריכת מחשבון נכות',
    can_view_cash_flow: 'צפייה בתזרים', can_edit_cash_flow: 'עריכת תזרים',
    can_view_budget: 'צפייה בתקציב', can_edit_budget: 'עריכת תקציב',
    can_manage_users: 'ניהול משתמשים', can_manage_permission_groups: 'ניהול קבוצות הרשאות',
    can_manage_system_settings: 'ניהול הגדרות מערכת', can_view_audit_logs: 'צפייה ביומן פעילות'
  }

  const openCreateDialog = () => {
    setEditingGroup(null)
    setName('')
    setDescription('')
    const defaultPerms: Record<string, boolean> = {}
    for (const key of allPermKeys) defaultPerms[key] = false
    setPerms(defaultPerms)
    setIsDialogOpen(true)
  }

  const openEditDialog = (group: any) => {
    setEditingGroup(group)
    setName(group.name)
    setDescription(group.description || '')
    const currentPerms: Record<string, boolean> = {}
    for (const key of allPermKeys) currentPerms[key] = group[key] || false
    setPerms(currentPerms)
    setIsDialogOpen(true)
  }

  const loadFromRole = (role: 'admin' | 'lawyer' | 'assistant' | 'client') => {
    const defaults = getDefaultPermissionsForRole(role)
    setPerms({ ...perms, ...defaults })
  }

  const handleSave = async () => {
    if (!name.trim()) return
    if (editingGroup) {
      await updatePermissionGroup(editingGroup.id, { name, description, ...perms })
    } else {
      await createPermissionGroup(name, description, perms)
    }
    setIsDialogOpen(false)
  }

  const handleDelete = async () => {
    if (groupToDelete) {
      await deletePermissionGroup(groupToDelete.id)
      setIsDeleteDialogOpen(false)
      setGroupToDelete(null)
    }
  }

  const countEnabled = (group: any) => {
    return allPermKeys.filter(k => group[k] === true).length
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <Button onClick={openCreateDialog} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              צור קבוצה חדשה
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              ניהול קבוצות הרשאות
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {permissionGroups.length === 0 ? (
            <div className="bg-gray-50 p-8 rounded-lg border-2 border-dashed border-gray-300 text-center">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">אין קבוצות הרשאות</h3>
              <p className="text-muted-foreground mb-4">
                צור קבוצות הרשאות כדי להקצות הרשאות בקלות למשתמשים חדשים
              </p>
              <Button onClick={openCreateDialog} variant="outline">
                <Plus className="h-4 w-4 ml-2" />
                צור קבוצה ראשונה
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {permissionGroups.map((group: any) => (
                <div key={group.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(group)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => { setGroupToDelete(group); setIsDeleteDialogOpen(true) }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 text-right mr-4">
                    <div className="flex items-center gap-2 justify-end">
                      <h4 className="font-medium">{group.name}</h4>
                      <Badge variant="outline">{countEnabled(group)}/{allPermKeys.length} הרשאות</Badge>
                    </div>
                    {group.description && (
                      <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Permission Group Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'עריכת קבוצת הרשאות' : 'יצירת קבוצת הרשאות חדשה'}</DialogTitle>
            <DialogDescription>הגדר שם, תיאור והרשאות לקבוצה</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>שם הקבוצה *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="לדוגמה: עורך דין בכיר" />
              </div>
              <div>
                <Label>תיאור</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="תיאור קצר של הקבוצה" />
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-2 flex-wrap">
              <Label className="ml-2">טען מתבנית:</Label>
              <Button variant="outline" size="sm" onClick={() => loadFromRole('admin')}>מנהל</Button>
              <Button variant="outline" size="sm" onClick={() => loadFromRole('lawyer')}>עורך דין</Button>
              <Button variant="outline" size="sm" onClick={() => loadFromRole('assistant')}>עוזר</Button>
              <Button variant="outline" size="sm" onClick={() => loadFromRole('client')}>לקוח</Button>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              {allPermKeys.map(key => (
                <div key={key} className="flex items-center gap-2">
                  <Switch
                    checked={perms[key] || false}
                    onCheckedChange={(checked) => {
                      const updated = { ...perms, [key]: checked }
                      // Auto-enable view when enabling edit
                      if (checked && key.startsWith('can_edit_')) {
                        const viewKey = key.replace('can_edit_', 'can_view_')
                        if (viewKey in updated) updated[viewKey] = true
                      }
                      if (!checked && key.startsWith('can_view_')) {
                        const editKey = key.replace('can_view_', 'can_edit_')
                        if (editKey in updated) updated[editKey] = false
                        const deleteKey = key.replace('can_view_', 'can_delete_')
                        if (deleteKey in updated) updated[deleteKey] = false
                      }
                      setPerms(updated)
                    }}
                  />
                  <Label className="text-sm">{permLabels[key] || key}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>ביטול</Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {editingGroup ? 'עדכן קבוצה' : 'צור קבוצה'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>מחיקת קבוצת הרשאות</DialogTitle>
            <DialogDescription>פעולה זו אינה ניתנת לביטול</DialogDescription>
          </DialogHeader>
          {groupToDelete && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span>האם אתה בטוח שברצונך למחוק את הקבוצה "{groupToDelete.name}"?</span>
              </div>
              <p className="text-sm text-muted-foreground">
                מחיקת הקבוצה לא תשפיע על הרשאות קיימות של משתמשים שהוקצו לקבוצה זו.
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>ביטול</Button>
            <Button variant="destructive" onClick={handleDelete}>מחק קבוצה</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
