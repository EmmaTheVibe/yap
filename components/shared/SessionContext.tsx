"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Session } from "@/types/auth";
import { setSession, clearSession, getSession } from "@/lib/session";
import { apiMe, apiRefresh, setRefreshToken } from "@/lib/api";
import {
  clearPrivateKey,
  clearStoredSession,
  loadWrappedSession,
} from "@/lib/storage";
import { unwrapPrivateKey } from "@/lib/crypto";
import { wsManager } from "@/lib/websocket";

type SessionContextValue = {
  session: Session | null;
  initializing: boolean;
  hasStoredSession: boolean;
  login: (session: Session) => void;
  logout: () => void;
  restore: (password: string) => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const initialSession = getSession();
  const [session, setSessionState] = useState<Session | null>(initialSession);
  const [initializing, setInitializing] = useState(initialSession === null);
  const [hasStoredSession, setHasStoredSession] = useState(
    initialSession !== null,
  );

  const login = useCallback((s: Session) => {
    setSession(s);
    setRefreshToken(s.refreshToken);
    setHasStoredSession(true);
    setSessionState(s);
    wsManager.connect(s.accessToken);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setRefreshToken(null);
    setHasStoredSession(false);
    void clearStoredSession();
    wsManager.disconnect();
    setSessionState(null);
  }, []);

  useEffect(() => {
    let active = true;

    if (session) return;

    async function restoreFromDevice() {
      try {
        const stored = await loadWrappedSession();

        if (!active) return;

        if (!stored) {
          void clearPrivateKey();
          setHasStoredSession(false);
          setInitializing(false);
          return;
        }

        void clearPrivateKey();
        setHasStoredSession(true);
        setRefreshToken(stored.refresh_token);
        setInitializing(false);
      } catch {
        if (!active) return;
        clearSession();
        setRefreshToken(null);
        setHasStoredSession(false);
        await clearStoredSession();
        setInitializing(false);
      }
    }

    restoreFromDevice();

    return () => {
      active = false;
    };
  }, [session, login]);

  const restore = useCallback(async (password: string) => {
    const stored = await loadWrappedSession();

    if (!stored) {
      setHasStoredSession(false);
      throw new Error("No saved session found. Please log in again.");
    }

    setRefreshToken(stored.refresh_token);

    let accessToken = "";
    let user: Session["user"];

    try {
      const refreshed = await apiRefresh(stored.refresh_token);
      accessToken = refreshed.access_token;
      user = await apiMe(accessToken);
    } catch {
      clearSession();
      setRefreshToken(null);
      setHasStoredSession(false);
      await clearStoredSession();
      throw new Error("Saved session expired. Please log in again.");
    }

    let privateKey: CryptoKey;

    try {
      privateKey = await unwrapPrivateKey(
        user.wrapped_private_key,
        password,
        user.pbkdf2_salt,
      );
    } catch {
      throw new Error("Could not unlock private key. Check your password.");
    }

    login({
      user,
      accessToken,
      refreshToken: stored.refresh_token,
      privateKey,
    });
  }, [login]);

  return (
    <SessionContext.Provider
      value={{
        session,
        initializing,
        hasStoredSession,
        login,
        logout,
        restore,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
