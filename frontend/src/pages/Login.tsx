import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Truck, Lock, Mail, AlertCircle, ArrowRight, User, Phone, ShieldCheck, CheckCircle2, Sparkles, ChevronRight, UserCheck } from 'lucide-react';
import { extractErrorMessage } from '../api/client';

export const Login: React.FC = () => {
  const { login, register, quickLogin } = useAuth();

  // Screen mode: 'landing' (quick persona entry) | 'custom-signin' | 'register'
  const [authMode, setAuthMode] = useState<'landing' | 'custom-signin' | 'register'>('landing');

  // Sign In fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await register({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        phone: regPhone.trim() || undefined,
        role: 'CUSTOMER',
      });
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuick = async (demoEmail: string, demoPass: string) => {
    setError(null);
    setEmail(demoEmail);
    setPassword(demoPass);
    setIsLoading(true);
    try {
      await quickLogin(demoEmail, demoPass);
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-4 sm:p-6 relative overflow-hidden">
      {/* Background ambient lighting glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/25 mb-1">
            <Truck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            LastMile Flow
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Last-mile delivery management and tracking platform.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-800/80 p-2.5 rounded-xl flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* ── 1. LANDING VIEW: Instant Persona Entry & Sign In ── */}
        {authMode === 'landing' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                Select Workspace Persona
              </div>

              {/* Customer */}
              <button
                type="button"
                onClick={() => handleQuick('rohit.verma@gmail.com', 'customer123')}
                disabled={isLoading}
                className="w-full p-3 bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-white">
                      Customer Portal
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Create orders, dynamic rate quotes & live tracking
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
              </button>

              {/* Agent */}
              <button
                type="button"
                onClick={() => handleQuick('vikram.singh@delivery.dev', 'agent123')}
                disabled={isLoading}
                className="w-full p-3 bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-white">
                      Delivery Agent
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Assigned deliveries, status dispatch & route execution
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </button>

              {/* Admin */}
              <button
                type="button"
                onClick={() => handleQuick('admin@lastmile.dev', 'admin123')}
                disabled={isLoading}
                className="w-full p-3 bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-white">
                      Operations Admin
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Fleet overview, auto-dispatch, rate cards & zones
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
              </button>
            </div>

            {/* Custom Sign In / Register Buttons */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('custom-signin');
                  setError(null);
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium py-1.5 px-2.5 rounded-lg hover:bg-indigo-500/10 transition-colors cursor-pointer"
              >
                Sign In with Email
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setError(null);
                }}
                className="text-xs text-slate-400 hover:text-slate-200 font-medium py-1.5 px-2.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Create Account
              </button>
            </div>
          </div>
        )}

        {/* ── 2. CUSTOM SIGN IN ── */}
        {authMode === 'custom-signin' && (
          <form className="space-y-3.5" onSubmit={handleLoginSubmit}>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 mt-1 cursor-pointer"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
              <button
                type="button"
                onClick={() => setAuthMode('landing')}
                className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                ← Back to Personas
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
              >
                Create Account
              </button>
            </div>
          </form>
        )}

        {/* ── 3. REGISTER NEW CUSTOMER ── */}
        {authMode === 'register' && (
          <form className="space-y-3" onSubmit={handleRegisterSubmit}>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Rahul Verma"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Phone Number <span className="text-slate-500 font-normal">(for SMS delivery updates)</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+91 98765 43210 (Optional)"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 mt-1 cursor-pointer"
            >
              {isLoading ? 'Creating Account...' : 'Register & Sign In'}
              <CheckCircle2 className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
              <button
                type="button"
                onClick={() => setAuthMode('landing')}
                className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                ← Back to Personas
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('custom-signin')}
                className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
              >
                Already registered? Sign In
              </button>
            </div>
          </form>
        )}

        {/* Small Tagline Footer */}
        <div className="pt-3 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500 tracking-tight leading-relaxed">
            Real-time order tracking · Automated assignment · Delivery lifecycle management
          </p>
        </div>
      </div>
    </div>
  );
};

