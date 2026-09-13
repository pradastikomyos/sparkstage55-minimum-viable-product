import { FormEvent, useMemo, useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { ViewIcon, ViewOffIcon } from '@hugeicons/core-free-icons';
import { BrandLogo } from '../components/ui/BrandLogo';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getUserRole, resolvePostLoginPath } from '../services/auth';
import { useSiteAssets } from '../hooks/useSiteAssets';

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { assetMap, isReady } = useSiteAssets();
  const editorialSrc = isReady ? assetMap['login.editorial'] : null;
  const navigate = useNavigate();
  const location = useLocation();
  const isSignup = mode === 'signup';
  const requestedRedirect = useMemo(() => {
    const queryRedirect = new URLSearchParams(location.search).get('redirect');
    const stateRedirect = (location.state as { returnTo?: unknown } | null)?.returnTo;
    return queryRedirect ?? (typeof stateRedirect === 'string' ? stateRedirect : null);
  }, [location.search, location.state]);

  useEffect(() => { document.title = 'Spark Stage - Log In or Sign Up'; }, []);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return;

    let active = true;

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!active || error || !data.session) return;

      const role = await getUserRole(data.session.user.id);
      if (active) navigate(resolvePostLoginPath(role, requestedRedirect), { replace: true });
    }).catch((error: unknown) => {
      if (active) setAuthError(error instanceof Error ? error.message : 'Google authentication failed.');
    });

    return () => { active = false; };
  }, [navigate, requestedRedirect]);

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    setStatusMessage(null);

    if (!supabase || !isSupabaseConfigured) {
      setAuthError('Supabase env belum tersedia.');
      return;
    }

    setIsSubmitting(true);

    try {
      let userId: string | undefined;

      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;
        userId = data.user?.id;
        setStatusMessage('Account created. You can continue.');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        userId = data.user?.id;
      }

      const role = userId ? await getUserRole(userId) : null;
      navigate(resolvePostLoginPath(role, requestedRedirect));
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const signInWithGoogle = async () => {
    setAuthError(null);
    setStatusMessage(null);

    if (!supabase || !isSupabaseConfigured) {
      setAuthError('Supabase env belum tersedia.');
      return;
    }

    setIsSubmitting(true);

    try {
      const callbackUrl = new URL('/login', window.location.origin);
      if (requestedRedirect) callbackUrl.searchParams.set('redirect', requestedRedirect);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callbackUrl.toString() },
      });

      if (error) throw error;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Google authentication failed.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <header className="login-logo">
          <Link to="/" className="login-back-btn" aria-label="Back to homepage" title="Back to homepage">
            &#8592;
          </Link>
          <Link to="/" aria-label="Spark Stage home"><BrandLogo /></Link>
        </header>
        <main className="login-form-area">
          <h2 className="login-heading">LOG IN OR SIGN UP</h2>
          <form className="login-form" onSubmit={submitAuth}>
            <div className="field">
              <label htmlFor="email">E-MAIL</label>
              <input
                type="email"
                id="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="field field-password">
              <label htmlFor="password">{isSignup ? 'CREATE PASSWORD' : 'PASSWORD'}</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>
                  <HugeiconsIcon icon={showPassword ? ViewOffIcon : ViewIcon} size={22} strokeWidth={1.5} />
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="btn-continue"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'PLEASE WAIT' : isSignup ? 'CREATE ACCOUNT' : 'LOG IN'}
            </button>
            {authError ? <p className="login-message login-message-error">{authError}</p> : null}
            {statusMessage ? <p className="login-message login-message-success">{statusMessage}</p> : null}
            <p className="toggle-text">
              {isSignup ? 'Sudah punya akun? ' : 'Belum punya akun? '}
              <button type="button" className="toggle-link" onClick={() => {
                setMode(isSignup ? 'login' : 'signup');
                setShowPassword(false);
                setPassword('');
                setAuthError(null);
                setStatusMessage(null);
              }}>{isSignup ? 'Masuk' : 'Daftar'}</button>
            </p>
            <div className="login-divider" aria-hidden="true"><span>ATAU</span></div>
            <button
              type="button"
              className="btn-sso"
              onClick={signInWithGoogle}
              disabled={isSubmitting}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.715v2.258h2.909c1.702-1.567 2.684-3.875 2.684-6.614Z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.181l-2.909-2.258c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.585-5.037-3.715H.956v2.332A9 9 0 0 0 9 18Z" />
                <path fill="#FBBC05" d="M3.963 10.705A5.41 5.41 0 0 1 3.682 9c0-.592.102-1.167.281-1.705V4.963H.956A9 9 0 0 0 0 9c0 1.452.347 2.826.956 4.037l3.007-2.332Z" />
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.507.454 3.441 1.346l2.581-2.581C13.464.892 11.426 0 9 0A9 9 0 0 0 .956 4.963l3.007 2.332C4.672 5.165 6.656 3.58 9 3.58Z" />
              </svg>
              CONTINUE WITH GOOGLE
            </button>
          </form>
        </main>
        <footer className="login-help"><button type="button" className="inline-link is-placeholder" aria-disabled="true" data-ui="placeholder">HELP</button></footer>
      </div>
      <div className="login-right">
        {editorialSrc ? (
          <img src={editorialSrc} alt="Fashion Editorial" />
        ) : (
          <div className="login-editorial-skeleton" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
