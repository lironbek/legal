import { useEffect, useState } from 'react';
import { useParams, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { getCompanyBySlug, getUserCompanyAssignments } from '@/lib/dataManager';
import { MainLayout } from './MainLayout';
import { Scale, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export function OrgShell() {
  const { slug } = useParams<{ slug: string }>();
  const { user, profile, loading: authLoading } = useAuth();
  const { currentCompany, switchCompany } = useCompany();
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-found' | 'no-access'>('loading');

  useEffect(() => {
    if (authLoading || !user || !profile || !slug) return;

    const company = getCompanyBySlug(slug);
    if (!company) {
      setStatus('not-found');
      return;
    }

    // Validate access: admins can access all, others need assignment
    if (profile.role !== 'admin') {
      const assignments = getUserCompanyAssignments(user.id);
      const hasAccess = assignments.some(a => a.company_id === company.id);
      if (!hasAccess) {
        setStatus('no-access');
        return;
      }
    }

    // Switch company if needed
    if (!currentCompany || currentCompany.id !== company.id) {
      switchCompany(company.id);
    }

    setStatus('ready');
  }, [slug, user, profile, authLoading, currentCompany, switchCompany]);

  // Dynamic favicon: update browser tab icon to match org logo
  useEffect(() => {
    const link = document.getElementById('dynamic-favicon') as HTMLLinkElement | null;
    if (!link) return;
    if (currentCompany?.logo_url) {
      link.href = currentCompany.logo_url;
    } else {
      link.href = '/favicon.ico';
    }
    return () => { link.href = '/favicon.ico'; };
  }, [currentCompany?.logo_url]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Scale className="h-8 w-8 text-primary" />
          </div>
          <div className="flex items-center gap-2 justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>טוען...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>טוען ארגון...</span>
        </div>
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="text-center max-w-md mx-auto p-8 bg-card rounded-2xl shadow-sm border border-border">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mb-6">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-foreground">ארגון לא נמצא</h1>
          <p className="text-muted-foreground mb-6">
            הארגון "{slug}" לא נמצא במערכת.
          </p>
          <Button asChild>
            <Link to="/">חזרה לדף הבית</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'no-access') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="text-center max-w-md mx-auto p-8 bg-card rounded-2xl shadow-sm border border-border">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mb-6">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-foreground">אין גישה</h1>
          <p className="text-muted-foreground mb-6">
            אין לך הרשאה לגשת לארגון זה.
          </p>
          <Button asChild>
            <Link to="/">חזרה לדף הבית</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}
