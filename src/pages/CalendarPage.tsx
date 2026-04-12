import { useState, useMemo } from 'react';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  User,
  Gavel,
  Phone,
  FileText,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getEvents, Event } from '@/lib/dataManager';

// ── Helpers ──

const HEBREW_DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isSameDay(a: string, b: string): boolean {
  return a === b;
}

function getStartOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day;
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = getDaysInMonth(year, month);
  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = new Array(firstDay).fill(null);

  for (let day = 1; day <= daysInMonth; day++) {
    week.push(new Date(year, month, day));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }

  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  return weeks;
}

// ── Event helpers ──

type EventType = 'court' | 'meeting' | 'deadline' | 'consultation' | 'internal';

function getEventIcon(type: string) {
  switch (type) {
    case 'court': return <Gavel className="h-4 w-4" />;
    case 'meeting': return <User className="h-4 w-4" />;
    case 'deadline': return <AlertCircle className="h-4 w-4" />;
    case 'consultation': return <Phone className="h-4 w-4" />;
    case 'internal': return <FileText className="h-4 w-4" />;
    default: return <CalendarIcon className="h-4 w-4" />;
  }
}

function getEventColor(type: string, priority: string) {
  if (priority === 'high') return 'bg-red-500 text-white';
  switch (type) {
    case 'court': return 'bg-purple-500 text-white';
    case 'meeting': return 'bg-blue-500 text-white';
    case 'deadline': return 'bg-amber-500 text-white';
    case 'consultation': return 'bg-emerald-500 text-white';
    case 'internal': return 'bg-slate-500 text-white';
    default: return 'bg-muted-foreground text-white';
  }
}

function getEventDotColor(type: string, priority: string) {
  if (priority === 'high') return 'bg-red-500';
  switch (type) {
    case 'court': return 'bg-purple-500';
    case 'meeting': return 'bg-blue-500';
    case 'deadline': return 'bg-amber-500';
    case 'consultation': return 'bg-emerald-500';
    case 'internal': return 'bg-slate-500';
    default: return 'bg-muted-foreground';
  }
}

function getPriorityLabel(p: string) {
  switch (p) {
    case 'high': return 'דחוף';
    case 'medium': return 'בינוני';
    default: return 'נמוך';
  }
}

function getTypeLabel(t: string) {
  switch (t) {
    case 'court': return 'דיון';
    case 'meeting': return 'פגישה';
    case 'deadline': return 'מועד';
    case 'consultation': return 'ייעוץ';
    case 'internal': return 'פנימי';
    default: return 'אירוע';
  }
}

// ── Component ──

