import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Field from '../components/Field';
import { LanguageToggle } from '../components/Layout';
import { Alert, Spinner } from '../components/States';
import { useLanguage } from '../i18n/LanguageContext';
import { errorMessage, mapServerErrors } from '../utils/errors';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { t } = useLanguage();
  const { status, login, notice, clearNotice } = useAuth();
  const location = useLocation();

  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authed') {
    const from = location.state?.from;
    return <Navigate to={from ? `${from.pathname}${from.search}` : '/tickets'} replace />;
  }

  const validate = (v) => {
    const e = {};
    if (!v.email.trim()) e.email = { key: 'validation.required' };
    else if (!EMAIL_RE.test(v.email.trim())) e.email = { key: 'validation.email' };
    if (!v.password) e.password = { key: 'validation.required' };
    return e;
  };

  const onChange = (event) => {
    const { name, value } = event.target;
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    clearNotice();
    setFormError(null);
    const clientErrors = validate(values);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;

    setSubmitting(true);
    try {
      await login(values.email.trim(), values.password);
      // Redirect happens via the `status === 'authed'` check above.
    } catch (err) {
      if (err.status === 422) {
        // Wrong credentials → server says which field is wrong (usually email).
        const { fieldErrors, unmatched } = mapServerErrors(err.errors, ['email', 'password']);
        setErrors(fieldErrors);
        if (unmatched.length || !Object.keys(fieldErrors).length) {
          setFormError(unmatched[0] || err.message);
        }
      } else {
        setFormError(errorMessage(err, t));
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-lang">
        <LanguageToggle />
      </div>
      <div className="login-card card">
        <div className="brand brand-lg">
          <span className="brand-mark" aria-hidden="true">
            SD
          </span>
          <span>{t('app.title')}</span>
        </div>
        <h1 className="login-title">{t('login.title')}</h1>
        <p className="muted">{t('login.subtitle')}</p>

        {notice && (
          <Alert type="info" onClose={clearNotice}>
            {t(notice)}
          </Alert>
        )}
        {formError && <Alert type="error">{formError}</Alert>}

        <form onSubmit={onSubmit} noValidate className="stack">
          <Field id="email" label={t('login.email')} required error={errors.email}>
            {(props) => (
              <input
                {...props}
                name="email"
                type="email"
                dir="ltr"
                autoComplete="email"
                className="input"
                value={values.email}
                onChange={onChange}
                disabled={submitting}
              />
            )}
          </Field>
          <Field id="password" label={t('login.password')} required error={errors.password}>
            {(props) => (
              <input
                {...props}
                name="password"
                type="password"
                dir="ltr"
                autoComplete="current-password"
                className="input"
                value={values.password}
                onChange={onChange}
                disabled={submitting}
              />
            )}
          </Field>

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting && <Spinner size="sm" />}
            {submitting ? t('login.submitting') : t('login.submit')}
          </button>
        </form>

        <button
          type="button"
          className="btn btn-link demo-btn"
          onClick={() => {
            setValues({ email: 'candidate@support.test', password: 'Password123!' });
            setErrors({});
          }}
          disabled={submitting}
        >
          {t('login.useDemo')}
        </button>
      </div>
    </div>
  );
}
