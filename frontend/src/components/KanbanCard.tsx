import React, { useCallback } from 'react';
import { Task } from '../types';

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-green-100 text-green-800',
};

interface KanbanCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export const KanbanCard = React.memo(({ task, onEdit, onDelete }: KanbanCardProps) => {
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.dataTransfer.setData(
        'application/json',
        JSON.stringify({ taskId: task.id, fromStatus: task.status }),
      );
      e.dataTransfer.effectAllowed = 'move';
      (e.currentTarget as HTMLElement).style.opacity = '0.5';
    },
    [task.id, task.status],
  );

  const handleDragEnd = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
  }, []);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm('Are you sure you want to delete this task?')) {
        onDelete(task.id);
      }
    },
    [onDelete, task.id],
  );

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit(task);
    },
    [onEdit, task],
  );

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-sm text-gray-900 leading-snug break-words min-w-0">
          {task.title}
        </h4>
        <span
          className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${PRIORITY_COLORS[task.priority] ?? ''}`}
        >
          {task.priority}
        </span>
      </div>

      {task.description && (
        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 break-words">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-3">
        <span className="text-[11px] text-gray-400 truncate max-w-[60%]">
          {task.user ? (task.user.name || task.user.username) : ''}
        </span>

        <div className="flex gap-1 shrink-0">
          <button
            onClick={handleEdit}
            className="px-2 py-0.5 text-[11px] text-blue-600 hover:bg-blue-50 rounded transition-colors"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="px-2 py-0.5 text-[11px] text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
});

KanbanCard.displayName = 'KanbanCard';
