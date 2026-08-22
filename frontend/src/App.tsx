import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Navbar } from './components/Navbar';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { AgentDashboard } from './pages/AgentDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminOrdersPage } from './pages/AdminOrdersPage';
import { AdminAgentsPage } from './pages/AdminAgentsPage';
import { AdminZonesPage } from './pages/AdminZonesPage';
import { AdminRateCardsPage } from './pages/AdminRateCardsPage';
import { OrderCreatePage } from './pages/OrderCreatePage';
import { OrderDetailModal } from './pages/OrderDetailModal';

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
        Initializing Last-Mile Delivery Tracker...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Login />;
  }

  const handleOrderCreated = (orderId: string) => {
    setSelectedOrderId(orderId);
    setCurrentTab(user.role === 'ADMIN' ? 'orders' : 'dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar currentTab={currentTab} onSelectTab={setCurrentTab} />

      <main className="flex-1 pb-16">
        {/* CUSTOMER PORTAL */}
        {user.role === 'CUSTOMER' && (
          <>
            {currentTab === 'create-order' ? (
              <OrderCreatePage onOrderCreated={handleOrderCreated} />
            ) : (
              <CustomerDashboard onCreateOrderClick={() => setCurrentTab('create-order')} />
            )}
          </>
        )}

        {/* AGENT PORTAL */}
        {user.role === 'AGENT' && (
          <AgentDashboard />
        )}

        {/* ADMIN PORTAL */}
        {user.role === 'ADMIN' && (
          <>
            {currentTab === 'dashboard' && (
              <AdminDashboard onNavigateToOrders={() => setCurrentTab('orders')} />
            )}
            {currentTab === 'orders' && <AdminOrdersPage />}
            {currentTab === 'create-order' && (
              <OrderCreatePage onOrderCreated={handleOrderCreated} />
            )}
            {currentTab === 'agents' && <AdminAgentsPage />}
            {currentTab === 'zones' && <AdminZonesPage />}
            {currentTab === 'rate-cards' && <AdminRateCardsPage />}
          </>
        )}
      </main>

      {/* Global Order Detail Modal when triggered */}
      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
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
