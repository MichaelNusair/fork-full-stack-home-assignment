import { PrismaClient } from '@prisma/client';

// Module-scoped singleton: Node's require cache ensures only one PrismaClient
// (and therefore one connection pool) exists across all imports.
const prisma = new PrismaClient();

export default prisma;
