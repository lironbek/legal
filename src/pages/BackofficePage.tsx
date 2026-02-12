import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, ScrollText, LogOut, Scale, LogIn, MapPin, Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { CompanyManagement } from '@/components/settings/CompanyManagement';
import { UserManagement } from '@/components/settings/UserManagement';
import { AuditLogSettings } from '@/components/settings/AuditLogSettings';
import { getCompanyUserAssignments } from '@/lib/dataManager';

export default function BackofficePage() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { companies } = useCompany();
  const [activeTab, setActiveTab] = useState('organizations');

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const getUserCount = (companyId: string): number => {
    return getCompanyUserAssignments(companyId).length;
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
          <TabsList className="grid w-full grid-cols-3 bg-card border border-border mb-6">
            <TabsTrigger value="organizations" className="flex items-center gap-2 data-[state=active]:bg-primary/5 data-[state=active]:text-primary">
              <Building2 className="h-4 w-4" />
              ארגונים
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-primary/5 data-[state=active]:text-primary">
              <Users className="h-4 w-4" />
              משתמשים
            </TabsTrigger>
            <TabsTrigger value="audit-log" className="flex items-center gap-2 data-[state=active]:bg-primary/5 data-[state=active]:text-primary">
              <ScrollText className="h-4 w-4" />
              יומן פעילות
            </TabsTrigger>
          </TabsList>

          <TabsContent value="organizations">
            {/* Org Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {companies.filter(c => c.is_active).map((company) => (
                <Card key={company.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center gap-2">
                        {company.logo_url ? (
                          <img src={company.logo_url} alt={company.name} className="h-8 w-8 object-contain rounded" />
                        ) : (
                          <Building2 className="h-5 w-5 text-primary" />
                        )}
                        <span>{company.name}</span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className="text-xs font-mono">{company.slug}</Badge>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {getUserCount(company.id)} משתמשים
                      </span>
                    </div>

                    {(company.address || company.city) && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{[company.address, company.city].filter(Boolean).join(', ')}</span>
                      </div>
                    )}

                    {company.phone && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{company.phone}</span>
                      </div>
                    )}

                    <Button
                      className="w-full gap-2 mt-2"
                      onClick={() => navigate(`/org/${company.slug}/`)}
                    >
                      <LogIn className="h-4 w-4" />
                      כניסה
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Full Company Management below */}
            <CompanyManagement />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="audit-log">
            <AuditLogSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
