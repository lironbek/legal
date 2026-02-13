import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Building2, Boxes, Save } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
import { updateCompany, type Company } from '@/lib/dataManager';
import { ALL_MODULES, type ModuleKey } from '@/lib/moduleConfig';

export function ModuleConfiguration() {
  const { companies, refreshCompanies } = useCompany();
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());

  const getEnabledCount = (company: Company): number => {
    if (!company.enabled_modules || company.enabled_modules.length === 0) {
      return ALL_MODULES.length;
    }
    return company.enabled_modules.length;
  };

  const openEditor = (company: Company) => {
    setEditingCompany(company);
    if (!company.enabled_modules || company.enabled_modules.length === 0) {
      // All modules enabled by default
      setSelectedModules(new Set(ALL_MODULES.map(m => m.key)));
    } else {
      setSelectedModules(new Set(company.enabled_modules));
    }
  };

  const toggleModule = (key: ModuleKey) => {
    const mod = ALL_MODULES.find(m => m.key === key);
    if (mod?.alwaysEnabled) return;

    setSelectedModules(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSave = () => {
    if (!editingCompany) return;

    const allSelected = selectedModules.size === ALL_MODULES.length;
    const enabledModules = allSelected ? undefined : Array.from(selectedModules);

    updateCompany(editingCompany.id, {
      enabled_modules: enabledModules as string[] | undefined,
    });

    refreshCompanies();
    setEditingCompany(null);
  };

  const activeCompanies = companies.filter(c => c.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Boxes className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">הגדרת מודולים לפי ארגון</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        בחר אילו מודולים יהיו זמינים לכל ארגון. מודולים שלא יופעלו לא יופיעו בתפריט הצד.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeCompanies.map((company) => (
          <Card key={company.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                {company.logo_url ? (
                  <img src={company.logo_url} alt={company.name} className="h-7 w-7 object-contain rounded" />
                ) : (
                  <Building2 className="h-5 w-5 text-primary" />
                )}
                {company.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {getEnabledCount(company)} / {ALL_MODULES.length} מודולים פעילים
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => openEditor(company)}
              >
                <Boxes className="h-4 w-4" />
                הגדר מודולים
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Module Editor Dialog */}
      <Dialog open={!!editingCompany} onOpenChange={(open) => !open && setEditingCompany(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-primary" />
              מודולים — {editingCompany?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto py-2">
            {ALL_MODULES.map((mod) => (
              <div
                key={mod.key}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Label
                  htmlFor={`module-${mod.key}`}
                  className={`text-sm font-medium cursor-pointer ${
                    mod.alwaysEnabled ? 'text-muted-foreground' : 'text-foreground'
                  }`}
                >
                  {mod.label}
                  {mod.alwaysEnabled && (
                    <span className="text-xs text-muted-foreground mr-2">(תמיד פעיל)</span>
                  )}
                </Label>
                <Switch
                  id={`module-${mod.key}`}
                  checked={selectedModules.has(mod.key)}
                  onCheckedChange={() => toggleModule(mod.key)}
                  disabled={mod.alwaysEnabled}
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button className="gap-2" onClick={handleSave}>
              <Save className="h-4 w-4" />
              שמור
            </Button>
            <Button variant="outline" onClick={() => setEditingCompany(null)}>
              ביטול
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="mr-auto text-xs"
              onClick={() => setSelectedModules(new Set(ALL_MODULES.map(m => m.key)))}
            >
              בחר הכל
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
