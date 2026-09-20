/*
 * Database schema.
 *
 * Everything lives in the `app` schema, not `public`. Supabase exposes `public`
 * through the Data API by default, which would mean the security of a system holding
 * passport scans rests entirely on getting every RLS policy right. Keeping the
 * tables out of that schema removes the surface; RLS is then a second layer.
 *
 * The schema is called `app` and not `solmara` on purpose: the brand is
 * configuration, because it becomes Solmavera later.
 *
 * Three things exist here and nothing else:
 *   - clients, the people, with their details and their two documents
 *   - SOPs, the team's own working instructions
 *   - properties, which staff keep for themselves
 */

import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const app = pgSchema("app");

/* ------------------------------------------------------------------- enums */

export const staffRole = app.enum("staff_role", ["ADMIN", "STAFF"]);

export const documentKind = app.enum("document_kind", ["PASSPORT", "PHOTO"]);

export const documentStatus = app.enum("document_status", [
  "REQUIRED",
  "RECEIVED",
  "APPROVED",
  "REJECTED",
]);

export const clientStatus = app.enum("client_status", ["INVITED", "ACTIVE", "CLOSED"]);

export const locale = app.enum("locale", ["en", "nl", "es"]);

/* --------------------------------------------------------------- sequences */

export const clientCodeSeq = app.sequence("client_code_seq", { startWith: 1, increment: 1 });

/* ------------------------------------------------------------------- staff */

export const staffUser = app.table(
  "staff_user",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Null until their first sign-in; access is invite-only. */
    authUserId: uuid("auth_user_id").unique(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    initials: text("initials").notNull(),
    role: staffRole("role").notNull().default("STAFF"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("staff_user_active_idx").on(t.active)],
);

/* ------------------------------------------------------------------ client */

/**
 * The person. Identity numbers are columns, not facts buried in a PDF: "what is his
 * passport number?" is a query, and the scan is a separate thing in the vault.
 */
export const client = app.table(
  "client",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    codeNumber: bigint("code_number", { mode: "number" })
      .notNull()
      .default(sql`nextval('app.client_code_seq')`),
    /** e.g. SM-C-0021. Prefix from configuration at insert; never rewritten. */
    code: text("code").notNull().unique(),

    /** Set by staff when creating the client; the rest the client fills in. */
    name: text("name").notNull(),
    email: text("email").notNull(),
    status: clientStatus("status").notNull().default("INVITED"),
    preferredLocale: locale("preferred_locale").notNull().default("en"),

    phone: text("phone"),
    dateOfBirth: date("date_of_birth"),
    nationality: text("nationality"),
    passportNumber: text("passport_number"),
    passportExpiry: date("passport_expiry"),
    addressHomeCountry: text("address_home_country"),
    addressSpain: text("address_spain"),

    /** Internal. Never leaves the admin side — see the client_self function. */
    internalNotes: text("internal_notes"),
    createdBy: uuid("created_by").references(() => staffUser.id, { onDelete: "set null" }),

    /** Set when the client first completes their details. */
    detailsCompletedAt: timestamp("details_completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("client_email_idx").on(t.email), index("client_status_idx").on(t.status)],
);

/**
 * Who may sign in for this client. Separate from `client` so a couple can share one
 * file later without sharing one login.
 */
export const clientContact = app.table(
  "client_contact",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id, { onDelete: "cascade" }),
    /** Null until they first sign in; the magic link creates the auth user. */
    authUserId: uuid("auth_user_id").unique(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("client_contact_client_idx").on(t.clientId),
    uniqueIndex("client_contact_email_idx").on(t.clientId, t.email),
  ],
);

/**
 * The link a staff member generates and sends. A token rather than an account,
 * because asking someone to register before they can send a passport photo is how
 * you lose them to WhatsApp.
 */
export const clientInvite = app.table(
  "client_invite",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id, { onDelete: "cascade" }),
    /** Random, long, and the only thing standing between a stranger and this file. */
    token: text("token").notNull().unique(),
    createdBy: uuid("created_by").references(() => staffUser.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    /** Set the moment it is redeemed; a link works once. */
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("client_invite_client_idx").on(t.clientId)],
);

