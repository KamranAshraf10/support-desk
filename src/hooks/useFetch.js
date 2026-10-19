import { useCallback, useEffect, useState } from 'react';

/**
 * Small data-fetching hook: { data, loading, error, reload, setData }.
 *
 * - Re-runs whenever `deps` change.
 * - Cancels the previous request with AbortController, so a slow old response
 *   can never overwrite newer data (e.g. typing fast in the search box).
 * - Keeps the previous `data` while reloading, so lists don't flash empty.
 *
 * In a bigger app I'd use TanStack Query for caching; for this scope a hook is enough
 * and keeps the data flow easy to follow.
 */
export function useFetch(fetcher, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));

    fetcher(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (error?.name === 'AbortError' || controller.signal.aborted) return;
        setState((s) => ({ ...s, loading: false, error }));
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const setData = useCallback(
    (updater) =>
      setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })),
    [],
  );

  return { ...state, reload, setData };
}
