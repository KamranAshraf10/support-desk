import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import Icon from './Icon';

export function LanguageToggle() {
  const { t, toggleLang, lang } = useLanguage();
  return (
    <button
      type="button"
      className="btn btn-ghost lang-toggle"
      onClick={toggleLang}
      aria-label={t('nav.switchLanguage')}
      lang={lang === 'en' ? 'ar' : 'en'}
    >
      <Icon name="globe" />
      <span>{t('nav.otherLanguage')}</span>
    </button>
  );
}

export default function Layout() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();

  return (
    <div className="app">
      <a href="#main" className="skip-link">
        {t('app.skip')}
      </a>
      <header className="topbar">
        <div className="topbar-inner container">
          <Link to="/tickets" className="brand">
            <span className="brand-mark" aria-hidden="true">
              SD
            </span>
            <span>{t('app.title')}</span>
          </Link>

          <nav className="topnav">
            <NavLink to="/tickets" end className="topnav-link">
              {t('nav.tickets')}
            </NavLink>
          </nav>

          <div className="topbar-actions">
            <LanguageToggle />
            {user?.name && <span className="user-name">{user.name}</span>}
            <button type="button" className="btn btn-ghost" onClick={logout}>
              <Icon name="logout" />
              <span className="hide-sm">{t('nav.logout')}</span>
            </button>
          </div>
        </div>
      </header>

      <main id="main" className="container main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
