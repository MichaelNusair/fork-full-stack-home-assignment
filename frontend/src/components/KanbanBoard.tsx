import React, { useMemo, useState, useCallback } from 'react';
import { useTasks } from '../hooks/useTasks';
import { Task, TaskFilters, TaskStatus, UpdateTaskInput } from '../types';
import { KanbanColumn } from './KanbanColumn';

const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

const BOARD_LIMIT = 100;

interface KanbanBoardProps {
  filters: TaskFilters;
}

export const KanbanBoard = React.memo(({ filters }: KanbanBoardProps) => {
  const boardFilters = useMemo<TaskFilters>(
    () => ({ ...filters, limit: BOARD_LIMIT }),
    [filters],
  );

  const { tasks, loading, error, updateTask, deleteTask, refetch } = useTasks(boardFilters);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState<UpdateTaskInput>({});
  const [moveError, setMoveError] = useState<string | null>(null);

  const columns = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
    for (const task of tasks) {
      const bucket = grouped[task.status as TaskStatus];
      if (bucket) bucket.push(task);
    }
    return grouped;
  }, [tasks]);

  const handleDrop = useCallback(
    async (taskId: string, newStatus: TaskStatus) => {
      setMoveError(null);
      try {
        await updateTask(taskId, { status: newStatus });
      } catch {
        setMoveError('Failed to move task. Please try again.');
        await refetch();
      }
    },
    [updateTask, refetch],
  );

  const handleEditStart = useCallback((task: Task) => {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
    });
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editingTask) return;
    try {
      await updateTask(editingTask.id, editForm);
      setEditingTask(null);
      setEditForm({});
    } catch {
      setMoveError('Failed to update task.');
    }
  }, [editingTask, editForm, updateTask]);

  const handleEditCancel = useCallback(() => {
    setEditingTask(null);
    setEditForm({});
  }, []);

  const handleEditChange = useCallback((field: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleDelete = useCallback(
    async (taskId: string) => {
      try {
        await deleteTask(taskId);
      } catch {
        setMoveError('Failed to delete task.');
      }
    },
    [deleteTask],
  );

  if (loading) {
    return <div className="p-4 text-gray-500">Loading tasks...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  return (
    <div>
      {moveError && (
        <div className="mb-3 px-3 py-2 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
          {moveError}
        </div>
      )}

      {editingTask && (
        <div className="mb-4 p-4 bg-white border rounded-lg shadow-sm">
          <h4 className="text-sm font-semibold mb-3">Edit Task</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={editForm.title || ''}
                onChange={(e) => handleEditChange('title', e.target.value)}
                className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={editForm.description || ''}
                onChange={(e) => handleEditChange('description', e.target.value)}
                rows={2}
                className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editForm.status || ''}
                  onChange={(e) => handleEditChange('status', e.target.value)}
                  className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="DONE">Done</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={editForm.priority || ''}
                  onChange={(e) => handleEditChange('priority', e.target.value)}
                  className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleEditCancel}
                className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <p className="text-lg mb-1">No tasks found</p>
          <p className="text-sm">Create a new task to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={columns[status]}
              onDrop={handleDrop}
              onEditTask={handleEditStart}
              onDeleteTask={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
});

KanbanBoard.displayName = 'KanbanBoard';
