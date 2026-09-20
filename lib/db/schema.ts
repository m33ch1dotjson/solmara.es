/*
 * Database schema.
 *
 * Everything lives in the `app` schema, not `public`. Supabase exposes `public`
 * through the Data API by default, which would mean the entire security of a system
 * holding passports rests on getting every RLS policy right. Keeping the tables in a
 * schema the Data API does not expose removes that surface; RLS is then a second
 * layer rather than the only one.
 *
 * The schema name is `app` and not `solmara` on purpose: the brand is configuration
 * and must not appear in identifiers, because the brand becomes Solmavera later.
 *
 * Human-readable codes (SM-C-0021, SM-CASE-0042) are stored as text and never
 * regenerated — they are quoted in emails and invoices. The number comes from a
 * sequence so two simultaneous sign-ups cannot collide; the prefix comes from
 * configuration at insert time, which is why the code is stored rather than derived.
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

export const serviceCategory = app.enum("service_category", ["REAL_ESTATE", "SERVICES"]);

export const staffRole = app.enum("staff_role", ["ADMIN", "CASE_MANAGER", "VIEWER"]);

export const documentStatus = app.enum("document_status", [
  "REQUIRED",
  "RECEIVED",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "WAIVED",
]);

export const clientStatus = app.enum("client_status", ["ACTIVE", "DORMANT", "CLOSED"]);

export const paymentStatus = app.enum("payment_status", ["OUTSTANDING", "PAID", "REFUNDED"]);

export const locale = app.enum("locale", ["en", "nl", "es"]);

/* --------------------------------------------------------------- sequences */

export const clientCodeSeq = app.sequence("client_code_seq", { startWith: 1, increment: 1 });
export const caseCodeSeq = app.sequence("case_code_seq", { startWith: 1, increment: 1 });

/* ------------------------------------------------------------------- staff */

/**
 * A member of the team. `authUserId` points at Supabase's auth.users; this table
 * holds what the application needs and auth does not: role, display name, initials.
 */
