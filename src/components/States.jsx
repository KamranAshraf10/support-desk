import { useLanguage } from '../i18n/LanguageContext';
import { errorMessage } from '../utils/errors';
import Icon from './Icon';

/** Every place that talks to the API uses these three, so no screen is ever blank. */

export function Spinner({ size = 'md' }) {
  return <span className={`spinner spinner-${size}`} aria-hidden="true" />;
}

export function LoadingState({ label }) {
  const { t } = useLanguage();
  return (
    <div className="state" role="status" aria-live="polite">
      <Spinner size="lg" />
      <p className="state-text">{label || t('common.loading')}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry, title }) {
  const { t } = useLanguage();
  return (
    <div className="state state-error" role="alert">
      <span className="state-icon">
        <Icon name="alert" size={28} />
      </span>
      <h2 className="state-title">{title || t('errors.title')}</h2>
      <p className="state-text">{errorMessage(error, t)}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          {t('errors.retry')}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="state">
      <span className="state-icon">
        <Icon name="inbox" size={28} />
      </span>
      <h2 className="state-title">{title}</h2>
      {text && <p className="state-text">{text}</p>}
      {action}
    </div>
  );
}

export function Alert({ type = 'error', children, onClose }) {
  const { t } = useLanguage();
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon name={type === 'success' ? 'check' : 'alert'} />
      <div className="alert-body">{children}</div>
      {onClose && (
        <button type="button" className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
}
