/*
 * Puts a logo file in the workspace bucket and points the invoice settings at it.
 *
 * Run on the container, where .env.local holds the keys:
 *
 *   node --env-file=.env.local scripts/set-invoice-logo.mjs /path/to/logo.png
 *
 * The file is uploaded once and referred to by its storage key from then on. No
 * path from somebody's laptop ever ends up in the database, and an invoice that has
 * already been finalised keeps pointing at the logo it was made with.
 */

import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const file = process.argv[2];
if (!file) {
  console.error("Geef het pad naar het logo mee.");
  process.exit(1);
}

const extension = extname(file).toLowerCase();
const contentType = extension === ".png" ? "image/png" : "image/jpeg";
if (![".png", ".jpg", ".jpeg"].includes(extension)) {
  console.error("Alleen PNG of JPEG: dat zijn de formaten die een PDF kan insluiten.");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

const key = `invoice-logo/${randomUUID()}${extension}`;
const { error } = await supabase.storage
  .from("workspace-files")
  .upload(key, readFileSync(file), { contentType, upsert: false });

if (error) {
  console.error("Uploaden mislukt:", error.message);
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
await sql`update app.workspace_setting set invoice_logo_key = ${key}, updated_at = now() where id`;
await sql.end();

console.log(`${basename(file)} staat in de bucket als ${key} en is ingesteld als factuurlogo`);
