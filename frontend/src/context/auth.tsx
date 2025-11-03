import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type AuthContextType = {
  user: { id: string; email?: string | null } | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthContextType['user']>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const session = await supabase?.auth.getSession();
        if (mounted) setUser(session?.data.session?.user ? { id: session.data.session.user.id, email: session.data.session.user.email } : null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    const { data: sub } = supabase?.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
    }) || { data: { subscription: { unsubscribe() {} } } };
    return () => {
      // @ts-ignore
      sub?.subscription?.unsubscribe?.();
      mounted = false;
    };
  }, []);

  async function signOut() {
    await supabase?.auth.signOut();
  }

  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}