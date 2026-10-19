import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import { Ltr, PriorityBadge, StatusBadge } from '../components/Badges';
import Icon from '../components/Icon';
import Pagination from '../components/Pagination';
import { Alert, EmptyState, ErrorState, LoadingState, Spinner } from '../components/States';
import { useDebounce } from '../hooks/useDebounce';
import { useFetch } from '../hooks/useFetch';
import { useFlash } from '../hooks/useFlash';
import { useLanguage } from '../i18n/LanguageContext';
import { useMeta } from '../meta/MetaContext';

const DEFAULT_SORT = '-created_at';
const DEFAULT_PER_PAGE = 15;
const SORT_OPTIONS = [
  { value: '-created_at', key: 'sort.newest' },
  { value: 'created_at', key: 'sort.oldest' },
  { value: '-priority', key: 'sort.priorityDesc' },
  { value: 'priority', key: 'sort.priorityAsc' },
  { value: 'status', key: 'sort.status' },
];
const PER_PAGE_OPTIONS = [15, 25, 50];

/**
 * The URL is the single source of truth for search / filters / sort / page.
 * → links are shareable, refresh keeps your place, and Back/Forward work.
 */
export default function TicketListPage() {
  const { t, formatDate, formatNumber, localized } = useLanguage();
  const { statuses, priorities, categories, categoryName } = useMeta();
  const navigate = useNavigate();
  const [flash, clearFlash] = useFlash();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    q: searchParams.get('q') ?? '',
    status: searchParams.get('status') ?? '',
    priority: searchParams.get('priority') ?? '',
    category: searchParams.get('category') ?? '',
    sort: searchParams.get('sort') ?? DEFAULT_SORT,
    per_page: Number(searchParams.get('per_page')) || DEFAULT_PER_PAGE,
    page: Math.max(1, Number(searchParams.get('page')) || 1),
  };
  const hasFilters = Boolean(filters.q || filters.status || filters.priority || filters.category);

  /** Update URL params. Changing anything except the page sends you back to page 1. */
  const updateParams = (changes, { resetPage = true } = {}) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      const isDefault =
        value === '' ||
        value == null ||
        (key === 'sort' && value === DEFAULT_SORT) ||
        (key === 'per_page' && Number(value) === DEFAULT_PER_PAGE) ||
        (key === 'page' && Number(value) === 1);
      if (isDefault) next.delete(key);
      else next.set(key, String(value));
    });
    if (resetPage && !('page' in changes)) next.delete('page');
    setSearchParams(next);
  };

  // --- Debounced search: type freely, the request fires 400ms after you stop typing.
  const [searchInput, setSearchInput] = useState(filters.q);
  const debouncedSearch = useDebounce(searchInput, 400);

  useEffect(() => {
    // Keep the input in sync when the URL changes from outside (Back button, "Clear filters").
    setSearchInput(filters.q);
  }, [filters.q]);

  useEffect(() => {
    if (debouncedSearch !== filters.q) updateParams({ q: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // --- Fetch tickets whenever the URL query changes.
  const queryKey = searchParams.toString();
  const { data, loading, error, reload } = useFetch(
    (signal) =>
      api.listTickets(
        {
          q: filters.q.trim() || undefined,
          status: filters.status || undefined,
          priority: filters.priority || undefined,
          category: filters.category || undefined,
          sort: filters.sort,
          per_page: filters.per_page,
          page: filters.page,
        },
        signal,
      ),
    [queryKey],
  );

  const tickets = data?.data ?? [];
  const meta = data?.meta;
  const firstLoad = loading && !data;

  const summary = useMemo(() => {
    if (!meta || !meta.total) return null;
    return t('list.summary', {
      from: formatNumber(meta.from ?? 0),
      to: formatNumber(meta.to ?? 0),
      total: formatNumber(meta.total),
    });
  }, [meta, t, formatNumber]);

  const flashText = flash ? t(flash.key, flash.vars) : null;

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>{t('list.title')}</h1>
          {meta && (
            <p className="muted">{t('list.total', { total: formatNumber(meta.total ?? 0) })}</p>
          )}
        </div>
        <Link to="/tickets/new" className="btn btn-primary">
          <Icon name="plus" />
          {t('nav.newTicket')}
        </Link>
      </div>

      {flashText && (
        <Alert type="success" onClose={clearFlash}>
          {flashText}
        </Alert>
      )}

      {/* ---------- Toolbar: search + filters ---------- */}
      <form
        className="toolbar card"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          updateParams({ q: searchInput }); // Enter = search immediately, skip the debounce
        }}
      >
        <div className="search-box">
          <label htmlFor="search" className="sr-only">
            {t('list.searchLabel')}
          </label>
          <Icon name="search" className="search-icon" />
          <input
            id="search"
            type="search"
            className="input"
            placeholder={t('list.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            dir="auto"
          />
          {loading && data && (
            <span className="search-spinner">
              <Spinner size="sm" />
            </span>
          )}
        </div>

        <div className="filters">
          <FilterSelect
            id="f-status"
            label={t('filters.status')}
            value={filters.status}
            onChange={(v) => updateParams({ status: v })}
            allLabel={t('filters.all')}
            options={statuses.map((s) => ({ value: s.value, label: localized(s, 'label') }))}
          />
          <FilterSelect
            id="f-priority"
            label={t('filters.priority')}
            value={filters.priority}
            onChange={(v) => updateParams({ priority: v })}
            allLabel={t('filters.all')}
            options={priorities.map((p) => ({ value: p.value, label: localized(p, 'label') }))}
          />
          <FilterSelect
            id="f-category"
            label={t('filters.category')}
            value={filters.category}
            onChange={(v) => updateParams({ category: v })}
            allLabel={t('filters.all')}
            options={categories.map((c) => ({ value: String(c.id), label: categoryName(c) }))}
          />
          <div className="filter">
            <label htmlFor="f-sort" className="filter-label">
              {t('filters.sort')}
            </label>
            <select
              id="f-sort"
              className="input select"
              value={filters.sort}
              onChange={(e) => updateParams({ sort: e.target.value })}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {t(o.key)}
                </option>
              ))}
            </select>
          </div>
          <div className="filter filter-narrow">
            <label htmlFor="f-per-page" className="filter-label">
              {t('filters.perPage')}
            </label>
            <select
              id="f-per-page"
              className="input select"
              value={filters.per_page}
              onChange={(e) => updateParams({ per_page: Number(e.target.value) })}
            >
              {PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {formatNumber(n)}
                </option>
              ))}
            </select>
          </div>
          {hasFilters && (
            <button
              type="button"
              className="btn btn-link clear-btn"
              onClick={() => {
                setSearchInput('');
                updateParams({ q: '', status: '', priority: '', category: '' });
              }}
            >
              {t('filters.clear')}
            </button>
          )}
        </div>
      </form>

      {/* ---------- Results: loading / error / empty / table ---------- */}
      {firstLoad ? (
        <div className="card">
          <LoadingState label={t('list.loading')} />
        </div>
      ) : error ? (
        <div className="card">
          <ErrorState error={error} onRetry={reload} />
        </div>
      ) : tickets.length === 0 ? (
        <div className="card">
          {filters.page > 1 && meta?.total > 0 ? (
            <EmptyState
              title={t('list.outOfRange')}
              action={
                <button type="button" className="btn btn-secondary" onClick={() => updateParams({ page: 1 })}>
                  {t('list.firstPage')}
                </button>
              }
            />
          ) : (
            <EmptyState
              title={t('list.empty')}
              text={hasFilters ? t('list.emptyFiltered') : t('list.emptyNone')}
              action={
                hasFilters ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setSearchInput('');
                      updateParams({ q: '', status: '', priority: '', category: '' });
                    }}
                  >
                    {t('filters.clear')}
                  </button>
                ) : (
                  <Link to="/tickets/new" className="btn btn-primary">
                    {t('nav.newTicket')}
                  </Link>
                )
              }
            />
          )}
        </div>
      ) : (
        <div className={`card table-card ${loading ? 'is-refreshing' : ''}`} aria-busy={loading}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">{t('table.reference')}</th>
                  <th scope="col">{t('table.subject')}</th>
                  <th scope="col">{t('table.status')}</th>
                  <th scope="col">{t('table.priority')}</th>
                  <th scope="col" className="col-md">{t('table.category')}</th>
                  <th scope="col" className="col-lg">{t('table.requester')}</th>
                  <th scope="col" className="col-lg">{t('table.assignee')}</th>
                  <th scope="col" className="col-md">{t('table.created')}</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="row-link"
                    onClick={(e) => {
                      // Whole row is clickable, but the real <Link> keeps keyboard + middle-click working.
                      if (e.target.closest('a')) return;
                      navigate(`/tickets/${ticket.id}`);
                    }}
                  >
                    <td className="nowrap cell-ref">
                      <Ltr className="ref">{ticket.reference}</Ltr>
                    </td>
                    <td className="subject-cell">
                      <Link to={`/tickets/${ticket.id}`} dir="auto">
                        {ticket.subject}
                      </Link>
                    </td>
                    <td className="cell-status">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="cell-priority">
                      <PriorityBadge priority={ticket.priority} />
                    </td>
                    <td className="col-md">{categoryName(ticket.category)}</td>
                    <td className="col-lg" dir="auto">
                      {ticket.requester_name}
                    </td>
                    <td className="col-lg" dir="auto">
                      {ticket.assignee_name || <span className="muted">{t('common.unassigned')}</span>}
                    </td>
                    <td className="col-md cell-date nowrap muted">{formatDate(ticket.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-footer">
            {summary && <span className="muted">{summary}</span>}
            <Pagination
              meta={meta}
              disabled={loading}
              onChange={(page) => {
                updateParams({ page }, { resetPage: false });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function FilterSelect({ id, label, value, onChange, allLabel, options }) {
  return (
    <div className="filter">
      <label htmlFor={id} className="filter-label">
        {label}
      </label>
      <select id={id} className="input select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
