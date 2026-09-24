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
  numeric,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const app = pgSchema("app");

/* ------------------------------------------------------------------- enums */

/**
 * EXTERNAL is deliberately not staff: app.is_staff() excludes it, so until
 * per-client assignment exists an external user signs in and sees nothing. See
 * drizzle/0006_account_and_team.sql.
 */
export const staffRole = app.enum("staff_role", ["ADMIN", "STAFF", "EXTERNAL"]);

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

    /* Their own settings. The cookies the browser works from are set from these at
       sign-in, so a colleague on a borrowed laptop gets their own portal. */
    avatarKey: text("avatar_key"),
    preferredLocale: locale("preferred_locale"),
    /** "light" | "dark" | "system" */
    theme: text("theme").notNull().default("light"),
    timeZone: text("time_zone").notNull().default("Europe/Madrid"),
    /** "LONG" | "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD" */
    dateStyle: text("date_style").notNull().default("LONG"),
    /** "GRID" | "LIST" — how this colleague likes the client list. */
    clientsView: text("clients_view").notNull().default("GRID"),
    /** A growing set of switches, so a new one is not a migration. */
    notify: jsonb("notify").notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("staff_user_active_idx").on(t.active)],
);

/**
 * The workspace itself. Exactly one row, enforced by a check constraint on a
 * boolean primary key — a second workspace nobody is looking at is a worse bug than
 * a failed insert.
 */
