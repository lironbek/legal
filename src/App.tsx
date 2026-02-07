
import { useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

// New form pages
import NewCasePage from "./pages/forms/NewCasePage";
import NewClientPage from "./pages/forms/NewClientPage";
import EditClientPage from "./pages/forms/EditClientPage";
import NewInvoicePage from "./pages/forms/NewInvoicePage";
import NewEventPage from "./pages/forms/NewEventPage";
import UploadDocumentPage from "./pages/forms/UploadDocumentPage";
import UploadCaseDocumentPage from "./pages/forms/UploadCaseDocumentPage";
import CaseDocumentsPage from "./pages/forms/CaseDocumentsPage";

// Data manager
import { initializeSampleData } from "./lib/dataManager";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Initialize sample data when app loads
    initializeSampleData();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
            <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />
            <Route path="/cases" element={<MainLayout><CasesPage /></MainLayout>} />
            <Route path="/cases/new" element={<MainLayout><NewCasePage /></MainLayout>} />
            <Route path="/cases/:caseId/documents" element={<MainLayout><CaseDocumentsPage /></MainLayout>} />
            <Route path="/cases/:caseId/documents/upload" element={<MainLayout><UploadCaseDocumentPage /></MainLayout>} />
            <Route path="/clients" element={<MainLayout><ClientsPage /></MainLayout>} />
            <Route path="/clients/new" element={<MainLayout><NewClientPage /></MainLayout>} />
            <Route path="/clients/:clientId/edit" element={<MainLayout><EditClientPage /></MainLayout>} />
            <Route path="/time-tracking" element={<MainLayout><TimeTrackingPage /></MainLayout>} />
            <Route path="/billing" element={<MainLayout><BillingPage /></MainLayout>} />
            <Route path="/billing/new" element={<MainLayout><NewInvoicePage /></MainLayout>} />
            <Route path="/calendar" element={<MainLayout><CalendarPage /></MainLayout>} />
            <Route path="/calendar/new" element={<MainLayout><NewEventPage /></MainLayout>} />
            <Route path="/documents" element={<MainLayout><DocumentsPage /></MainLayout>} />
            <Route path="/documents/upload" element={<MainLayout><UploadDocumentPage /></MainLayout>} />
            <Route path="/reports" element={<MainLayout><ReportsPage /></MainLayout>} />
            <Route path="/cash-flow" element={<MainLayout><CashFlowPage /></MainLayout>} />
            <Route path="/budget" element={<MainLayout><BudgetPage /></MainLayout>} />
            <Route path="/legal-library" element={<MainLayout><LegalLibraryPage /></MainLayout>} />
            <Route path="/disability-calculator" element={<MainLayout><DisabilityCalculatorPage /></MainLayout>} />
            <Route path="/settings" element={<MainLayout><SettingsPage /></MainLayout>} />
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
