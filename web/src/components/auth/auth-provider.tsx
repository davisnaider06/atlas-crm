"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import { clerkEnabled, CLERK_SIGNOUT_FLAG } from "@/components/auth/clerk-provider";
import type { AuthResponse, RegisterPayload } from "@/lib/types";

type AuthContextValue = {
  user: AuthResponse | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  adoptSession: (response: AuthResponse) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "atlascrm.auth";

type StoredAuth = {
  token: string;
  user: AuthResponse;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as StoredAuth;
      setUser(parsed.user);
      setToken(parsed.token);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleRefresh = (event: Event) => {
      const customEvent = event as CustomEvent<AuthResponse>;
      setUser(customEvent.detail);
      setToken(customEvent.detail.accessToken);
    };

    const handleLogout = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener("atlascrm:auth:refresh", handleRefresh);
    window.addEventListener("atlascrm:auth:logout", handleLogout);

    return () => {
      window.removeEventListener("atlascrm:auth:refresh", handleRefresh);
      window.removeEventListener("atlascrm:auth:logout", handleLogout);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.login(email, password);
    setUser(response);
    setToken(response.accessToken);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: response.accessToken, user: response }),
    );
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const response = await api.register(payload);
    setUser(response);
    setToken(response.accessToken);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: response.accessToken, user: response }),
    );
  }, []);

  /** Adota uma sessão já autenticada (ex.: troca de token via Clerk). */
  const adoptSession = useCallback((response: AuthResponse) => {
    setUser(response);
    setToken(response.accessToken);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: response.accessToken, user: response }),
    );
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    window.localStorage.removeItem(STORAGE_KEY);
    if (clerkEnabled) {
      window.localStorage.setItem(CLERK_SIGNOUT_FLAG, "1");
      window.dispatchEvent(new Event("atlascrm:clerk:signout"));
    }
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, register, adoptSession, logout }),
    [adoptSession, loading, login, logout, register, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth precisa estar dentro de AuthProvider.");
  }

  return context;
}
