import { defineConfig } from "drizzle-kit";

/*
 * Migrations run against the session pooler: the direct host is IPv6-only and the
 * container that runs them has no IPv6.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  // Only our own schema is managed here; auth and storage belong to Supabase.
  schemaFilter: ["app"],
  verbose: true,
  strict: true,
});
