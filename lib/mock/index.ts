/*
 * Mock data, typed against lib/domain.
 *
 * The content comes from the design handoff and is extracted mechanically by
 * lib/mock/extract.mjs, so every string — including all Dutch and Spanish copy —
 * is verbatim rather than retyped. Re-run the extractor if the design files change:
 *
 *   node lib/mock/extract.mjs <handoff dir> lib/mock
 *
 * Everything below is a pure mapping from that raw shape onto the domain types.
 * When Supabase lands, these functions are replaced by queries and the components
 * do not change.
 */

import type { Locale } from "../brand";
import type {
  ActivityEntry,
  Appointment,
  ClientDocument,
  CaseRecord,
  ClientRecord,
  DocumentStatus,
  DueState,
  Payment,
  ServiceTemplate,
  StaffUser,
  StageDefinition,
  Task,
} from "../domain";
import type { StatusKey, Tone } from "../status";
import raw from "./staff-data.json";
import clientCopyRaw from "./client-copy.json";

/* ------------------------------------------------------------------ raw shapes */

interface RawCase {
  id: string;
  client: string;
  service: string;
  stage: string;
  si: number;
  n: number;
  assignee: string;
  initials: string;
  next: string;
  due: string;
  tone: string;
  glyph: string;
  docs: string;
}

type RawDocument = [name: string, meta: string, status: string, action: string, primary: number];
type RawTask = [title: string, due: string, who: string, done: boolean];
type RawActivity = [text: string, when: string, tone: string];

const rawCases = raw.cases as RawCase[];
const rawDocuments = raw.documents as RawDocument[];
const rawTasks = raw.tasks as RawTask[];
const rawActivity = raw.activity as RawActivity[];

/* --------------------------------------------------------------- due-state map */

/**
 * The prototype encodes due state as a tone plus a label. Real code derives it from
 * a date, so this is the one place where that translation happens.
 */
function dueState(due: string, tone: string): DueState {
  if (due === "—") return { status: "noDate", label: "—" };
  if (due === "Today") return { status: "dueToday", label: due };
  if (tone === "danger") return { status: "overdue", label: due };
  if (tone === "info") return { status: "dueSoon", label: due };
  if (tone === "ok") return { status: "approved", label: due };
  return { status: "dueLater", label: due };
}

const DOCUMENT_STATUS: Record<string, DocumentStatus> = {
  Approved: "APPROVED",
  Received: "RECEIVED",
  Required: "REQUIRED",
  Rejected: "REJECTED",
  Expired: "EXPIRED",
  Waived: "WAIVED",
};

export const DOCUMENT_STATUS_KEY: Record<DocumentStatus, StatusKey> = {
  APPROVED: "approved",
  RECEIVED: "received",
  REQUIRED: "required",
  REJECTED: "rejected",
  EXPIRED: "expired",
  WAIVED: "waived",
};

/** Which side owes the next move. Drives the grouping on the case screen. */
function owes(status: DocumentStatus): ClientDocument["owes"] {
  if (status === "RECEIVED") return "staff";
  if (status === "REJECTED" || status === "REQUIRED" || status === "EXPIRED") return "client";
  return "nobody";
}

/* ------------------------------------------------------------------- templates */

/**
 * The NIE template. The client-facing sentences come from the client design file,
 * which is the authority for that copy; the internal stage keys are ours.
 */
const clientCopy = clientCopyRaw as Record<Locale, ClientCopy>;

const NIE_STAGE_KEYS = [
  "INTAKE",
  "WAITING_FOR_DOCS",
  "APPOINTMENT_SET",
  "WAITING_AUTHORITY",
  "COMPLETED",
] as const;

