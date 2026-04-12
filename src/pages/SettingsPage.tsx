import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, Users, Scan, Building2, MessageSquare, ScrollText } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DesignSettings } from '@/components/settings/DesignSettings';
import { UserManagement } from '@/components/settings/UserManagement';
import { ScannerSettings } from '@/components/settings/ScannerSettings';
import { CompanyManagement } from '@/components/settings/CompanyManagement';
import { WhatsAppSettings } from '@/components/settings/WhatsAppSettings';
import { AuditLogSettings } from '@/components/settings/AuditLogSettings';
import { useAuth } from '@/contexts/AuthContext';

const settingsTabs = [
  { value: 'design', label: 'עיצוב המערכת', icon: Palette },
  { value: 'scanner', label: 'הגדרות סורק', icon: Scan },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { value: 'users', label: 'ניהול משתמשים', icon: Users },
  { value: 'companies', label: 'ניהול משרדים', icon: Building2 },
];

const adminTabs = [
  { value: 'audit-log', label: 'יומן פעילות', icon: ScrollText },
];

export default function SettingsPage() {
  const { profile, realAdmin } = useAuth();
  const isAdmin = profile?.role === 'admin' || realAdmin !== null;

  const allTabs = isAdmin ? [...settingsTabs, ...adminTabs] : settingsTabs;

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="הגדרות מערכת"
        subtitle="ניהול והתאמה אישית של המערכת"
      />

      <Tabs defaultValue="design" className="w-full" orientation="vertical">
        <div className="flex gap-6">
          {/* Vertical Tab List */}
          <TabsList className="flex flex-col h-auto w-52 shrink-0 bg-card border border-border rounded-lg p-1.5 gap-0.5">
            {allTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="w-full justify-start gap-2.5 px-3 py-2.5 text-[13px] rounded-md data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:font-medium"
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab Content */}
          <div className="flex-1 min-w-0">
            <TabsContent value="design" className="mt-0">
              <DesignSettings />
            </TabsContent>

            <TabsContent value="scanner" className="mt-0">
              <ScannerSettings />
            </TabsContent>

            <TabsContent value="whatsapp" className="mt-0">
              <WhatsAppSettings />
            </TabsContent>

            <TabsContent value="users" className="mt-0">
              <UserManagement />
            </TabsContent>

            <TabsContent value="companies" className="mt-0">
              <CompanyManagement />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="audit-log" className="mt-0">
                <AuditLogSettings />
              </TabsContent>
            )}
          </div>
        </div>
      </Tabs>
    </div>
  );
}
