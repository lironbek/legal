import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  Play,
  Pause,
  Square,
  Plus,
  Calendar,
  FileText,
  User,
  Timer,
  BarChart3,
  Search
} from 'lucide-react';

const mockTimeEntries = [
  {
    id: 'T001',
    date: '2024-06-15',
    client: 'יוסף אברהם',
    case: 'תביעת נזיקין',
    task: 'הכנת כתב הגנה',
    startTime: '09:00',
    endTime: '11:30',
    duration: '2:30',
    billable: true,
    rate: 500,
    status: 'הושלם'
  },
  {
    id: 'T002',
    date: '2024-06-15',
    client: 'משפחת לוי',
    case: 'הסכם מקרקעין',
    task: 'בדיקת מסמכים',
    startTime: '14:00',
    endTime: '16:00',
    duration: '2:00',
    billable: true,
    rate: 450,
    status: 'הושלם'
  },
  {
    id: 'T003',
    date: '2024-06-14',
    client: 'דוד כהן',
    case: 'תיק פלילי',
    task: 'ייעוץ טלפוני',
    startTime: '10:00',
    endTime: '10:45',
    duration: '0:45',
    billable: true,
    rate: 400,
    status: 'הושלם'
  },
  {
    id: 'T004',
    date: '2024-06-14',
    client: 'חברת אלפא',
    case: 'ערעור מס',
    task: 'מחקר משפטי',
    startTime: '15:00',
    endTime: '18:00',
    duration: '3:00',
    billable: true,
    rate: 600,
    status: 'הושלם'
  },
  {
    id: 'T005',
    date: '2024-06-15',
    client: 'פנימי',
    case: 'ניהול משרד',
    task: 'ישיבת צוות',
    startTime: '16:30',
    endTime: '17:30',
    duration: '1:00',
    billable: false,
    rate: 0,
    status: 'הושלם'
  }
];

export default function TimeTrackingPage() {
  const [isTracking, setIsTracking] = useState(false);
  const [currentTime, setCurrentTime] = useState('00:00:00');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEntries, setFilteredEntries] = useState(mockTimeEntries);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (!value) {
      setFilteredEntries(mockTimeEntries);
      return;
    }

    const filtered = mockTimeEntries.filter(
      (entry) =>
        entry.client.includes(value) ||
        entry.case.includes(value) ||
        entry.task.includes(value)
    );

    setFilteredEntries(filtered);
  };

  const totalHours = mockTimeEntries.reduce((sum, entry) => {
    const [hours, minutes] = entry.duration.split(':').map(Number);
    return sum + hours + minutes / 60;
  }, 0);

  const billableHours = mockTimeEntries
    .filter(entry => entry.billable)
    .reduce((sum, entry) => {
      const [hours, minutes] = entry.duration.split(':').map(Number);
      return sum + hours + minutes / 60;
    }, 0);

  const totalRevenue = mockTimeEntries
    .filter(entry => entry.billable)
    .reduce((sum, entry) => {
      const [hours, minutes] = entry.duration.split(':').map(Number);
      const entryHours = hours + minutes / 60;
      return sum + (entryHours * entry.rate);
    }, 0);

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <PageHeader
        title="מעקב זמנים"
        subtitle="רישום ומעקב שעות עבודה לתיקים ולקוחות"
        actions={
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> רישום ידני
            </Button>
          </motion.div>
        }
      />

      {/* Time Tracker Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-primary/5 border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground font-display flex items-center gap-2">
              <Timer className="h-5 w-5" />
              מד זמן פעיל
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="text-center">
                <div className="text-4xl font-bold text-foreground font-mono mb-2">
                  {currentTime}
                </div>
                <p className="text-muted-foreground text-sm">זמן נוכחי</p>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">לקוח</label>
                  <Select>
                    <SelectTrigger className="border-border">
                      <SelectValue placeholder="בחר לקוח" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client1">יוסף אברהם</SelectItem>
                      <SelectItem value="client2">משפחת לוי</SelectItem>
                      <SelectItem value="client3">דוד כהן</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">תיק</label>
                  <Select>
                    <SelectTrigger className="border-border">
                      <SelectValue placeholder="בחר תיק" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="case1">תביעת נזיקין</SelectItem>
                      <SelectItem value="case2">הסכם מקרקעין</SelectItem>
                      <SelectItem value="case3">תיק פלילי</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">משימה</label>
                  <Input
                    placeholder="תיאור המשימה"
                    className="border-border"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={() => setIsTracking(!isTracking)}
                    className={isTracking ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}
                  >
                    {isTracking ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" className="border-border">
                    <Square className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div className="mr-4">
                <p className="text-2xl font-bold text-foreground">{totalHours.toFixed(1)}</p>
                <p className="text-muted-foreground text-sm">סה"כ שעות השבוע</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <div className="mr-4">
                <p className="text-2xl font-bold text-foreground">{billableHours.toFixed(1)}</p>
                <p className="text-muted-foreground text-sm">שעות חיוביות</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <span className="text-green-600 font-bold">₪</span>
              </div>
              <div className="mr-4">
                <p className="text-2xl font-bold text-foreground">₪{totalRevenue.toLocaleString()}</p>
                <p className="text-muted-foreground text-sm">הכנסות השבוע</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Time Entries Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-border shadow-sm">
          <CardHeader className="bg-muted/50">
            <CardTitle className="text-foreground font-display">רישומי זמן</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 justify-between mt-4">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="חפש לפי לקוח, תיק או משימה..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="w-full pl-9 pr-4 border-border"
                />
              </div>
              <div className="flex gap-2">
                <Select>
                  <SelectTrigger className="w-[130px] border-border">
                    <SelectValue placeholder="תאריך" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">היום</SelectItem>
                    <SelectItem value="week">השבוע</SelectItem>
                    <SelectItem value="month">החודש</SelectItem>
                  </SelectContent>
                </Select>

                <Select>
                  <SelectTrigger className="w-[130px] border-border">
                    <SelectValue placeholder="סטטוס" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">הכל</SelectItem>
                    <SelectItem value="billable">חיובי</SelectItem>
                    <SelectItem value="non-billable">לא חיובי</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-border">
                    <TableHead className="text-foreground font-semibold">תאריך</TableHead>
                    <TableHead className="text-foreground font-semibold">לקוח</TableHead>
                    <TableHead className="hidden md:table-cell text-foreground font-semibold">תיק</TableHead>
                    <TableHead className="text-foreground font-semibold">משימה</TableHead>
                    <TableHead className="hidden lg:table-cell text-foreground font-semibold">זמן התחלה</TableHead>
                    <TableHead className="hidden lg:table-cell text-foreground font-semibold">זמן סיום</TableHead>
                    <TableHead className="text-foreground font-semibold">משך</TableHead>
                    <TableHead className="hidden md:table-cell text-foreground font-semibold">תעריף</TableHead>
                    <TableHead className="text-foreground font-semibold">סטטוס</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry, index) => (
                    <motion.tr
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-muted/50 border-border transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{entry.date}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground font-medium">{entry.client}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{entry.case}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{entry.task}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{entry.startTime}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{entry.endTime}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground font-medium">{entry.duration}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {entry.billable ? (
                          <span className="text-foreground font-medium">₪{entry.rate}/שעה</span>
                        ) : (
                          <span className="text-muted-foreground">לא חיובי</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={entry.billable ? "default" : "secondary"}
                          className={entry.billable ? "bg-green-500" : ""}
                        >
                          {entry.billable ? 'חיובי' : 'לא חיובי'}
                        </Badge>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
