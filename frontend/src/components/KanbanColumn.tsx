import React, { useState, useCallback } from 'react';
import { Task, TaskStatus } from '../types';
import { KanbanCard } from './KanbanCard';

interface ColumnConfig {
  label: string;
  accent: string;
  bg: string;
  dropHighlight: string;
}

const COLUMN_STYLES: Record<TaskStatus, ColumnConfig> = {
  TODO: {
    label: 'To Do',
    accent: 'border-t-gray-400',
    bg: 'bg-gray-50',
    dropHighlight: 'bg-gray-100 border-gray-400',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    accent: 'border-t-blue-500',
    bg: 'bg-blue-50/40',
    dropHighlight: 'bg-blue-100 border-blue-400',
  },
  DONE: {
    label: 'Done',
    accent: 'border-t-green-500',
    bg: 'bg-green-50/40',
    dropHighlight: 'bg-green-100 border-green-400',
  },
};

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onDrop: (taskId: string, newStatus: TaskStatus) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export const KanbanColumn = React.memo(
  ({ status, tasks, onDrop, onEditTask, onDeleteTask }: KanbanColumnProps) => {
    const [dragOver, setDragOver] = useState(false);
    const config = COLUMN_STYLES[status];

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOver(true);
    }, []);

    // Ignore dragleave events fired when moving between child elements inside the column
    const handleDragLeave = useCallback((e: React.DragEvent) => {
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setDragOver(false);
    }, []);

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);

        try {
          const data = JSON.parse(e.dataTransfer.getData('application/json'));
          if (data.taskId && data.fromStatus !== status) {
            onDrop(data.taskId, status);
          }
        } catch {
          // ignore malformed drag data
        }
      },
      [onDrop, status],
    );

    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col rounded-lg border-t-4 border border-gray-200 min-h-[200px] transition-colors ${config.accent} ${
          dragOver ? `${config.dropHighlight} border-dashed` : config.bg
        }`}
      >
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">{config.label}</h3>
          <span className="bg-white text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full border border-gray-200">
            {tasks.length}
          </span>
        </div>

        <div className="flex-1 p-2 space-y-2 overflow-y-auto">
          {tasks.length === 0 && !dragOver && (
            <p className="text-xs text-gray-400 text-center py-6">No tasks</p>
          )}
          {tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </div>
      </div>
    );
  },
);

KanbanColumn.displayName = 'KanbanColumn';
