import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, UserCheck, UserX, Shield, Clock, TrendingUp } from 'lucide-react'
import { useUsers } from '@/hooks/useUsers'

export function UserStats() {
  const { users, permissions } = useUsers()

  const totalUsers = users.length
  const activeUsers = users.filter(user => user.is_active).length
  const inactiveUsers = totalUsers - activeUsers
  
  const roleCounts = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const totalPermissions = permissions.length
  const usersWithFullAccess = permissions.filter(perm => 
    perm.can_manage_users && perm.can_manage_permission_groups
  ).length

  const recentUsers = users
    .filter(user => {
      const userDate = new Date(user.created_at)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return userDate > weekAgo
    })
    .length

  return (
    <div dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-right">סה"כ משתמשים</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-right">{totalUsers}</div>
            <p className="text-xs text-muted-foreground text-right">
              משתמשים במערכת
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-right">משתמשים פעילים</CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 text-right">{activeUsers}</div>
            <p className="text-xs text-muted-foreground text-right">
              {totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0}% מהמשתמשים
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-right">משתמשים לא פעילים</CardTitle>
            <UserX className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive text-right">{inactiveUsers}</div>
            <p className="text-xs text-muted-foreground text-right">
              דורש התייחסות
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-right">משתמשים חדשים</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 text-right">{recentUsers}</div>
            <p className="text-xs text-muted-foreground text-right">
              השבוע האחרון
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-end">
              <Shield className="h-5 w-5" />
              חלוקה לפי תפקידים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(roleCounts).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {role === 'admin' && 'מנהל'}
                      {role === 'lawyer' && 'עורך דין'}
                      {role === 'assistant' && 'עוזר'}
                      {role === 'client' && 'לקוח'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {role === 'admin' && 'ניהול מלא'}
                      {role === 'lawyer' && 'ניהול תיקים'}
                      {role === 'assistant' && 'תמיכה'}
                      {role === 'client' && 'גישה מוגבלת'}
                    </span>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-end">
              <Clock className="h-5 w-5" />
              סטטוס הרשאות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-right">משתמשים עם הרשאות מלאות</span>
                <Badge variant="secondary">{usersWithFullAccess}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-right">סה"כ הרשאות מוגדרות</span>
                <Badge variant="outline">{totalPermissions}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-right">משתמשים ללא הרשאות</span>
                <Badge variant="destructive">
                  {Math.max(0, totalUsers - totalPermissions)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
