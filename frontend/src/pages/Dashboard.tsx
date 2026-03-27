import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TaskList } from '../components/TaskList';
import { TaskForm } from '../components/TaskForm';
import { useAuth } from '../hooks/useAuth';
import { CreateTaskInput, TaskFilters, Task } from '../types';
import { api } from '../services/api';

export const Dashboard = () => {
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleCreateTask = useCallback(async (taskData: CreateTaskInput) => {
    setCreating(true);
    try {
      await api.post<Task>('/tasks', taskData);
      setShowForm(false);
      setRefreshKey((k) => k + 1);
    } finally {
      setCreating(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const handleStatusFilter = useCallback((status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status === status ? undefined : status,
    }));
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({ ...prev, search: value || undefined }));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Task Manager</h1>
            {user && (
              <p className="text-sm text-gray-500 mt-0.5">
                Welcome, {user.name || user.username}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              {showForm ? 'Cancel' : 'New Task'}
            </button>
            <button
              onClick={handleLogout}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6">
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Create New Task</h2>
            <TaskForm onSubmit={handleCreateTask} isLoading={creating} />
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold">Tasks</h2>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Search tasks..."
                value={filters.search || ''}
                onChange={handleSearchChange}
                className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              />
              {(['TODO', 'IN_PROGRESS', 'DONE'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    filters.status === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
              {filters.status && (
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, status: undefined }))}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <TaskList key={refreshKey} filters={filters} />
        </div>
      </main>
    </div>
  );
};
