import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AUTH_MODE = (import.meta.env.VITE_AUTH_MODE as string | undefined) || 'supabase';
const useSupabase = !!supabase && AUTH_MODE !== 'local';

type AuthContextType = {
  user: { id: string; email?: string | null } | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInLocal?: (email: string) => void;
};

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, signOut: async () => {}, signInLocal: undefined });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthContextType['user']>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadSupabase() {
      setLoading(true);
      try {
        const session = await supabase?.auth.getSession();
        if (mounted) setUser(session?.data.session?.user ? { id: session.data.session.user.id, email: session.data.session.user.email } : null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    function loadLocal() {
      setLoading(true);
      const email = localStorage.getItem('localUserEmail');
      setUser(email ? { id: `local:${email}`, email } : null);
      setLoading(false);
    }

    if (useSupabase) {
      loadSupabase();
    } else {
      loadLocal();
    }

    const { data: sub } = useSupabase
      ? supabase?.auth.onAuthStateChange((_event, session) => {
          setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
        }) || { data: { subscription: { unsubscribe() {} } } }
      : { data: { subscription: { unsubscribe() {} } } };
    return () => {
      // @ts-ignore
      sub?.subscription?.unsubscribe?.();
      mounted = false;
    };
  }, []);

  async function signOut() {
    if (useSupabase) {
      await supabase?.auth.signOut();
    } else {
      localStorage.removeItem('localUserEmail');
      setUser(null);
    }
  }

  function signInLocal(email: string) {
    if (!useSupabase) {
      localStorage.setItem('localUserEmail', email);
      setUser({ id: `local:${email}`, email });
    }
  }

  return <AuthContext.Provider value={{ user, loading, signOut, signInLocal }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}