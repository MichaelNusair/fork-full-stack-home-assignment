import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  // upsert with empty update = create-if-missing, skip-if-exists (idempotent seed)
  const user1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      id: 'user1',
      email: 'john@example.com',
      username: 'johndoe',
      password: hashedPassword,
      name: 'John Doe',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      id: 'user2',
      email: 'jane@example.com',
      username: 'janedoe',
      password: hashedPassword,
      name: 'Jane Doe',
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      id: 'user3',
      email: 'bob@example.com',
      username: 'bobsmith',
      password: hashedPassword,
      name: 'Bob Smith',
    },
  });

  const tag1 = await prisma.tag.upsert({
    where: { name: 'Frontend' },
    update: {},
    create: { name: 'Frontend', color: '#3B82F6' },
  });

  const tag2 = await prisma.tag.upsert({
    where: { name: 'Backend' },
    update: {},
    create: { name: 'Backend', color: '#10B981' },
  });

  const tag3 = await prisma.tag.upsert({
    where: { name: 'Urgent' },
    update: {},
    create: { name: 'Urgent', color: '#EF4444' },
  });

  const tag4 = await prisma.tag.upsert({
    where: { name: 'Bug' },
    update: {},
    create: { name: 'Bug', color: '#F59E0B' },
  });

  const task1 = await prisma.task.create({
    data: {
      title: 'Implement user authentication',
      description: 'Add login and registration functionality',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      userId: user1.id,
      tags: {
        create: [
          { tagId: tag2.id },
          { tagId: tag3.id },
        ],
      },
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: 'Design dashboard UI',
      description: 'Create responsive dashboard layout with Tailwind CSS',
      status: 'TODO',
      priority: 'MEDIUM',
      userId: user1.id,
      tags: {
        create: [{ tagId: tag1.id }],
      },
    },
  });

  const task3 = await prisma.task.create({
    data: {
      title: 'Fix login bug',
      description: 'Users cannot log in with special characters in password',
      status: 'TODO',
      priority: 'HIGH',
      userId: user2.id,
      tags: {
        create: [
          { tagId: tag2.id },
          { tagId: tag4.id },
        ],
      },
    },
  });

  const task4 = await prisma.task.create({
    data: {
      title: 'Setup CI/CD pipeline',
      description: 'Configure GitHub Actions for automated testing and deployment',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      userId: user1.id,
      tags: {
        create: [{ tagId: tag2.id }],
      },
    },
  });

  await prisma.task.create({
    data: {
      title: 'Implement task filtering',
      description: 'Add filter by status, priority, and assignee',
      status: 'DONE',
      priority: 'LOW',
      userId: user2.id,
    },
  });

  await prisma.taskAssignment.create({
    data: { taskId: task1.id, userId: user2.id },
  });

  await prisma.taskAssignment.create({
    data: { taskId: task1.id, userId: user3.id },
  });

  await prisma.taskAssignment.create({
    data: { taskId: task3.id, userId: user1.id },
  });

  await prisma.comment.create({
    data: {
      content: 'Started working on JWT implementation',
      taskId: task1.id,
      userId: user1.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'Need to add refresh token functionality',
      taskId: task1.id,
      userId: user2.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'This is a critical bug, needs immediate attention',
      taskId: task3.id,
      userId: user2.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'Fixed the issue with password encoding',
      taskId: task3.id,
      userId: user1.id,
    },
  });

  console.log('Seed data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
