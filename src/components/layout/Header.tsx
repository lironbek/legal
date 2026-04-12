
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Bell, LogOut, Settings, ChevronLeft, LayoutGrid } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const pageTitles: Record<string, { title: string; breadcrumbs: string[] }> = {
  '/': { title: 'לוח הבקרה', breadcrumbs: ['ראשי'] },
  '/cases': { title: 'ניהול תיקים', breadcrumbs: ['ראשי', 'תיקים'] },
  '/cases/new': { title: 'תיק חדש', breadcrumbs: ['ראשי', 'תיקים', 'חדש'] },
  '/clients': { title: 'לקוחות', breadcrumbs: ['ראשי', 'לקוחות'] },
  '/clients/new': { title: 'לקוח חדש', breadcrumbs: ['ראשי', 'לקוחות', 'חדש'] },
  '/time-tracking': { title: 'שעות עבודה', breadcrumbs: ['פיננסי', 'שעות עבודה'] },
  '/billing': { title: 'חשבונות', breadcrumbs: ['פיננסי', 'חשבונות'] },
  '/billing/new': { title: 'חשבונית חדשה', breadcrumbs: ['פיננסי', 'חשבונות', 'חדש'] },
  '/calendar': { title: 'יומן דיונים', breadcrumbs: ['ראשי', 'יומן'] },
  '/calendar/new': { title: 'אירוע חדש', breadcrumbs: ['ראשי', 'יומן', 'חדש'] },
  '/documents': { title: 'ארכיון מסמכים', breadcrumbs: ['כלים', 'מסמכים'] },
  '/documents/upload': { title: 'סריקת מסמכים', breadcrumbs: ['כלים', 'מסמכים', 'סריקה'] },
  '/scanned-documents': { title: 'מסמכים סרוקים', breadcrumbs: ['כלים', 'מסמכים סרוקים'] },
  '/reports': { title: 'דוחות', breadcrumbs: ['פיננסי', 'דוחות'] },
  '/cash-flow': { title: 'תזרים מזומנים', breadcrumbs: ['פיננסי', 'תזרים מזומנים'] },
  '/budget': { title: 'תקציב', breadcrumbs: ['פיננסי', 'תקציב'] },
  '/legal-library': { title: 'ספרייה משפטית', breadcrumbs: ['כלים', 'ספרייה'] },
  '/disability-calculator': { title: 'מחשבון נכות', breadcrumbs: ['כלים', 'מחשבון'] },
  '/tort-claims': { title: 'כתבי תביעה', breadcrumbs: ['כלים', 'כתבי תביעה'] },
  '/tort-claims/new': { title: 'כתב תביעה חדש', breadcrumbs: ['כלים', 'כתבי תביעה', 'חדש'] },
  '/nizkin': { title: 'נזיקין', breadcrumbs: ['כלים', 'נזיקין'] },
  '/nizkin/new': { title: 'כתב תביעה חדש', breadcrumbs: ['כלים', 'נזיקין', 'חדש'] },
  '/settings': { title: 'הגדרות', breadcrumbs: ['הגדרות'] },
};

function getPageInfo(pathname: string) {
  const stripped = pathname.replace(/^\/org\/[^/]+/, '') || '/';
  if (pageTitles[stripped]) return pageTitles[stripped];
  if (stripped.match(/^\/cases\/[^/]+\/documents$/)) return { title: 'מסמכי תיק', breadcrumbs: ['ראשי', 'תיקים', 'מסמכים'] };
  if (stripped.match(/^\/cases\/[^/]+\/documents\/upload$/)) return { title: 'העלאת מסמך לתיק', breadcrumbs: ['ראשי', 'תיקים', 'העלאה'] };
  if (stripped.match(/^\/cases\/[^/]+\/view$/)) return { title: 'צפייה בתיק', breadcrumbs: ['ראשי', 'תיקים', 'צפייה'] };
  if (stripped.match(/^\/cases\/[^/]+\/edit$/)) return { title: 'עריכת תיק', breadcrumbs: ['ראשי', 'תיקים', 'עריכה'] };
  if (stripped.match(/^\/clients\/[^/]+\/edit$/)) return { title: 'עריכת לקוח', breadcrumbs: ['ראשי', 'לקוחות', 'עריכה'] };
  if (stripped.match(/^\/tort-claims\/[^/]+\/view$/)) return { title: 'צפייה בכתב תביעה', breadcrumbs: ['כלים', 'כתבי תביעה', 'צפייה'] };
  if (stripped.match(/^\/tort-claims\/[^/]+\/edit$/)) return { title: 'עריכת כתב תביעה', breadcrumbs: ['כלים', 'כתבי תביעה', 'עריכה'] };
  if (stripped.match(/^\/nizkin\/[^/]+\/edit$/)) return { title: 'עריכת כתב תביעה', breadcrumbs: ['כלים', 'נזיקין', 'עריכה'] };
  if (stripped.match(/^\/nizkin\/[^/]+$/)) return { title: 'צפייה בכתב תביעה', breadcrumbs: ['כלים', 'נזיקין', 'צפייה'] };
  return { title: '', breadcrumbs: [] };
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return parts[0].charAt(0) + '.' + parts[1].charAt(0);
  }
  return name.charAt(0);
}

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const orgNavigate = useOrgNavigate();
  const { user, profile, signOut } = useAuth();
  const pageInfo = getPageInfo(location.pathname);

  const displayName = profile?.full_name || user?.email || '';
  const displayEmail = user?.email || '';
  const initials = getInitials(displayName);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-lg border-b border-border shadow-xs">
      <div className="flex h-14 items-center justify-between px-5">
        {/* Right side - Sidebar trigger + Breadcrumbs */}
        <div className="flex items-center gap-3">
          <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground" />
          <div className="hidden sm:block h-5 w-px bg-border" />
          <nav className="hidden sm:flex items-center gap-1.5 text-[13px]">
            {pageInfo.breadcrumbs.map((crumb, index) => (
              <span key={index} className="flex items-center gap-1.5">
                {index > 0 && <ChevronLeft className="h-3 w-3 text-muted-foreground/40" />}
                <span className={index === pageInfo.breadcrumbs.length - 1 ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                  {crumb}
                </span>
              </span>
            ))}
          </nav>
          {/* Mobile: just show page title */}
          <span className="sm:hidden text-sm font-medium text-foreground">
            {pageInfo.title}
          </span>
        </div>

        {/* Left side - Actions */}
        <div className="flex items-center gap-1">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 text-muted-foreground hover:text-foreground rounded-lg"
            onClick={() => orgNavigate('/settings')}
            title="התראות"
          >
            <Bell className="h-4 w-4" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 w-9 p-0 rounded-full ring-2 ring-primary/10 hover:ring-primary/20 transition-all">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" dir="rtl">
              <DropdownMenuLabel>
                <div>
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">{displayEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {profile?.role === 'admin' && (
                <DropdownMenuItem onClick={() => navigate('/')}>
                  <LayoutGrid className="h-4 w-4 ml-2" />
                  חזרה ל-Backoffice
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => orgNavigate('/settings')}>
                <Settings className="h-4 w-4 ml-2" />
                הגדרות
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 ml-2" />
                התנתק
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
