import * as schema from "./schema";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { privateEnv } from "~/config/privateEnv";

const pool = new pg.Pool({ connectionString: privateEnv.DATABASE_URL });
const database = drizzle(pool, { schema, logger: true });

export { database, pool };
