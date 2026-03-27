import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TaskFilters } from '../types';

const FILTER_KEYS = ['search', 'status', 'priority'] as const;
type StringFilterKey = typeof FILTER_KEYS[number];

export function useFilterParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: TaskFilters = {
    search: searchParams.get('search') || undefined,
    status: searchParams.get('status') || undefined,
    priority: searchParams.get('priority') || undefined,
  };

  const setFilters = useCallback(
    (updater: TaskFilters | ((prev: TaskFilters) => TaskFilters)) => {
      setSearchParams((prev) => {
        const currentFilters: TaskFilters = {
          search: prev.get('search') || undefined,
          status: prev.get('status') || undefined,
          priority: prev.get('priority') || undefined,
        };

        const next = typeof updater === 'function' ? updater(currentFilters) : updater;
        const params = new URLSearchParams(prev);

        for (const key of FILTER_KEYS) {
          const val = next[key as StringFilterKey];
          if (val) {
            params.set(key, val);
          } else {
            params.delete(key);
          }
        }

        // replace: true avoids polluting browser history on every filter change
        return params;
      }, { replace: true });
    },
    [setSearchParams],
  );

  return { filters, setFilters } as const;
}
