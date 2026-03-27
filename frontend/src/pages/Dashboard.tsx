import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TaskList } from '../components/TaskList';
import { KanbanBoard } from '../components/KanbanBoard';
import { TaskForm } from '../components/TaskForm';
import { ActivityFeed } from '../components/ActivityFeed';
import { useAuth } from '../hooks/useAuth';
import { useFilterParams } from '../hooks/useFilterParams';
import { useDebounce } from '../hooks/useDebounce';
import { CreateTaskInput, Task, TaskFilters, SavedFilterPreset, ViewMode } from '../types';
import { api } from '../services/api';

const STORAGE_KEY = 'taskmanager_saved_filters';
const VIEW_MODE_KEY = 'taskmanager_view_mode';

function loadPresets(): SavedFilterPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistPresets(presets: SavedFilterPreset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

function loadViewMode(): ViewMode {
  const stored = localStorage.getItem(VIEW_MODE_KEY);
  return stored === 'board' ? 'board' : 'list';
}

type Tab = 'tasks' | 'activity';

export const Dashboard = () => {
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('tasks');
  const [viewMode, setViewMode] = useState<ViewMode>(loadViewMode);
  const [presets, setPresets] = useState<SavedFilterPreset[]>(loadPresets);
  const [showPresetInput, setShowPresetInput] = useState(false);
  const [presetName, setPresetName] = useState('');
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { filters, setFilters } = useFilterParams();

  const debouncedSearch = useDebounce(filters.search, 300);

  const taskFilters = useMemo<TaskFilters>(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );

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
  }, [setFilters]);

  const handlePriorityFilter = useCallback((priority: string) => {
    setFilters((prev) => ({
      ...prev,
      priority: prev.priority === priority ? undefined : priority,
    }));
  }, [setFilters]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({ ...prev, search: value || undefined }));
  }, [setFilters]);

  const handleClearFilters = useCallback(() => {
    setFilters({});
  }, [setFilters]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  }, []);

  const handleSavePreset = useCallback(() => {
    const name = presetName.trim();
    if (!name) return;
    const preset: SavedFilterPreset = {
      id: Date.now().toString(36),
      name,
      filters: { search: filters.search, status: filters.status, priority: filters.priority },
    };
    const updated = [...presets, preset];
    setPresets(updated);
    persistPresets(updated);
    setPresetName('');
    setShowPresetInput(false);
  }, [presetName, filters, presets]);

  const handleApplyPreset = useCallback((preset: SavedFilterPreset) => {
    setFilters(preset.filters);
  }, [setFilters]);

  const handleDeletePreset = useCallback((id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    persistPresets(updated);
  }, [presets]);

  const hasActiveFilters = filters.search || filters.status || filters.priority;

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
          <div className="flex items-center border-b mb-4">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === 'tasks'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === 'activity'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Activity
            </button>
          </div>

          {activeTab === 'tasks' && (
            <>
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={filters.search || ''}
                      onChange={handleSearchChange}
                      className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-56"
                    />
                    <div className="flex border rounded-md overflow-hidden shrink-0">
                      <button
                        onClick={() => handleViewModeChange('list')}
                        title="List view"
                        className={`px-2.5 py-1.5 text-sm transition-colors ${
                          viewMode === 'list'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleViewModeChange('board')}
                        title="Board view"
                        className={`px-2.5 py-1.5 text-sm transition-colors border-l ${
                          viewMode === 'board'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-400 font-medium">Status:</span>
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

                    <span className="text-gray-300">|</span>

                    <span className="text-xs text-gray-400 font-medium">Priority:</span>
                    {(['LOW', 'MEDIUM', 'HIGH'] as const).map((priority) => (
                      <button
                        key={priority}
                        onClick={() => handlePriorityFilter(priority)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          filters.priority === priority
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {priority}
                      </button>
                    ))}

                    {hasActiveFilters && (
                      <button
                        onClick={handleClearFilters}
                        className="text-xs text-gray-500 hover:text-gray-700 underline"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {presets.map((preset) => (
                    <span
                      key={preset.id}
                      className="inline-flex items-center gap-1 bg-gray-50 border rounded-full px-3 py-1 text-xs"
                    >
                      <button
                        onClick={() => handleApplyPreset(preset)}
                        className="text-gray-700 hover:text-blue-600"
                      >
                        {preset.name}
                      </button>
                      <button
                        onClick={() => handleDeletePreset(preset.id)}
                        className="text-gray-400 hover:text-red-500 ml-1"
                        title="Remove preset"
                      >
                        &times;
                      </button>
                    </span>
                  ))}

                  {hasActiveFilters && !showPresetInput && (
                    <button
                      onClick={() => setShowPresetInput(true)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Save filter
                    </button>
                  )}

                  {showPresetInput && (
                    <span className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="Preset name..."
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                        className="border rounded px-2 py-1 text-xs w-32 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={handleSavePreset}
                        className="text-xs text-green-600 hover:text-green-700 font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setShowPresetInput(false); setPresetName(''); }}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Cancel
                      </button>
                    </span>
                  )}
                </div>
              </div>

              {viewMode === 'list' ? (
                <TaskList key={refreshKey} filters={taskFilters} />
              ) : (
                <KanbanBoard key={refreshKey} filters={taskFilters} />
              )}
            </>
          )}

          {activeTab === 'activity' && <ActivityFeed />}
        </div>
      </main>
    </div>
  );
};
