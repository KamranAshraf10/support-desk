import { useLanguage } from '../i18n/LanguageContext';
import Icon from './Icon';

/** Builds [1, '…', 4, 5, 6, '…', 12] style page lists. */
function pageItems(current, last) {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages = new Set([1, last, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
  const items = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) items.push(`gap-${p}`);
    items.push(p);
  });
  return items;
}

/** Driven entirely by the API's `meta` block (current_page, last_page). */
export default function Pagination({ meta, onChange, disabled }) {
  const { t, formatNumber } = useLanguage();
  if (!meta || meta.last_page <= 1) return null;
  const { current_page: current, last_page: last } = meta;

  return (
    <nav className="pagination" aria-label={t('pagination.label')}>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => onChange(current - 1)}
        disabled={disabled || current <= 1}
      >
        <Icon name="chevron" className="flip" />
        <span>{t('pagination.prev')}</span>
      </button>

      <ul className="pagination-pages">
        {pageItems(current, last).map((item) =>
          typeof item === 'string' ? (
            <li key={item} className="pagination-gap" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                className={`page-btn ${item === current ? 'is-current' : ''}`}
                aria-current={item === current ? 'page' : undefined}
                aria-label={t('pagination.goTo', { page: formatNumber(item) })}
                onClick={() => onChange(item)}
                disabled={disabled}
              >
                {formatNumber(item)}
              </button>
            </li>
          ),
        )}
      </ul>

      <span className="pagination-compact">
        {t('pagination.page', { current: formatNumber(current), last: formatNumber(last) })}
      </span>

      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => onChange(current + 1)}
        disabled={disabled || current >= last}
      >
        <span>{t('pagination.next')}</span>
        <Icon name="chevron" />
      </button>
    </nav>
  );
}
