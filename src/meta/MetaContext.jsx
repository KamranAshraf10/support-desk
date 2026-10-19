import { createContext, useContext, useMemo } from 'react';
import { api, unwrap } from '../api/endpoints';
import { useFetch } from '../hooks/useFetch';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * Loads /api/meta (statuses, priorities + labels) and /api/categories once,
 * after login, and shares them with every page. Nothing enum-like is hard-coded.
 */
const MetaContext = createContext(null);

export function MetaProvider({ children }) {
  const { localized } = useLanguage();
  const { data, loading, error, reload } = useFetch(
    (signal) => Promise.all([api.meta(signal), api.categories(signal)]),
    [],
  );

  const value = useMemo(() => {
    const [meta, categoriesRes] = data || [];
    const statuses = meta?.statuses ?? [];
    const priorities = meta?.priorities ?? [];
    const categories = unwrap(categoriesRes) ?? [];

    const labelFrom = (list, code) => {
      const item = list.find((x) => x.value === code);
      // Fall back to a readable version of the raw code if meta failed to load.
      return item ? localized(item, 'label') : String(code ?? '').replace(/_/g, ' ');
    };

    return {
      loading,
      error,
      reload,
      statuses,
      priorities,
      categories,
      statusLabel: (code) => labelFrom(statuses, code),
      priorityLabel: (code) => labelFrom(priorities, code),
      categoryName: (cat) => (cat ? localized(cat, 'name') : '—'),
    };
  }, [data, loading, error, reload, localized]);

  return <MetaContext.Provider value={value}>{children}</MetaContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMeta() {
  const ctx = useContext(MetaContext);
  if (!ctx) throw new Error('useMeta must be used inside <MetaProvider>');
  return ctx;
}
