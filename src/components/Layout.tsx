import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CreditCard, 
  Receipt, 
  PiggyBank, 
  Calendar, 
  Settings,
  LogOut,
  TrendingUp,
  Folder,
  Wallet,
  Target,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageLoader } from '@/components/PageLoader';
import PrivacyToggle from '@/components/PrivacyToggle';
import { usePageLoading } from '@/hooks/usePageLoading';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const Layout = () => {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();
  const isPageLoading = usePageLoading();
  const isMobile = useIsMobile();
  const [userProfile, setUserProfile] = useState<{ full_name?: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user?.id)
        .single();
      
      setUserProfile(data);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      current: location.pathname === '/'
    },
    {
      name: 'Cuentas',
      href: '/accounts',
      icon: CreditCard,
      current: location.pathname === '/accounts'
    },
    {
      name: 'Transacciones',
      href: '/transactions',
      icon: Receipt,
      current: location.pathname === '/transactions'
    },
    {
      name: 'Presupuestos',
      href: '/budgets',
      icon: PiggyBank,
      current: location.pathname === '/budgets'
    },
    {
      name: 'Suscripciones',
      href: '/subscriptions',
      icon: Calendar,
      current: location.pathname === '/subscriptions'
    },
    {
      name: 'Categorías',
      href: '/categories',
      icon: Folder,
      current: location.pathname === '/categories'
    },
    {
      name: 'Diezmos',
      href: '/diezmos',
      icon: ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      ),
      current: location.pathname === '/diezmos'
    },
    {
      name: 'Ahorros',
      href: '/savings',
      icon: Wallet,
      current: location.pathname === '/savings'
    },
    {
      name: 'Metas',
      href: '/goals',
      icon: Target,
      current: location.pathname === '/goals'
    },
    {
      name: 'Métricas',
      href: '/metrics',
      icon: TrendingUp,
      current: location.pathname === '/metrics'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-card border-b p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">💰 Wealth</h1>
          <div className="flex items-center gap-2">
            <PrivacyToggle size="sm" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 bg-card border-r transition-transform duration-300",
        isMobile ? "w-80" : "w-64",
        isMobile && !sidebarOpen ? "-translate-x-full" : "translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Header - Desktop only */}
          {!isMobile && (
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h1 className="text-2xl font-bold text-primary">
                💰 Wealth
              </h1>
              <PrivacyToggle size="sm" />
            </div>
          )}

          {/* Mobile header space */}
          {isMobile && <div className="h-16" />}

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => isMobile && setSidebarOpen(false)}
                className={cn(
                  'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200',
                  'hover-scale active:scale-95 active:bg-primary/20 transform-gpu',
                  'hover:shadow-md hover:shadow-primary/20',
                  isMobile ? 'text-base py-4' : '',
                  item.current
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30 scale-105'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className={cn(
                  "mr-3 transition-transform duration-200",
                  isMobile ? "h-6 w-6" : "h-5 w-5",
                  item.current ? "scale-110" : ""
                )} />
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t">
            <Link 
              to="/settings"
              onClick={() => isMobile && setSidebarOpen(false)}
              className="flex items-center justify-between w-full hover:bg-accent rounded-lg p-2 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {userProfile?.full_name || user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">Ver configuraciones</p>
                </div>
              </div>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={cn(
        "transition-all duration-300",
        isMobile ? "pt-16" : "ml-64"
      )}>
        <main className={cn(
          "p-4 sm:p-6 lg:p-8",
          "min-h-[calc(100vh-4rem)]"
        )}>
          <PageLoader isLoading={isPageLoading}>
            <Outlet />
          </PageLoader>
        </main>
      </div>
    </div>
  );
};

export default Layout;