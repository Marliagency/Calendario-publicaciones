import { PrismaClient } from '@prisma/client';

/**
 * Cliente Prisma singleton. Reutilizable desde api, worker y scripts.
 * En tests crea instancias propias para aislamiento.
 */
declare global {
  // eslint-disable-next-line no-var
  var __qyroPrisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__qyroPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__qyroPrisma = prisma;
}

export * from '@prisma/client';
