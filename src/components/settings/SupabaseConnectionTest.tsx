import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Database, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  ExternalLink 
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ConnectionStatus {
  isConnected: boolean
  isRealSupabase: boolean
  error?: string
  projectUrl?: string
}

export function SupabaseConnectionTest() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const checkConnection = async () => {
    setIsChecking(true)
    setStatus(null)

    try {
      // Check if we have real Supabase client
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      const isRealSupabase = supabaseUrl && 
        supabaseKey && 
        supabaseUrl !== 'https://placeholder.supabase.co' && 
        supabaseKey !== 'placeholder-key'

      if (!isRealSupabase) {
        setStatus({
          isConnected: false,
          isRealSupabase: false,
          error: 'משתני סביבה לא מוגדרים - עובד במצב Mock'
        })
        return
      }

      // Test actual connection (with 5s timeout)
      const queryResult = await Promise.race([
        supabase.from('profiles').select('count', { count: 'exact', head: true }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('החיבור ל-Supabase עבר זמן מותר (timeout)')), 15000))
      ]) as any

      const { data, error } = queryResult
      if (error && error.code !== 'PGRST116') { // PGRST116 is "table not found" which is expected
        throw error
      }

      setStatus({
        isConnected: true,
        isRealSupabase: true,
        projectUrl: supabaseUrl
      })

    } catch (error: any) {
      setStatus({
        isConnected: false,
        isRealSupabase: true,
        error: error.message || 'שגיאה בחיבור לSupabase'
      })
    } finally {
      setIsChecking(false)
    }
  }

  const getStatusBadge = () => {
    if (!status) return null

    if (status.isConnected && status.isRealSupabase) {
      return (
        <Badge className="bg-green-500 text-white">
          <CheckCircle className="h-3 w-3 ml-1" />
          מחובר לSupabase
        </Badge>
      )
    }

    if (!status.isRealSupabase) {
      return (
        <Badge className="bg-yellow-500 text-white">
          <AlertCircle className="h-3 w-3 ml-1" />
          מצב Mock
        </Badge>
      )
    }

    return (
      <Badge className="bg-red-500 text-white">
        <XCircle className="h-3 w-3 ml-1" />
        שגיאה בחיבור
      </Badge>
    )
  }

  return (
    <Card dir="rtl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-end">
          <Database className="h-5 w-5" />
          בדיקת חיבור Supabase
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1 text-right">
            <p className="text-sm font-medium">סטטוס חיבור</p>
            <p className="text-xs text-gray-500">
              בדוק את החיבור למסד הנתונים
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Button
              variant="outline"
              size="sm"
              onClick={checkConnection}
              disabled={isChecking}
            >
              {isChecking ? (
                <>
                  <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                  בודק...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 ml-2" />
                  בדוק חיבור
                </>
              )}
            </Button>
          </div>
        </div>

        {status && (
          <>
            {status.isConnected && status.isRealSupabase && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-green-800 text-right">
                  <strong>החיבור תקין!</strong>
                  <br />
                  המערכת מחוברת בהצלחה לSupabase.
                  {status.projectUrl && (
                    <>
                      <br />
                      <span className="text-xs">פרויקט: {status.projectUrl}</span>
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {!status.isRealSupabase && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-yellow-800 text-right">
                  <strong>מצב פיתוח (Mock) - לא מחובר לSupabase</strong>
                  <br />
                  המערכת פועלת במצב הדמיה. כל המשתמשים נשמרים ב-localStorage ולא בטבלת auth של Supabase.
                  <br />
                  <strong>כדי לראות משתמשים בSupabase:</strong>
                  <br />
                  <span className="text-xs">
                    1. צור קובץ .env בשורש הפרויקט<br />
                    2. הוסף VITE_SUPABASE_URL=כתובת-הפרויקט-שלך<br />
                    3. הוסף VITE_SUPABASE_ANON_KEY=המפתח-שלך<br />
                    4. הפעל מחדש את השרת (npm run dev)
                  </span>
                </AlertDescription>
              </Alert>
            )}

            {status.error && status.isRealSupabase && (
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4" />
                <AlertDescription className="text-red-800 text-right">
                  <strong>שגיאה בחיבור</strong>
                  <br />
                  {status.error}
                  <br />
                  <span className="text-xs">
                    בדוק את משתני הסביבה והטבלאות בSupabase
                  </span>
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        <div className="space-y-2 pt-4 border-t">
          <h4 className="text-sm font-medium text-right">הגדרת Supabase</h4>
          <div className="text-xs text-gray-600 space-y-1 text-right">
            <p>• צור קובץ <code className="bg-gray-100 px-1 rounded">.env</code> בשורש הפרויקט</p>
            <p>• הוסף: <code className="bg-gray-100 px-1 rounded">VITE_SUPABASE_URL=your-url</code></p>
            <p>• הוסף: <code className="bg-gray-100 px-1 rounded">VITE_SUPABASE_ANON_KEY=your-key</code></p>
            <p>
              • עיין במדריך המלא: 
              <Button 
                variant="link" 
                size="sm" 
                className="h-auto p-0 text-xs"
                onClick={() => {
                  // This would open the setup guide
                  console.log('Opening SUPABASE_SETUP.md')
                }}
              >
                <ExternalLink className="h-3 w-3 ml-1" />
                SUPABASE_SETUP.md
              </Button>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