export const workspaceSetting = app.table("workspace_setting", {
  id: boolean("id").primaryKey().default(true),
  companyName: text("company_name"),
  companyEmail: text("company_email"),
  phone: text("phone"),
  website: text("website"),
  logoKey: text("logo_key"),
  displayName: text("display_name"),
  defaultClientLocale: locale("default_client_locale").notNull().default("en"),
  defaultCountry: text("default_country").notNull().default("ES"),
  defaultCurrency: text("default_currency").notNull().default("EUR"),

  /* What an invoice needs to know about the company sending it. Every field is
     copied onto an invoice when it is finalised, never read back from here. */
  legalName: text("legal_name"),
  taxId: text("tax_id"),
  address: text("address"),
  postalCode: text("postal_code"),
  city: text("city"),
  province: text("province"),
  country: text("country"),

  accountHolder: text("account_holder"),
  iban: text("iban"),
  bic: text("bic"),
  bankName: text("bank_name"),
  paymentInstructions: text("payment_instructions"),

  invoicePrefix: text("invoice_prefix").notNull().default("SOL"),
  paymentTermsDays: integer("payment_terms_days").notNull().default(14),
  invoiceLanguage: locale("invoice_language").notNull().default("nl"),
  invoiceNotes: text("invoice_notes"),
  invoiceLogoKey: text("invoice_logo_key"),

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------- tasks */

/**
 * The office's own to-do list.
 *
 * `done` is a flag, not a deletion: a ticked task stays in the list, struck
 * through, because "what did we already do here" is a question people ask.
 */
export const task = app.table(
  "task",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    title: text("title").notNull(),
    /** The detail behind the one line. HTML, sanitised by lib/sanitize.ts. */
    body: text("body").notNull().default(""),

    done: boolean("done").notNull().default(false),
    doneAt: timestamp("done_at", { withTimezone: true }),
    doneBy: uuid("done_by").references(() => staffUser.id, { onDelete: "set null" }),

    dueDate: date("due_date"),
    assignedTo: uuid("assigned_to").references(() => staffUser.id, { onDelete: "set null" }),
    clientId: uuid("client_id").references(() => client.id, { onDelete: "set null" }),

    createdBy: uuid("created_by").references(() => staffUser.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("task_open_idx").on(t.done, t.dueDate, t.createdAt),
    index("task_client_idx").on(t.clientId),
  ],
);

/* --------------------------------------------------------------- invoicing */

export const invoiceStatus = app.enum("invoice_status", [
  "DRAFT",
  "FINALIZED",
  "SENT",
  "PAID",
  "CANCELLED",
]);

export const paymentMethod = app.enum("payment_method", ["TRANSFER", "CASH", "CARD", "OTHER"]);

/** One row per year; the official number comes from an atomic upsert on it. */
export const invoiceCounter = app.table("invoice_counter", {
  year: integer("year").primaryKey(),
  nextNumber: integer("next_number").notNull().default(1),
});

/**
 * An invoice.
 *
 * The customer_* and issuer_* columns are a snapshot, not a join: an invoice is a
 * document about a moment, and neither the client moving house nor the company
 * changing its IBAN may rewrite one that has already gone out.
 *
 * Amounts are integer cents. See lib/money.ts, which is the only place that rounds.
 */
export const invoice = app.table(
  "invoice",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** Null until finalisation, so a deleted draft leaves no hole in the sequence. */
    number: text("number").unique(),
    numberYear: integer("number_year"),
    numberSequence: integer("number_sequence"),

    clientId: uuid("client_id").references(() => client.id, { onDelete: "set null" }),

    status: invoiceStatus("status").notNull().default("DRAFT"),
    currency: text("currency").notNull().default("EUR"),
    language: locale("language").notNull().default("nl"),

    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date").notNull(),

    customerName: text("customer_name").notNull().default(""),
    customerCompanyName: text("customer_company_name"),
    customerEmail: text("customer_email"),
    customerTaxId: text("customer_tax_id"),
    customerVatNumber: text("customer_vat_number"),
    customerAddress: text("customer_address"),
    customerPostalCode: text("customer_postal_code"),
    customerCity: text("customer_city"),
    customerProvince: text("customer_province"),
    customerCountry: text("customer_country"),

    issuerLegalName: text("issuer_legal_name"),
    issuerDisplayName: text("issuer_display_name"),
    issuerTaxId: text("issuer_tax_id"),
    issuerEmail: text("issuer_email"),
    issuerPhone: text("issuer_phone"),
    issuerWebsite: text("issuer_website"),
    issuerAddress: text("issuer_address"),
    issuerPostalCode: text("issuer_postal_code"),
    issuerCity: text("issuer_city"),
    issuerProvince: text("issuer_province"),
    issuerCountry: text("issuer_country"),
    issuerIban: text("issuer_iban"),
    issuerBic: text("issuer_bic"),
    issuerBankName: text("issuer_bank_name"),
    issuerAccountHolder: text("issuer_account_holder"),
    issuerLogoKey: text("issuer_logo_key"),

    subtotalCents: bigint("subtotal_cents", { mode: "number" }).notNull().default(0),
    taxTotalCents: bigint("tax_total_cents", { mode: "number" }).notNull().default(0),
    totalCents: bigint("total_cents", { mode: "number" }).notNull().default(0),

    notes: text("notes"),
    paymentInstructions: text("payment_instructions"),

    pdfStorageKey: text("pdf_storage_key"),

    createdBy: uuid("created_by").references(() => staffUser.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),

    finalizedBy: uuid("finalized_by").references(() => staffUser.id, { onDelete: "set null" }),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    sentBy: uuid("sent_by").references(() => staffUser.id, { onDelete: "set null" }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    paidBy: uuid("paid_by").references(() => staffUser.id, { onDelete: "set null" }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paymentMethod: paymentMethod("payment_method"),
    paymentReference: text("payment_reference"),
    cancelledBy: uuid("cancelled_by").references(() => staffUser.id, { onDelete: "set null" }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (t) => [
    index("invoice_client_idx").on(t.clientId, t.issueDate),
    index("invoice_status_idx").on(t.status, t.dueDate),
  ],
);

export const invoiceItem = app.table(
  "invoice_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoice.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),

    description: text("description").notNull().default(""),
    /** numeric(12,3) — read as a string by the driver and parsed where it is used. */
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull().default("1"),
    unitPriceCents: bigint("unit_price_cents", { mode: "number" }).notNull().default(0),
    /** numeric(5,2), a percentage: "21.00" is 21%. */
    vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).notNull().default("21"),

    subtotalCents: bigint("subtotal_cents", { mode: "number" }).notNull().default(0),
    taxCents: bigint("tax_cents", { mode: "number" }).notNull().default(0),
    totalCents: bigint("total_cents", { mode: "number" }).notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("invoice_item_invoice_idx").on(t.invoiceId, t.position)],
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
    /** A photograph, in the private client bucket. Optional, always. */
    avatarKey: text("avatar_key"),
    dateOfBirth: date("date_of_birth"),
    nationality: text("nationality"),
    passportNumber: text("passport_number"),
    passportExpiry: date("passport_expiry"),
    addressHomeCountry: text("address_home_country"),
    addressSpain: text("address_spain"),

    /* What an invoice needs. Filled by staff, copied onto an invoice when one is
       made, and never read back from here once that invoice is final. */
    companyName: text("company_name"),
    postalCode: text("postal_code"),
    city: text("city"),
    province: text("province"),
    country: text("country"),
    /** NIE or NIF; which of the two depends on the person. */
    taxId: text("tax_id"),
    vatNumber: text("vat_number"),

    /** Internal. Never leaves the admin side — see the client_self function. */
    internalNotes: text("internal_notes"),
    createdBy: uuid("created_by").references(() => staffUser.id, { onDelete: "set null" }),

    /** They signed up themselves rather than being created by the office. */
    selfRegistered: boolean("self_registered").notNull().default(false),

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
    /* Switched off by an admin. app.resolve_actor() refuses a disabled contact, so
       this is the lock itself and not a hidden button. */
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    disabledBy: uuid("disabled_by").references(() => staffUser.id, { onDelete: "set null" }),
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
    /**
     * Which of this guide's files is the cover. Not a second storage key: the cover
     * is an ordinary file row, so it is served and cleaned up by the same machinery.
     * Typed loosely to avoid a circular reference between the two tables.
     */
    coverFileId: uuid("cover_file_id"),
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

    /**
     * The listing text, as HTML, written with the same editor as a Process Guide
     * and sanitised by lib/sanitize.ts on the way in.
     */
    description: text("description").notNull().default(""),

    /* The three or four facts a listing leads with. All optional: a property with
       only a title and an address shows a title and an address. */
    priceCents: bigint("price_cents", { mode: "number" }),
    bedrooms: integer("bedrooms"),
    bathrooms: integer("bathrooms"),
    areaM2: integer("area_m2"),

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