/* --------------------------------------------------------------- documents */

export const clientDocument = app.table(
  "client_document",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id, { onDelete: "cascade" }),
    kind: documentKind("kind").notNull(),
    status: documentStatus("status").notNull().default("REQUIRED"),
    /** Path in Supabase Storage. Random, never derived from a client's name. */
    storageKey: text("storage_key"),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => staffUser.id, { onDelete: "set null" }),
    rejectionNote: text("rejection_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("client_document_kind_idx").on(t.clientId, t.kind),
    index("client_document_status_idx").on(t.status),
  ],
);

/* ----------------------------------------------------------- process guide */

export const guideCategory = app.enum("guide_category", [
  "RESIDENCY",
  "REAL_ESTATE",
  "ADMINISTRATION",
  "TAX_BUSINESS",
  "VEHICLES",
  "INSURANCE",
  "OTHER",
]);

export const guideFileKind = app.enum("guide_file_kind", ["IMAGE", "ATTACHMENT"]);

/**
 * The internal handbook. Staff only — no client policy exists for this table.
 *
 * `content` is HTML, written by the document editor and sanitised on the way in by
 * lib/sanitize.ts. It is never rendered to a client; nothing outside /admin reads it.
 */
export const processGuide = app.table(
  "process_guide",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    category: guideCategory("category").notNull().default("OTHER"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: uuid("created_by").references(() => staffUser.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("process_guide_order_idx").on(t.sortOrder, t.createdAt),
    index("process_guide_category_idx").on(t.category),
  ],
);

/**
 * Files belonging to a guide: screenshots placed inside the text, and templates
 * hanging under it. The same protection for both, so they are the same table.
 *
 * A body never holds a storage key or a signed URL. It holds
 * /admin/process-guide/file/<id>, which checks the reader is staff and mints a fresh
 * ten-minute URL — a signed URL saved into HTML would be dead by the next read.
 */
export const processGuideFile = app.table(
  "process_guide_file",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    guideId: uuid("guide_id")
      .notNull()
      .references(() => processGuide.id, { onDelete: "cascade" }),
    kind: guideFileKind("kind").notNull().default("ATTACHMENT"),
    filename: text("filename").notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    uploadedBy: uuid("uploaded_by").references(() => staffUser.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("process_guide_file_guide_idx").on(t.guideId, t.createdAt)],
);

/* -------------------------------------------------------------- properties */

/** Internal only. No client policy exists for these tables, deliberately. */
export const property = app.table(
  "property",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    address: text("address").notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => staffUser.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("property_created_idx").on(t.createdAt)],
);

export const propertyPhoto = app.table(
  "property_photo",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => property.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("property_photo_property_idx").on(t.propertyId, t.sortOrder)],
);

/* ------------------------------------------------------------------- audit */

/**
 * Everything that happens to a client's file. Small, but it is what lets anyone
 * answer "who downloaded that passport, and when" — which the GDPR eventually asks.
 */
export const event = app.table(
  "event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorStaffId: uuid("actor_staff_id").references(() => staffUser.id, { onDelete: "set null" }),
    actorContactId: uuid("actor_contact_id").references(() => clientContact.id, {
      onDelete: "set null",
    }),
    clientId: uuid("client_id").references(() => client.id, { onDelete: "cascade" }),
    /** e.g. client.created, invite.generated, document.uploaded, document.viewed */
    action: text("action").notNull(),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("event_client_idx").on(t.clientId), index("event_created_idx").on(t.createdAt)],
);

/* --------------------------------------------------------------- relations */

export const clientRelations = relations(client, ({ many, one }) => ({
  contacts: many(clientContact),
  documents: many(clientDocument),
  invites: many(clientInvite),
  createdByUser: one(staffUser, { fields: [client.createdBy], references: [staffUser.id] }),
}));

export const propertyRelations = relations(property, ({ many }) => ({
  photos: many(propertyPhoto),
}));

export const propertyPhotoRelations = relations(propertyPhoto, ({ one }) => ({
  property: one(property, { fields: [propertyPhoto.propertyId], references: [property.id] }),
}));
