import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Truck, ShieldCheck, UserCheck, Package, LayoutDashboard, Map, CreditCard, LogOut, Sparkles, User as UserIcon } from 'lucide-react';

interface Props {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Navbar: React.FC<Props> = ({ currentTab, onSelectTab }) => {
  const { user, logout, quickLogin, savedCustomAccount, restoreCustomAccount } = useAuth();

  if (!user) return null;

  const isCustomUserActive = savedCustomAccount && user.id === savedCustomAccount.user.id;

  const handleCustomerSwitch = async () => {
    if (savedCustomAccount && savedCustomAccount.user.role === 'CUSTOMER') {
      restoreCustomAccount();
    } else {
      await quickLogin('rohit.verma@gmail.com', 'customer123');
    }
    onSelectTab('dashboard');
  };

  const handleAgentSwitch = async () => {
    if (savedCustomAccount && savedCustomAccount.user.role === 'AGENT') {
      restoreCustomAccount();
    } else {
      await quickLogin('vikram.singh@delivery.dev', 'agent123');
    }
    onSelectTab('dashboard');
  };

  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      {/* Top Banner: Quick Demo Switcher (Gated by VITE_DEMO_MODE) */}
      {isDemoMode && (
        <div className="bg-indigo-950/60 border-b border-indigo-800/40 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-indigo-300 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold tracking-wide uppercase text-[10px] text-indigo-400">Demo Mode</span>
            <span className="text-slate-400">· 1-Click Role Switcher:</span>
          </div>

        <div className="flex items-center gap-2">
          {/* If custom account exists and user is currently on another persona, show return button */}
          {savedCustomAccount && !isCustomUserActive && (
            <button
              onClick={() => {
                restoreCustomAccount();
                onSelectTab('dashboard');
              }}
              className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1 transition-all shadow-sm"
              title={`Switch back to ${savedCustomAccount.user.email}`}
            >
              <UserIcon className="w-3 h-3" />
              <span>My Profile ({savedCustomAccount.user.name.split(' ')[0]})</span>
            </button>
          )}

          <button
            onClick={async () => {
              await quickLogin('admin@lastmile.dev', 'admin123');
              onSelectTab('dashboard');
            }}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              user.role === 'ADMIN'
                ? 'bg-indigo-600 text-white font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            👑 Admin
          </button>

          <button
            onClick={handleCustomerSwitch}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              user.role === 'CUSTOMER' && (isCustomUserActive || user.email.includes('rohit'))
                ? 'bg-indigo-600 text-white font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            👤 Customer {savedCustomAccount?.user.role === 'CUSTOMER' && isCustomUserActive ? `(${user.name.split(' ')[0]})` : '(B2C)'}
          </button>

          <button
            onClick={async () => {
              await quickLogin('logistics@acmecorp.in', 'customer123');
              onSelectTab('dashboard');
            }}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              user.role === 'CUSTOMER' && user.email.includes('acme')
                ? 'bg-indigo-600 text-white font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🏢 Customer (B2B)
          </button>

          <button
            onClick={handleAgentSwitch}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              user.role === 'AGENT'
                ? 'bg-indigo-600 text-white font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🛵 Agent {savedCustomAccount?.user.role === 'AGENT' && isCustomUserActive ? `(${user.name.split(' ')[0]})` : ''}
          </button>
        </div>
      </div>
      )}

      {/* Main Nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onSelectTab('dashboard')}>
            <div className="bg-gradient-to-tr from-indigo-600 to-cyan-500 p-2 rounded-lg text-white shadow-md">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black tracking-tight text-slate-100 text-base">LAST-MILE</span>
              <span className="text-xs text-indigo-400 block font-medium -mt-1 tracking-wider uppercase">Tracker</span>
            </div>
          </div>

          {/* Navigation Links based on role */}
          <nav className="hidden md:flex items-center gap-1">
            {user.role === 'ADMIN' && (
              <>
                <button
                  onClick={() => onSelectTab('dashboard')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    currentTab === 'dashboard' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>
                <button
                  onClick={() => onSelectTab('orders')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    currentTab === 'orders' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Orders
                </button>
                <button
                  onClick={() => onSelectTab('create-order')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    currentTab === 'create-order' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Create Order
                </button>
                <button
                  onClick={() => onSelectTab('agents')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    currentTab === 'agents' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  Agents
                </button>
                <button
                  onClick={() => onSelectTab('zones')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    currentTab === 'zones' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Map className="w-4 h-4" />
                  Zones & Areas
                </button>
                <button
                  onClick={() => onSelectTab('rate-cards')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    currentTab === 'rate-cards' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Rate Cards & COD
                </button>
              </>
            )}

            {user.role === 'CUSTOMER' && (
              <>
                <button
                  onClick={() => onSelectTab('dashboard')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    currentTab === 'dashboard' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  My Orders
                </button>
                <button
                  onClick={() => onSelectTab('create-order')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    currentTab === 'create-order' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Create Order & Price Preview
                </button>
              </>
            )}

            {user.role === 'AGENT' && (
              <>
                <button
                  onClick={() => onSelectTab('dashboard')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    currentTab === 'dashboard' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  Assigned Deliveries
                </button>
              </>
            )}
          </nav>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-200">{user.name}</div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1 justify-end">
              <ShieldCheck className="w-3 h-3 text-indigo-400" />
              <span>{user.role}</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
