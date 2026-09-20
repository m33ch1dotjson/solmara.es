/*
 * The database handle.
 *
 * One connection pool for the whole server process, deliberately small: the pooler
 * is shared with everything else on the project, and more connections make nothing
 * faster once Postgres is the bottleneck.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
}

// Session mode (port 5432) keeps prepared statements, unlike transaction mode.
const client = postgres(url, { max: 10, prepare: true });

export const db = drizzle(client, { schema });
export { schema };