export const staffUser = app.table(
  "staff_user",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /**
     * Null until they first sign in. Access is invite-only, so the row is created
     * when someone is added to the team — the auth user follows later.
     */
    authUserId: uuid("auth_user_id").unique(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    initials: text("initials").notNull(),
    title: text("title").notNull().default(""),
    role: staffRole("role").notNull().default("CASE_MANAGER"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("staff_user_active_idx").on(t.active)],
);

/* ------------------------------------------------------------------ client */

/**
 * The central person record. Identity numbers are columns here, not facts hidden
 * inside a PDF: "what is his NIE?" is answered by a query, and the certificate is a
 * separate document in the vault.
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
    name: text("name").notNull(),
    status: clientStatus("status").notNull().default("ACTIVE"),
    email: text("email").notNull(),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    preferredLocale: locale("preferred_locale").notNull().default("en"),

    dateOfBirth: date("date_of_birth"),
    nationality: text("nationality"),
    maritalStatus: text("marital_status"),
    passportNumber: text("passport_number"),
    passportExpiry: date("passport_expiry"),
    nieNumber: text("nie_number"),
    nussNumber: text("nuss_number"),
    sipNumber: text("sip_number"),

    addressHomeCountry: text("address_home_country"),
    addressSpain: text("address_spain"),

    context: text("context"),
    leadSource: text("lead_source"),
    assignedTo: uuid("assigned_to").references(() => staffUser.id, { onDelete: "set null" }),
    internalNotes: text("internal_notes"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("client_assigned_idx").on(t.assignedTo), index("client_email_idx").on(t.email)],
);

/**
 * A person who may sign in on behalf of a client. Separate from `client` because a
 * property purchase usually has two buyers and both want to follow it.
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
    name: text("name").notNull(),
    email: text("email").notNull(),
    preferredLocale: locale("preferred_locale").notNull().default("en"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("client_contact_client_idx").on(t.clientId),
    uniqueIndex("client_contact_email_idx").on(t.clientId, t.email),
  ],
);

/* ---------------------------------------------------------------- services */

export const service = app.table("service", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  category: serviceCategory("category").notNull(),
  internalName: text("internal_name").notNull(),
  /** { en, nl, es } — what the client reads. */
  displayName: jsonb("display_name").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * A template is never edited, only superseded. A case pins the version it started
 * on, so changing the NIE checklist tomorrow cannot break today's cases.
 */
export const serviceTemplate = app.table(
  "service_template",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => service.id, { onDelete: "restrict" }),
    version: integer("version").notNull(),
    /** Stages, intake questions, document checklist, tasks, SLAs, automations. */
    definition: jsonb("definition").notNull(),
    expectedDurationDays: integer("expected_duration_days"),
    defaultPriceCents: integer("default_price_cents"),
    defaultCurrency: text("default_currency").notNull().default("EUR"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("service_template_version_idx").on(t.serviceId, t.version)],
);

/* ------------------------------------------------------------------- cases */

export const caseRecord = app.table(
  "case",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    codeNumber: bigint("code_number", { mode: "number" })
      .notNull()
      .default(sql`nextval('app.case_code_seq')`),
    /** e.g. SM-CASE-0042. Never rewritten, not even on a rebrand. */
    code: text("code").notNull().unique(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id, { onDelete: "restrict" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => service.id, { onDelete: "restrict" }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => serviceTemplate.id, { onDelete: "restrict" }),

    /** Internal stage key from the pinned template, e.g. WAITING_FOR_DOCS. */
    stageKey: text("stage_key").notNull(),
    stageEnteredAt: timestamp("stage_entered_at", { withTimezone: true }).notNull().defaultNow(),
    /** Set when a case is parked; SLA counting stops while this is non-null. */
    onHoldReason: text("on_hold_reason"),

    assigneeId: uuid("assignee_id").references(() => staffUser.id, { onDelete: "set null" }),
    nextAction: text("next_action"),
    dueDate: date("due_date"),
    priority: integer("priority").notNull().default(0),

    /** A case may point at another, e.g. a mortgage tied to a purchase. */
    linkedCaseId: uuid("linked_case_id"),

    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("case_client_idx").on(t.clientId),
    index("case_assignee_idx").on(t.assigneeId),
    index("case_stage_idx").on(t.stageKey),
    index("case_due_idx").on(t.dueDate),
  ],
);

/**
 * Who may see which case. Access is granted per person, never derived from the
 * client record, so revoking one buyer does not affect the other.
 */
export const caseAccess = app.table(
  "case_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => caseRecord.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => clientContact.id, { onDelete: "cascade" }),
    grantedBy: uuid("granted_by").references(() => staffUser.id, { onDelete: "set null" }),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("case_access_pair_idx").on(t.caseId, t.contactId),
    index("case_access_contact_idx").on(t.contactId),
  ],
);

/* --------------------------------------------------------------- documents */

/**
 * A document belongs to the client, and `document_case` records which cases use it.
 * Uploading a passport once and reusing it is the whole point; a per-case copy would
 * mean three approvals and three chances to be reading the stale one.
 */
export const clientDocument = app.table(
  "client_document",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id, { onDelete: "cascade" }),
    /** Checklist key from a template, e.g. passport_copy. */
    key: text("key").notNull(),
    name: text("name").notNull(),
    status: documentStatus("status").notNull().default("REQUIRED"),
    /** Path in Supabase Storage. Random, never derived from a client name. */
    storageKey: text("storage_key"),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    version: integer("version").notNull().default(1),
    /** Supersedes an earlier version; the old row stays for the audit trail. */
    replacesId: uuid("replaces_id"),

    expiresAt: date("expires_at"),
    rejectionReason: text("rejection_reason"),
    rejectionNote: text("rejection_note"),

    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => staffUser.id, { onDelete: "set null" }),

    /** Whether the client may download it back from their own vault. */
    availableToClient: boolean("available_to_client").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("client_document_client_idx").on(t.clientId),
    index("client_document_status_idx").on(t.status),
    index("client_document_expiry_idx").on(t.expiresAt),
  ],
);

/** Join: which cases rely on which document. */
export const documentCase = app.table(
  "document_case",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => clientDocument.id, { onDelete: "cascade" }),
    caseId: uuid("case_id")
      .notNull()
      .references(() => caseRecord.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("document_case_pair_idx").on(t.documentId, t.caseId),
    index("document_case_case_idx").on(t.caseId),
  ],
);

/** What a case needs, copied from the template when the case is created. */
export const documentRequirement = app.table(
  "document_requirement",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => caseRecord.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    required: boolean("required").notNull().default(true),
    expiresAfterDays: integer("expires_after_days"),
    helpText: text("help_text"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("document_requirement_key_idx").on(t.caseId, t.key)],
);

