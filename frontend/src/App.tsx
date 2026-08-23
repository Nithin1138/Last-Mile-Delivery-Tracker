import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';

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
    <div className="skeleton h-32 w-full rounded-xl" />
    <div className="skeleton h-32 w-full rounded-xl" />
    <div className="skeleton h-32 w-full rounded-xl" />
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Last-Mile Delivery Tracker</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
        <Login />
      </Suspense>
    );
  }

  const handleOrderCreated = (orderId: string) => {
    setSelectedOrderId(orderId);
    setCurrentTab(user.role === 'ADMIN' ? 'orders' : 'dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Suspense fallback={null}>
        <Navbar currentTab={currentTab} onSelectTab={setCurrentTab} />
      </Suspense>

      <main className="flex-1 pb-16">
        <Suspense fallback={<PageShimmer />}>
          {/* CUSTOMER PORTAL */}
          {user.role === 'CUSTOMER' && (
            <>
              {currentTab === 'create-order' ? (
                <div className="page-enter">
                  <OrderCreatePage onOrderCreated={handleOrderCreated} />
                </div>
              ) : (
                <div className="page-enter">
                  <CustomerDashboard onCreateOrderClick={() => setCurrentTab('create-order')} />
                </div>
              )}
            </>
          )}

          {/* AGENT PORTAL */}
          {user.role === 'AGENT' && (
            <div className="page-enter">
              <AgentDashboard />
            </div>
          )}

          {/* ADMIN PORTAL */}
          {user.role === 'ADMIN' && (
            <>
              {currentTab === 'dashboard' && (
                <div className="page-enter">
                  <AdminDashboard onNavigateToOrders={() => setCurrentTab('orders')} />
                </div>
              )}
              {currentTab === 'orders' && (
                <div className="page-enter">
                  <AdminOrdersPage />
                </div>
              )}
              {currentTab === 'create-order' && (
                <div className="page-enter">
                  <OrderCreatePage onOrderCreated={handleOrderCreated} />
                </div>
              )}
              {currentTab === 'agents' && (
                <div className="page-enter">
                  <AdminAgentsPage />
                </div>
              )}
              {currentTab === 'zones' && (
                <div className="page-enter">
                  <AdminZonesPage />
                </div>
              )}
              {currentTab === 'rate-cards' && (
                <div className="page-enter">
                  <AdminRateCardsPage />
                </div>
              )}
            </>
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
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-400 bg-slate-900/60">
        Last-Mile Delivery Management Platform · PostgreSQL · FastAPI · React + TypeScript
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

