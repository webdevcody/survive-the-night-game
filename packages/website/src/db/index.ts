import * as schema from "./schema";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { privateEnv } from "~/config/privateEnv";

const pool = new pg.Pool({ connectionString: privateEnv.DATABASE_URL });
/** Set DRIZZLE_LOG_QUERIES=true to print SQL (default off — avoids console spam during dev). */
const database = drizzle(pool, {
  schema,
  logger: process.env.DRIZZLE_LOG_QUERIES === "true",
});

export { database, pool };
