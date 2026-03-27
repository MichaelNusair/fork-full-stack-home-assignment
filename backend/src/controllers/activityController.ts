import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const VALID_ACTIONS = [
  'TASK_CREATED',
  'TASK_UPDATED',
  'TASK_DELETED',
  'COMMENT_ADDED',
  'COMMENT_DELETED',
] as const;

const VALID_ENTITY_TYPES = ['TASK', 'COMMENT'] as const;

const userSelect = {
  id: true,
  email: true,
  username: true,
  name: true,
} as const;

export const getActivities = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { action, entityType, entityId, startDate, endDate, page, limit } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const skip = (pageNum - 1) * pageSize;

    const where: Record<string, unknown> = { userId };

    if (action && typeof action === 'string' && VALID_ACTIONS.includes(action as any)) {
      where.action = action;
    }

    if (entityType && typeof entityType === 'string' && VALID_ENTITY_TYPES.includes(entityType as any)) {
      where.entityType = entityType;
    }

    if (entityId && typeof entityId === 'string') {
      where.entityId = entityId;
    }

    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {};
      if (startDate && typeof startDate === 'string') {
        const d = new Date(startDate);
        if (!isNaN(d.getTime())) createdAt.gte = d;
      }
      if (endDate && typeof endDate === 'string') {
        const d = new Date(endDate);
        if (!isNaN(d.getTime())) {
          d.setHours(23, 59, 59, 999);
          createdAt.lte = d;
        }
      }
      if (Object.keys(createdAt).length > 0) {
        where.createdAt = createdAt;
      }
    }

    const [activities, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: { select: userSelect },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({
      activities,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
};
