import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Truck, Lock, Mail, AlertCircle, ArrowRight, User, Phone, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { extractErrorMessage } from '../api/client';

export const Login: React.FC = () => {
  const { login, register, quickLogin } = useAuth();
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

  const [isRegister, setIsRegister] = useState(false);

  // Sign In fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<'CUSTOMER' | 'AGENT'>('CUSTOMER');

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
        role: regRole,
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
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4 sm:p-6 relative overflow-hidden">
      {/* Background ambient lighting glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/95 border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-600/20 mb-1">
            <Truck className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {isRegister ? 'Create an Account' : 'Welcome Back'}
          </h1>
          <p className="text-xs text-slate-400">
            {isRegister
              ? 'Get started with last-mile logistics management'
              : 'Sign in to access your dispatch dashboard'}
          </p>
        </div>

        {/* 1-Click Demo Accounts (Gated by VITE_DEMO_MODE) */}
        {isDemoMode && !isRegister && (
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span className="font-semibold uppercase tracking-wide text-[10px] text-indigo-400">Demo Mode · 1-Click Login</span>
              <span className="text-slate-500 font-mono text-[10px]">Evaluation</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuick('admin@lastmile.dev', 'admin123')}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-lg text-left transition-all text-xs flex items-center justify-between"
              >
                <span className="font-semibold text-slate-200">👑 Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuick('rohit.verma@gmail.com', 'customer123')}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-lg text-left transition-all text-xs flex items-center justify-between"
              >
                <span className="font-semibold text-slate-200">👤 B2C Client</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuick('logistics@acmecorp.in', 'customer123')}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-lg text-left transition-all text-xs flex items-center justify-between"
              >
                <span className="font-semibold text-slate-200">🏢 B2B Client</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuick('vikram.singh@delivery.dev', 'agent123')}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-lg text-left transition-all text-xs flex items-center justify-between"
              >
                <span className="font-semibold text-slate-200">🛵 Agent</span>
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-800/80 p-2.5 rounded-xl flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        {!isRegister ? (
          /* SIGN IN */
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

            <div className="text-center pt-2 border-t border-slate-800/80 text-xs text-slate-400">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError(null);
                }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold ml-1 cursor-pointer"
              >
                Create one now
              </button>
            </div>
          </form>
        ) : (
          /* REGISTER */
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
              <label className="block text-xs font-medium text-slate-300 mb-1">Account Role</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRegRole('CUSTOMER')}
                  className={`py-1.5 px-3 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    regRole === 'CUSTOMER'
                      ? 'bg-indigo-600/90 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Customer
                </button>
                <button
                  type="button"
                  onClick={() => setRegRole('AGENT')}
                  className={`py-1.5 px-3 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    regRole === 'AGENT'
                      ? 'bg-indigo-600/90 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  Agent
                </button>
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
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 mt-1 cursor-pointer"
            >
              {isLoading ? 'Creating Account...' : 'Register & Sign In'}
              <CheckCircle2 className="w-4 h-4" />
            </button>

            <div className="text-center pt-2 border-t border-slate-800/80 text-xs text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError(null);
                }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold ml-1 cursor-pointer"
              >
                Sign in
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
