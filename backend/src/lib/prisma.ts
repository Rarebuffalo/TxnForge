import { PrismaClient } from "@prisma/client";

// Global shared Prisma Client instance to avoid connection pool exhaustion
export const prisma = new PrismaClient();
