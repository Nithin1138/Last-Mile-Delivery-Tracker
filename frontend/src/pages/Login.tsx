import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authApi, extractErrorMessage } from '../api/client';
import { 
  Truck, 
  ShieldCheck, 
  UserCheck, 
  Package, 
  AlertCircle, 
  ArrowRight, 
  Sun, 
  Moon,
  User,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  CheckCircle2,
  KeyRound,
  RotateCcw,
  Check
} from 'lucide-react';

type AuthMode = 'signin' | 'register' | 'forgot_request' | 'forgot_verify';

export const Login: React.FC = () => {
  const { login, quickLogin, register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  // Navigation & view mode
  const [authMode, setAuthMode] = useState<AuthMode>('signin');

  // Sign in & registration fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+91');
  const [role, setRole] = useState<'CUSTOMER' | 'AGENT'>('CUSTOMER');
  
  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility toggles
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle Login & Register submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (authMode === 'register') {
        await register({ email, password, name, phone: phone.trim() || undefined, role });
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(extractErrorMessage(err) || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Quick Demo Account Login
  const handleQuickLogin = async (e: string, p: string) => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      await quickLogin(e, p);
    } catch (err: any) {
      setError(extractErrorMessage(err) || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 1: Send 6-Digit Passcode to Email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await authApi.forgotPassword(forgotEmail.trim());
      setSuccessMessage(res.message || 'Verification passcode sent to your email.');
      setAuthMode('forgot_verify');
    } catch (err: any) {
      setError(extractErrorMessage(err) || 'Failed to send verification passcode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2: Verify 6-Digit Passcode & Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.resetPassword({
        email: forgotEmail.trim(),
        otp_code: otpCode.trim(),
        new_password: newPassword,
      });

      setEmail(forgotEmail.trim());
      setPassword('');
      setSuccessMessage(res.message || 'Password reset successfully! Please sign in with your new password.');
      setAuthMode('signin');
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(extractErrorMessage(err) || 'Failed to reset password. Please check your passcode.');
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

      <div className={`mt-6 sm:mx-auto sm:w-full transition-all duration-200 px-4 sm:px-0 ${authMode === 'register' ? 'sm:max-w-lg' : 'sm:max-w-md'}`}>
        <div className="stripe-card rounded-2xl p-6 sm:p-8 space-y-6">
          
          {/* Global Alert Banners */}
          {error && (
            <div className="p-3 rounded-xl bg-[#FAF0F0] dark:bg-[#2B1717] border border-[#F2D0D0] dark:border-[#432323] text-xs text-[#B54848] dark:text-[#D56B6B] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-[#EAF5F0] dark:bg-[#16271E] border border-[#C8E5D6] dark:border-[#203D2E] text-xs text-[#287A55] dark:text-[#55A878] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────
             MODE 1: SIGN IN (PRESERVED DEMO ACCOUNTS + PASSWORD TOGGLE + FORGOT LINK)
             ───────────────────────────────────────────────────────── */}
          {authMode === 'signin' && (
            <>
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
                    <div className="text-[10px] text-[#8A919C] dark:text-[#737A84] truncate">Veera Nithin</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('alekhya.reddy@gmail.com', 'customer123')}
                    className="p-2.5 rounded-xl border border-[#E2E5E9] dark:border-[#2B3138] bg-white dark:bg-[#181C20] hover:bg-[#F1F3F5] dark:hover:bg-[#1E2328] hover:border-[#3157A6] dark:hover:border-[#6D8ED4] text-left transition-all cursor-pointer group shadow-2xs"
                  >
                    <Package className="w-3.5 h-3.5 text-[#287A55] dark:text-[#55A878] mb-1" />
                    <div className="text-xs font-semibold text-[#171A1F] dark:text-[#E8EAED]">Customer</div>
                    <div className="text-[10px] text-[#8A919C] dark:text-[#737A84] truncate">Alekhya (B2C)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('babu.naidu@delivery.dev', 'agent123')}
                    className="p-2.5 rounded-xl border border-[#E2E5E9] dark:border-[#2B3138] bg-white dark:bg-[#181C20] hover:bg-[#F1F3F5] dark:hover:bg-[#1E2328] hover:border-[#3157A6] dark:hover:border-[#6D8ED4] text-left transition-all cursor-pointer group shadow-2xs"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-[#A66A16] dark:text-[#D19A4A] mb-1" />
                    <div className="text-xs font-semibold text-[#171A1F] dark:text-[#E8EAED]">Agent</div>
                    <div className="text-[10px] text-[#8A919C] dark:text-[#737A84] truncate">Babu Naidu</div>
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
                <div>
                  <label className="block text-xs font-semibold text-[#171A1F] dark:text-[#E8EAED] mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-[#8A919C] dark:text-[#737A84] absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full linear-input rounded-lg pl-9 pr-3 py-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none placeholder-[#8A919C]"
                      placeholder="alekhya.reddy@gmail.com"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#171A1F] dark:text-[#E8EAED]">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('forgot_request');
                        setError(null);
                        setSuccessMessage(null);
                        setForgotEmail(email || '');
                      }}
                      className="text-[11px] text-[#3157A6] dark:text-[#6D8ED4] hover:text-[#284A91] dark:hover:text-[#819DDE] font-semibold transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-[#8A919C] dark:text-[#737A84] absolute left-3 top-2.5" />
                    <input
                      type={showSignInPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full linear-input rounded-lg pl-9 pr-9 py-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none placeholder-[#8A919C]"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      className="absolute right-2.5 top-2.5 text-[#8A919C] hover:text-[#171A1F] dark:hover:text-[#E8EAED] cursor-pointer"
                      title={showSignInPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSignInPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full stripe-btn-primary py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Authenticating (connecting to server)...</span>
                    </div>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center pt-2 border-t border-[#E2E5E9] dark:border-[#2B3138]">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-[#3157A6] dark:text-[#6D8ED4] hover:text-[#284A91] dark:hover:text-[#819DDE] font-semibold transition-colors cursor-pointer"
                >
                  Don't have an account? Register
                </button>
              </div>
            </>
          )}

          {/* ─────────────────────────────────────────────────────────
             MODE 2: CREATE ACCOUNT (POLISHED ONBOARDING UX)
             ───────────────────────────────────────────────────────── */}
          {authMode === 'register' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-[#E2E5E9] dark:border-[#2B3138] pb-3">
                <h3 className="text-base font-bold text-[#171A1F] dark:text-[#E8EAED]">
                  Create Account
                </h3>
                <p className="text-xs text-[#5F6672] dark:text-[#A7ADB5] mt-0.5">
                  Select your role and start dispatching or booking deliveries.
                </p>
              </div>

              {/* Visual Role Persona Cards */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-[#5F6672] dark:text-[#A7ADB5] uppercase tracking-wider">
                  Select Account Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('CUSTOMER')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                      role === 'CUSTOMER'
                        ? 'bg-[#EBF1FA] dark:bg-[#182232] border-[#3157A6] dark:border-[#6D8ED4] shadow-xs'
                        : 'bg-white dark:bg-[#181C20] border-[#E2E5E9] dark:border-[#2B3138] hover:border-[#3157A6]/50 dark:hover:border-[#6D8ED4]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-lg bg-white dark:bg-[#111417] text-[#3157A6] dark:text-[#6D8ED4] border border-[#D0DEF2] dark:border-[#25354E]">
                        <Package className="w-4 h-4" />
                      </div>
                      {role === 'CUSTOMER' && (
                        <CheckCircle2 className="w-4 h-4 text-[#3157A6] dark:text-[#6D8ED4]" />
                      )}
                    </div>
                    <div className="text-xs font-bold text-[#171A1F] dark:text-[#E8EAED]">
                      Customer
                    </div>
                    <div className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] mt-0.5">
                      Book & track parcels
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('AGENT')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                      role === 'AGENT'
                        ? 'bg-[#EAF5F0] dark:bg-[#16271E] border-[#287A55] dark:border-[#55A878] shadow-xs'
                        : 'bg-white dark:bg-[#181C20] border-[#E2E5E9] dark:border-[#2B3138] hover:border-[#287A55]/50 dark:hover:border-[#55A878]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-lg bg-white dark:bg-[#111417] text-[#287A55] dark:text-[#55A878] border border-[#C8E5D6] dark:border-[#203D2E]">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      {role === 'AGENT' && (
                        <CheckCircle2 className="w-4 h-4 text-[#287A55] dark:text-[#55A878]" />
                      )}
                    </div>
                    <div className="text-xs font-bold text-[#171A1F] dark:text-[#E8EAED]">
                      Delivery Courier
                    </div>
                    <div className="text-[11px] text-[#5F6672] dark:text-[#A7ADB5] mt-0.5">
                      Deliver & complete runs
                    </div>
                  </button>
                </div>
              </div>

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#171A1F] dark:text-[#E8EAED] mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-[#8A919C] dark:text-[#737A84] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full linear-input rounded-lg pl-9 pr-3 py-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none placeholder-[#8A919C]"
                        placeholder="Rohit Verma"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#171A1F] dark:text-[#E8EAED] mb-1">
                      Mobile Phone <span className="text-[#8A919C] text-[10px] font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-[#8A919C] dark:text-[#737A84] absolute left-3 top-2.5" />
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
                        className="w-full linear-input rounded-lg pl-9 pr-3 py-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none font-mono placeholder-[#8A919C]"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#171A1F] dark:text-[#E8EAED] mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-[#8A919C] dark:text-[#737A84] absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full linear-input rounded-lg pl-9 pr-3 py-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none placeholder-[#8A919C]"
                      placeholder="rohit.verma@gmail.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#171A1F] dark:text-[#E8EAED] mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-[#8A919C] dark:text-[#737A84] absolute left-3 top-2.5" />
                    <input
                      type={showRegisterPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full linear-input rounded-lg pl-9 pr-9 py-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none placeholder-[#8A919C]"
                      placeholder="At least 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute right-2.5 top-2.5 text-[#8A919C] hover:text-[#171A1F] dark:hover:text-[#E8EAED] cursor-pointer"
                      title={showRegisterPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegisterPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full stripe-btn-primary py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md mt-1"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating {role === 'AGENT' ? 'Courier' : 'Customer'} Account...</span>
                    </div>
                  ) : (
                    <>
                      <span>Complete Registration & Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center pt-2 border-t border-[#E2E5E9] dark:border-[#2B3138]">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-[#3157A6] dark:text-[#6D8ED4] hover:text-[#284A91] dark:hover:text-[#819DDE] font-semibold transition-colors cursor-pointer"
                >
                  Already have an account? Sign In
                </button>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────
             MODE 3: FORGOT PASSWORD STEP 1 (REQUEST 6-DIGIT PASSCODE)
             ───────────────────────────────────────────────────────── */}
          {authMode === 'forgot_request' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-[#E2E5E9] dark:border-[#2B3138] pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-[#EBF1FA] dark:bg-[#182232] text-[#3157A6] dark:text-[#6D8ED4]">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-[#171A1F] dark:text-[#E8EAED]">
                    Reset Password
                  </h3>
                </div>
                <p className="text-xs text-[#5F6672] dark:text-[#A7ADB5] mt-1 leading-relaxed">
                  Enter your registered email address to receive a secure 6-digit verification passcode.
                </p>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#171A1F] dark:text-[#E8EAED] mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-[#8A919C] dark:text-[#737A84] absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full linear-input rounded-lg pl-9 pr-3 py-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none placeholder-[#8A919C]"
                      placeholder="rohit.verma@gmail.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full stripe-btn-primary py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending Passcode...</span>
                    </div>
                  ) : (
                    <>
                      <span>Send 6-Digit Passcode</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center pt-2 border-t border-[#E2E5E9] dark:border-[#2B3138]">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED] font-semibold transition-colors cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────
             MODE 4: FORGOT PASSWORD STEP 2 (VERIFY 6-DIGIT PASSCODE & RESET)
             ───────────────────────────────────────────────────────── */}
          {authMode === 'forgot_verify' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-[#E2E5E9] dark:border-[#2B3138] pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-[#EAF5F0] dark:bg-[#16271E] text-[#287A55] dark:text-[#55A878]">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-[#171A1F] dark:text-[#E8EAED]">
                    Verify & Set Password
                  </h3>
                </div>
                <p className="text-xs text-[#5F6672] dark:text-[#A7ADB5] mt-1">
                  Enter the 6-digit passcode sent to <span className="font-semibold text-[#171A1F] dark:text-[#E8EAED]">{forgotEmail}</span>
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#171A1F] dark:text-[#E8EAED]">
                      6-Digit Passcode
                    </label>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading}
                      className="text-[11px] text-[#3157A6] dark:text-[#6D8ED4] hover:text-[#284A91] dark:hover:text-[#819DDE] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Resend code</span>
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 text-[#8A919C] dark:text-[#737A84] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full linear-input rounded-lg pl-9 pr-3 py-2 text-sm font-mono tracking-widest text-[#171A1F] dark:text-[#E8EAED] focus:outline-none placeholder-[#8A919C]"
                      placeholder="123456"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#171A1F] dark:text-[#E8EAED] mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-[#8A919C] dark:text-[#737A84] absolute left-3 top-2.5" />
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full linear-input rounded-lg pl-9 pr-9 py-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none placeholder-[#8A919C]"
                      placeholder="At least 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-2.5 top-2.5 text-[#8A919C] hover:text-[#171A1F] dark:hover:text-[#E8EAED] cursor-pointer"
                      title={showResetPassword ? 'Hide password' : 'Show password'}
                    >
                      {showResetPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#171A1F] dark:text-[#E8EAED] mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-[#8A919C] dark:text-[#737A84] absolute left-3 top-2.5" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full linear-input rounded-lg pl-9 pr-9 py-2 text-xs text-[#171A1F] dark:text-[#E8EAED] focus:outline-none placeholder-[#8A919C]"
                      placeholder="Repeat new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-2.5 text-[#8A919C] hover:text-[#171A1F] dark:hover:text-[#E8EAED] cursor-pointer"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full stripe-btn-primary py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md mt-1"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Resetting Password...</span>
                    </div>
                  ) : (
                    <>
                      <span>Reset Password & Sign In</span>
                      <Check className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              <div className="flex items-center justify-between pt-2 border-t border-[#E2E5E9] dark:border-[#2B3138] text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('forgot_request');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[#5F6672] dark:text-[#A7ADB5] hover:text-[#171A1F] dark:hover:text-[#E8EAED] font-semibold cursor-pointer"
                >
                  ← Change Email
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[#3157A6] dark:text-[#6D8ED4] hover:text-[#284A91] dark:hover:text-[#819DDE] font-semibold cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
