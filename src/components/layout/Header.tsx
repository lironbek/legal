
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Bell, Search, LogOut, User, Settings, Moon, Sun, ChevronLeft } from 'lucide-react';
import { CompanySwitcher } from './CompanySwitcher';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';

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
  '/documents/upload': { title: 'העלאת מסמך', breadcrumbs: ['כלים', 'מסמכים', 'העלאה'] },
  '/reports': { title: 'דוחות', breadcrumbs: ['פיננסי', 'דוחות'] },
  '/cash-flow': { title: 'תזרים מזומנים', breadcrumbs: ['פיננסי', 'תזרים מזומנים'] },
  '/budget': { title: 'תקציב', breadcrumbs: ['פיננסי', 'תקציב'] },
  '/legal-library': { title: 'ספרייה משפטית', breadcrumbs: ['כלים', 'ספרייה'] },
  '/disability-calculator': { title: 'מחשבון נכות', breadcrumbs: ['כלים', 'מחשבון'] },
  '/settings': { title: 'הגדרות', breadcrumbs: ['הגדרות'] },
};

function getPageInfo(pathname: string) {
  if (pageTitles[pathname]) return pageTitles[pathname];
  // Handle dynamic routes
  if (pathname.match(/^\/cases\/[^/]+\/documents$/)) return { title: 'מסמכי תיק', breadcrumbs: ['ראשי', 'תיקים', 'מסמכים'] };
  if (pathname.match(/^\/cases\/[^/]+\/documents\/upload$/)) return { title: 'העלאת מסמך לתיק', breadcrumbs: ['ראשי', 'תיקים', 'העלאה'] };
  if (pathname.match(/^\/clients\/[^/]+\/edit$/)) return { title: 'עריכת לקוח', breadcrumbs: ['ראשי', 'לקוחות', 'עריכה'] };
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
  const { theme, setTheme } = useTheme();
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
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left side - Sidebar trigger + Breadcrumbs */}
        <div className="flex items-center gap-3">
          <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground" />
          <Separator orientation="vertical" className="h-5" />
          <nav className="flex items-center gap-1.5 text-sm">
            {pageInfo.breadcrumbs.map((crumb, index) => (
              <span key={index} className="flex items-center gap-1.5">
                {index > 0 && <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/50" />}
                <span className={index === pageInfo.breadcrumbs.length - 1 ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                  {crumb}
                </span>
              </span>
            ))}
          </nav>
        </div>

        {/* Center - Search */}
        <div className="hidden md:flex items-center">
          <button className="flex items-center gap-3 h-9 px-4 rounded-lg border border-border bg-muted/50 text-muted-foreground text-sm hover:bg-muted transition-colors min-w-[280px]">
            <Search className="h-4 w-4" />
            <span>חיפוש...</span>
            <kbd className="mr-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          {/* Company Switcher */}
          <CompanySwitcher />

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center">
              3
            </span>
          </Button>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-9 px-2 hover:bg-muted rounded-lg">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground hidden lg:inline">{displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" dir="rtl">
              <DropdownMenuLabel>
                <div>
                  <p className="text-sm font-semibold">{displayName}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">{displayEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
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
