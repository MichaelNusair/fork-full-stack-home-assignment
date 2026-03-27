-- Drop legacy Project relation from Task
ALTER TABLE "Task" DROP CONSTRAINT IF EXISTS "Task_projectId_fkey";
ALTER TABLE "Task" DROP COLUMN IF EXISTS "projectId";

-- Drop legacy Project table
DROP TABLE IF EXISTS "Project";

-- Add unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "Tag_name_key" ON "Tag"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "TaskAssignment_taskId_userId_key" ON "TaskAssignment"("taskId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "TaskTag_taskId_tagId_key" ON "TaskTag"("taskId", "tagId");

-- Add performance indexes
CREATE INDEX IF NOT EXISTS "Task_userId_idx" ON "Task"("userId");
CREATE INDEX IF NOT EXISTS "Task_status_idx" ON "Task"("status");
CREATE INDEX IF NOT EXISTS "Task_createdAt_idx" ON "Task"("createdAt");
CREATE INDEX IF NOT EXISTS "Comment_taskId_idx" ON "Comment"("taskId");

-- Update cascade deletes: drop old FKs and recreate with ON DELETE CASCADE
ALTER TABLE "TaskAssignment" DROP CONSTRAINT IF EXISTS "TaskAssignment_taskId_fkey";
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment" DROP CONSTRAINT IF EXISTS "Comment_taskId_fkey";
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskTag" DROP CONSTRAINT IF EXISTS "TaskTag_taskId_fkey";
ALTER TABLE "TaskTag" ADD CONSTRAINT "TaskTag_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: ActivityLog
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");
CREATE INDEX "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
