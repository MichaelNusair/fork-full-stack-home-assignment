import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Task, TaskFilters, CreateTaskInput, UpdateTaskInput, PaginatedResponse } from '../types';

interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  pagination: { page: number; limit: number; total: number; totalPages: number } | null;
  createTask: (taskData: CreateTaskInput) => Promise<Task>;
  updateTask: (id: string, taskData: UpdateTaskInput) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
  setPage: (page: number) => void;
}

export const useTasks = (filters?: TaskFilters): UseTasksReturn => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(filters?.page || 1);
  const [pagination, setPagination] = useState<UseTasksReturn['pagination']>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.priority) params.set('priority', filters.priority);
      params.set('page', String(page));
      if (filters?.limit) params.set('limit', String(filters.limit));

      const data = await api.get<PaginatedResponse<Task>>(`/tasks?${params.toString()}`);
      setTasks(data.tasks);
      setPagination(data.pagination);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch tasks';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters?.search, filters?.status, filters?.priority, filters?.limit, page]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    setPage(1);
  }, [filters?.search, filters?.status, filters?.priority]);

  const createTask = useCallback(async (taskData: CreateTaskInput): Promise<Task> => {
    const newTask = await api.post<Task>('/tasks', taskData);
    await fetchTasks();
    return newTask;
  }, [fetchTasks]);

  const updateTask = useCallback(async (id: string, taskData: UpdateTaskInput): Promise<Task> => {
    const updatedTask = await api.put<Task>(`/tasks/${id}`, taskData);
    setTasks((prev) => prev.map((task) => (task.id === id ? updatedTask : task)));
    return updatedTask;
  }, []);

  const deleteTask = useCallback(async (id: string): Promise<void> => {
    await api.delete(`/tasks/${id}`);
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }, []);

  return {
    tasks,
    loading,
    error,
    pagination,
    createTask,
    updateTask,
    deleteTask,
    refetch: fetchTasks,
    setPage,
  };
};
