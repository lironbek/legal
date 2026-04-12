import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Building2, Users, ScrollText, LogOut, Scale, Boxes } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CompanyManagement } from '@/components/settings/CompanyManagement';
import { UserManagement } from '@/components/settings/UserManagement';
import { AuditLogSettings } from '@/components/settings/AuditLogSettings';
import { ModuleConfiguration } from '@/components/settings/ModuleConfiguration';

export default function BackofficePage() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('organizations');

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header Bar */}
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
              <Scale className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground leading-tight">Legal Nexus</h1>
              <p className="text-xs text-muted-foreground">Backoffice</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{profile?.full_name}</span>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              התנתק
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6 lg:p-8" dir="rtl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-card border border-border mb-6">
            <TabsTrigger value="organizations" className="flex items-center gap-2 data-[state=active]:bg-primary/5 data-[state=active]:text-primary">
              <Building2 className="h-4 w-4" />
              ארגונים
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-primary/5 data-[state=active]:text-primary">
              <Users className="h-4 w-4" />
              משתמשים
            </TabsTrigger>
            <TabsTrigger value="modules" className="flex items-center gap-2 data-[state=active]:bg-primary/5 data-[state=active]:text-primary">
              <Boxes className="h-4 w-4" />
              מודולים
            </TabsTrigger>
            <TabsTrigger value="audit-log" className="flex items-center gap-2 data-[state=active]:bg-primary/5 data-[state=active]:text-primary">
              <ScrollText className="h-4 w-4" />
              יומן פעילות
            </TabsTrigger>
          </TabsList>

          <TabsContent value="organizations">
            <CompanyManagement showBackofficeActions />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="modules">
            <ModuleConfiguration />
          </TabsContent>

          <TabsContent value="audit-log">
            <AuditLogSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
