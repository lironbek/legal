import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  Company,
  getCompanies,
  getCurrentCompany,
  setCurrentCompany as setDataManagerCompany,
} from '@/lib/dataManager';

interface CompanyContextType {
  currentCompany: Company | null;
  companies: Company[];
  switchCompany: (companyId: string) => void;
  refreshCompanies: () => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);

  const loadCompanies = useCallback(() => {
    const allCompanies = getCompanies();
    setCompanies(allCompanies);

    const currentId = getCurrentCompany();
    if (currentId) {
      const company = allCompanies.find(c => c.id === currentId);
      if (company) {
        setCurrentCompany(company);
        return;
      }
    }

    // Default to first active company
    const firstActive = allCompanies.find(c => c.is_active);
    if (firstActive) {
      setCurrentCompany(firstActive);
      setDataManagerCompany(firstActive.id);
    }
  }, []);

  const switchCompany = useCallback((companyId: string) => {
    const allCompanies = getCompanies();
    const company = allCompanies.find(c => c.id === companyId);
    if (company) {
      setCurrentCompany(company);
      setDataManagerCompany(companyId);
      // Trigger re-render of all data-dependent components
      setCompanies([...allCompanies]);
    }
  }, []);

  const refreshCompanies = useCallback(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

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
