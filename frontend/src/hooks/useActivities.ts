import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { ActivityLog, ActivityFilters, PaginatedActivityResponse } from '../types';

interface UseActivitiesReturn {
  activities: ActivityLog[];
  loading: boolean;
  error: string | null;
  pagination: { page: number; limit: number; total: number; totalPages: number } | null;
  refetch: () => Promise<void>;
  setPage: (page: number) => void;
}

export const useActivities = (filters?: ActivityFilters): UseActivitiesReturn => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(filters?.page || 1);
  const [pagination, setPagination] = useState<UseActivitiesReturn['pagination']>(null);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filters?.action) params.set('action', filters.action);
      if (filters?.entityType) params.set('entityType', filters.entityType);
      if (filters?.entityId) params.set('entityId', filters.entityId);
      if (filters?.startDate) params.set('startDate', filters.startDate);
      if (filters?.endDate) params.set('endDate', filters.endDate);
      params.set('page', String(page));
      if (filters?.limit) params.set('limit', String(filters.limit));

      const data = await api.get<PaginatedActivityResponse>(`/activities?${params.toString()}`);
      setActivities(data.activities);
      setPagination(data.pagination);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch activities';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters?.action, filters?.entityType, filters?.entityId, filters?.startDate, filters?.endDate, filters?.limit, page]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    setPage(1);
  }, [filters?.action, filters?.entityType, filters?.startDate, filters?.endDate]);

  return {
    activities,
    loading,
    error,
    pagination,
    refetch: fetchActivities,
    setPage,
  };
};
