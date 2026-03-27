import prisma from './prisma';

type ActivityAction =
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_DELETED'
  | 'COMMENT_ADDED'
  | 'COMMENT_DELETED';

type EntityType = 'TASK' | 'COMMENT';

interface ActivityMetadata {
  [key: string]: unknown;
}

// Fire-and-forget: the returned Promise is intentionally not awaited so audit
// logging never blocks or fails the parent request. Errors go to stderr only.
export function logActivity(
  userId: string,
  action: ActivityAction,
  entityType: EntityType,
  entityId: string,
  metadata?: ActivityMetadata,
): void {
  prisma.activityLog
    .create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    })
    .catch((err) => {
      console.error('Failed to log activity:', err);
    });
}
