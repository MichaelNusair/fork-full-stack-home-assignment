export interface User {
  id: string;
  email: string;
  username: string;
  name?: string | null;
}

export interface TaskAssignment {
  id: string;
  taskId: string;
  userId: string;
  user: User;
}

export interface Comment {
  id: string;
  content: string;
  taskId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: User;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  userId: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
  assignments?: TaskAssignment[];
  comments?: Comment[];
}

export interface PaginatedResponse<T> {
  tasks: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TaskFilters {
  search?: string;
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
}

export interface SavedFilterPreset {
  id: string;
  name: string;
  filters: TaskFilters;
}

export type ActivityAction =
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_DELETED'
  | 'COMMENT_ADDED'
  | 'COMMENT_DELETED';

export interface ActivityLog {
  id: string;
  action: ActivityAction;
  entityType: 'TASK' | 'COMMENT';
  entityId: string;
  userId: string;
  metadata: string | null;
  createdAt: string;
  user: User;
}

export interface ActivityFilters {
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedActivityResponse {
  activities: ActivityLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  name?: string;
}

export type ViewMode = 'list' | 'board';
