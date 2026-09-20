/*
 * The database handle.
 *
 * It connects as `app_server`, not as `postgres`. That is not a detail: Supabase's
 * postgres role has rolbypassrls, so connecting as postgres would mean every row
 * level security policy in this project is silently ignored.
 *
 * One small pool for the whole server process. The pooler is shared with everything
 * else on the project, and more connections make nothing faster once Postgres is the
 * bottleneck.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.APP_DATABASE_URL;
if (!url) {
  throw new Error(
    "APP_DATABASE_URL is not set. Run scripts/set-app-role-password.sh to create it.",
  );
}

// Session mode (port 5432) keeps prepared statements, unlike transaction mode.
const sql = postgres(url, { max: 10, prepare: true });

export const db = drizzle(sql, { schema });
export { schema };
