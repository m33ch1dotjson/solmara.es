/*
 * The client-safe projection.
 *
 * The handoff is explicit that this mapping is part of the domain model and not a
 * presentation detail, so it lives here rather than inside a component. Internal
 * stage keys, staff names, SLA state and lateness must not cross this boundary.
 *
 * The projection is branded. A client-portal component asks for `ClientSafeCase`,
 * so handing it a raw `CaseRecord` is a type error rather than a leak that only
 * shows up in a screenshot.
 */

import type { Locale } from "./brand";
import type { CaseRecord, ServiceTemplate } from "./domain";
import { type StatusKey, isClientSafe } from "./status";

declare const clientSafeBrand: unique symbol;

export interface ClientSafeStep {
  /** One sentence, first person plural. Never an internal key. */
  label: string;
  /** Plain expectation, e.g. "Usually two to four weeks after the appointment". */
  meta: string;
  state: "done" | "current" | "future";
}

export interface ClientSafeCase {
  readonly [clientSafeBrand]: true;
  /** The case code is safe: the client already has it in their emails. */
  code: string;
  /** Service name in the client's language. */
  service: string;
  /** One full sentence of status. */
  status: string;
  steps: ClientSafeStep[];
  /** "Step 3 of 5" — countable, never a percentage. */
  stepLabel: string;
  stepIndex: number;
  stepCount: number;
  /** Outstanding work, or null when nothing is expected of the client. */
  outstanding: { count: number; status: Extract<StatusKey, "dueToday"> } | null;
}

/** How many documents the client still owes. Computed by the caller from case documents. */
export interface ClientOutstanding {
  documentsOutstanding: number;
}

/**
 * Project an internal case onto what the client may see.
 *
 * Stages with `clientVisible: false` collapse into the previous visible stage, so
 * adding an internal step never makes an unexplained heading appear for the client.
 */
export function toClientCase(
  record: CaseRecord,
  template: ServiceTemplate,
  outstanding: ClientOutstanding,
  locale: Locale,
): ClientSafeCase {
  const visible = template.stages.filter((stage) => stage.clientVisible);

  // Map the internal index onto the visible list: the client's current step is the
  // last visible stage at or before the internal one.
  let currentVisible = 0;
  for (let i = 0; i < visible.length; i++) {
    const stage = visible[i]!;
    const internalIndex = template.stages.indexOf(stage);
    if (internalIndex <= record.stageIndex) currentVisible = i;
  }

  const steps: ClientSafeStep[] = visible.map((stage, i) => ({
    label: stage.clientLabel[locale],
    meta: stage.clientMeta[locale],
    state: i < currentVisible ? "done" : i === currentVisible ? "current" : "future",
  }));

  const current = visible[currentVisible];

  return {
    code: record.code,
    service: template.displayName[locale],
    status: current ? current.clientLabel[locale] : "",
    steps,
    stepLabel: stepLabel(currentVisible + 1, visible.length, locale),
    stepIndex: currentVisible,
    stepCount: visible.length,
    outstanding:
      outstanding.documentsOutstanding > 0
        ? { count: outstanding.documentsOutstanding, status: "dueToday" }
        : null,
  } as ClientSafeCase;
}

function stepLabel(step: number, total: number, locale: Locale): string {
  const pattern: Record<Locale, string> = {
    en: `Step ${step} of ${total}`,
    nl: `Stap ${step} van ${total}`,
    es: `Paso ${step} de ${total}`,
  };
  return pattern[locale];
}

/**
 * Guard for anything that is about to be sent to the client tier. Throws rather
 * than degrading, because a silent fallback to staff wording is exactly the bug
 * this module exists to prevent.
 */
export function assertClientSafe(key: StatusKey): StatusKey {
  if (!isClientSafe(key)) {
    throw new Error(
      `Status "${key}" has no client-facing form and must not reach the client portal.`,
    );
  }
  return key;
}
