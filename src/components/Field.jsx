import { useLanguage } from '../i18n/LanguageContext';

/**
 * Label + control + error message, wired up for accessibility:
 * aria-invalid and aria-describedby point screen readers at the error text.
 *
 * `error` is either a string (from the server) or { key, vars } (client-side, translated here).
 */
export default function Field({ id, label, required, optional, error, hint, children }) {
  const { t } = useLanguage();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const message = error ? (typeof error === 'string' ? error : t(error.key, error.vars)) : null;
  const describedBy = [message && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`field ${message ? 'has-error' : ''}`}>
      <label htmlFor={id} className="field-label">
        {label}
        {required && (
          <span className="required" aria-hidden="true">
            {' '}*
          </span>
        )}
        {optional && <span className="optional"> ({t('form.optional')})</span>}
      </label>
      {children({ id, 'aria-invalid': message ? true : undefined, 'aria-describedby': describedBy, required })}
      {hint && !message && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      {message && (
        <p id={errorId} className="field-error">
          {message}
        </p>
      )}
    </div>
  );
}
