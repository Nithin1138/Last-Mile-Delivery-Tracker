import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Lazy-load all pages — each becomes a separate JS chunk, loaded on demand
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Navbar = lazy(() => import('./components/Navbar').then(m => ({ default: m.Navbar })));
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard').then(m => ({ default: m.CustomerDashboard })));
const AgentDashboard = lazy(() => import('./pages/AgentDashboard').then(m => ({ default: m.AgentDashboard })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminOrdersPage = lazy(() => import('./pages/AdminOrdersPage').then(m => ({ default: m.AdminOrdersPage })));
const AdminAgentsPage = lazy(() => import('./pages/AdminAgentsPage').then(m => ({ default: m.AdminAgentsPage })));
const AdminZonesPage = lazy(() => import('./pages/AdminZonesPage').then(m => ({ default: m.AdminZonesPage })));
const AdminRateCardsPage = lazy(() => import('./pages/AdminRateCardsPage').then(m => ({ default: m.AdminRateCardsPage })));
const OrderCreatePage = lazy(() => import('./pages/OrderCreatePage').then(m => ({ default: m.OrderCreatePage })));
const OrderDetailModal = lazy(() => import('./pages/OrderDetailModal').then(m => ({ default: m.OrderDetailModal })));

/** Full-screen shimmer shown while a lazy chunk is loading */
const PageShimmer: React.FC = () => (
  <div className="flex-1 p-8 space-y-4 max-w-7xl mx-auto w-full">
    <div className="skeleton h-8 w-48 mb-6" />
    <div className="skeleton h-32 w-full rounded-2xl" />
    <div className="skeleton h-32 w-full rounded-2xl" />
    <div className="skeleton h-32 w-full rounded-2xl" />
  </div>
);

const MainApp: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Automatically sync/reset currentTab whenever user or user role switches
  useEffect(() => {
    setCurrentTab('dashboard');
  }, [user?.id, user?.role]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#111417] flex items-center justify-center text-[#5F6672] dark:text-[#A7ADB5] text-sm">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#3157A6] dark:border-[#6D8ED4] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-semibold text-[#171A1F] dark:text-[#E8EAED]">LastMile Flow</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#F7F8FA] dark:bg-[#111417]" />}>
        <Login />
      </Suspense>
    );
  }

  const handleOrderCreated = (orderId: string) => {
    setSelectedOrderId(orderId);
    setCurrentTab(user.role === 'ADMIN' ? 'orders' : 'dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#111417] text-[#171A1F] dark:text-[#E8EAED] flex flex-col font-sans transition-colors duration-150">
      <Suspense fallback={null}>
        <Navbar currentTab={currentTab} onSelectTab={setCurrentTab} />
      </Suspense>

      <main className="flex-1 pb-16">
        <Suspense fallback={<PageShimmer />}>
          {/* CUSTOMER PORTAL */}
          {user.role === 'CUSTOMER' && (
            <div key={currentTab} className="page-enter">
              {currentTab === 'create-order' ? (
                <OrderCreatePage onOrderCreated={handleOrderCreated} />
              ) : (
                <CustomerDashboard onCreateOrderClick={() => setCurrentTab('create-order')} />
              )}
            </div>
          )}

          {/* AGENT PORTAL */}
          {user.role === 'AGENT' && (
            <div key={currentTab} className="page-enter">
              <AgentDashboard />
            </div>
          )}

          {/* ADMIN PORTAL */}
          {user.role === 'ADMIN' && (
            <div key={currentTab} className="page-enter">
              {currentTab === 'dashboard' && (
                <AdminDashboard onNavigateToOrders={() => setCurrentTab('orders')} />
              )}
              {currentTab === 'orders' && (
                <AdminOrdersPage />
              )}
              {currentTab === 'create-order' && (
                <OrderCreatePage onOrderCreated={handleOrderCreated} />
              )}
              {currentTab === 'agents' && <AdminAgentsPage />}
              {currentTab === 'zones' && <AdminZonesPage />}
              {currentTab === 'rate-cards' && <AdminRateCardsPage />}
            </div>
          )}
        </Suspense>
      </main>

      {/* Global Order Detail Modal when triggered */}
      {selectedOrderId && (
        <Suspense fallback={null}>
          <OrderDetailModal
            orderId={selectedOrderId}
            onClose={() => setSelectedOrderId(null)}
          />
        </Suspense>
      )}

      {/* Footer */}
      <footer className="border-t border-[#E2E5E9] dark:border-[#2B3138] py-4 px-6 text-center text-xs text-[#8A919C] dark:text-[#737A84] bg-white/70 dark:bg-[#181C20]/70 transition-colors">
        LastMile Flow · Autonomous Delivery & Agent Dispatch Platform
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
