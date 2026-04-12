
import { useMemo } from 'react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentCases } from '@/components/dashboard/RecentCases';
import { UpcomingDeadlines } from '@/components/dashboard/UpcomingDeadlines';
import { TasksWidget } from '@/components/dashboard/TasksWidget';
import { Users, Briefcase, Gavel, FileCheck, PlusCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { useAuth } from '@/contexts/AuthContext';
import { getCases, getClients, getDocuments } from '@/lib/dataManager';

export function Dashboard() {
  const navigate = useOrgNavigate();
  const { profile } = useAuth();

  const stats = useMemo(() => {
    const cases = getCases();
    const clients = getClients();
    const documents = getDocuments();
    const activeCases = cases.filter(c => c.status !== 'סגור' && c.status !== 'closed');
    const closedCases = cases.filter(c => c.status === 'סגור' || c.status === 'closed');
    const activeClients = clients.filter(c => c.status === 'פעיל' || c.status === 'active');
    return {
      activeCases: activeCases.length,
      activeClients: activeClients.length,
      closedCases: closedCases.length,
      documents: documents.length,
    };
  }, []);

  const today = new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 md:p-8 text-white"
        style={{ background: 'linear-gradient(135deg, #4338ca 0%, #5b4fd4 40%, #7c6be6 100%)' }}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-40 h-40 rounded-full -translate-x-1/2 -translate-y-1/2" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full translate-x-1/3 translate-y-1/3" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="absolute top-1/2 left-1/3 w-20 h-20 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-white/70 text-sm mb-2">
              <Calendar className="h-4 w-4" />
              <span>{today}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              בוקר טוב, {profile?.full_name || 'משתמש'}
            </h1>
            <p className="text-sm text-white/70 mt-1">
              הנה סיכום הפעילות של המשרד שלך
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/cases/new')}
              className="gap-2 bg-white text-blue-700 hover:bg-white/90 shadow-lg font-medium"
            >
              <PlusCircle className="h-4 w-4" />
              תיק חדש
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard
          title="תיקים פעילים"
          value={String(stats.activeCases)}
          change=""
          icon={Briefcase}
          trend="up"
          accentColor="blue"
        />
        <StatsCard
          title="לקוחות פעילים"
          value={String(stats.activeClients)}
          change=""
          icon={Users}
          trend="up"
          accentColor="emerald"
        />
        <StatsCard
          title="תיקים שהסתיימו"
          value={String(stats.closedCases)}
          change=""
          icon={Gavel}
          trend="up"
          accentColor="cyan"
        />
        <StatsCard
          title="מסמכים"
          value={String(stats.documents)}
          change=""
          icon={FileCheck}
          trend="up"
          accentColor="violet"
        />
      </div>

      {/* Bottom Row - Cases + Deadlines & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentCases />
        </div>
        <div className="space-y-6">
          <UpcomingDeadlines />
          <TasksWidget />
        </div>
      </div>
    </div>
  );
}
