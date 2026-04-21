import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { derivApi, parseOAuthRedirect, getOAuthUrl, type DerivAccount, type AuthorizeResponse } from '@/services/deriv-api';
import { useNavigate, useLocation } from 'react-router-dom';

interface AuthState {
  isAuthorized: boolean;
  isLoading: boolean;
  accounts: DerivAccount[];
  activeAccount: DerivAccount | null;
  accountInfo: AuthorizeResponse['authorize'] | null;
  balance: number;
  login: () => void;
  logout: () => void;
  switchAccount: (loginid: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accounts, setAccounts] = useState<DerivAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<DerivAccount | null>(null);
  const [accountInfo, setAccountInfo] = useState<AuthorizeResponse['authorize'] | null>(null);
  const [balance, setBalance] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  const authorizeAccount = useCallback(async (account: DerivAccount) => {
    try {
      const response = await derivApi.authorize(account.token);
      setAccountInfo(response.authorize);
      setBalance(response.authorize.balance);
      setActiveAccount(account);
      setIsAuthorized(true);

      // Subscribe to balance updates
      derivApi.onMessage((data) => {
        if (data.balance) {
          setBalance(data.balance.balance);
        }
      });

      await derivApi.getBalance();
    } catch (err) {
      console.error('Authorization failed:', err);
      setIsAuthorized(false);
    }
  }, []);

  // Check for OAuth redirect
  useEffect(() => {
    const search = location.search;
    if (search.includes('acct1')) {
      const parsedAccounts = parseOAuthRedirect(search);
      if (parsedAccounts.length > 0) {
        localStorage.setItem('deriv_accounts', JSON.stringify(parsedAccounts));
        setAccounts(parsedAccounts);
        
        // Default to demo account if available
        const demoAccount = parsedAccounts.find(a => a.is_virtual) || parsedAccounts[0];
        authorizeAccount(demoAccount).then(() => {
          setIsLoading(false);
          navigate('/', { replace: true });
        });
        return;
      }
    }

    // Check stored accounts
    const stored = localStorage.getItem('deriv_accounts');
    if (stored) {
      try {
        const storedAccounts: DerivAccount[] = JSON.parse(stored);
        setAccounts(storedAccounts);
        const demoAccount = storedAccounts.find(a => a.is_virtual) || storedAccounts[0];
        authorizeAccount(demoAccount).then(() => setIsLoading(false));
      } catch {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = () => {
    window.location.href = getOAuthUrl();
  };

  const logout = () => {
    localStorage.removeItem('deriv_accounts');
    derivApi.disconnect();
    setIsAuthorized(false);
    setAccounts([]);
    setActiveAccount(null);
    setAccountInfo(null);
    setBalance(0);
  };

  const switchAccount = async (loginid: string) => {
    const account = accounts.find(a => a.loginid === loginid);
    if (account) {
      derivApi.disconnect();
      await authorizeAccount(account);
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthorized, isLoading, accounts, activeAccount,
      accountInfo, balance, login, logout, switchAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
