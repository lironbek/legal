
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './Sidebar';
import { Header } from './Header';
import { ImpersonationBanner } from './ImpersonationBanner';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col bg-background overflow-hidden">
          <ImpersonationBanner />
          <Header />
          <div className="flex-1 overflow-auto p-6 lg:p-8">
            <div className="max-w-[1400px] mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
