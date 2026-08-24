import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authApi } from '../api/client';

const DEMO_EMAILS = [
  'admin@lastmile.dev',
  'alekhya.reddy@gmail.com',
  'pujitha.logistics@andhraexports.in',
  'babu.naidu@delivery.dev',
  'srinivas.rao@delivery.dev',
  'kalyan.varma@delivery.dev',
  'ananya.chowdary@delivery.dev',
  // Backward compatibility aliases
  'rohit.verma@gmail.com',
  'logistics@acmecorp.in',
  'vikram.singh@delivery.dev',
];

interface CustomAccount {
  user: User;
  token: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  savedCustomAccount: CustomAccount | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (payload: { email: string; password: string; name: string; phone?: string; role?: string }) => Promise<void>;
  logout: () => void;
  quickLogin: (email: string, pass: string) => Promise<void>;
  restoreCustomAccount: () => void;
  updateProfile: (payload: { name?: string; phone?: string }) => Promise<void>;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [savedCustomAccount, setSavedCustomAccount] = useState<CustomAccount | null>(() => {
    try {
      const stored = localStorage.getItem('saved_custom_account');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const me = await authApi.getMe();
          setUser(me);
          if (!DEMO_EMAILS.includes(me.email)) {
            const custom = { user: me, token: storedToken };
            setSavedCustomAccount(custom);
            localStorage.setItem('saved_custom_account', JSON.stringify(custom));
          }
        } catch (err) {
          console.error('Failed to validate session token', err);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await authApi.login(email, pass);
    localStorage.setItem('token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);

    if (!DEMO_EMAILS.includes(res.user.email)) {
      const custom = { user: res.user, token: res.access_token };
      setSavedCustomAccount(custom);
      localStorage.setItem('saved_custom_account', JSON.stringify(custom));
    }
  };

  const register = async (payload: { email: string; password: string; name: string; phone?: string; role?: string }) => {
    const res = await authApi.register(payload);
    localStorage.setItem('token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);

    const custom = { user: res.user, token: res.access_token };
    setSavedCustomAccount(custom);
    localStorage.setItem('saved_custom_account', JSON.stringify(custom));
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('saved_custom_account');
    setToken(null);
    setUser(null);
    setSavedCustomAccount(null);
  };

  const quickLogin = async (email: string, pass: string) => {
    const res = await authApi.login(email, pass);
    localStorage.setItem('token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
  };

  const restoreCustomAccount = () => {
    if (savedCustomAccount) {
      localStorage.setItem('token', savedCustomAccount.token);
      setToken(savedCustomAccount.token);
      setUser(savedCustomAccount.user);
    }
  };

  const updateProfile = async (payload: { name?: string; phone?: string }) => {
    const updatedUser = await authApi.updateMe(payload);
    setUser(updatedUser);
    if (savedCustomAccount) {
      const custom = { ...savedCustomAccount, user: updatedUser };
      setSavedCustomAccount(custom);
      localStorage.setItem('saved_custom_account', JSON.stringify(custom));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        savedCustomAccount,
        login,
        register,
        logout,
        quickLogin,
        restoreCustomAccount,
        updateProfile,
      }}
    >

      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
