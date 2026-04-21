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
      const saved = localStorage.getItem("last_active_loginid");

      if (saved) {
        const match = available.find((a) => a.loginid === saved);
        if (match) return match;
      }

      const real = available.find((a) => !a.is_virtual);
      if (real) return real;

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
          const parsed = parseOAuthRedirect(search);

          if (parsed.length > 0 && !cancelled) {
            localStorage.setItem(
              "deriv_accounts",
              JSON.stringify(parsed)
            );

            setAccounts(parsed);

            const account = selectAccount(parsed);

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

        if (stored) {
          const parsed: DerivAccount[] = JSON.parse(stored);

          setAccounts(parsed);

          const account = selectAccount(parsed);

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