function stageDefinitions(): StageDefinition[] {
  const labels = raw.stageLabels as string[];
  const slas = [2, 10, null, 10, null];
  // The five weights sum to 100, so "halfway" is a business decision rather than a
  // side effect of how many stages happen to exist.
  const weights = [10, 30, 20, 30, 10];

  return NIE_STAGE_KEYS.map((key, i) => ({
    key,
    label: labels[i] ?? key,
    slaDays: slas[i] ?? null,
    clientVisible: true,
    clientLabel: {
      en: clientCopy.en.steps[i]!.label,
      nl: clientCopy.nl.steps[i]!.label,
      es: clientCopy.es.steps[i]!.label,
    },
    clientMeta: {
      en: clientCopy.en.steps[i]!.meta,
      nl: clientCopy.nl.steps[i]!.meta,
      es: clientCopy.es.steps[i]!.meta,
    },
    progressWeight: weights[i] ?? 0,
  }));
}

export const nieTemplate: ServiceTemplate = {
  slug: "nie-application",
  version: 3,
  category: "SERVICES",
  internalName: "NIE Application",
  displayName: {
    en: clientCopy.en.detail.service,
    nl: clientCopy.nl.detail.service,
    es: clientCopy.es.detail.service,
  },
  stages: stageDefinitions(),
  expectedDurationDays: 35,
  defaultPrice: { cents: 45000, currency: "EUR" },
};

/* ----------------------------------------------------------------------- cases */

export const cases: CaseRecord[] = rawCases.map((c) => {
  const [approved, total] = c.docs.split("/").map((n) => Number.parseInt(n, 10));
  return {
    id: c.id,
    code: c.id,
    clientId: "SM-C-0021",
    clientName: c.client,
    templateSlug: c.service === "NIE Application" ? "nie-application" : slugify(c.service),
    templateVersion: 3,
    serviceName: c.service,
    stageIndex: c.si,
    stageCount: c.n,
    stageLabel: c.stage,
    assignee: c.assignee,
    assigneeInitials: c.initials,
    nextAction: c.next,
    due: dueState(c.due, c.tone),
    documentsApproved: approved ?? 0,
    documentsTotal: total ?? 0,
  };
});

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

export function caseByCode(code: string): CaseRecord | undefined {
  return cases.find((c) => c.code === code);
}

/** The case the design details throughout. */
export const featuredCaseCode = "ES-2481";

/* ------------------------------------------------------------------- documents */

/**
 * Documents hang off the client. `caseCodes` records which cases use each one, which
 * is what makes the "shared across cases" table real rather than cosmetic: the
 * passport below is one file serving three cases.
 */
export const documents: ClientDocument[] = rawDocuments.map(([name, meta, status, action], i) => {
  const mapped = DOCUMENT_STATUS[status] ?? "REQUIRED";
  const key = slugify(name).replace(/[^a-z0-9-]/g, "");
  const reusable = key.startsWith("passport") || key.startsWith("proof-of-address");

  return {
    id: `doc-${i + 1}`,
    clientId: "SM-C-0021",
    key,
    name,
    status: mapped,
    meta,
    owes: owes(mapped),
    staffAction: action as ClientDocument["staffAction"],
    version: meta.includes("replaces rejected v1") ? 2 : 1,
    expiresAt: name.startsWith("Padrón") ? "2026-12-15" : null,
    caseCodes: reusable ? ["ES-2481", "ES-2483", "ES-2490"] : ["ES-2481"],
    // A client may download back what is settled, not what is still in review.
    availableToClient: mapped === "APPROVED",
  };
});

/** The checklist for one case: the documents that case relies on. */
export function checklistFor(caseCode: string): ClientDocument[] {
  return documents.filter((d) => d.caseCodes.includes(caseCode));
}

/** Everything the client may open again from their own vault. */
export function clientVault(): ClientDocument[] {
  return documents.filter((d) => d.availableToClient);
}

/** One segment per document, in checklist order, coloured by status. */
export const documentTones: Tone[] = (raw.documentProgress as string[]).map((t) => t as Tone);

export function documentById(id: string): ClientDocument | undefined {
  return documents.find((d) => d.id === id);
}

/* ---------------------------------------------------------- tasks and the rail */

export const tasks: Task[] = rawTasks.map(([title, due, assignee, done], i) => ({
  id: `task-${i + 1}`,
  title,
  due,
  assignee,
  done,
}));

