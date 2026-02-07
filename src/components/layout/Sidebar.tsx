
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import {
  Home,
  FileText,
  Users,
  Clock,
  Receipt,
  FileImage,
  BarChart3,
  Settings,
  Briefcase,
  Calendar,
  Calculator,
  Scale,
  BookOpen,
  Shield,
  UserCheck,
  TrendingUp,
  PieChart,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';

const navGroups = [
  {
    label: 'ראשי',
    items: [
      { title: 'לוח הבקרה', url: '/', icon: Home },
      { title: 'ניהול תיקים', url: '/cases', icon: Briefcase },
      { title: 'לקוחות', url: '/clients', icon: UserCheck },
      { title: 'יומן דיונים', url: '/calendar', icon: Calendar },
    ],
  },
  {
    label: 'פיננסי',
    items: [
      { title: 'שעות עבודה', url: '/time-tracking', icon: Clock },
      { title: 'חשבונות', url: '/billing', icon: Receipt },
      { title: 'דוחות', url: '/reports', icon: BarChart3 },
      { title: 'תזרים מזומנים', url: '/cash-flow', icon: TrendingUp },
      { title: 'תקציב', url: '/budget', icon: PieChart },
    ],
  },
  {
    label: 'כלים',
    items: [
      { title: 'מסמכים', url: '/documents', icon: FileImage },
      { title: 'ספרייה משפטית', url: '/legal-library', icon: BookOpen },
      { title: 'מחשבון נכות', url: '/disability-calculator', icon: Calculator },
    ],
  },
];

const settingsItem = { title: 'הגדרות', url: '/settings', icon: Settings };

function LogoDisplay() {
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    const savedLogo = localStorage.getItem('app-logo');
    if (savedLogo) {
      setLogo(savedLogo);
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      const savedLogo = localStorage.getItem('app-logo');
      setLogo(savedLogo);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (logo) {
    return (
      <div className="w-10 h-10 rounded-xl overflow-hidden border border-border bg-muted/50">
        <img
          src={logo}
          alt="לוגו המערכת"
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
      <Scale className="h-5 w-5 text-white" />
    </div>
  );
}

export function AppSidebar() {
  const location = useLocation();

  const isActive = (url: string) => {
    if (url === '/') return location.pathname === '/';
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar
      side="right"
      collapsible="icon"
      className="border-l border-sidebar-border"
    >
      {/* Logo Header */}
      <SidebarHeader className="border-b border-border px-5 py-5">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <LogoDisplay />
          <div className="group-data-[collapsible=icon]:hidden">
            <h1 className="text-base font-bold text-foreground font-display leading-tight">
              Legal Nexus
            </h1>
            <p className="text-xs text-muted-foreground">
              ניהול משרד עורכי דין
            </p>
          </div>
        </motion.div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-3 py-4">
        {navGroups.map((group, groupIndex) => (
          <SidebarGroup key={group.label} className={groupIndex > 0 ? 'mt-2' : ''}>
            <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/70 px-3 mb-1 group-data-[collapsible=icon]:hidden">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        className={`
                          justify-start gap-3 py-2.5 px-3 rounded-lg transition-all duration-200 text-sm font-medium
                          ${active
                            ? 'bg-primary/10 text-primary border-r-2 border-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground border-r-2 border-transparent'
                          }
                        `}
                      >
                        <Link to={item.url} className="flex items-center gap-3 w-full">
                          <item.icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-primary' : 'text-muted-foreground/70'}`} />
                          <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                          {active && (
                            <motion.div
                              layoutId="activeIndicator"
                              className="mr-auto w-1.5 h-1.5 bg-primary rounded-full group-data-[collapsible=icon]:hidden"
                            />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer - Settings */}
      <SidebarFooter className="border-t border-border px-3 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip={settingsItem.title}
              className={`
                justify-start gap-3 py-2.5 px-3 rounded-lg transition-all duration-200 text-sm font-medium
                ${isActive(settingsItem.url)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }
              `}
            >
              <Link to={settingsItem.url} className="flex items-center gap-3 w-full">
                <settingsItem.icon className={`h-[18px] w-[18px] shrink-0 ${isActive(settingsItem.url) ? 'text-primary' : 'text-muted-foreground/70'}`} />
                <span className="group-data-[collapsible=icon]:hidden">{settingsItem.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Security Badge */}
        <div className="mt-3 px-3 py-2 rounded-lg bg-muted/50 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span className="text-[11px] text-muted-foreground">מאובטח ומוצפן</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
