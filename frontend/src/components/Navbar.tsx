import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
  Plus,
  Sun,
  Moon
} from 'lucide-react';

interface Props {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Navbar: React.FC<Props> = ({ currentTab, onSelectTab }) => {
  const { user, logout, quickLogin, savedCustomAccount, restoreCustomAccount } = useAuth();
  const { theme, toggleTheme } = useTheme();

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

  const navContainerRef = React.useRef<HTMLElement>(null);
  const [indicator, setIndicator] = React.useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });

  React.useEffect(() => {
    if (!navContainerRef.current) return;
    const activeBtn = navContainerRef.current.querySelector<HTMLButtonElement>(`[data-tab="${currentTab}"]`);
    if (activeBtn) {
      setIndicator({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
        ready: true,
      });
    }
  }, [currentTab, user.role]);

  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

  return (
    <header className="bg-white/90 dark:bg-[#181C20]/90 border-b border-[#E2E5E9] dark:border-[#2B3138] backdrop-blur-xl sticky top-0 z-40 transition-colors">
      {/* Top Banner: Quick Demo Persona Switcher (Subtle restrained strip) */}
      {isDemoMode && (
        <div className="bg-[#F1F3F5] dark:bg-[#1E2328] border-b border-[#E2E5E9] dark:border-[#2B3138] px-4 sm:px-8 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2 transition-colors">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider bg-[#EBF1FA] dark:bg-[#182232] text-[#3157A6] dark:text-[#6D8ED4] border border-[#D0DEF2] dark:border-[#25354E] px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3157A6] dark:bg-[#6D8ED4] animate-pulse" />
              Demo Roles
            </span>
            <span className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] hidden sm:inline">1-Click Persona Switcher:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {savedCustomAccount && !isCustomUserActive && (
              <button
                onClick={() => {
                  restoreCustomAccount();
                  onSelectTab('dashboard');
                }}
                className="px-2.5 py-0.5 rounded-lg bg-[#FAF3E8] dark:bg-[#292014] hover:bg-[#F2DEBF] dark:hover:bg-[#42321D] border border-[#F2DEBF] dark:border-[#42321D] text-[#A66A16] dark:text-[#D19A4A] font-semibold flex items-center gap-1 transition-all text-[11px] cursor-pointer"
                title={`Switch back to ${savedCustomAccount.user.email}`}
              >
                <UserIcon className="w-3 h-3 text-[#A66A16] dark:text-[#D19A4A]" />
                <span>My Profile ({savedCustomAccount.user.name.split(' ')[0]})</span>
              </button>
            )}

            <button
              onClick={async () => {
                await quickLogin('admin@lastmile.dev', 'admin123');
                onSelectTab('dashboard');
              }}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                user.role === 'ADMIN'
                  ? 'bg-[#3157A6] text-white font-semibold shadow-2xs dark:bg-[#6D8ED4] dark:text-[#111417]'
                  : 'bg-white dark:bg-[#181C20] text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED] hover:bg-[#F1F3F5] dark:hover:bg-[#1E2328] border border-[#E2E5E9] dark:border-[#2B3138]'
              }`}
            >
              Admin
            </button>

            <button
              onClick={handleCustomerSwitch}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                user.role === 'CUSTOMER' && (isCustomUserActive || user.email.includes('rohit'))
                  ? 'bg-[#3157A6] text-white font-semibold shadow-2xs dark:bg-[#6D8ED4] dark:text-[#111417]'
                  : 'bg-white dark:bg-[#181C20] text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED] hover:bg-[#F1F3F5] dark:hover:bg-[#1E2328] border border-[#E2E5E9] dark:border-[#2B3138]'
              }`}
            >
              Customer {savedCustomAccount?.user.role === 'CUSTOMER' && isCustomUserActive ? `(${user.name.split(' ')[0]})` : '(B2C)'}
            </button>

            <button
              onClick={async () => {
                await quickLogin('logistics@acmecorp.in', 'customer123');
                onSelectTab('dashboard');
              }}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                user.role === 'CUSTOMER' && user.email.includes('acme')
                  ? 'bg-[#3157A6] text-white font-semibold shadow-2xs dark:bg-[#6D8ED4] dark:text-[#111417]'
                  : 'bg-white dark:bg-[#181C20] text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED] hover:bg-[#F1F3F5] dark:hover:bg-[#1E2328] border border-[#E2E5E9] dark:border-[#2B3138]'
              }`}
            >
              Customer (B2B)
            </button>

            <button
              onClick={handleAgentSwitch}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                user.role === 'AGENT'
                  ? 'bg-[#3157A6] text-white font-semibold shadow-2xs dark:bg-[#6D8ED4] dark:text-[#111417]'
                  : 'bg-white dark:bg-[#181C20] text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED] hover:bg-[#F1F3F5] dark:hover:bg-[#1E2328] border border-[#E2E5E9] dark:border-[#2B3138]'
              }`}
            >
              Agent {savedCustomAccount?.user.role === 'AGENT' && isCustomUserActive ? `(${user.name.split(' ')[0]})` : ''}
            </button>
          </div>
        </div>
      )}

      {/* Main Nav Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer group select-none" 
            onClick={() => onSelectTab('dashboard')}
          >
            <div className="w-8 h-8 rounded-lg bg-[#3157A6] dark:bg-[#6D8ED4] text-white dark:text-[#111417] flex items-center justify-center shadow-xs transition-colors">
              <Truck className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold tracking-tight text-[#171A1F] dark:text-[#E8EAED] text-sm">LastMile</span>
              <span className="text-[11px] font-mono text-[#3157A6] dark:text-[#6D8ED4] font-semibold tracking-wider uppercase">Flow</span>
            </div>
          </div>

          {/* Linear-Style Nav Tabs with sliding indicator */}
          <nav ref={navContainerRef} className="hidden md:flex items-center gap-1 relative bg-[#F1F3F5] dark:bg-[#1E2328] p-1 rounded-xl border border-[#E2E5E9] dark:border-[#2B3138]">
            {indicator.ready && (
              <div
                className="absolute top-1 bottom-1 bg-white dark:bg-[#181C20] border border-[#E2E5E9] dark:border-[#2B3138] rounded-lg shadow-2xs transition-all duration-200 ease-spring pointer-events-none z-0"
                style={{
                  left: `${indicator.left}px`,
                  width: `${indicator.width}px`,
                }}
              />
            )}

            {user.role === 'ADMIN' && (
              <>
                <button
                  data-tab="dashboard"
                  onClick={() => onSelectTab('dashboard')}
                  className={`relative z-10 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    currentTab === 'dashboard'
                      ? 'text-[#171A1F] dark:text-[#E8EAED] font-semibold'
                      : 'text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-[#8A919C] dark:text-[#737A84]" />
                  Dashboard
                </button>
                <button
                  data-tab="orders"
                  onClick={() => onSelectTab('orders')}
                  className={`relative z-10 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    currentTab === 'orders'
                      ? 'text-[#171A1F] dark:text-[#E8EAED] font-semibold'
                      : 'text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
                  }`}
                >
                  <Package className="w-3.5 h-3.5 text-[#8A919C] dark:text-[#737A84]" />
                  Shipments
                </button>
                <button
                  data-tab="create-order"
                  onClick={() => onSelectTab('create-order')}
                  className={`relative z-10 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    currentTab === 'create-order'
                      ? 'text-[#171A1F] dark:text-[#E8EAED] font-semibold'
                      : 'text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 text-[#8A919C] dark:text-[#737A84]" />
                  Create Order
                </button>
                <button
                  data-tab="agents"
                  onClick={() => onSelectTab('agents')}
                  className={`relative z-10 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    currentTab === 'agents'
                      ? 'text-[#171A1F] dark:text-[#E8EAED] font-semibold'
                      : 'text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-[#8A919C] dark:text-[#737A84]" />
                  Agents
                </button>
                <button
                  data-tab="zones"
                  onClick={() => onSelectTab('zones')}
                  className={`relative z-10 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    currentTab === 'zones'
                      ? 'text-[#171A1F] dark:text-[#E8EAED] font-semibold'
                      : 'text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
                  }`}
                >
                  <Map className="w-3.5 h-3.5 text-[#8A919C] dark:text-[#737A84]" />
                  Zones
                </button>
                <button
                  data-tab="rate-cards"
                  onClick={() => onSelectTab('rate-cards')}
                  className={`relative z-10 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    currentTab === 'rate-cards'
                      ? 'text-[#171A1F] dark:text-[#E8EAED] font-semibold'
                      : 'text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-[#8A919C] dark:text-[#737A84]" />
                  Rate Cards
                </button>
              </>
            )}

            {user.role === 'CUSTOMER' && (
              <>
                <button
                  data-tab="dashboard"
                  onClick={() => onSelectTab('dashboard')}
                  className={`relative z-10 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    currentTab === 'dashboard'
                      ? 'text-[#171A1F] dark:text-[#E8EAED] font-semibold'
                      : 'text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
                  }`}
                >
                  <Package className="w-3.5 h-3.5 text-[#8A919C] dark:text-[#737A84]" />
                  My Orders
                </button>
                <button
                  data-tab="create-order"
                  onClick={() => onSelectTab('create-order')}
                  className={`relative z-10 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    currentTab === 'create-order'
                      ? 'text-[#171A1F] dark:text-[#E8EAED] font-semibold'
                      : 'text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 text-[#8A919C] dark:text-[#737A84]" />
                  New Order & Quote
                </button>
              </>
            )}

            {user.role === 'AGENT' && (
              <>
                <button
                  data-tab="dashboard"
                  onClick={() => onSelectTab('dashboard')}
                  className={`relative z-10 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    currentTab === 'dashboard'
                      ? 'text-[#171A1F] dark:text-[#E8EAED] font-semibold'
                      : 'text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED]'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5 text-[#8A919C] dark:text-[#737A84]" />
                  Assigned Deliveries
                </button>
              </>
            )}
          </nav>
        </div>

        {/* User Info, Theme Toggle & Logout */}
        <div className="flex items-center gap-2.5">
          {/* Theme Toggle Button (Light/Dark Switch) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 text-[#5F6672] hover:text-[#171A1F] dark:text-[#A7ADB5] dark:hover:text-[#E8EAED] hover:bg-[#F1F3F5] dark:hover:bg-[#1E2328] rounded-lg transition-colors cursor-pointer border border-transparent hover:border-[#E2E5E9] dark:hover:border-[#2B3138]"
            title={theme === 'light' ? 'Switch to Dark mode' : 'Switch to Light mode'}
            aria-label="Toggle color theme"
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 text-[#5F6672]" />
            ) : (
              <Sun className="w-4 h-4 text-[#D19A4A]" />
            )}
          </button>

          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-[#171A1F] dark:text-[#E8EAED] leading-tight">{user.name}</div>
            <div className="text-[10px] text-[#5F6672] dark:text-[#A7ADB5] font-mono flex items-center gap-1 justify-end font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#287A55] dark:bg-[#55A878]" />
              <span>{user.role}</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-1.5 text-[#8A919C] hover:text-[#B54848] dark:hover:text-[#D56B6B] hover:bg-[#FAF0F0] dark:hover:bg-[#2B1717] rounded-lg transition-colors cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar for Small Screens */}
      <div className="md:hidden flex items-center gap-1.5 overflow-x-auto px-4 py-2 bg-[#F1F3F5]/90 dark:bg-[#181C20]/90 border-t border-[#E2E5E9] dark:border-[#2B3138] no-scrollbar">
        {user.role === 'ADMIN' && (
          <>
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                currentTab === 'dashboard'
                  ? 'bg-white dark:bg-[#1E2328] text-[#171A1F] dark:text-[#E8EAED] shadow-2xs border border-[#E2E5E9] dark:border-[#2B3138]'
                  : 'text-[#5F6672] dark:text-[#A7ADB5]'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </button>
            <button
              onClick={() => onSelectTab('orders')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                currentTab === 'orders'
                  ? 'bg-white dark:bg-[#1E2328] text-[#171A1F] dark:text-[#E8EAED] shadow-2xs border border-[#E2E5E9] dark:border-[#2B3138]'
                  : 'text-[#5F6672] dark:text-[#A7ADB5]'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Shipments
            </button>
            <button
              onClick={() => onSelectTab('create-order')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                currentTab === 'create-order'
                  ? 'bg-white dark:bg-[#1E2328] text-[#171A1F] dark:text-[#E8EAED] shadow-2xs border border-[#E2E5E9] dark:border-[#2B3138]'
                  : 'text-[#5F6672] dark:text-[#A7ADB5]'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Create Order
            </button>
            <button
              onClick={() => onSelectTab('agents')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                currentTab === 'agents'
                  ? 'bg-white dark:bg-[#1E2328] text-[#171A1F] dark:text-[#E8EAED] shadow-2xs border border-[#E2E5E9] dark:border-[#2B3138]'
                  : 'text-[#5F6672] dark:text-[#A7ADB5]'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Agents
            </button>
            <button
              onClick={() => onSelectTab('zones')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                currentTab === 'zones'
                  ? 'bg-white dark:bg-[#1E2328] text-[#171A1F] dark:text-[#E8EAED] shadow-2xs border border-[#E2E5E9] dark:border-[#2B3138]'
                  : 'text-[#5F6672] dark:text-[#A7ADB5]'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              Zones
            </button>
            <button
              onClick={() => onSelectTab('rate-cards')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                currentTab === 'rate-cards'
                  ? 'bg-white dark:bg-[#1E2328] text-[#171A1F] dark:text-[#E8EAED] shadow-2xs border border-[#E2E5E9] dark:border-[#2B3138]'
                  : 'text-[#5F6672] dark:text-[#A7ADB5]'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Rate Cards
            </button>
          </>
        )}

        {user.role === 'CUSTOMER' && (
          <>
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                currentTab === 'dashboard'
                  ? 'bg-white dark:bg-[#1E2328] text-[#171A1F] dark:text-[#E8EAED] shadow-2xs border border-[#E2E5E9] dark:border-[#2B3138]'
                  : 'text-[#5F6672] dark:text-[#A7ADB5]'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              My Orders
            </button>
            <button
              onClick={() => onSelectTab('create-order')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                currentTab === 'create-order'
                  ? 'bg-white dark:bg-[#1E2328] text-[#171A1F] dark:text-[#E8EAED] shadow-2xs border border-[#E2E5E9] dark:border-[#2B3138]'
                  : 'text-[#5F6672] dark:text-[#A7ADB5]'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              New Order & Quote
            </button>
          </>
        )}

        {user.role === 'AGENT' && (
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              currentTab === 'dashboard'
                ? 'bg-white dark:bg-[#1E2328] text-[#171A1F] dark:text-[#E8EAED] shadow-2xs border border-[#E2E5E9] dark:border-[#2B3138]'
                : 'text-[#5F6672] dark:text-[#A7ADB5]'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            Assigned Deliveries
          </button>
        )}
      </div>
    </header>
  );
};
