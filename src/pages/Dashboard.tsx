
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentCases } from '@/components/dashboard/RecentCases';
import { UpcomingDeadlines } from '@/components/dashboard/UpcomingDeadlines';
import { ProjectStats } from '@/components/dashboard/ProjectStats';
import { EmailChart } from '@/components/dashboard/EmailChart';
import { ContactsList } from '@/components/dashboard/ContactsList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, Briefcase, Gavel, FileCheck, PlusCircle, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { useAuth } from '@/contexts/AuthContext';

export function Dashboard() {
  const navigate = useOrgNavigate();
  const { profile } = useAuth();
  const [statsRef, statsInView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [chartsRef, chartsInView] = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            בוקר טוב, {profile?.full_name || 'משתמש'}
          </h1>
          <p className="text-muted-foreground mt-1">
            הנה סיכום הפעילות של המשרד שלך
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/cases/new')} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            תיק חדש
          </Button>
          <Button variant="outline" onClick={() => navigate('/time-tracking')} className="gap-2">
            <Clock className="h-4 w-4" />
            רישום שעות
          </Button>
          <Button variant="outline" onClick={() => navigate('/documents/upload')} className="gap-2">
            <Upload className="h-4 w-4" />
            העלאת מסמך
          </Button>
        </div>
      </motion.div>

      {/* KPI Stats Cards */}
      <motion.div
        ref={statsRef}
        initial={{ opacity: 0, y: 20 }}
        animate={statsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        <StatsCard
          title="תיקים פעילים"
          value="127"
          change="12%"
          icon={Briefcase}
          trend="up"
          accentColor="blue"
        />
        <StatsCard
          title="לקוחות פעילים"
          value="342"
          change="8%"
          icon={Users}
          trend="up"
          accentColor="emerald"
        />
        <StatsCard
          title="תיקים שהסתיימו"
          value="89"
          change="15%"
          icon={Gavel}
          trend="up"
          accentColor="cyan"
        />
        <StatsCard
          title="מסמכים שנסרקו"
          value="1,247"
          change="23%"
          icon={FileCheck}
          trend="up"
          accentColor="purple"
        />
      </motion.div>

      {/* Charts Row */}
      <motion.div
        ref={chartsRef}
        initial={{ opacity: 0, y: 20 }}
        animate={chartsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className="lg:col-span-2">
          <ProjectStats />
        </div>
        <div>
          <EmailChart />
        </div>
      </motion.div>

      {/* Case Pipeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-display font-semibold text-foreground">סטטוס תיקים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-foreground">תיקים דחופים</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-rose-600 tabular-nums">23 תיקים</span>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-gradient-to-r from-rose-500 to-rose-400 h-2 rounded-full transition-all duration-500" style={{ width: '18%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-foreground">תיקים בטיפול</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-xs font-medium text-primary tabular-nums">67 תיקים</span>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-500" style={{ width: '53%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-foreground">תיקים שהושלמו</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-xs font-medium text-emerald-600 tabular-nums">37 תיקים</span>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full transition-all duration-500" style={{ width: '29%' }}></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Row - Cases, Deadlines, Team */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentCases />
        </div>
        <div className="space-y-6">
          <UpcomingDeadlines />
          <ContactsList />
        </div>
      </div>
    </div>
  );
}
