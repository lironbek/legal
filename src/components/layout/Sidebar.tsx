
import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useUsers } from '@/hooks/useUsers';
import { URL_TO_MODULE, ALWAYS_ENABLED_MODULES } from '@/lib/moduleConfig';
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
  UserCheck,
  TrendingUp,
  PieChart,
  Scan,
  PenTool,
  Gavel,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { getOpenClaimsCount } from '@/lib/nizkin/api';

// Light violet sidebar palette - direct inline styles
const SIDEBAR_COLORS = {
  bg: 'linear-gradient(180deg, #f5f3ff 0%, #ede9fe 100%)',
  text: '#5b21b6',
  textMuted: 'rgba(91, 33, 182, 0.45)',
  activeBg: '#ddd6fe',
  activeText: '#4c1d95',
  activeIcon: '#7c3aed',
  activeBorder: '#7c3aed',
  hoverBg: '#ede9fe',
  hoverText: '#6d28d9',
  iconDefault: 'rgba(124, 58, 237, 0.6)',
  border: '#ddd6fe',
  headerText: '#4c1d95',
  badge: '#7c3aed',
  logoBg: '#7c3aed',
};

interface NavItem {
  title: string;
  url: string;
  icon: typeof Home;
  badgeKey?: string;
  isAI?: boolean;
  comingSoon?: boolean;
}

const navGroups: { label: string; items: NavItem[] }[] = [
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
      { title: 'שעות עבודה', url: '/time-tracking', icon: Clock, comingSoon: true },
      { title: 'חשבונות', url: '/billing', icon: Receipt, comingSoon: true },
      { title: 'דוחות', url: '/reports', icon: BarChart3, comingSoon: true },
      { title: 'תזרים מזומנים', url: '/cash-flow', icon: TrendingUp },
      { title: 'תקציב', url: '/budget', icon: PieChart },
    ],
  },
  {
    label: 'כלים',
    items: [
      { title: 'מסמכים', url: '/documents', icon: FileImage, comingSoon: true },
      { title: 'סריקת מסמכים', url: '/scanned-documents', icon: Scan },
      { title: 'חתימה דיגיטלית', url: '/signing', icon: PenTool },
      { title: 'נזיקין', url: '/nizkin', icon: Gavel, badgeKey: 'nizkin', isAI: true },
      { title: 'ספרייה משפטית', url: '/legal-library', icon: BookOpen, comingSoon: true },
      { title: 'מחשבון נכות', url: '/disability-calculator', icon: Calculator },
    ],
  },
];

const settingsItem = { title: 'הגדרות', url: '/settings', icon: Settings };

function LogoDisplay({ logoUrl }: { logoUrl?: string }) {
  const [globalLogo, setGlobalLogo] = useState<string | null>(null);

  useEffect(() => {
    const savedLogo = localStorage.getItem('app-logo');
    if (savedLogo) setGlobalLogo(savedLogo);
  }, []);

  useEffect(() => {
    const handleStorageChange = () => setGlobalLogo(localStorage.getItem('app-logo'));
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const src = logoUrl || globalLogo;

  if (src) {
    return (
      <div className="w-8 h-8 rounded-lg overflow-hidden" style={{ backgroundColor: SIDEBAR_COLORS.activeBg }}>
        <img src={src} alt="לוגו" className="w-full h-full object-contain" />
      </div>
    );
  }

  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: SIDEBAR_COLORS.logoBg }}>
      <Scale className="h-4 w-4 text-white" />
    </div>
  );
}

