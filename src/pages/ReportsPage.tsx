import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Download,
  Calendar,
  DollarSign,
  Clock,
  User,
  FileText,
  TrendingUp,
  PieChart,
  Activity,
  Target
} from 'lucide-react';

const dataLabels: Record<string, string> = {
  revenue: 'הכנסות',
  expenses: 'הוצאות',
  profit: 'רווח',
  growth: 'צמיחה',
  totalHours: 'סה"כ שעות',
  billableHours: 'שעות לחיוב',
  efficiency: 'יעילות',
  avgHourly: 'תעריף ממוצע',
  totalClients: 'סה"כ לקוחות',
  activeClients: 'לקוחות פעילים',
  newClients: 'לקוחות חדשים',
  retention: 'שימור',
  totalCases: 'סה"כ תיקים',
  activeCases: 'תיקים פעילים',
  completedCases: 'תיקים שהושלמו',
  winRate: 'אחוז הצלחה',
};

const formatValue = (key: string, value: string | number): string => {
  if (typeof value === 'string') return value;
  if (key === 'revenue' || key === 'expenses' || key === 'profit') return `₪${value.toLocaleString()}`;
  if (key === 'avgHourly') return `₪${value}/שעה`;
  return String(value);
};

const reportTypes = [
  {
    id: 'financial',
    title: 'דוח כספי',
    description: 'הכנסות, הוצאות וחיובים',
    icon: DollarSign,
    color: 'bg-green-500',
    data: {
      revenue: 285000,
      expenses: 45000,
      profit: 240000,
      growth: '+12%'
    }
  },
  {
    id: 'time',
    title: 'דוח שעות עבודה',
    description: 'מעקב זמנים ופרודוקטיביות',
    icon: Clock,
    color: 'bg-blue-500',
    data: {
      totalHours: 720,
      billableHours: 650,
      efficiency: '90%',
      avgHourly: 520
    }
  },
  {
    id: 'clients',
    title: 'דוח לקוחות',
    description: 'פעילות ושביעות רצון לקוחות',
    icon: User,
    color: 'bg-purple-500',
    data: {
      totalClients: 45,
      activeClients: 38,
      newClients: 8,
      retention: '95%'
    }
  },
  {
    id: 'cases',
    title: 'דוח תיקים',
    description: 'מעקב התקדמות תיקים',
    icon: FileText,
    color: 'bg-blue-500',
    data: {
      totalCases: 67,
      activeCases: 42,
      completedCases: 25,
      winRate: '87%'
    }
  }
];

const recentReports = [
  {
    id: 'R001',
    name: 'דוח רבעוני Q2 2024',
    type: 'כספי',
    generatedDate: '2024-06-30',
    generatedBy: 'המערכת',
    status: 'הושלם',
    statusColor: 'bg-green-500',
    fileSize: '2.3 MB'
  },
  {
    id: 'R002',
    name: 'דוח שעות יוני 2024',
    type: 'זמנים',
    generatedDate: '2024-06-28',
    generatedBy: 'אדמין',
    status: 'הושלם',
    statusColor: 'bg-green-500',
    fileSize: '1.1 MB'
  },
  {
    id: 'R003',
    name: 'ניתוח פעילות לקוחות',
    type: 'לקוחות',
    generatedDate: '2024-06-25',
    generatedBy: 'המערכת',
    status: 'בתהליך',
    statusColor: 'bg-blue-500',
    fileSize: '1.8 MB'
  },
  {
    id: 'R004',
    name: 'דוח התקדמות תיקים',
    type: 'תיקים',
    generatedDate: '2024-06-20',
    generatedBy: 'המערכת',
    status: 'הושלם',
    statusColor: 'bg-green-500',
    fileSize: '3.2 MB'
  }
];

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedReportType, setSelectedReportType] = useState('all');

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="דוחות וניתוחים"
        subtitle="מעקב ביצועים, ניתוח נתונים ודוחות עסקיים"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 border-border">
              <BarChart3 className="h-4 w-4" /> צור דוח מותאם
            </Button>
            <Button className="gap-2">
              <Download className="h-4 w-4" /> ייצא דוחות
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[180px] border-border">
            <SelectValue placeholder="בחר תקופה" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">השבוע</SelectItem>
            <SelectItem value="month">החודש</SelectItem>
            <SelectItem value="quarter">הרבעון</SelectItem>
            <SelectItem value="year">השנה</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedReportType} onValueChange={setSelectedReportType}>
          <SelectTrigger className="w-[180px] border-border">
            <SelectValue placeholder="סוג דוח" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הדוחות</SelectItem>
            <SelectItem value="financial">כספי</SelectItem>
            <SelectItem value="time">זמנים</SelectItem>
            <SelectItem value="clients">לקוחות</SelectItem>
            <SelectItem value="cases">תיקים</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Report Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {reportTypes.map((report) => (
          <div key={report.id}>
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${report.color} rounded-lg flex items-center justify-center`}>
                    <report.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">{report.title}</CardTitle>
                    <p className="text-muted-foreground text-sm">{report.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(report.data).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{dataLabels[key] || key}</span>
                      <span className="font-medium text-foreground">{formatValue(key, value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Chart */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              מגמת הכנסות חודשית
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">גרף הכנסות יוצג כשיהיו נתונים אמיתיים</div>
          </CardContent>
        </Card>

        {/* Cases Chart */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              התפלגות תיקים
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className="text-muted-foreground">תיקים שהושלמו</span>
                </div>
                <span className="font-bold text-foreground">25 (37%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  <span className="text-muted-foreground">תיקים פעילים</span>
                </div>
                <span className="font-bold text-foreground">42 (63%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                  <span className="text-muted-foreground">תיקים חדשים החודש</span>
                </div>
                <span className="font-bold text-foreground">8 (12%)</span>
              </div>
              <div className="mt-6 bg-muted rounded-full h-2">
                <div className="bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            דוחות אחרונים
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {recentReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{report.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        <span>{report.type}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{report.generatedDate}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{report.generatedBy}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <Badge className={`${report.statusColor} text-white mb-1`}>
                      {report.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground">{report.fileSize}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="hover:bg-muted">
                    <Download className="h-4 w-4 text-primary" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
