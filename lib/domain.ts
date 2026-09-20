/*
 * Domain types.
 *
 * These mirror the tables in the plan of approach (client, service,
 * service_template, case, case_document, task, appointment, payment, event) so the
 * screens are built against the shape the database will actually have. The mock
 * data in lib/mock is typed against these, which means swapping it for Drizzle
 * queries later is a change of source, not a change of components.
 *
 * Money is integer cents. Never a float, never a formatted string — formatting is
 * a locale concern and lives in lib/format.ts.
 */

import type { Locale } from "./brand";
import type { StatusKey } from "./status";

/** The two commercial categories. Drives reporting and default assignment only. */
export type ServiceCategory = "REAL_ESTATE" | "SERVICES";

export type Role = "ADMIN" | "CASE_MANAGER" | "VIEWER" | "CLIENT";

export type DocumentStatus =
  | "REQUIRED"
  | "RECEIVED"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "WAIVED";

/** Only APPROVED and WAIVED let a stage advance. */
export const SETTLES_CHECKLIST: readonly DocumentStatus[] = ["APPROVED", "WAIVED"];

export type Money = { cents: number; currency: "EUR" };

export interface StaffUser {
  id: string;
  name: string;
  initials: string;
  role: Role;
  /** "Case manager · Málaga" */
  title: string;
}

/*
 * A client is the central person record, and it carries structured identity data in
 * its own fields.
 *
 * This is deliberately separate from the document vault. "What is his NIE number?"
 * is answered by `nieNumber` — a text field on the client — and never by opening
 * NIE Certificate.pdf. The certificate is a file; the number is data. Both exist,
 * and neither substitutes for the other.
 *
 * Identifiers are optional because they arrive at different moments: a client has a
 * passport on day one and a NIE only after the case that produces it completes.
 */
export interface ClientIdentity {
  dateOfBirth: string | null;
  nationality: string;
  maritalStatus: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  /** Número de Identidad de Extranjero. */
  nieNumber: string | null;
  /** Número de la Seguridad Social. */
  nussNumber: string | null;
  /** Tarjeta sanitaria. */
  sipNumber: string | null;
}

export interface ClientAddresses {
  homeCountry: string | null;
  spain: string | null;
}

export interface ClientRecord {
  id: string;
  /** Human-readable code, e.g. SM-C-0021. Never regenerated. */
  code: string;
  name: string;
  status: "ACTIVE" | "DORMANT" | "CLOSED";
  email: string;
  phone: string;
  whatsapp: string | null;
  locale: Locale;
  identity: ClientIdentity;
  addresses: ClientAddresses;
  /** One line of context, as the staff client screen shows it. */
  context: string;
  since: string;
  leadSource: string;
  /** Internal: who owns the relationship, not a single case. */
  assignedTo: string;
  internalNotes: string | null;
}

export interface StageDefinition {
  /** Internal key, e.g. WAITING_FOR_DOCS. Never shown to a client. */
  key: string;
  /** Internal label for staff. */
  label: string;
  slaDays: number | null;
  /** Whether this stage appears in the client's step list at all. */
  clientVisible: boolean;
  /** One sentence, first person plural, per locale. */
  clientLabel: Record<Locale, string>;
  /** Plain expectation line beneath the client label. */
  clientMeta: Record<Locale, string>;
  /** Share of overall progress. The weights of a template sum to 100. */
  progressWeight: number;
}

export interface ServiceTemplate {
  slug: string;
  version: number;
  category: ServiceCategory;
  internalName: string;
  displayName: Record<Locale, string>;
  stages: StageDefinition[];
  expectedDurationDays: number;
  defaultPrice: Money;
}

/*
 * A document belongs to the CLIENT, not to a case, and is linked to the cases that
 * use it.
 *
 * That is the whole point: a passport is uploaded once and reused across the NIE
 * application, the mortgage and the purchase. Storing it per case would mean three
 * copies, three approvals and three chances to be looking at the stale one.
 */
export interface ClientDocument {
  id: string;
  clientId: string;
  /** Checklist key from the template, e.g. passport_copy. */
  key: string;
  name: string;
  status: DocumentStatus;
  /** Provenance line: "Uploaded 17 Sep 08:40 · replaces rejected v1". */
  meta: string;
  /** Who owes the next move. Drives the grouping on the case screen. */
  owes: "staff" | "client" | "nobody";
  /** Action label for the staff row: Review, Chase, Waive, View. */
  staffAction: "Review" | "Chase" | "Waive" | "View";
  version: number;
  /** Validity, where the document type has one. Drives the expiry sweep. */
  expiresAt: string | null;
  /** Which cases rely on this file. A client-visible document has at least one. */
  caseCodes: string[];
  /** True once the client may download it back — their own copy to keep. */
  availableToClient: boolean;
}

/**
 * What a template says a case needs. Joined to the client's documents to produce the
 * checklist, so a case can require a document the client has not uploaded yet.
 */
export interface DocumentRequirement {
  caseCode: string;
  key: string;
  required: boolean;
}

export interface Task {
  id: string;
  title: string;
  due: string;
  assignee: string;
  done: boolean;
}

export interface Appointment {
  id: string;
  /** ISO date, for the calendar export and the mono date block. */
  date: string;
  /** Written out, per locale: "09:40, Thursday 24 September". */
  time: Record<Locale, string>;
  place: Record<Locale, string>;
  address: string;
  bring: Record<Locale, string[]>;
}

export interface Payment {
  id: string;
  label: Record<Locale, string>;
  meta: Record<Locale, string>;
  amount: Money;
  status: Extract<StatusKey, "paid" | "received">;
  /** Staff-only wording, e.g. "Reimburse". */
  staffStatus: string;
}

export interface ActivityEntry {
  id: string;
  text: string;
  when: string;
  tone: "ok" | "info" | "danger" | "mute" | "warn";
}

/** Due state, derived server-side. Never recomputed in a client component. */
export interface DueState {
  status: StatusKey;
  /** Staff-facing text: "Today", "2 days late", "22 Sep", "—". */
  label: string;
}

export interface CaseRecord {
  id: string;
  /** Human-readable code, e.g. ES-2481. Never regenerated. */
  code: string;
  clientId: string;
  clientName: string;
  templateSlug: string;
  templateVersion: number;
  serviceName: string;
  /** Index into the template's stages. */
  stageIndex: number;
  stageCount: number;
  stageLabel: string;
  assignee: string;
  assigneeInitials: string;
  nextAction: string;
  due: DueState;
  documentsApproved: number;
  documentsTotal: number;
}
