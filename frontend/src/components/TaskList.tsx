import React, { useState, useCallback } from 'react';
import { useTasks } from '../hooks/useTasks';
import { Task, TaskFilters, UpdateTaskInput } from '../types';

interface TaskListProps {
  filters: TaskFilters;
}

export const TaskList = React.memo(({ filters }: TaskListProps) => {
  const { tasks, loading, error, pagination, deleteTask, updateTask, setPage } = useTasks(filters);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<UpdateTaskInput>({});

  const handleEditClick = useCallback((task: Task) => {
    setEditingId(task.id);
    setEditFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
    });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditFormData({});
  }, []);

  const handleSaveEdit = useCallback(async (taskId: string) => {
    try {
      await updateTask(taskId, editFormData);
      setEditingId(null);
      setEditFormData({});
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  }, [updateTask, editFormData]);

  const handleDelete = useCallback(async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteTask(taskId);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }, [deleteTask]);

  const handleInputChange = useCallback((field: string, value: string) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  if (loading) {
    return <div className="p-4 text-gray-500">Loading tasks...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p className="text-lg mb-1">No tasks found</p>
        <p className="text-sm">Create a new task to get started.</p>
      </div>
    );
  }

  const priorityColor: Record<string, string> = {
    HIGH: 'bg-red-100 text-red-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-green-100 text-green-800',
  };

  const statusColor: Record<string, string> = {
    TODO: 'bg-gray-100 text-gray-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    DONE: 'bg-green-100 text-green-800',
  };

  return (
    <div className="space-y-4">
      {tasks.map((task: Task) => (
        <div
          key={task.id}
          className="border rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          {editingId === task.id ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={editFormData.title || ''}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={editFormData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={editFormData.status || ''}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={editFormData.priority || ''}
                    onChange={(e) => handleInputChange('priority', e.target.value)}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveEdit(task.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg">{task.title}</h3>
                {task.description && (
                  <p className="text-gray-600 mt-1 whitespace-pre-wrap break-words">{task.description}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor[task.status] || ''}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${priorityColor[task.priority] || ''}`}>
                    {task.priority}
                  </span>
                </div>
                {task.user && (
                  <p className="text-xs text-gray-400 mt-2">
                    Created by {task.user.name || task.user.username}
                  </p>
                )}
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                <button
                  onClick={() => handleEditClick(task)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(task.id)}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-gray-600">
            Showing {tasks.length} of {pagination.total} tasks
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
});

TaskList.displayName = 'TaskList';
