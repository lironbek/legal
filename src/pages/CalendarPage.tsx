import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  User,
  Gavel,
  Phone,
  FileText,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const mockEvents = [
  {
    id: 'E001',
    title: 'דיון בבית משפט - תיק אברהם',
    type: 'court',
    client: 'יוסף אברהם',
    date: '2024-06-20',
    time: '09:00',
    duration: '2 שעות',
    location: 'בית משפט השלום תל אביב',
    priority: 'high',
    description: 'דיון ראשוני בתביעת נזיקין'
  },
  {
    id: 'E002',
    title: 'פגישה עם לקוח - משפחת לוי',
    type: 'meeting',
    client: 'משפחת לוי',
    date: '2024-06-20',
    time: '14:00',
    duration: '1 שעה',
    location: 'המשרד',
    priority: 'medium',
    description: 'סקירת הסכם המקרקעין'
  },
  {
    id: 'E003',
    title: 'הגשת מסמכים לבית משפט',
    type: 'deadline',
    client: 'דוד כהן',
    date: '2024-06-21',
    time: '12:00',
    duration: '30 דקות',
    location: 'בית משפט השלום ירושלים',
    priority: 'high',
    description: 'הגשת כתב הגנה'
  },
  {
    id: 'E004',
    title: 'ייעוץ טלפוני',
    type: 'consultation',
    client: 'רחל גרינברג',
    date: '2024-06-21',
    time: '10:30',
    duration: '45 דקות',
    location: 'שיחת טלפון',
    priority: 'low',
    description: 'ייעוץ בנושא דיני עבודה'
  },
  {
    id: 'E005',
    title: 'ישיבת צוות שבועית',
    type: 'internal',
    client: 'פנימי',
    date: '2024-06-22',
    time: '09:00',
    duration: '1.5 שעות',
    location: 'חדר הישיבות',
    priority: 'medium',
    description: 'סקירת תיקים פעילים'
  }
];

const currentWeek = [
  { date: '16', day: 'א', isToday: false },
  { date: '17', day: 'ב', isToday: false },
  { date: '18', day: 'ג', isToday: false },
  { date: '19', day: 'ד', isToday: false },
  { date: '20', day: 'ה', isToday: true },
  { date: '21', day: 'ו', isToday: false },
  { date: '22', day: 'ש', isToday: false }
];

export default function CalendarPage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState('2024-06-15');
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');

  const handleNewEvent = () => {
    navigate('/calendar/new');
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'court':
        return <Gavel className="h-4 w-4" />;
      case 'meeting':
        return <User className="h-4 w-4" />;
      case 'deadline':
        return <AlertCircle className="h-4 w-4" />;
      case 'consultation':
        return <Phone className="h-4 w-4" />;
      case 'internal':
        return <FileText className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: string, priority: string) => {
    if (priority === 'high') return 'bg-red-500';
    if (type === 'court') return 'bg-purple-500';
    if (type === 'meeting') return 'bg-blue-500';
    if (type === 'deadline') return 'bg-blue-500';
    if (type === 'consultation') return 'bg-green-500';
    return 'bg-muted-foreground';
  };

  const todayEvents = mockEvents.filter(event => event.date === selectedDate);
  const upcomingEvents = mockEvents.filter(event => event.date > selectedDate).slice(0, 3);

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <PageHeader
        title="לוח זמנים"
        subtitle="ניהול פגישות, דיונים ומועדים משפטיים"
        actions={
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button className="gap-2" onClick={handleNewEvent}>
              <Plus className="h-4 w-4" /> אירוע חדש
            </Button>
          </motion.div>
        }
      />

      {/* Calendar Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-border shadow-sm">
          <CardHeader className="bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="border-border">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-bold text-foreground">יוני 2024</h2>
                <Button variant="outline" size="icon" className="border-border">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('day')}
                  className="border-border"
                >
                  יום
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                  className="border-border"
                >
                  שבוע
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                  className="border-border"
                >
                  חודש
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* Week View */}
            <div className="grid grid-cols-7 gap-2">
              {currentWeek.map((day, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  className={`
                    p-4 rounded-lg text-center cursor-pointer transition-all
                    ${day.isToday
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/50 text-foreground hover:bg-muted'
                    }
                  `}
                  onClick={() => setSelectedDate(`2024-06-${day.date}`)}
                >
                  <div className="text-sm font-medium">{day.day}</div>
                  <div className="text-lg font-bold">{day.date}</div>
                  <div className="mt-2 space-y-1">
                    {mockEvents
                      .filter(event => event.date === `2024-06-${day.date}`)
                      .slice(0, 2)
                      .map((event, idx) => (
                        <div
                          key={idx}
                          className={`
                            w-full h-1 rounded-full
                            ${getEventColor(event.type, event.priority)}
                          `}
                        />
                      ))
                    }
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Events */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-muted/50">
              <CardTitle className="text-foreground font-display flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                אירועי היום - {selectedDate}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {todayEvents.length > 0 ? (
                  todayEvents.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className={`p-2 rounded-lg ${getEventColor(event.type, event.priority)}`}>
                        {getEventIcon(event.type)}
                        <span className="text-white text-xs sr-only">{event.type}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-foreground">{event.title}</h3>
                            <p className="text-muted-foreground text-sm">{event.description}</p>
                          </div>
                          <Badge
                            variant={event.priority === 'high' ? 'destructive' : 'secondary'}
                            className={
                              event.priority === 'high' ? 'bg-red-500' :
                              event.priority === 'medium' ? 'bg-blue-500' : ''
                            }
                          >
                            {event.priority === 'high' ? 'דחוף' :
                             event.priority === 'medium' ? 'בינוני' : 'נמוך'}
                          </Badge>
                        </div>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{event.time} ({event.duration})</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{event.client}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{event.location}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">אין אירועים מתוכננים ליום זה</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          {/* Quick Stats */}
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-muted/50">
              <CardTitle className="text-foreground font-display">סטטיסטיקות השבוע</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-muted-foreground text-sm">דיונים בבית משפט</span>
                  </div>
                  <span className="font-bold text-foreground">3</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-muted-foreground text-sm">פגישות לקוחות</span>
                  </div>
                  <span className="font-bold text-foreground">5</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-muted-foreground text-sm">מועדים חשובים</span>
                  </div>
                  <span className="font-bold text-foreground">2</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-muted-foreground text-sm">ייעוצים</span>
                  </div>
                  <span className="font-bold text-foreground">4</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-muted/50">
              <CardTitle className="text-foreground font-display">אירועים קרובים</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {upcomingEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className={`p-1.5 rounded ${getEventColor(event.type, event.priority)}`}>
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.date} • {event.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-muted/50 border-border">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">פעולות מהירות</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start border-border">
                  <Plus className="h-4 w-4 ml-2" />
                  תזמן דיון חדש
                </Button>
                <Button variant="outline" className="w-full justify-start border-border">
                  <User className="h-4 w-4 ml-2" />
                  קבע פגישת לקוח
                </Button>
                <Button variant="outline" className="w-full justify-start border-border">
                  <AlertCircle className="h-4 w-4 ml-2" />
                  הוסף מועד חשוב
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
