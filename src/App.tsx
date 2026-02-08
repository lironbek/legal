
import { useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
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

// New form pages
import NewCasePage from "./pages/forms/NewCasePage";
import NewClientPage from "./pages/forms/NewClientPage";
import EditClientPage from "./pages/forms/EditClientPage";
import NewInvoicePage from "./pages/forms/NewInvoicePage";
import NewEventPage from "./pages/forms/NewEventPage";
import UploadDocumentPage from "./pages/forms/UploadDocumentPage";
import UploadCaseDocumentPage from "./pages/forms/UploadCaseDocumentPage";
import CaseDocumentsPage from "./pages/forms/CaseDocumentsPage";
import ScannedDocumentsPage from "./pages/ScannedDocumentsPage";

// Data manager
import { initializeSampleData } from "./lib/dataManager";
import { CompanyProvider } from "./contexts/CompanyContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Scale, Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

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

  return <>{children}</>;
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
      <Route path="/login/:companySlug" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

      {/* Protected routes */}
      <Route path="/" element={<ProtectedRoute><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
      <Route path="/cases" element={<ProtectedRoute><MainLayout><CasesPage /></MainLayout></ProtectedRoute>} />
      <Route path="/cases/new" element={<ProtectedRoute><MainLayout><NewCasePage /></MainLayout></ProtectedRoute>} />
      <Route path="/cases/:caseId/documents" element={<ProtectedRoute><MainLayout><CaseDocumentsPage /></MainLayout></ProtectedRoute>} />
      <Route path="/cases/:caseId/documents/upload" element={<ProtectedRoute><MainLayout><UploadCaseDocumentPage /></MainLayout></ProtectedRoute>} />
      <Route path="/clients" element={<ProtectedRoute><MainLayout><ClientsPage /></MainLayout></ProtectedRoute>} />
      <Route path="/clients/new" element={<ProtectedRoute><MainLayout><NewClientPage /></MainLayout></ProtectedRoute>} />
      <Route path="/clients/:clientId/edit" element={<ProtectedRoute><MainLayout><EditClientPage /></MainLayout></ProtectedRoute>} />
      <Route path="/time-tracking" element={<ProtectedRoute><MainLayout><TimeTrackingPage /></MainLayout></ProtectedRoute>} />
      <Route path="/billing" element={<ProtectedRoute><MainLayout><BillingPage /></MainLayout></ProtectedRoute>} />
      <Route path="/billing/new" element={<ProtectedRoute><MainLayout><NewInvoicePage /></MainLayout></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><MainLayout><CalendarPage /></MainLayout></ProtectedRoute>} />
      <Route path="/calendar/new" element={<ProtectedRoute><MainLayout><NewEventPage /></MainLayout></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute><MainLayout><DocumentsPage /></MainLayout></ProtectedRoute>} />
      <Route path="/documents/upload" element={<ProtectedRoute><MainLayout><UploadDocumentPage /></MainLayout></ProtectedRoute>} />
      <Route path="/scanned-documents" element={<ProtectedRoute><MainLayout><ScannedDocumentsPage /></MainLayout></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><MainLayout><ReportsPage /></MainLayout></ProtectedRoute>} />
      <Route path="/cash-flow" element={<ProtectedRoute><MainLayout><CashFlowPage /></MainLayout></ProtectedRoute>} />
      <Route path="/budget" element={<ProtectedRoute><MainLayout><BudgetPage /></MainLayout></ProtectedRoute>} />
      <Route path="/legal-library" element={<ProtectedRoute><MainLayout><LegalLibraryPage /></MainLayout></ProtectedRoute>} />
      <Route path="/disability-calculator" element={<ProtectedRoute><MainLayout><DisabilityCalculatorPage /></MainLayout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><MainLayout><SettingsPage /></MainLayout></ProtectedRoute>} />
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
