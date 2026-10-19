import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingState } from '../components/States';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from './AuthContext';

/** Guards every page except /login. Remembers where the user was going. */
export default function ProtectedRoute() {
  const { status } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (status === 'checking') {
    return (
      <div className="fullpage">
        <LoadingState label={t('login.checking')} />
      </div>
    );
  }
  if (status === 'guest') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