export const payments: Payment[] = [
  {
    id: "pay-1",
    label: {
      en: clientCopy.en.payments[0]!.label,
      nl: clientCopy.nl.payments[0]!.label,
      es: clientCopy.es.payments[0]!.label,
    },
    meta: {
      en: "Invoice 2026-0841",
      nl: "Factuur 2026-0841",
      es: "Factura 2026-0841",
    },
    amount: { cents: 45000, currency: "EUR" },
    status: "paid",
    staffStatus: "Paid",
  },
  {
    id: "pay-2",
    label: {
      en: clientCopy.en.payments[1]!.label,
      nl: clientCopy.nl.payments[1]!.label,
      es: clientCopy.es.payments[1]!.label,
    },
    meta: {
      en: "Government fee, advanced by us",
      nl: "Overheidsheffing, door ons voorgeschoten",
      es: "Tasa oficial, adelantada por nosotros",
    },
    amount: { cents: 984, currency: "EUR" },
    status: "received",
    staffStatus: "Reimburse",
  },
];

export const activity: ActivityEntry[] = rawActivity.map(([text, when, tone], i) => ({
  id: `act-${i + 1}`,
  text,
  when,
  tone: tone as ActivityEntry["tone"],
}));

export const appointment: Appointment = {
  id: "appt-1",
  date: "2026-09-24T09:40:00+02:00",
  time: {
    en: clientCopy.en.appt.time,
    nl: clientCopy.nl.appt.time,
    es: clientCopy.es.appt.time,
  },
  place: {
    en: clientCopy.en.appt.place,
    nl: clientCopy.nl.appt.place,
    es: clientCopy.es.appt.place,
  },
  address: clientCopy.en.appt.address,
  bring: {
    en: clientCopy.en.appt.bring,
    nl: clientCopy.nl.appt.bring,
    es: clientCopy.es.appt.bring,
  },
};

/* --------------------------------------------------------- people and the rail */

export const signedInUser: StaffUser = {
  id: "user-1",
  name: "Núria Camps",
  initials: "NC",
  role: "CASE_MANAGER",
  title: "Case manager · Málaga",
};

export const featuredClient: ClientRecord = {
  id: "SM-C-0021",
  code: "SM-C-0021",
  name: "Maartje de Vries",
  status: "ACTIVE",
  email: "m.devries@example.nl",
  phone: "+31 6 21 44 09 87",
  whatsapp: "+31 6 21 44 09 87",
  locale: "nl",
  identity: {
    dateOfBirth: "1984-03-11",
    nationality: "Dutch",
    maritalStatus: "Married",
    passportNumber: "NX4821993",
    passportExpiry: "2031-04-30",
    // Empty until the NIE case completes — then the number is filled in here and the
    // certificate lands in the vault.
    nieNumber: null,
    nussNumber: null,
    sipNumber: null,
  },
  addresses: {
    homeCountry: "Rozengracht 118, 1016 NH Amsterdam, Netherlands",
    spain: "Calle Ancha 12, 3ºB, 29601 Marbella",
  },
  context: "Dutch national · relocating to Marbella · prefers Dutch",
  since: "28 Aug 2026",
  leadSource: "website enquiry",
  assignedTo: "Núria Camps",
  internalNotes: "Partner travels for work; schedule calls after 17:00 where possible.",
};

export const sharedDocuments = [
  {
    name: "Passport — photo page",
    meta: "Approved 3 Sep · expires 04/2031",
    status: "APPROVED" as DocumentStatus,
    used: "Used in 3 cases",
  },
  {
    name: "Proof of address (Netherlands)",
    meta: "Approved 5 Sep · issued 21 Aug",
    status: "APPROVED" as DocumentStatus,
    used: "Used in 2 cases",
  },
  {
    name: "Marriage certificate (apostilled)",
    meta: "Received 9 Sep · needed for purchase",
    status: "RECEIVED" as DocumentStatus,
    used: "Used in 1 case",
  },
  {
    name: "Spanish bank certificate",
    meta: "Expired 1 Sep · request a fresh one",
    status: "EXPIRED" as DocumentStatus,
    used: "Used in 2 cases",
  },
];

