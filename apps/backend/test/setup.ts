import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env.test") });

const databaseDir = path.resolve(__dirname, "..", "..", "..", "database");

// Note: In test, we use db push instead of migrate deploy because the
// Prisma schema has drifted from the committed migrations. This syncs
// the test database to match the current schema exactly.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { execSync } = require("node:child_process");
try {
  execSync("npx prisma db push --skip-generate", {
    cwd: databaseDir,
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL! },
    stdio: "pipe",
  });
} catch {
  // Schema push may fail if DB is not reachable
}
