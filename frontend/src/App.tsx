import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
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
      <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#111417] flex items-center justify-center text-[#5F6672] dark:text-[#A7ADB5] text-sm">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#3157A6] dark:border-[#6D8ED4] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-semibold text-[#171A1F] dark:text-[#E8EAED]">LastMile Flow</p>
        </div>
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
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#111417] text-[#171A1F] dark:text-[#E8EAED] flex flex-col font-sans transition-colors duration-150">
      <Navbar currentTab={currentTab} onSelectTab={setCurrentTab} />

      <main className="flex-1 pb-16">
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
      </main>

      {/* Global Order Detail Modal when triggered */}
      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
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
