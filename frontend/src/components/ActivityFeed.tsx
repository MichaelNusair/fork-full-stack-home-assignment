import { useState, useCallback, useMemo } from 'react';
import { useActivities } from '../hooks/useActivities';
import { ActivityLog, ActivityFilters, ActivityAction } from '../types';

const ACTION_LABELS: Record<ActivityAction, string> = {
  TASK_CREATED: 'created a task',
  TASK_UPDATED: 'updated a task',
  TASK_DELETED: 'deleted a task',
  COMMENT_ADDED: 'added a comment',
  COMMENT_DELETED: 'deleted a comment',
};

const ACTION_ICONS: Record<ActivityAction, string> = {
  TASK_CREATED: '+',
  TASK_UPDATED: '~',
  TASK_DELETED: '×',
  COMMENT_ADDED: '+',
  COMMENT_DELETED: '×',
};

const ACTION_COLORS: Record<ActivityAction, string> = {
  TASK_CREATED: 'bg-green-100 text-green-700',
  TASK_UPDATED: 'bg-blue-100 text-blue-700',
  TASK_DELETED: 'bg-red-100 text-red-700',
  COMMENT_ADDED: 'bg-purple-100 text-purple-700',
  COMMENT_DELETED: 'bg-gray-100 text-gray-700',
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function buildDescription(entry: ActivityLog): string {
  const userName = entry.user.name || entry.user.username;
  const label = ACTION_LABELS[entry.action] || entry.action;

  let detail = '';
  if (entry.metadata) {
    try {
      const meta = JSON.parse(entry.metadata);
      if (meta.title) detail = ` "${meta.title}"`;
      if (meta.preview) detail = `: "${meta.preview}"`;
    } catch {
      // metadata not parseable, skip
    }
  }

  return `${userName} ${label}${detail}`;
}

function buildChangeSummary(entry: ActivityLog): string | null {
  if (entry.action !== 'TASK_UPDATED' || !entry.metadata) return null;
  try {
    const meta = JSON.parse(entry.metadata);
    if (!meta.changes || Object.keys(meta.changes).length === 0) return null;
    return Object.entries(meta.changes as Record<string, { from: unknown; to: unknown }>)
      .map(([field, { from, to }]) => `${field}: ${from ?? '(empty)'} → ${to ?? '(empty)'}`)
      .join(', ');
  } catch {
    return null;
  }
}

const ALL_ACTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All actions' },
  { value: 'TASK_CREATED', label: 'Task created' },
  { value: 'TASK_UPDATED', label: 'Task updated' },
  { value: 'TASK_DELETED', label: 'Task deleted' },
  { value: 'COMMENT_ADDED', label: 'Comment added' },
  { value: 'COMMENT_DELETED', label: 'Comment deleted' },
];

export const ActivityFeed = () => {
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filters = useMemo<ActivityFilters>(() => ({
    action: actionFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  }), [actionFilter, startDate, endDate]);

  const { activities, loading, error, pagination, setPage } = useActivities(filters);

  const handleClearFilters = useCallback(() => {
    setActionFilter('');
    setStartDate('');
    setEndDate('');
  }, []);

  const hasActiveFilters = actionFilter || startDate || endDate;

  if (loading && activities.length === 0) {
    return <div className="p-4 text-gray-500">Loading activity...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ALL_ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-xs text-gray-500 hover:text-gray-700 underline pb-1.5"
          >
            Clear filters
          </button>
        )}
      </div>

      {activities.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <p className="text-lg mb-1">No activity found</p>
          <p className="text-sm">Actions like creating tasks and adding comments will appear here.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {activities.map((entry) => (
            <ActivityEntry key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-gray-600">
            Showing {activities.length} of {pagination.total} entries
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function ActivityEntry({ entry }: { entry: ActivityLog }) {
  const icon = ACTION_ICONS[entry.action] || '•';
  const colorClass = ACTION_COLORS[entry.action] || 'bg-gray-100 text-gray-700';
  const description = buildDescription(entry);
  const changeSummary = buildChangeSummary(entry);

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium ${colorClass}`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{description}</p>
        {changeSummary && (
          <p className="text-xs text-gray-500 mt-0.5">{changeSummary}</p>
        )}
      </div>
      <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
        {formatRelativeTime(entry.createdAt)}
      </span>
    </div>
  );
}
