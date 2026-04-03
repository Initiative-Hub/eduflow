import { defineConfig } from '@prisma/config';

// Load .env explicitly if needed
const dbUrl =
  process.env.DATABASE_URL ||
  'postgresql://postgres:password@localhost:5432/eduflow_db?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'bun --bun prisma/seed.ts',
  },
  datasource: {
    url: dbUrl,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
