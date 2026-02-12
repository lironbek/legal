import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import {
  Company,
  getCompanies,
  getCurrentCompany,
  setCurrentCompany as setDataManagerCompany,
  getUserCompanyAssignments,
} from '@/lib/dataManager';
import { syncFromSupabase, seedInitialCompanies } from '@/lib/companyService';
import { useAuth } from '@/contexts/AuthContext';

interface CompanyContextType {
  currentCompany: Company | null;
  companies: Company[];
  switchCompany: (companyId: string) => void;
  refreshCompanies: () => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const supabaseSynced = useRef(false);

  const loadCompaniesFromLocal = useCallback(() => {
    const allCompanies = getCompanies();

    // Filter companies by user assignments (admins see all)
    let allowedCompanies: Company[];
    if (profile?.role === 'admin') {
      allowedCompanies = allCompanies;
    } else if (user) {
      const assignments = getUserCompanyAssignments(user.id);
      const assignedCompanyIds = new Set(assignments.map(a => a.company_id));
      allowedCompanies = allCompanies.filter(c => assignedCompanyIds.has(c.id));
    } else {
      allowedCompanies = [];
    }

    setCompanies(allowedCompanies);

    const currentId = getCurrentCompany();
    if (currentId) {
      const company = allowedCompanies.find(c => c.id === currentId);
      if (company) {
        setCurrentCompany(company);
        return;
      }
    }

    // Default to first active allowed company
    const firstActive = allowedCompanies.find(c => c.is_active);
    if (firstActive) {
      setCurrentCompany(firstActive);
      setDataManagerCompany(firstActive.id);
    }
  }, [user, profile]);

  // On mount: sync from Supabase, then load
  useEffect(() => {
    if (supabaseSynced.current) {
      loadCompaniesFromLocal();
      return;
    }
    supabaseSynced.current = true;

    (async () => {
      // Seed initial companies if none exist in Supabase
      await seedInitialCompanies();
      // Sync Supabase -> localStorage
      await syncFromSupabase();
      // Now load from localStorage (which now has Supabase data)
      loadCompaniesFromLocal();
    })();
  }, [loadCompaniesFromLocal]);

  const switchCompany = useCallback((companyId: string) => {
    const allCompanies = getCompanies();
    const company = allCompanies.find(c => c.id === companyId);
    if (!company) return;

    // Validate access: admins can switch anywhere, others need assignment
    if (profile?.role !== 'admin' && user) {
      const assignments = getUserCompanyAssignments(user.id);
      const hasAccess = assignments.some(a => a.company_id === companyId);
      if (!hasAccess) {
        console.warn('User does not have access to company:', companyId);
        return;
      }
    }

    setCurrentCompany(company);
    setDataManagerCompany(companyId);
    setCompanies(prev => [...prev]);
  }, [user, profile]);

  const refreshCompanies = useCallback(() => {
    // Re-sync from Supabase, then reload
    (async () => {
      await syncFromSupabase();
      loadCompaniesFromLocal();
    })();
  }, [loadCompaniesFromLocal]);

  return (
    <CompanyContext.Provider
      value={{
        currentCompany,
        companies,
        switchCompany,
        refreshCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within CompanyProvider');
  }
  return context;
};
