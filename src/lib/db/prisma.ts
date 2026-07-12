import {PrismaMariaDb} from '@prisma/adapter-mariadb';
import {PrismaTiDBCloud} from '@tidbcloud/prisma-adapter';

import {PrismaClient} from '@/generated/prisma/client';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to initialize Prisma Client.');
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = process.env.DATABASE_DRIVER === 'tidb-cloud'
  ? new PrismaTiDBCloud({url: databaseUrl})
  : new PrismaMariaDb(databaseUrl);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({adapter});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