export default function CalendarPage() {
  const navigate = useOrgNavigate();
  const today = new Date();
  const todayStr = toDateString(today);

  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');

  const allEvents = useMemo(() => getEvents(), []);

  // Navigation
  const goNext = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (viewMode === 'day') d.setDate(d.getDate() + 1);
      else if (viewMode === 'week') d.setDate(d.getDate() + 7);
      else d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const goPrev = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (viewMode === 'day') d.setDate(d.getDate() - 1);
      else if (viewMode === 'week') d.setDate(d.getDate() - 7);
      else d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const goToday = () => {
    setCurrentDate(today);
    setSelectedDate(todayStr);
  };

  // Heading
  const heading = useMemo(() => {
    if (viewMode === 'day') {
      return `${currentDate.getDate()} ${HEBREW_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    if (viewMode === 'week') {
      const start = getStartOfWeek(currentDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()}-${end.getDate()} ${HEBREW_MONTHS[start.getMonth()]} ${start.getFullYear()}`;
      }
      return `${start.getDate()} ${HEBREW_MONTHS[start.getMonth()]} - ${end.getDate()} ${HEBREW_MONTHS[end.getMonth()]} ${end.getFullYear()}`;
    }
    return `${HEBREW_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [currentDate, viewMode]);

  // Events for selected date
  const selectedDayEvents = useMemo(
    () => allEvents.filter(e => isSameDay(e.date, selectedDate)).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')),
    [allEvents, selectedDate]
  );

  // Events count per date (for dots)
  const eventsByDate = useMemo(() => {
    const map: Record<string, Event[]> = {};
    allEvents.forEach(e => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [allEvents]);

  // Week days
  const weekDays = useMemo(() => {
    const start = viewMode === 'day' ? currentDate : getStartOfWeek(currentDate);
    const count = viewMode === 'day' ? 1 : 7;
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate, viewMode]);

  // Month grid
  const monthGrid = useMemo(
    () => getMonthGrid(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );

  // Upcoming events (next 7 days from today)
  const upcomingEvents = useMemo(() => {
    const todayD = toDateString(today);
    const weekLater = new Date(today);
    weekLater.setDate(weekLater.getDate() + 7);
    const weekLaterStr = toDateString(weekLater);
    return allEvents
      .filter(e => e.date >= todayD && e.date <= weekLaterStr)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || '').localeCompare(b.startTime || ''))
      .slice(0, 5);
  }, [allEvents]);

  // Stats
  const weekStats = useMemo(() => {
    const start = getStartOfWeek(currentDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const s = toDateString(start);
    const e = toDateString(end);
    const weekEvents = allEvents.filter(ev => ev.date >= s && ev.date <= e);
    return {
      court: weekEvents.filter(ev => ev.type === 'court').length,
      meeting: weekEvents.filter(ev => ev.type === 'meeting').length,
      deadline: weekEvents.filter(ev => ev.type === 'deadline').length,
      total: weekEvents.length,
    };
  }, [allEvents, currentDate]);

  // ── Render ──

  const renderEventCard = (event: Event) => (
    <div
      key={event.id}
      className="flex items-start gap-3 p-4 rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all group"
    >
      <div className={`p-2 rounded-lg shrink-0 ${getEventColor(event.type, event.priority)}`}>
        {getEventIcon(event.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-medium text-foreground truncate">{event.title}</h3>
            {event.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{event.description}</p>
            )}
          </div>
          <Badge
            variant={event.priority === 'high' ? 'destructive' : 'secondary'}
            className="shrink-0 text-xs"
          >
            {getPriorityLabel(event.priority)}
          </Badge>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {(event.startTime || event.endTime) && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {event.startTime}{event.endTime ? ` - ${event.endTime}` : ''}
            </span>
          )}
          {event.client && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {event.client}
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {event.location}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="יומן דיונים"
        subtitle="ניהול פגישות, דיונים ומועדים משפטיים"
        actions={
          <Button className="gap-2" onClick={() => navigate('/calendar/new')}>
            <Plus className="h-4 w-4" /> אירוע חדש
          </Button>
        }
      />

      {/* Calendar Card */}
      <Card className="border-border shadow-lg">
        {/* Toolbar */}
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={goPrev}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={goNext}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-bold text-foreground mr-2">{heading}</h2>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={goToday}>
                היום
              </Button>
              <div className="flex bg-muted rounded-lg p-0.5">
                {(['day', 'week', 'month'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                      viewMode === mode
                        ? 'bg-background text-foreground shadow-sm font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {mode === 'day' ? 'יום' : mode === 'week' ? 'שבוע' : 'חודש'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* ── Month View ── */}
          {viewMode === 'month' && (
            <div className="border border-border rounded-xl overflow-hidden">
              {/* Day headers */}
              <div className="grid grid-cols-7 bg-muted/50">
                {HEBREW_DAYS.map((day, i) => (
                  <div key={i} className="py-2 text-center text-xs font-medium text-muted-foreground border-b border-border">
                    {day}
                  </div>
                ))}
              </div>
              {/* Weeks */}
              {monthGrid.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7">
                  {week.map((date, di) => {
                    if (!date) {
                      return <div key={di} className="min-h-[80px] border-b border-r border-border last:border-r-0 bg-muted/20" />;
                    }
                    const ds = toDateString(date);
                    const isToday = ds === todayStr;
                    const isSelected = ds === selectedDate;
                    const dayEvents = eventsByDate[ds] || [];
                    const isCurrentMonth = date.getMonth() === currentDate.getMonth();

                    return (
                      <div
                        key={di}
                        className={`min-h-[80px] p-1.5 border-b border-r border-border last:border-r-0 cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/5' : 'hover:bg-muted/40'
                        } ${!isCurrentMonth ? 'opacity-40' : ''}`}
                        onClick={() => setSelectedDate(ds)}
                      >
                        <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm mb-1 ${
                          isToday
                            ? 'bg-primary text-primary-foreground font-bold'
                            : isSelected
                              ? 'bg-primary/20 text-primary font-medium'
                              : 'text-foreground'
                        }`}>
                          {date.getDate()}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 2).map((ev) => (
                            <div key={ev.id} className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate ${getEventDotColor(ev.type, ev.priority)} text-white`}>
                              {ev.startTime ? `${ev.startTime} ` : ''}{ev.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 2} עוד</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* ── Week View ── */}
          {viewMode === 'week' && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-7">
                {weekDays.map((date) => {
                  const ds = toDateString(date);
                  const isToday = ds === todayStr;
                  const isSelected = ds === selectedDate;
                  const dayEvents = eventsByDate[ds] || [];

                  return (
                    <div
                      key={ds}
                      className={`min-h-[140px] p-2 border-r border-border last:border-r-0 cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/5' : 'hover:bg-muted/40'
                      }`}
                      onClick={() => setSelectedDate(ds)}
                    >
                      <div className="text-center mb-2">
                        <div className="text-xs text-muted-foreground">{HEBREW_DAYS[date.getDay()]}</div>
                        <div className={`w-9 h-9 mx-auto flex items-center justify-center rounded-full text-sm mt-0.5 ${
                          isToday
                            ? 'bg-primary text-primary-foreground font-bold'
                            : isSelected
                              ? 'bg-primary/20 text-primary font-medium'
                              : 'text-foreground'
                        }`}>
                          {date.getDate()}
                        </div>
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <div key={ev.id} className={`text-[11px] leading-tight px-1.5 py-1 rounded truncate ${getEventDotColor(ev.type, ev.priority)} text-white`}>
                            {ev.startTime ? `${ev.startTime} ` : ''}{ev.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-muted-foreground text-center">+{dayEvents.length - 3} עוד</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Day View ── */}
          {viewMode === 'day' && (() => {
            const ds = toDateString(currentDate);
            const dayEvents = (eventsByDate[ds] || []).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

            return (
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="bg-muted/50 px-4 py-3 border-b border-border flex items-center gap-3">
                  <div className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold ${
                    ds === todayStr ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                  }`}>
                    {currentDate.getDate()}
                  </div>
                  <div>
                    <p className="font-medium">{HEBREW_DAYS[currentDate.getDay()]}  {currentDate.getDate()} {HEBREW_MONTHS[currentDate.getMonth()]}</p>
                    <p className="text-xs text-muted-foreground">{dayEvents.length} אירועים</p>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {dayEvents.length === 0 ? (
                    <div className="text-center py-12">
                      <CalendarIcon className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">אין אירועים ביום זה</p>
                      <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => navigate('/calendar/new')}>
                        <Plus className="h-3 w-3" /> הוסף אירוע
                      </Button>
                    </div>
                  ) : (
                    dayEvents.map((ev) => (
                      <div key={ev.id} className="flex gap-3 p-4">
                        <div className="text-sm text-muted-foreground w-14 shrink-0 pt-0.5 text-left" dir="ltr">
                          {ev.startTime || '--:--'}
                        </div>
                        <div className={`w-1 shrink-0 rounded-full ${getEventDotColor(ev.type, ev.priority)}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{ev.title}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
                            {ev.endTime && <span>{ev.startTime} - {ev.endTime}</span>}
                            {ev.client && <span>{ev.client}</span>}
                            {ev.location && <span>{ev.location}</span>}
                          </div>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-xs h-fit">
                          {getTypeLabel(ev.type)}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selected Day Events */}
        <div className="lg:col-span-2">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                אירועים ב-{new Date(selectedDate).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDayEvents.length > 0 ? (
                <div className="space-y-3">
                  {selectedDayEvents.map(renderEventCard)}
                </div>
              ) : (
                <div className="text-center py-10">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">אין אירועים מתוכננים ליום זה</p>
                  <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => navigate('/calendar/new')}>
                    <Plus className="h-3 w-3" /> הוסף אירוע
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Week Stats */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">סטטיסטיקות השבוע</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-purple-500 rounded-full" />
                    <span className="text-sm text-muted-foreground">דיונים</span>
                  </div>
                  <span className="font-bold text-foreground">{weekStats.court}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                    <span className="text-sm text-muted-foreground">פגישות</span>
                  </div>
                  <span className="font-bold text-foreground">{weekStats.meeting}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
                    <span className="text-sm text-muted-foreground">מועדים</span>
                  </div>
                  <span className="font-bold text-foreground">{weekStats.deadline}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">סה"כ</span>
                  <span className="font-bold text-primary">{weekStats.total}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">אירועים קרובים</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">אין אירועים קרובים</p>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedDate(event.date);
                        setCurrentDate(new Date(event.date));
                      }}
                    >
                      <div className={`p-1.5 rounded-md shrink-0 ${getEventColor(event.type, event.priority)}`}>
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.date).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {event.startTime ? ` · ${event.startTime}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-border bg-muted/30">
            <CardContent className="p-4">
              <h3 className="font-medium text-foreground mb-3">פעולות מהירות</h3>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => navigate('/calendar/new')}>
                  <Gavel className="h-4 w-4" />
                  תזמן דיון
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => navigate('/calendar/new')}>
                  <User className="h-4 w-4" />
                  קבע פגישת לקוח
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => navigate('/calendar/new')}>
                  <AlertCircle className="h-4 w-4" />
                  הוסף מועד חשוב
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
