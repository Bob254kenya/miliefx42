import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";

import {
  derivApi,
  parseOAuthRedirect,
  getOAuthUrl,
  type DerivAccount,
  type AuthorizeResponse,
} from "@/services/deriv-api";

import { useNavigate, useLocation } from "react-router-dom";

interface AuthState {
  isAuthorized: boolean;
  isLoading: boolean;
  accounts: DerivAccount[];
  activeAccount: DerivAccount | null;
  accountInfo: AuthorizeResponse["authorize"] | null;
  balance: number;
  login: () => void;
  logout: () => void;
  switchAccount: (loginid: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

// Helper function to filter out CRW and VRW accounts
const filterAllowedAccounts = (accounts: DerivAccount[]): DerivAccount[] => {
  console.log('Filtering accounts:', accounts.map(a => a.loginid));
  
  const filtered = accounts.filter(account => {
    const loginid = account.loginid.toUpperCase();
    const isExcluded = loginid.startsWith('CRW') || loginid.startsWith('VRW');
    
    if (isExcluded) {
      console.log(`Excluding account: ${account.loginid}`);
    } else {
      console.log(`Keeping account: ${account.loginid}`);
    }
    
    return !isExcluded;
  });
  
  console.log('Filtered accounts:', filtered.map(a => a.loginid));
  return filtered;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [accounts, setAccounts] = useState<DerivAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<DerivAccount | null>(null);
  const [accountInfo, setAccountInfo] =
    useState<AuthorizeResponse["authorize"] | null>(null);
  const [balance, setBalance] = useState(0);

  const location = useLocation();
  const navigate = useNavigate();

  const unsubscribeRef = useRef<null | (() => void)>(null);
  const authLock = useRef(false);
  const initialized = useRef(false);

  const cleanupSubscription = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  const selectAccount = useCallback(
    (available: DerivAccount[]) => {
      console.log('Selecting account from:', available.map(a => a.loginid));
      
      const saved = localStorage.getItem("last_active_loginid");

      if (saved) {
        const match = available.find((a) => a.loginid === saved);
        if (match) {
          console.log('Using saved account:', match.loginid);
          return match;
        }
      }

      const real = available.find((a) => !a.is_virtual);
      if (real) {
        console.log('Using real account:', real.loginid);
        return real;
      }

      console.log('Using first account:', available[0]?.loginid);
      return available[0];
    },
    []
  );

  const authorizeAccount = useCallback(
    async (account: DerivAccount) => {
      if (authLock.current) return;
      authLock.current = true;

      try {
        cleanupSubscription();

        const response = await derivApi.authorize(account.token);

        setAccountInfo(response.authorize);
        setBalance(response.authorize.balance);
        setActiveAccount(account);
        setIsAuthorized(true);

        localStorage.setItem("last_active_loginid", account.loginid);

        unsubscribeRef.current = derivApi.onMessage((data) => {
          if (data?.balance) {
            setBalance(data.balance.balance);
          }
        });

        await derivApi.getBalance();
      } catch (err) {
        console.error("Auth failed:", err);
        setIsAuthorized(false);
      } finally {
        authLock.current = false;
      }
    },
    [cleanupSubscription]
  );

  // ✅ INIT AUTH ONLY ONCE (THIS FIXES YOUR PAGE REDIRECT BUG)
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let cancelled = false;

    const init = async () => {
      setIsLoading(true);

      try {
        const search = location.search;

        // OAuth redirect login
        if (search.includes("acct1")) {
          console.log('OAuth redirect detected');
          const parsed = parseOAuthRedirect(search);
          console.log('Parsed accounts from OAuth:', parsed.map(a => a.loginid));

          if (parsed.length > 0 && !cancelled) {
            // Filter out CRW and VRW accounts
            const allowedAccounts = filterAllowedAccounts(parsed);
            
            if (allowedAccounts.length === 0) {
              console.warn('No allowed accounts found (CRW and VRW filtered out)');
              setIsLoading(false);
              return;
            }
            
            localStorage.setItem(
              "deriv_accounts",
              JSON.stringify(allowedAccounts)
            );

            setAccounts(allowedAccounts);

            const account = selectAccount(allowedAccounts);

            await authorizeAccount(account);

            if (!cancelled) {
              navigate("/", { replace: true });
            }
          }

          setIsLoading(false);
          return;
        }

        // Stored session login
        const stored = localStorage.getItem("deriv_accounts");
        console.log('Stored accounts from localStorage:', stored);

        if (stored) {
          const parsed: DerivAccount[] = JSON.parse(stored);
          console.log('Parsed stored accounts:', parsed.map(a => a.loginid));
          
          // Filter out CRW and VRW accounts
          const allowedAccounts = filterAllowedAccounts(parsed);
          
          if (allowedAccounts.length === 0) {
            console.warn('No allowed accounts found in stored data');
            // Clear invalid stored data
            localStorage.removeItem("deriv_accounts");
            setIsLoading(false);
            return;
          }

          setAccounts(allowedAccounts);

          const account = selectAccount(allowedAccounts);

          await authorizeAccount(account);
        }
      } catch (err) {
        console.error("Init auth error:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [location.search, selectAccount, authorizeAccount, navigate]);

  // cleanup websocket on unmount
  useEffect(() => {
    return () => {
      cleanupSubscription();
      derivApi.disconnect();
    };
  }, [cleanupSubscription]);

  const login = () => {
    window.location.href = getOAuthUrl();
  };

  const logout = () => {
    cleanupSubscription();
    derivApi.disconnect();

    localStorage.removeItem("deriv_accounts");
    localStorage.removeItem("last_active_loginid");

    setIsAuthorized(false);
    setAccounts([]);
    setActiveAccount(null);
    setAccountInfo(null);
    setBalance(0);
  };

  const switchAccount = async (loginid: string) => {
    const account = accounts.find((a) => a.loginid === loginid);
    if (!account) return;

    derivApi.disconnect();
    await authorizeAccount(account);
  };

  const value = useMemo(
    () => ({
      isAuthorized,
      isLoading,
      accounts,
      activeAccount,
      accountInfo,
      balance,
      login,
      logout,
      switchAccount,
    }),
    [
      isAuthorized,
      isLoading,
      accounts,
      activeAccount,
      accountInfo,
      balance,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