/* ------------------------------------------------- tasks, appointments, money */

export const task = app.table(
  "task",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => caseRecord.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    assigneeId: uuid("assignee_id").references(() => staffUser.id, { onDelete: "set null" }),
    dueDate: date("due_date"),
    /** A blocking task stops the stage from advancing. */
    blocking: boolean("blocking").notNull().default(false),
    doneAt: timestamp("done_at", { withTimezone: true }),
    doneBy: uuid("done_by").references(() => staffUser.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("task_case_idx").on(t.caseId), index("task_assignee_idx").on(t.assigneeId)],
);

export const appointment = app.table(
  "appointment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => caseRecord.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    place: text("place"),
    address: text("address"),
    /** What the client must bring, per locale. */
    bring: jsonb("bring"),
    calendarEventId: text("calendar_event_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("appointment_case_idx").on(t.caseId), index("appointment_starts_idx").on(t.startsAt)],
);

export const payment = app.table(
  "payment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => caseRecord.id, { onDelete: "cascade" }),
    label: jsonb("label").notNull(),
    meta: jsonb("meta"),
    /** Integer cents. Never a float. */
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    status: paymentStatus("status").notNull().default("OUTSTANDING"),
    /** True for money advanced on the client's behalf, e.g. a government fee. */
    advanced: boolean("advanced").notNull().default(false),
    stripeId: text("stripe_id"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payment_case_idx").on(t.caseId)],
);

export const intakeSubmission = app.table(
  "intake_submission",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => caseRecord.id, { onDelete: "cascade" }),
    answers: jsonb("answers").notNull().default(sql`'{}'::jsonb`),
    /** Tokenised link, so a client can upload without an account. */
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("intake_case_idx").on(t.caseId)],
);

/* -------------------------------------------------------- events and outbox */

/**
 * Everything that happens. One table gives three things at once: the Slack alerts,
 * the audit trail the GDPR asks for, and the timeline the client portal shows.
 */
export const event = app.table(
  "event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Null for something the system did on its own. */
    actorStaffId: uuid("actor_staff_id").references(() => staffUser.id, { onDelete: "set null" }),
    actorContactId: uuid("actor_contact_id").references(() => clientContact.id, {
      onDelete: "set null",
    }),
    caseId: uuid("case_id").references(() => caseRecord.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => client.id, { onDelete: "cascade" }),
    /** e.g. document.status_changed, stage.entered, payment.succeeded */
    action: text("action").notNull(),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("event_case_idx").on(t.caseId),
    index("event_client_idx").on(t.clientId),
    index("event_action_idx").on(t.action),
    index("event_created_idx").on(t.createdAt),
  ],
);

/**
 * Outbound work. A write to the database is never also an external call: the request
 * stores the row and a cron drains it. A Slack outage then cannot leave a half-saved
 * case behind, and a failed email can simply run again.
 *
 * `idempotencyKey` is the rule from the plan made physical — a unique index means a
 * rule that already ran for a given (rule, case, event) cannot run twice.
 */
export const outbox = app.table(
  "outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(),
    payload: jsonb("payload").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("outbox_idempotency_idx").on(t.idempotencyKey),
    index("outbox_pending_idx").on(t.processedAt, t.availableAt),
  ],
);

/* --------------------------------------------------------------- relations */

export const clientRelations = relations(client, ({ many, one }) => ({
  cases: many(caseRecord),
  contacts: many(clientContact),
  documents: many(clientDocument),
  assignee: one(staffUser, { fields: [client.assignedTo], references: [staffUser.id] }),
}));

export const caseRelations = relations(caseRecord, ({ one, many }) => ({
  client: one(client, { fields: [caseRecord.clientId], references: [client.id] }),
  service: one(service, { fields: [caseRecord.serviceId], references: [service.id] }),
  template: one(serviceTemplate, {
    fields: [caseRecord.templateId],
    references: [serviceTemplate.id],
  }),
  assignee: one(staffUser, { fields: [caseRecord.assigneeId], references: [staffUser.id] }),
  tasks: many(task),
  appointments: many(appointment),
  payments: many(payment),
  requirements: many(documentRequirement),
  access: many(caseAccess),
}));

export const clientDocumentRelations = relations(clientDocument, ({ one, many }) => ({
  client: one(client, { fields: [clientDocument.clientId], references: [client.id] }),
  cases: many(documentCase),
}));
