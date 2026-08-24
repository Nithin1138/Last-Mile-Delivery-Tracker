import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Truck, ShieldCheck, UserCheck, Package, AlertCircle, ArrowRight, Sun, Moon, Sparkles } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, quickLogin, register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+91');
  const [role, setRole] = useState<'CUSTOMER' | 'AGENT'>('CUSTOMER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await register({ email, password, name, phone: phone.trim() || undefined, role });
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (e: string, p: string) => {
    setError(null);
    setLoading(true);
    try {
      await quickLogin(e, p);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#111417] text-[#171A1F] dark:text-[#E8EAED] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-[#3157A6] selection:text-white transition-colors duration-150">
      {/* Theme Toggle in top-right */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 text-[#5F6672] hover:text-[#171A1F] dark:text-[#A7ADB5] dark:hover:text-[#E8EAED] hover:bg-[#F1F3F5] dark:hover:bg-[#1E2328] rounded-xl transition-colors cursor-pointer border border-[#E2E5E9] dark:border-[#2B3138] bg-white dark:bg-[#181C20] shadow-2xs"
          title={theme === 'light' ? 'Switch to Dark mode' : 'Switch to Light mode'}
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4 text-[#5F6672]" />
          ) : (
            <Sun className="w-4 h-4 text-[#D19A4A]" />
          )}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-[#3157A6] dark:bg-[#6D8ED4] text-white dark:text-[#111417] flex items-center justify-center shadow-md">
            <Truck className="w-6 h-6" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-xl font-bold tracking-tight text-[#171A1F] dark:text-[#E8EAED]">
          LastMile Flow
        </h2>
        <p className="mt-1 text-center text-xs text-[#5F6672] dark:text-[#A7ADB5]">
          Autonomous Last-Mile Delivery & Agent Dispatch Platform
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="stripe-card rounded-2xl p-6 sm:p-8 space-y-6">
          {/* Quick Demo Accounts */}
          <div>
            <div className="text-[11px] font-semibold text-[#5F6672] dark:text-[#A7ADB5] uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Demo accounts</span>
              <span className="text-[11px] text-[#3157A6] dark:text-[#6D8ED4] font-medium">Quick access</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@lastmile.dev', 'admin123')}
                className="p-2.5 rounded-xl border border-[#E2E5E9] dark:border-[#2B3138] bg-white dark:bg-[#181C20] hover:bg-[#F1F3F5] dark:hover:bg-[#1E2328] hover:border-[#3157A6] dark:hover:border-[#6D8ED4] text-left transition-all cursor-pointer group shadow-2xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#3157A6] dark:text-[#6D8ED4] mb-1" />
                <div className="text-xs font-semibold text-[#171A1F] dark:text-[#E8EAED]">Admin</div>
                <div className="text-[10px] text-[#8A919C] dark:text-[#737A84] truncate">Operations</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('rohit.verma@gmail.com', 'customer123')}
                className="p-2.5 rounded-xl border border-[#E2E5E9] dark:border-[#2B3138] bg-white dark:bg-[#181C20] hover:bg-[#F1F3F5] dark:hover:bg-[#1E2328] hover:border-[#3157A6] dark:hover:border-[#6D8ED4] text-left transition-all cursor-pointer group shadow-2xs"
              >
                <Package className="w-3.5 h-3.5 text-[#287A55] dark:text-[#55A878] mb-1" />
                <div className="text-xs font-semibold text-[#171A1F] dark:text-[#E8EAED]">Customer</div>
                <div className="text-[10px] text-[#8A919C] dark:text-[#737A84] truncate">Rohit (B2C)</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('vikram.singh@delivery.dev', 'agent123')}
                className="p-2.5 rounded-xl border border-[#E2E5E9] dark:border-[#2B3138] bg-white dark:bg-[#181C20] hover:bg-[#F1F3F5] dark:hover:bg-[#1E2328] hover:border-[#3157A6] dark:hover:border-[#6D8ED4] text-left transition-all cursor-pointer group shadow-2xs"
              >
                <UserCheck className="w-3.5 h-3.5 text-[#A66A16] dark:text-[#D19A4A] mb-1" />
                <div className="text-xs font-semibold text-[#171A1F] dark:text-[#E8EAED]">Agent</div>
                <div className="text-[10px] text-[#8A919C] dark:text-[#737A84] truncate">Vikram Singh</div>
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E2E5E9] dark:border-[#2B3138]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white dark:bg-[#181C20] text-[#8A919C] dark:text-[#737A84] font-medium">Or enter credentials</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-[#FAF0F0] dark:bg-[#2B1717] border border-[#F2D0D0] dark:border-[#432323] text-xs text-[#B54848] dark:text-[#D56B6B] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-[#171A1F] dark:text-[#E8EAED] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full linear-input rounded-lg px-3 py-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none"
                  placeholder="Rohit Verma"
                />
              </div>
            )}

            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-[#171A1F] dark:text-[#E8EAED] mb-1">
                  Mobile Number <span className="text-[#8A919C] text-[10px] font-normal">(for SMS alerts)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      setPhone('+91');
                    } else if (!val.startsWith('+')) {
                      setPhone('+91' + val.replace(/\D/g, ''));
                    } else {
                      setPhone(val);
                    }
                  }}
                  className="w-full linear-input rounded-lg px-3 py-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none font-mono"
                  placeholder="+91 98765 43210"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#171A1F] dark:text-[#E8EAED] mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full linear-input rounded-lg px-3 py-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none"
                placeholder="rohit.verma@gmail.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171A1F] dark:text-[#E8EAED] mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full linear-input rounded-lg px-3 py-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-[#171A1F] dark:text-[#E8EAED] mb-1">Account Type</label>
                <select
                  value={role}
                  onChange={(e: any) => setRole(e.target.value)}
                  className="w-full linear-input rounded-lg px-3 py-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none cursor-pointer"
                >
                  <option value="CUSTOMER">Customer (Shipment Creator)</option>
                  <option value="AGENT">Delivery Courier (Agent)</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full stripe-btn-primary py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-[#E2E5E9] dark:border-[#2B3138]">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-xs text-[#3157A6] dark:text-[#6D8ED4] hover:text-[#284A91] dark:hover:text-[#819DDE] font-semibold transition-colors cursor-pointer"
            >
              {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
