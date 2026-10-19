import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * One-time success messages passed through navigation state,
 * e.g. navigate('/tickets/5', { state: { flash: { key: 'flash.created', vars } } }).
 * The state is cleared right away so a page refresh doesn't show it again.
 */
export function useFlash() {
  const location = useLocation();
  const navigate = useNavigate();
  const [flash, setFlash] = useState(() => location.state?.flash ?? null);

  useEffect(() => {
    if (location.state?.flash) {
      setFlash(location.state.flash);
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }
  }, [location, navigate]);

  return [flash, () => setFlash(null)];
}
