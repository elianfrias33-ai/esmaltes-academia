import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isConfigured, supabase } from '../../lib/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(isConfigured);

  useEffect(() => {
    if (!isConfigured) return undefined;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;
  useEffect(() => {
    if (!isConfigured) return undefined;
    if (!userId) { setProfile(null); return undefined; }
    let alive = true;
    setLoading(true);
    supabase.from('profiles').select('id, full_name, phone, country, role').eq('id', userId).maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        setProfile(data);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [userId]);

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    profile,
    setProfile,
    // only decides what the screen shows; the database enforces the real permission
    isAdmin: profile?.role === 'admin',
    loading,
    signOut: () => supabase.auth.signOut(),
  }), [session, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
