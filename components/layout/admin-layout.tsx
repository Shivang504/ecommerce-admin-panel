'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';
import { ThemeProvider } from '@/components/theme-provider';
import { syncAdminTokenCookie } from '@/lib/auth-utils';
import { usePermissions } from '@/hooks/use-permissions';
import { useToast } from '@/hooks/use-toast';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { canRoute, loading: permissionsLoading, role } = usePermissions();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/login');
    } else {
      syncAdminTokenCookie();
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated || permissionsLoading || !pathname) return;

    if (role === 'vendor') return;

    if (!canRoute(pathname)) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access this page.',
        variant: 'destructive',
      });
      router.push('/admin');
    }
  }, [isAuthenticated, permissionsLoading, pathname, canRoute, role, router, toast]);

  if (isLoading || (isAuthenticated && permissionsLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-[#401d5d] animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <TopBar />
          <main className="flex-1 overflow-auto bg-background p-6">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
