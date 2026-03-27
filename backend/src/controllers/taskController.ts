import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { logActivity } from '../lib/activityLogger';

const VALID_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;
const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;

const userSelect = {
  id: true,
  email: true,
  username: true,
  name: true,
} as const;

const VALID_SORT_FIELDS = ['createdAt', 'title', 'status', 'priority'] as const;
const VALID_SORT_ORDERS = ['asc', 'desc'] as const;

export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { search, status, priority, page, limit, sortBy, sortOrder } = req.query;

    // Clamp page >= 1, page size to [1, 100] to prevent abuse or over-fetching
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const skip = (pageNum - 1) * pageSize;

    const where: Record<string, unknown> = { userId };

    if (status && typeof status === 'string' && VALID_STATUSES.includes(status as any)) {
      where.status = status;
    }

    if (priority && typeof priority === 'string' && VALID_PRIORITIES.includes(priority as any)) {
      where.priority = priority;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const field = VALID_SORT_FIELDS.includes(sortBy as any) ? (sortBy as string) : 'createdAt';
    const order = VALID_SORT_ORDERS.includes(sortOrder as any) ? (sortOrder as string) : 'desc';

    // Run paginated query and count in parallel -- same WHERE, no sequential round-trip
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          user: { select: userSelect },
          assignments: {
            include: {
              user: { select: userSelect },
            },
          },
        },
        orderBy: { [field]: order },
        skip,
        take: pageSize,
      }),
      prisma.task.count({ where }),
    ]);

    res.json({
      tasks,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { title, description, status, priority } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` });
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        status: status || 'TODO',
        priority: priority || 'MEDIUM',
        userId,
      },
      include: {
        user: { select: userSelect },
        assignments: {
          include: {
            user: { select: userSelect },
          },
        },
      },
    });

    res.status(201).json(task);

    // Log after responding so the client isn't blocked by audit writes
    logActivity(userId, 'TASK_CREATED', 'TASK', task.id, { title: task.title });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { title, description, status, priority } = req.body;

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }
    if (existing.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this task' });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` });
    }

    const task = await prisma.task.update({
      where: { id },
      // Only include fields that were actually sent in the request body.
      // description uses !== undefined so callers can explicitly clear it to null.
      data: {
        ...(title && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(status && { status }),
        ...(priority && { priority }),
      },
      include: {
        user: { select: userSelect },
        assignments: {
          include: {
            user: { select: userSelect },
          },
        },
      },
    });

    res.json(task);

    // Build a before/after diff of changed fields for the activity log
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (title && title.trim() !== existing.title) changes.title = { from: existing.title, to: title.trim() };
    if (description !== undefined && (description?.trim() || null) !== existing.description) changes.description = { from: existing.description, to: description?.trim() || null };
    if (status && status !== existing.status) changes.status = { from: existing.status, to: status };
    if (priority && priority !== existing.priority) changes.priority = { from: existing.priority, to: priority };
    logActivity(userId, 'TASK_UPDATED', 'TASK', id, { title: task.title, changes });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }
    if (existing.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this task' });
    }

    await prisma.task.delete({ where: { id } });

    res.status(204).send();

    logActivity(userId, 'TASK_DELETED', 'TASK', id, { title: existing.title });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};

export const getTaskById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        user: { select: userSelect },
        assignments: {
          include: {
            user: { select: userSelect },
          },
        },
        comments: {
          include: {
            user: { select: userSelect },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to view this task' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
};
