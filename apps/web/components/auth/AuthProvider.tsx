"use client";

import { onAuthStateChanged, signOut as fbSignOut, type User } from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { registerProfile, type Account } from "@/lib/api";
import { firebaseEnabled, getFirebaseAuth } from "@/lib/firebase";

interface AuthState {
  enabled: boolean;
  user: User | null;
  loading: boolean;
  /** Plan and today's usage for the signed-in user (null when unknown). */
  account: Account | null;
  refreshAccount: (name?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  enabled: false,
  user: null,
  loading: false,
  account: null,
  refreshAccount: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(firebaseEnabled);

  const refreshAccount = useCallback(async (name?: string) => {
    setAccount(await registerProfile(name));
  }, []);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return setLoading(false);
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) void refreshAccount(u.displayName ?? undefined);
      else setAccount(null);
    });
  }, [refreshAccount]);

  const signOut = async () => {
    const auth = getFirebaseAuth();
    if (auth) await fbSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ enabled: firebaseEnabled, user, loading, account, refreshAccount, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