function NavItemButton({ item, active, badge, prefixUrl }: {
  item: NavItem;
  active: boolean;
  badge: number;
  prefixUrl: (url: string) => string;
}) {
  const hasAI = item.isAI;
  const isSoon = item.comingSoon;
  const [hovered, setHovered] = useState(false);

  const bgStyle = active
    ? SIDEBAR_COLORS.activeBg
    : hovered
      ? SIDEBAR_COLORS.hoverBg
      : 'transparent';

  const textColor = active
    ? SIDEBAR_COLORS.activeText
    : hovered
      ? SIDEBAR_COLORS.hoverText
      : SIDEBAR_COLORS.text;

  const iconColor = active
    ? SIDEBAR_COLORS.activeIcon
    : SIDEBAR_COLORS.iconDefault;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip={item.title}
        className="justify-start gap-3 py-1.5 px-3 rounded-lg transition-all duration-150 text-[13px]"
      >
        <Link
          to={prefixUrl(item.url)}
          className="flex items-center gap-3 w-full"
          style={{
            backgroundColor: bgStyle,
            color: textColor,
            borderRight: active ? `2px solid ${SIDEBAR_COLORS.activeBorder}` : 'none',
            fontWeight: active ? 500 : 400,
            borderRadius: '0.5rem',
            padding: '0.4rem 0.75rem',
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <item.icon className="h-4 w-4 shrink-0" style={{ color: iconColor }} />
          <span className="group-data-[collapsible=icon]:hidden flex items-center gap-1.5">
            {item.title}
            {hasAI && (
              <Sparkles className="h-3 w-3 shrink-0" style={{ color: '#a855f7' }} />
            )}
          </span>
          {isSoon && (
            <span
              className="mr-auto inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium group-data-[collapsible=icon]:hidden"
              style={{ backgroundColor: '#f3e8ff', color: '#7c3aed' }}
            >
              בקרוב
            </span>
          )}
          {badge > 0 && (
            <span
              className="mr-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white group-data-[collapsible=icon]:hidden"
              style={{ backgroundColor: SIDEBAR_COLORS.badge }}
            >
              {badge}
            </span>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const location = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const { user, isImpersonating } = useAuth();
  const { currentCompany } = useCompany();
  const { getUserMenuItems } = useUsers();

  const prefixUrl = (url: string) => {
    if (!slug) return url;
    return `/org/${slug}${url === '/' ? '' : url}`;
  };

  const strippedPathname = location.pathname.replace(/^\/org\/[^/]+/, '') || '/';

  const allowedPaths = useMemo(() => {
    if (!isImpersonating || !user) return null;
    const items = getUserMenuItems(user.id);
    const paths = new Set(items.map(item => item.path));
    if (paths.has('/dashboard')) paths.add('/');
    return paths;
  }, [isImpersonating, user, getUserMenuItems]);

  const isActive = (url: string) => {
    if (url === '/') return strippedPathname === '/';
    return strippedPathname.startsWith(url);
  };

  const filteredNavGroups = useMemo(() => {
    let groups = navGroups;

    if (allowedPaths) {
      groups = groups
        .map(group => ({
          ...group,
          items: group.items.filter(item => allowedPaths.has(item.url)),
        }))
        .filter(group => group.items.length > 0);
    }

    if (currentCompany?.enabled_modules && currentCompany.enabled_modules.length > 0) {
      const enabledSet = new Set(currentCompany.enabled_modules);
      groups = groups
        .map(group => ({
          ...group,
          items: group.items.filter(item => {
            const moduleKey = URL_TO_MODULE[item.url];
            if (!moduleKey) return true;
            return enabledSet.has(moduleKey) || ALWAYS_ENABLED_MODULES.has(moduleKey);
          }),
        }))
        .filter(group => group.items.length > 0);
    }

    return groups;
  }, [allowedPaths, currentCompany?.enabled_modules]);

  const badgeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    try {
      counts.nizkin = getOpenClaimsCount();
    } catch { /* ignore */ }
    return counts;
  }, []);

  const showSettings = !isImpersonating;

  // Collapsible groups - persist in localStorage
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('sidebar-collapsed-groups');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      localStorage.setItem('sidebar-collapsed-groups', JSON.stringify([...next]));
      return next;
    });
  };

  return (
    <Sidebar
      side="right"
      collapsible="icon"
      style={{ background: SIDEBAR_COLORS.bg, borderLeft: `1px solid ${SIDEBAR_COLORS.border}` }}
    >
      {/* Logo Header */}
      <SidebarHeader
        className="px-4 py-2.5"
        style={{ borderBottom: `1px solid ${SIDEBAR_COLORS.border}` }}
      >
        <div className="flex items-center gap-3">
          <LogoDisplay logoUrl={currentCompany?.logo_url} />
          <div className="group-data-[collapsible=icon]:hidden">
            <h1 className="text-sm font-semibold leading-tight tracking-tight" style={{ color: SIDEBAR_COLORS.headerText }}>
              {currentCompany?.name || 'Legal Nexus'}
            </h1>
            <p className="text-[11px] mt-0.5" style={{ color: SIDEBAR_COLORS.textMuted }}>
              {currentCompany ? 'Legal Nexus' : 'ניהול משרד עורכי דין'}
            </p>
          </div>
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-3 py-2">
        {filteredNavGroups.map((group, groupIndex) => {
          const isCollapsed = collapsedGroups.has(group.label);
          return (
            <SidebarGroup
              key={group.label}
              className={groupIndex > 0 ? 'mt-2 pt-2' : ''}
              style={groupIndex > 0 ? { borderTop: `1px solid ${SIDEBAR_COLORS.border}` } : undefined}
            >
              <SidebarGroupLabel
                className="text-[10px] font-medium tracking-[0.12em] uppercase px-3 mb-0.5 group-data-[collapsible=icon]:hidden cursor-pointer select-none flex items-center justify-between"
                style={{ color: SIDEBAR_COLORS.textMuted }}
                onClick={() => toggleGroup(group.label)}
              >
                <span>{group.label}</span>
                <ChevronDown
                  className="h-3.5 w-3.5 transition-transform duration-200"
                  style={{
                    color: SIDEBAR_COLORS.textMuted,
                    transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                  }}
                />
              </SidebarGroupLabel>
              {!isCollapsed && (
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-0.5">
                    {group.items.map((item) => (
                      <NavItemButton
                        key={item.title}
                        item={item}
                        active={isActive(item.url)}
                        badge={item.badgeKey ? badgeCounts[item.badgeKey] || 0 : 0}
                        prefixUrl={prefixUrl}
                      />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      {/* Footer - Settings */}
      <SidebarFooter className="px-3 py-2" style={{ borderTop: `1px solid ${SIDEBAR_COLORS.border}` }}>
        {showSettings && (
          <SidebarMenu>
            <NavItemButton
              item={settingsItem}
              active={isActive(settingsItem.url)}
              badge={0}
              prefixUrl={prefixUrl}
            />
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
