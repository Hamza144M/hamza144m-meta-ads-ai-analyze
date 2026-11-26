"use client";

import { onAuthStateChanged, signOut as fbSignOut, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { firebaseEnabled, getFirebaseAuth } from "@/lib/firebase";

interface AuthState {
  enabled: boolean;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({ enabled: false, user: null, loading: false, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(firebaseEnabled);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return setLoading(false);
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const signOut = async () => {
    const auth = getFirebaseAuth();
    if (auth) await fbSignOut(auth);
  };

  return <AuthContext.Provider value={{ enabled: firebaseEnabled, user, loading, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
