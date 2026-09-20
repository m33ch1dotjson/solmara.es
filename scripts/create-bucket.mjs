/*
 * Creates a private storage bucket, if it is not there already.
 *
 * Run on the container, where .env.local holds the secret key:
 *
 *   cd /opt/solmara && node --env-file=.env.local scripts/create-bucket.mjs process-guide-files
 *
 * Private with no storage policies, like the other two buckets: everything that
 * reads from them goes through our server and gets a short-lived signed URL. A
 * bucket made public by hand in the dashboard would quietly undo that.
 */

import { createClient } from "@supabase/supabase-js";

const name = process.argv[2];
if (!name) {
  console.error("Geef de naam van de bucket mee.");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("NEXT_PUBLIC_SUPABASE_URL of SUPABASE_SECRET_KEY ontbreekt.");
  process.exit(1);
}

const supabase = createClient(url, secret, { auth: { persistSession: false } });

const { data: buckets, error: listError } = await supabase.storage.listBuckets();
if (listError) {
  console.error("Kon de buckets niet opvragen:", listError.message);
  process.exit(1);
}

if (buckets.some((bucket) => bucket.name === name)) {
  console.log(`bucket "${name}" bestaat al — niets gedaan`);
  process.exit(0);
}

const { error } = await supabase.storage.createBucket(name, { public: false });
if (error) {
  console.error("Aanmaken mislukt:", error.message);
  process.exit(1);
}

console.log(`bucket "${name}" aangemaakt, privé`);
