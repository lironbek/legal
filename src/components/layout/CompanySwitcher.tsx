import { useCompany } from '@/contexts/CompanyContext';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, Check, ChevronDown } from 'lucide-react';

export function CompanySwitcher() {
  const { currentCompany, companies, switchCompany } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams<{ slug: string }>();

  if (!currentCompany) return null;

  const handleSwitch = (company: typeof currentCompany) => {
    switchCompany(company.id);
    // If inside an org route, navigate to the same page under the new org slug
    if (slug) {
      const newPath = location.pathname.replace(`/org/${slug}`, `/org/${company.slug}`);
      navigate(newPath, { replace: true });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 h-9 px-3 text-sm font-medium">
          <Building2 className="h-4 w-4" />
          <span className="hidden md:inline max-w-[150px] truncate">{currentCompany.name}</span>
          {companies.length > 1 && <ChevronDown className="h-3 w-3 opacity-50" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64" dir="rtl">
        <DropdownMenuLabel>החלף משרד</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {companies
          .filter(c => c.is_active)
          .map((company) => (
            <DropdownMenuItem
              key={company.id}
              onClick={() => handleSwitch(company)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{company.name}</span>
              </div>
              {company.id === currentCompany.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
