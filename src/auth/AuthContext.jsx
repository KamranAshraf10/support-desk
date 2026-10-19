import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setUnauthorizedHandler, tokenStore } from '../api/client';
import { api, unwrap } from '../api/endpoints';

/**
 * Auth state:
 *  - 'checking' → we have a stored token and are verifying it with GET /api/me
 *  - 'authed'   → logged in
 *  - 'guest'    → no valid token
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState(() => (tokenStore.get() ? 'checking' : 'guest'));
  const [user, setUser] = useState(null);
  // A message to show on the login screen (e.g. "session expired").
  const [notice, setNotice] = useState(null);

  // Any 401 from any request (with a token) lands here → clean logout + redirect.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStore.clear();
      setUser(null);
      setStatus('guest');
      setNotice('notice.sessionExpired');
      navigate('/login', { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate]);

  // On page load with a stored token, confirm it's still valid.
  useEffect(() => {
    if (status !== 'checking') return;
    let cancelled = false;
    api
      .me()
      .then((res) => {
        if (cancelled) return;
        setUser(unwrap(res)?.user ?? unwrap(res));
        setStatus('authed');
      })
      .catch((err) => {
        if (cancelled) return;
        // 401 is already handled by the unauthorized handler.
        // For network / server errors keep the token: pages will show their own error states.
        if (err.status !== 401) setStatus('authed');
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const login = useCallback(async (email, password) => {
    const res = await api.login(email, password); // throws ApiError (422 on bad credentials)
    tokenStore.set(res.token);
    setUser(res.user ?? null);
    setNotice(null);
    setStatus('authed');
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout(); // revoke the token on the server
    } catch {
      // Even if the server call fails, log out locally.
    }
    tokenStore.clear();
    setUser(null);
    setStatus('guest');
    setNotice('notice.loggedOut');
    navigate('/login', { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({ status, user, notice, login, logout, clearNotice: () => setNotice(null) }),
    [status, user, notice, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