/** The three cases shown side by side on the client detail screen. */
export const clientCaseCards = raw.clientCases as Array<{
  id: string;
  service: string;
  stage: string;
  due: string;
  tone: string;
  glyph: string;
  docs: string;
  assignee: string;
  si: number;
}>;

export const documentReviewMeta = [
  { k: "Case", v: "ES-2481 · NIE Application" },
  { k: "Client", v: "Maartje de Vries" },
  { k: "Uploaded", v: "17 Sep 2026, 08:40" },
  { k: "Version", v: "v2 — replaces rejected v1" },
  { k: "Checklist item", v: "Tasa 790-012 receipt" },
] as const;

export const documentHistory = [
  { text: "v2 uploaded by Maartje de Vries", when: "17 Sep 08:40", tone: "info" as Tone },
  { text: "v1 rejected by Núria — wrong tax form", when: "14 Sep 10:12", tone: "danger" as Tone },
  { text: "Requested from client", when: "10 Sep 09:00", tone: "mute" as Tone },
];

export const rejectionReasons = raw.rejectionReasons as string[];

/* ------------------------------------------------------ public upload-link copy */

export const uploadLinkCopy = raw.uploadCopy as Record<Locale, UploadLinkCopy>;

/* ----------------------------------------------------------- client portal copy */

export { clientCopy };

/* ------------------------------------------------------------------ copy shapes */

export interface UploadLinkCopy {
  hi: string;
  intro: string;
  stillNeeded: string;
  progress: string;
  upload: string;
  photoHint: string;
  doneTitle: string;
  helper: string;
  ask: string;
  privacy: string;
  missing: Array<{ name: string; help: string; flag?: boolean; flagText?: string }>;
  done: string[];
}

export interface ClientCopy {
  nav: string[];
  signin: {
    title: string;
    body: string;
    label: string;
    cta: string;
    privacy: string;
  };
  sent: {
    title: string;
    body: string;
    noEmailTitle: string;
    noEmailBody: string;
    codeCta: string;
    change: string;
  };
  code: { title: string; body: string; cta: string; resend: string; back: string };
  cases: { hi: string; summary: string; help: string };
  detail: {
    back: string;
    kicker: string;
    service: string;
    needTag: string;
    needTitle: string;
    needBody: string;
    needCta: string;
    progressTitle: string;
    docsTitle: string;
    docsSub: string;
    apptTitle: string;
    bring: string;
    addCal: string;
    map: string;
    payTitle: string;
    finalTitle: string;
    finalBody: string;
  };
  upload: {
    title: string;
    body: string;
    diagram: string;
    tipsTitle: string;
    tips: string[];
    camera: string;
    file: string;
    note: string;
  };
  rejected: {
    title: string;
    body: string;
    whatSent: string;
    thumb: string;
    reasonTag: string;
    reason: string;
    stepsTitle: string;
    cta: string;
    reassure: string;
  };
  rejectSteps: string[];
  intake: { back: string; next: string; savedTitle: string; savedBody: string };
  done: {
    title: string;
    body: string;
    keepTitle: string;
    keepSub: string;
    nextTitle: string;
    next: string[];
    againTitle: string;
    againBody: string;
    againCta: string;
  };
  months: string[];
  caseCards: Array<{
    service: string;
    status: string;
    todo: string;
    tone: string;
    glyph: string;
    step: string;
    si: number;
  }>;
  steps: Array<{ label: string; meta: string }>;
  docs: Array<{ label: string; meta: string; status: "missing" | "rejected" | "received" | "ok" }>;
  docCta: Record<"missing" | "rejected" | "received" | "ok", string>;
  appt: { time: string; place: string; address: string; bring: string[] };
  payments: Array<{
    label: string;
    meta: string;
    amount: string;
    status: string;
    tone: string;
    glyph: string;
  }>;
  finalDocs: Array<{ name: string; meta: string }>;
  intakeSteps: Array<{
    title: string;
    body: string;
    fields: Array<{ label: string; placeholder: string; hint: string }>;
  }>;
}
