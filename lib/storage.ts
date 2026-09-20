/*
 * File storage.
 *
 * Uploads go through the server with the secret key rather than straight from the
 * browser. That costs a hop and buys something worth more: the buckets stay entirely
 * private with no storage policies at all, so nothing in a browser can address them
 * even if a session leaks. Passport scans are the reason.
 *
 * Every read is a signed URL with a short life. There are no public objects here.
 */

import { createClient } from "@supabase/supabase-js";

export const BUCKET_CLIENT_DOCUMENTS = "client-documents";
export const BUCKET_PROPERTY_PHOTOS = "property-photos";
/** Screenshots inside a Process Guide, and the templates hanging under it. */
export const BUCKET_GUIDE_FILES = "process-guide-files";

/** Ten minutes: long enough to open a file, short enough that a shared link dies. */
const SIGNED_URL_SECONDS = 600;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error("SUPABASE_SECRET_KEY ontbreekt. Zonder die sleutel werkt uploaden niet.");
  }
  return createClient(url, secret, { auth: { persistSession: false } });
}

/** Random path. Never derived from a name — a guessable path is an invitation. */
export function storageKey(prefix: string, filename: string): string {
  const extension = filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "bin";
  return `${prefix}/${crypto.randomUUID()}.${extension}`;
}

export async function upload(bucket: string, key: string, file: File) {
  const { error } = await admin()
    .storage.from(bucket)
    .upload(key, file, { contentType: file.type, upsert: false });

  if (error) throw new Error(`upload mislukt: ${error.message}`);
  return { key, size: file.size, mimeType: file.type };
}

export async function signedUrl(bucket: string, key: string): Promise<string | null> {
  const { data, error } = await admin()
    .storage.from(bucket)
    .createSignedUrl(key, SIGNED_URL_SECONDS);
  return error ? null : data.signedUrl;
}

export async function remove(bucket: string, keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await admin().storage.from(bucket).remove(keys);
}

/** Only these reach storage. A file extension is not a content type. */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
export const ALLOWED_DOCUMENT_TYPES = [...ALLOWED_IMAGE_TYPES, "application/pdf"];

/**
 * What may hang under a Process Guide: the forms and templates a colleague actually
 * has on hand. Wider than the client list — these are our own files, not somebody's
 * passport — but still a list, because "any file at all" is how a staff tool becomes
 * a file share nobody audits.
 */
export const ALLOWED_GUIDE_FILE_TYPES = [
  ...ALLOWED_DOCUMENT_TYPES,
  "image/gif",
  // Deliberately no image/svg+xml: an SVG is a document that can carry script, and
  // ours are served from our own origin, so opening one in a tab would run it.
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Why an upload was refused. A code rather than a sentence: this layer has no
 * business knowing which language the person on the other end reads, and a message
 * baked in here could only ever come out in one.
 */
export type UploadRefusal = "empty" | "tooLarge" | "type";

export function validateUpload(
  file: File,
  allowed: string[],
): { ok: true } | { ok: false; reason: UploadRefusal } {
  if (file.size === 0) return { ok: false, reason: "empty" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, reason: "tooLarge" };
  if (!allowed.includes(file.type)) return { ok: false, reason: "type" };
  return { ok: true };
}
