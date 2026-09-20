/*
 * Shared primitives for both portals.
 *
 * StatusPill is the load-bearing one: it cannot render a tone without a word, and
 * in the client audience it refuses statuses that have no client-facing form. That
 * is where the "never tell a client their case is late" rule is enforced.
 */

import type { CSSProperties, ReactNode } from "react";
import type { Locale } from "@/lib/brand";
import { STATUS, type StatusKey, type Tone, clientStatusLabel, staffStatusLabel } from "@/lib/status";
import s from "./ui.module.css";

type Audience = "staff" | "client";

function toneVar(tone: Tone): CSSProperties {
  return { ["--tone" as string]: `var(--${tone})` };
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ status pill */

export function StatusPill({
  status,
  audience,
  locale,
  large = false,
  labelOverride,
}: {
  status: StatusKey;
  audience: Audience;
  locale: Locale;
  large?: boolean;
  /** Specific wording: "2 days late" for staff, "2 documents needed" for a client. */
  labelOverride?: string;
}) {
  const presentation = STATUS[status];

  // The guard is about which statuses may reach a client, not about the wording. A
  // status with no client form is omitted entirely — an override cannot smuggle it
  // through, and there is never a fallback to the staff wording.
  const generic = audience === "staff" ? staffStatusLabel(status, locale) : clientStatusLabel(status, locale);
  if (generic === null) return null;

  const label = labelOverride ?? generic;

  return (
    <span
      className={cx(s.pill, audience === "staff" ? s.pillStaff : s.pillClient, large && s.pillLarge)}
      style={toneVar(presentation.tone)}
    >
      <span className={s.glyph} aria-hidden="true">
        {presentation.glyph}
      </span>
      {label}
    </span>
  );
}

/* --------------------------------------------------------------------------- dot */

export function Dot({ tone }: { tone: Tone }) {
  return <span className={s.dot} style={toneVar(tone)} aria-hidden="true" />;
}

/* -------------------------------------------------------------------------- mono */

export function Mono({
  children,
  size,
  color,
  weight,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
  weight?: number;
}) {
  return (
    <span className={s.mono} style={{ fontSize: size, color, fontWeight: weight }}>
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ segment bars */

/** Named steps. `filled` segments are done or current. */
export function StepSegments({
  total,
  filled,
  tone = "accent",
}: {
  total: number;
  filled: number;
  tone?: Tone;
}) {
  return (
    <div className={cx(s.segments, s.segmentsStep)} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cx(s.segment, i < filled && s.segmentFilled)}
          style={i < filled ? toneVar(tone) : undefined}
        />
      ))}
    </div>
  );
}

/** One segment per document, coloured by that document's status. Shows composition. */
export function DocumentSegments({ tones }: { tones: Tone[] }) {
  return (
    <div className={cx(s.segments, s.segmentsDoc)} aria-hidden="true">
      {tones.map((tone, i) => (
        <span
          key={i}
          className={cx(s.segment, s.segmentFilled, tone === "mute" && s.segmentDim)}
          style={toneVar(tone)}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------------ button */

type ButtonVariant = "primary" | "secondary" | "affirm" | "destructive";
type ButtonSize = "staff" | "staffTall" | "client" | "clientTall" | "clientCompact";

const SIZE_CLASS: Record<ButtonSize, string> = {
  staff: s.buttonStaff!,
  staffTall: s.buttonStaffTall!,
  client: s.buttonClient!,
  clientTall: cx(s.buttonClient, s.buttonClientPrimaryTall),
  clientCompact: cx(s.buttonClient, s.buttonClientCompact),
};

export function Button({
  children,
  variant = "secondary",
  size = "staff",
  type = "button",
  disabled,
  onClick,
  className,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cx(s.button, SIZE_CLASS[size], s[variant], className)}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- card */

export function Card({
  children,
  audience,
  tone,
  className,
  style,
}: {
  children: ReactNode;
  audience: Audience;
  tone?: Tone;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cx(
        s.card,
        audience === "staff" ? s.cardStaff : s.cardClient,
        tone && s.cardToned,
        className,
      )}
      style={{ ...(tone ? toneVar(tone) : undefined), ...style }}
    >
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------------- eyebrow */

export function Eyebrow({
  children,
  audience,
}: {
  children: ReactNode;
  audience: Audience;
}) {
  return (
    <div className={cx(s.eyebrow, audience === "staff" ? s.eyebrowStaff : s.eyebrowClient)}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------- placeholder */

/** Stands in for a real document preview or photo. The caption says what belongs here. */
export function AssetPlaceholder({
  caption,
  minHeight = 160,
  className,
}: {
  caption: string;
  minHeight?: number;
  className?: string;
}) {
  return (
    <div className={cx(s.placeholder, className)} style={{ minHeight }}>
      {caption}
    </div>
  );
}
