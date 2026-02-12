import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { UserPlus, Mail, User, Phone, Building, MapPin, Calendar, CreditCard, AlertTriangle, Lock, Eye, EyeOff } from 'lucide-react'
import { UserProfile, PermissionGroup } from '@/lib/supabase'
import { useUsers } from '@/hooks/useUsers'
import { toast } from 'sonner'

export function AddUserForm() {
  const { createUser, permissionGroups } = useUsers()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'client' as UserProfile['role'],
    phone: '',
    department: '',
    address: '',
    city: '',
    postal_code: '',
    birth_date: '',
    id_number: '',
    emergency_contact: '',
    emergency_phone: '',
    notes: '',
    password: '',
    confirmPassword: ''
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [usePhoneAsPassword, setUsePhoneAsPassword] = useState(false)
  const [selectedPermissionGroup, setSelectedPermissionGroup] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.full_name) {
      toast.error('יש למלא אימייל ושם מלא')
      return
    }
    
    // Determine effective password
    const effectivePassword = usePhoneAsPassword ? formData.phone : formData.password

    if (usePhoneAsPassword) {
      if (!formData.phone) {
        toast.error('יש למלא מספר טלפון כדי להשתמש בו כסיסמה')
        return
      }
    } else {
      if (!formData.password) {
        toast.error('יש למלא סיסמה')
        return
      }
      if (formData.password.length < 6) {
        toast.error('הסיסמה חייבת להכיל לפחות 6 תווים')
        return
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('הסיסמאות אינן זהות')
        return
      }
    }

    setIsSubmitting(true)
    
    try {
      // Separate password from user data
      const { password, confirmPassword, ...userData } = formData;
      const success = await createUser({
        ...userData,
        is_active: true,
        updated_at: new Date().toISOString()
      }, effectivePassword)
      
      if (success) {
        setFormData({
          email: '',
          full_name: '',
          role: 'client',
          phone: '',
          department: '',
          address: '',
          city: '',
          postal_code: '',
          birth_date: '',
          id_number: '',
          emergency_contact: '',
          emergency_phone: '',
          notes: '',
          password: '',
          confirmPassword: ''
        })
        setSelectedPermissionGroup('')
        setIsFormOpen(false)
        toast.success('משתמש נוצר בהצלחה! המשתמש יקבל אימייל עם פרטי התחברות')
      }
    } catch (error) {
      console.error('Error creating user:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (!isFormOpen) {
    return (
      <Button 
        onClick={() => setIsFormOpen(true)}
        className="flex items-center gap-2"
      >
        <UserPlus className="h-4 w-4" />
        הוסף משתמש חדש
      </Button>
    )
  }

  return (
    <Card className="mb-6" dir="rtl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-end">
          <UserPlus className="h-5 w-5" />
          הוספת משתמש חדש
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2 text-right">מידע בסיסי</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName" className="text-right block">שם מלא *</Label>
                <Input
                  id="fullName"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  placeholder="הזן שם מלא"
                  required
                  className="text-right"
                />
              </div>
              
              <div>
                <Label htmlFor="email" className="text-right block">אימייל *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="הזן כתובת אימייל"
                  required
                  className="text-right"
                />
              </div>
              
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={usePhoneAsPassword}
                    onChange={(e) => setUsePhoneAsPassword(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-muted-foreground">
                    השתמש במספר טלפון כסיסמה ראשונית
                  </span>
                </label>
              </div>

              {!usePhoneAsPassword && (
                <>
                  <div>
                    <Label htmlFor="password" className="text-right block">סיסמה *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        placeholder="הזן סיסמה (לפחות 6 תווים)"
                        required
                        className="pl-10 text-right"
                      />
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword" className="text-right block">אימות סיסמה *</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        placeholder="הזן שוב את הסיסמה"
                        required
                        className="pl-10 text-right"
                      />
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
              
              <div>
                <Label htmlFor="role" className="text-right block">תפקיד</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => handleInputChange('role', value)}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">לקוח</SelectItem>
                    <SelectItem value="assistant">עוזר</SelectItem>
                    <SelectItem value="lawyer">עורך דין</SelectItem>
                    <SelectItem value="admin">מנהל</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="phone" className="text-right block">טלפון</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="הזן מספר טלפון"
                  className="text-right"
                />
              </div>
              
              <div>
                <Label htmlFor="department" className="text-right block">מחלקה</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  placeholder="הזן שם המחלקה"
                  className="text-right"
                />
              </div>

              <div>
                <Label htmlFor="idNumber" className="text-right block">תעודת זהות</Label>
                <Input
                  id="idNumber"
                  value={formData.id_number}
                  onChange={(e) => handleInputChange('id_number', e.target.value)}
                  placeholder="הזן מספר תעודת זהות"
                  className="text-right"
                />
              </div>

              <div>
                <Label htmlFor="birthDate" className="text-right block">תאריך לידה</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => handleInputChange('birth_date', e.target.value)}
                  className="text-right"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2 text-right">כתובת מגורים</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="address" className="text-right block">כתובת מלאה</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="הזן כתובת מלאה"
                  className="text-right"
                />
              </div>
              
              <div>
                <Label htmlFor="city" className="text-right block">עיר</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="הזן שם העיר"
                  className="text-right"
                />
              </div>
              
              <div>
                <Label htmlFor="postalCode" className="text-right block">מיקוד</Label>
                <Input
                  id="postalCode"
                  value={formData.postal_code}
                  onChange={(e) => handleInputChange('postal_code', e.target.value)}
                  placeholder="הזן מיקוד"
                  className="text-right"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2 text-right">איש קשר לחירום</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergencyContact" className="text-right block">שם איש קשר</Label>
                <Input
                  id="emergencyContact"
                  value={formData.emergency_contact}
                  onChange={(e) => handleInputChange('emergency_contact', e.target.value)}
                  placeholder="הזן שם איש קשר לחירום"
                  className="text-right"
                />
              </div>
              
              <div>
                <Label htmlFor="emergencyPhone" className="text-right block">טלפון חירום</Label>
                <Input
                  id="emergencyPhone"
                  value={formData.emergency_phone}
                  onChange={(e) => handleInputChange('emergency_phone', e.target.value)}
                  placeholder="הזן טלפון חירום"
                  className="text-right"
                />
              </div>
            </div>
          </div>

          {/* Permission Group Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2 text-right">קבוצת הרשאות</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="permissionGroup" className="text-right block">בחר קבוצת הרשאות (אופציונלי)</Label>
                <Select
                  value={selectedPermissionGroup}
                  onValueChange={setSelectedPermissionGroup}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="בחר קבוצת הרשאות" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ללא קבוצה (הרשאות ברירת מחדל)</SelectItem>
                    {permissionGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1 text-right">
                  אם לא תבחר קבוצה, יוקצו הרשאות ברירת מחדל לפי התפקיד
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2 text-right">הערות נוספות</h3>
            <div>
              <Label htmlFor="notes" className="text-right block">הערות</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="הזן הערות נוספות על המשתמש"
                rows={3}
                className="text-right"
              />
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2 justify-end">
              <AlertTriangle className="h-4 w-4" />
              מידע חשוב:
            </h4>
            <ul className="text-sm text-blue-800 space-y-1 text-right">
              <li>• המשתמש יקבל אימייל עם פרטי התחברות</li>
              <li>• סיסמה זמנית תהיה: tempPassword123!</li>
              <li>• המשתמש יידרש להחליף סיסמה בהתחברות הראשונה</li>
              <li>• הרשאות יוקצו אוטומטית לפי התפקיד שנבחר</li>
              <li>• אם נבחרה קבוצת הרשאות, היא תעקוף את הרשאות ברירת המחדל</li>
            </ul>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'יוצר משתמש...' : 'צור משתמש'}
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setIsFormOpen(false)}
              className="flex-1"
            >
              ביטול
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
