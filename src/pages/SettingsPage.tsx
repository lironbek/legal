import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Palette, Upload, Users, Scan } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DesignSettings } from '@/components/settings/DesignSettings';
import { UserManagement } from '@/components/settings/UserManagement';
import { ScannerSettings } from '@/components/settings/ScannerSettings';

export default function SettingsPage() {
  return (
    <div className="container mx-auto p-6 max-w-6xl" dir="rtl">
      <PageHeader
        title="הגדרות מערכת"
        subtitle="ניהול והתאמה אישית של המערכת"
      />

      <Tabs defaultValue="design" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-card border border-border">
          <TabsTrigger value="design" className="flex items-center gap-2 data-[state=active]:bg-primary/5 data-[state=active]:text-primary border-r border-border">
            <Palette className="h-4 w-4" />
            עיצוב המערכת
          </TabsTrigger>
          <TabsTrigger value="scanner" className="flex items-center gap-2 data-[state=active]:bg-primary/5 data-[state=active]:text-primary border-r border-border">
            <Scan className="h-4 w-4" />
            הגדרות סורק
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-primary/5 data-[state=active]:text-primary">
            <Users className="h-4 w-4" />
            ניהול משתמשים
          </TabsTrigger>
        </TabsList>

        <TabsContent value="design" className="mt-6">
          <DesignSettings />
        </TabsContent>

        <TabsContent value="scanner" className="mt-6">
          <ScannerSettings />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UserManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
