import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Truck, 
  ShieldCheck, 
  UserCheck, 
  Package, 
  LayoutDashboard, 
  Map, 
  CreditCard, 
  LogOut, 
  Sparkles, 
  User as UserIcon,
  Plus
} from 'lucide-react';

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
    <header className="bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-xl sticky top-0 z-40 transition-colors">
      {/* Top Banner: Quick Demo Switcher (Gated by VITE_DEMO_MODE) */}
      {isDemoMode && (
        <div className="bg-slate-950/80 border-b border-slate-800/60 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-indigo-300 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span className="font-bold tracking-wider uppercase text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded">Demo Mode</span>
            <span className="text-slate-400 hidden sm:inline">1-Click Role Switcher:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* If custom account exists and user is currently on another persona, show return button */}
            {savedCustomAccount && !isCustomUserActive && (
              <button
                onClick={() => {
                  restoreCustomAccount();
                  onSelectTab('dashboard');
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer text-xs"
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
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs font-semibold ${
                user.role === 'ADMIN'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              👑 Admin
            </button>

            <button
              onClick={handleCustomerSwitch}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs font-semibold ${
                user.role === 'CUSTOMER' && (isCustomUserActive || user.email.includes('rohit'))
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              👤 Customer {savedCustomAccount?.user.role === 'CUSTOMER' && isCustomUserActive ? `(${user.name.split(' ')[0]})` : '(B2C)'}
            </button>

            <button
              onClick={async () => {
                await quickLogin('logistics@acmecorp.in', 'customer123');
                onSelectTab('dashboard');
              }}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs font-semibold ${
                user.role === 'CUSTOMER' && user.email.includes('acme')
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              🏢 Customer (B2B)
            </button>

            <button
              onClick={handleAgentSwitch}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs font-semibold ${
                user.role === 'AGENT'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
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
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => onSelectTab('dashboard')}
          >
            <div className="bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 p-2 rounded-xl text-white shadow-lg shadow-indigo-600/20 group-hover:scale-105 transition-transform">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-slate-100 text-base group-hover:text-white transition-colors">LAST-MILE</span>
              <span className="text-[10px] text-indigo-400 block font-bold -mt-1 tracking-widest uppercase">Flow Tracker</span>
            </div>
          </div>

          {/* Navigation Links based on role */}
          <nav className="hidden md:flex items-center gap-1.5">
            {user.role === 'ADMIN' && (
              <>
                <button
                  onClick={() => onSelectTab('dashboard')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    currentTab === 'dashboard'
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border border-transparent'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>
                <button
                  onClick={() => onSelectTab('orders')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    currentTab === 'orders'
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border border-transparent'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Orders
                </button>
                <button
                  onClick={() => onSelectTab('create-order')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    currentTab === 'create-order'
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border border-transparent'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  Create Order
                </button>
                <button
                  onClick={() => onSelectTab('agents')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    currentTab === 'agents'
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border border-transparent'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  Agents
                </button>
                <button
                  onClick={() => onSelectTab('zones')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    currentTab === 'zones'
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border border-transparent'
                  }`}
                >
                  <Map className="w-4 h-4" />
                  Zones & Areas
                </button>
                <button
                  onClick={() => onSelectTab('rate-cards')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    currentTab === 'rate-cards'
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border border-transparent'
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
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    currentTab === 'dashboard'
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border border-transparent'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  My Orders
                </button>
                <button
                  onClick={() => onSelectTab('create-order')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    currentTab === 'create-order'
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border border-transparent'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  Create Order & Quote
                </button>
              </>
            )}

            {user.role === 'AGENT' && (
              <>
                <button
                  onClick={() => onSelectTab('dashboard')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    currentTab === 'dashboard'
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border border-transparent'
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
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-500/20"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
