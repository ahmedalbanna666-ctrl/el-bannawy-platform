import { PrismaClient } from "@prisma/client";

export default async (): Promise<void> => {
  const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ DECLARE
        tbl TEXT;
      BEGIN
        FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
        LOOP
          EXECUTE 'TRUNCATE TABLE ' || quote_ident(tbl) || ' CASCADE';
        END LOOP;
      END $$;
    `);
  } finally {
    await prisma.$disconnect();
  }
};
