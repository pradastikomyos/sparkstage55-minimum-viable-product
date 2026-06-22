import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type ProtectedRouteProps = {
  children: React.ReactNode;
  /** When true, also requires the user to have the 'admin' role. */
  adminOnly?: boolean;
  /** Optional explicit list of profile roles allowed to access this route. */
  allowedRoles?: string[];
};

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated' | 'unauthorized';

/**
 * Guards a route behind Supabase auth.
 * - Unauthenticated users are redirected to /login with returnTo state.
 * - adminOnly routes additionally check the profiles.role column.
 * - allowedRoles can be used for role-specific areas such as Owner.
 */
export function ProtectedRoute({ children, adminOnly = false, allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const [status, setStatus] = useState<AuthStatus>('checking');

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setStatus('unauthenticated');
      return;
    }

    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const session = data.session;

      if (!session) {
        setStatus('unauthenticated');
        return;
      }

      const rolesToCheck = allowedRoles ?? (adminOnly ? ['admin'] : null);

      if (!rolesToCheck) {
        setStatus('authenticated');
        return;
      }

      // Check role from profiles.
      const { data: profile } = await supabase!
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!active) return;
      setStatus(profile?.role && rolesToCheck.includes(profile.role) ? 'authenticated' : 'unauthorized');
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setStatus('unauthenticated');
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [adminOnly, allowedRoles]);

  if (status === 'checking') {
    return (
      <main className="admin-page">
        <section className="admin-panel">
          <p className="admin-eyebrow">Spark Stage</p>
          <h1>Mengecek sesi...</h1>
        </section>
      </main>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ returnTo: location.pathname + location.search }}
      />
    );
  }

  if (status === 'unauthorized') {
    return (
      <Navigate to="/" replace />
    );
  }

  return <>{children}</>;
}
