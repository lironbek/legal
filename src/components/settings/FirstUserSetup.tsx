import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserPlus, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useUsers } from '@/hooks/useUsers'
import { toast } from 'sonner'

export function FirstUserSetup() {
  const { createUser, users } = useUsers()
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Don't show if there are already users
  if (users.length > 0) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.full_name || !formData.password) {
      toast.error('יש למלא את כל השדות')
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

    setIsSubmitting(true)
    
    try {
      const success = await createUser({
        email: formData.email,
        full_name: formData.full_name,
        role: 'admin',
        is_active: true,
        updated_at: new Date().toISOString()
      }, formData.password)
      
      if (success) {
        toast.success('משתמש מנהל ראשון נוצר בהצלחה!')
        setFormData({
          email: '',
          full_name: '',
          password: '',
          confirmPassword: ''
        })
      }
    } catch (error) {
      console.error('Error creating first user:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Card className="mb-6 bg-background border border-border" dir="rtl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground justify-end">
          <AlertCircle className="h-5 w-5" />
          הגדרת משתמש ראשון
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4 border-border bg-muted">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-foreground text-right">
            לא נמצאו משתמשים במערכת. יש ליצור משתמש מנהל ראשון כדי להתחיל לעבוד עם המערכת.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstUserName" className="text-right block">שם מלא *</Label>
              <Input
                id="firstUserName"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="הזן שם מלא"
                required
                className="text-right"
              />
            </div>
            
            <div>
              <Label htmlFor="firstUserEmail" className="text-right block">אימייל *</Label>
              <Input
                id="firstUserEmail"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="הזן כתובת אימייל"
                required
                className="text-right"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstUserPassword" className="text-right block">סיסמה *</Label>
              <div className="relative">
                <Input
                  id="firstUserPassword"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="הזן סיסמה (לפחות 6 תווים)"
                  required
                  className="pl-10 text-right"
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
              <Label htmlFor="firstUserConfirmPassword" className="text-right block">אימות סיסמה *</Label>
              <div className="relative">
                <Input
                  id="firstUserConfirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="הזן שוב את הסיסמה"
                  required
                  className="pl-10 text-right"
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
          </div>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                  יוצר משתמש...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  צור משתמש מנהל ראשון
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

