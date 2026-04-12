import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserPlus, Lock, Eye, EyeOff, Check, X, Users, Building2 } from 'lucide-react'
import { UserProfile } from '@/lib/supabase'
import { useUsers } from '@/hooks/useUsers'
import { useAuth } from '@/contexts/AuthContext'
import { getCompanies } from '@/lib/dataManager'
import { toast } from 'sonner'

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (password.length < 8) errors.push('לפחות 8 תווים')
  if (!/[A-Z]/.test(password)) errors.push('אות גדולה באנגלית')
  if (!/[a-z]/.test(password)) errors.push('אות קטנה באנגלית')
  if (!/[0-9]/.test(password)) errors.push('ספרה')
  return { valid: errors.length === 0, errors }
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  const rules = [
    { label: 'לפחות 8 תווים', pass: password.length >= 8 },
    { label: 'אות גדולה באנגלית', pass: /[A-Z]/.test(password) },
    { label: 'אות קטנה באנגלית', pass: /[a-z]/.test(password) },
    { label: 'ספרה', pass: /[0-9]/.test(password) },
  ]
  const strength = rules.filter(r => r.pass).length
  const barColor = strength <= 1 ? 'bg-destructive' : strength <= 2 ? 'bg-orange-500' : strength <= 3 ? 'bg-yellow-500' : 'bg-green-500'

  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength ? barColor : 'bg-muted'}`} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {rules.map(rule => (
          <div key={rule.label} className={`flex items-center gap-1 text-[11px] ${rule.pass ? 'text-green-600' : 'text-muted-foreground'}`}>
            {rule.pass ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            {rule.label}
          </div>
        ))}
      </div>
    </div>
  )
}

interface AddUserFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddUserForm({ open, onOpenChange }: AddUserFormProps) {
  const { createUser } = useUsers()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [activeTab, setActiveTab] = useState('basic')
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'lawyer' as UserProfile['role'],
    companyId: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const companies = useMemo(() => getCompanies().filter(c => c.is_active !== false), [open])

  const companyOptions = useMemo(() =>
    companies.map(c => ({ value: c.id, label: c.name })),
    [companies]
  )

  const resetForm = () => {
    setFormData({ full_name: '', email: '', role: 'lawyer', companyId: '', password: '', confirmPassword: '' })
    setShowPassword(false)
    setActiveTab('basic')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.full_name || !formData.email) {
      toast.error('יש למלא שם מלא ואימייל')
      setActiveTab('basic')
      return
    }

    const { valid, errors } = validatePassword(formData.password)
    if (!valid) {
      toast.error(`הסיסמה חייבת לכלול: ${errors.join(', ')}`)
      setActiveTab('password')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('הסיסמאות אינן זהות')
      setActiveTab('password')
      return
    }

    setIsSubmitting(true)
    try {
      const success = await createUser({
        full_name: formData.full_name,
        email: formData.email.toLowerCase(),
        role: formData.role,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, formData.password)

      if (success) {
        resetForm()
        onOpenChange(false)
        toast.success('משתמש נוצר בהצלחה')
      }
    } catch (error) {
      console.error('Error creating user:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v) }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            הוספת משתמש חדש
          </DialogTitle>
          <DialogDescription>הזן את פרטי המשתמש, שייך לארגון והגדר סיסמה</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" orientation="vertical">
            <div className="flex gap-6">
              <div className="flex-1 min-w-0">

              <TabsList className="flex flex-col h-auto w-40 shrink-0 bg-transparent p-0 gap-1 border-r border-border pr-4">
                <TabsTrigger value="basic" className="w-full justify-start gap-2.5 text-sm px-3 py-2.5 rounded-lg data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted/50">
                  <Users className="h-4 w-4" />
                  פרטים בסיסיים
                </TabsTrigger>
                <TabsTrigger value="organization" className="w-full justify-start gap-2.5 text-sm px-3 py-2.5 rounded-lg data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted/50">
                  <Building2 className="h-4 w-4" />
                  ארגון
                </TabsTrigger>
                <TabsTrigger value="password" className="w-full justify-start gap-2.5 text-sm px-3 py-2.5 rounded-lg data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted/50">
                  <Lock className="h-4 w-4" />
                  סיסמה
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>שם מלא *</Label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="שם מלא"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>אימייל *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>תפקיד *</Label>
                    <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as UserProfile['role'] })}>
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
                </div>
              </TabsContent>

              <TabsContent value="organization" className="space-y-4 mt-0">
                {isAdmin && companyOptions.length > 0 ? (
                  <div className="space-y-2">
                    <Label>שייך לארגון</Label>
                    <SearchableSelect
                      value={formData.companyId}
                      onValueChange={(v) => setFormData({ ...formData, companyId: v })}
                      options={companyOptions}
                      placeholder="בחר ארגון"
                      searchPlaceholder="חיפוש ארגון..."
                      emptyMessage="לא נמצאו ארגונים"
                    />
                    <p className="text-xs text-muted-foreground">
                      ניתן לשייך את המשתמש לארגונים נוספים לאחר יצירתו
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                    {!isAdmin
                      ? 'רק מנהל מערכת יכול לשייך משתמשים לארגונים'
                      : 'אין ארגונים פעילים במערכת. צור ארגון תחילה.'
                    }
                  </div>
                )}
              </TabsContent>

              <TabsContent value="password" className="space-y-4 mt-0">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>סיסמה *</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="סיסמה"
                        className="pl-10"
                      />
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <PasswordStrength password={formData.password} />
                  </div>

                  <div className="space-y-2">
                    <Label>אישור סיסמה *</Label>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="הזן שוב את הסיסמה"
                    />
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-xs text-destructive">הסיסמאות אינן זהות</p>
                    )}
                  </div>
                </div>
              </TabsContent>
              </div>
            </div>
          </Tabs>

          <div className="flex gap-3 pt-4 mt-4 border-t">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'יוצר...' : 'צור משתמש'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ביטול
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
