
import { useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { OrgShell } from "./components/layout/OrgShell";
import { Dashboard } from "./pages/Dashboard";
import CasesPage from "./pages/CasesPage";
import ClientsPage from "./pages/ClientsPage";
import TimeTrackingPage from "./pages/TimeTrackingPage";
import BillingPage from "./pages/BillingPage";
import CalendarPage from "./pages/CalendarPage";
import DocumentsPage from "./pages/DocumentsPage";
import ReportsPage from "./pages/ReportsPage";
import LegalLibraryPage from "./pages/LegalLibraryPage";
import DisabilityCalculatorPage from "./pages/DisabilityCalculatorPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import CashFlowPage from "./pages/CashFlowPage";
import BudgetPage from "./pages/BudgetPage";
import LoginPage from "./pages/LoginPage";
import BackofficePage from "./pages/BackofficePage";

// New form pages
import NewCasePage from "./pages/forms/NewCasePage";
import NewClientPage from "./pages/forms/NewClientPage";
import EditClientPage from "./pages/forms/EditClientPage";
import NewInvoicePage from "./pages/forms/NewInvoicePage";
import NewEventPage from "./pages/forms/NewEventPage";
import UploadDocumentPage from "./pages/forms/UploadDocumentPage";
import UploadCaseDocumentPage from "./pages/forms/UploadCaseDocumentPage";
import CaseDocumentsPage from "./pages/forms/CaseDocumentsPage";
import ViewCasePage from "./pages/forms/ViewCasePage";
import EditCasePage from "./pages/forms/EditCasePage";
import ScannedDocumentsPage from "./pages/ScannedDocumentsPage";
import SigningPage from "./pages/SigningPage";
import SigningEditorPage from "./pages/SigningEditorPage";
import PublicSigningPage from "./pages/PublicSigningPage";

// Data manager
import { initializeSampleData, getUserCompanyAssignments, getCompanies } from "./lib/dataManager";
import { CompanyProvider } from "./contexts/CompanyContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Scale, Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// Backoffice or redirect for non-admins
function BackofficeOrRedirect() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Scale className="h-8 w-8 text-primary" />
          </div>
          <div className="flex items-center gap-2 justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>טוען...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin → show backoffice
  if (profile?.role === 'admin') {
    return <BackofficePage />;
  }

  // Non-admin → redirect to their primary org
  const assignments = getUserCompanyAssignments(user.id);
  const primary = assignments.find(a => a.is_primary) || assignments[0];
  if (primary) {
    const companies = getCompanies();
    const company = companies.find(c => c.id === primary.company_id);
    if (company) {
      return <Navigate to={`/org/${company.slug}/`} replace />;
    }
  }

  // No assignments at all - show backoffice anyway (will be empty)
  return <BackofficePage />;
}

const AppRoutes = () => {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Initialize sample data when app loads
    initializeSampleData();
  }, []);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Scale className="h-8 w-8 text-primary" />
          </div>
          <div className="flex items-center gap-2 justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>טוען...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login/:companySlug" element={<LoginPage />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

      {/* Root: Backoffice (admin) or redirect to org (non-admin) */}
      <Route path="/" element={<BackofficeOrRedirect />} />

      {/* Org-scoped routes */}
      <Route path="/org/:slug" element={<OrgShell />}>
        <Route index element={<Dashboard />} />
        <Route path="cases" element={<CasesPage />} />
        <Route path="cases/new" element={<NewCasePage />} />
        <Route path="cases/:caseId/view" element={<ViewCasePage />} />
        <Route path="cases/:caseId/edit" element={<EditCasePage />} />
        <Route path="cases/:caseId/documents" element={<CaseDocumentsPage />} />
        <Route path="cases/:caseId/documents/upload" element={<UploadCaseDocumentPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/new" element={<NewClientPage />} />
        <Route path="clients/:clientId/edit" element={<EditClientPage />} />
        <Route path="time-tracking" element={<TimeTrackingPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="billing/new" element={<NewInvoicePage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="calendar/new" element={<NewEventPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="documents/upload" element={<UploadDocumentPage />} />
        <Route path="scanned-documents" element={<ScannedDocumentsPage />} />
        <Route path="signing" element={<SigningPage />} />
        <Route path="signing/new" element={<SigningEditorPage />} />
        <Route path="signing/:id" element={<SigningEditorPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="cash-flow" element={<CashFlowPage />} />
        <Route path="budget" element={<BudgetPage />} />
        <Route path="legal-library" element={<LegalLibraryPage />} />
        <Route path="disability-calculator" element={<DisabilityCalculatorPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Public signing page - no auth required */}
      <Route path="/sign/:token" element={<PublicSigningPage />} />

      {/* Catch-all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <CompanyProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <AppRoutes />
              </TooltipProvider>
            </CompanyProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
