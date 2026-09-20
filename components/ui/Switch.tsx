"use client";

import s from "./Switch.module.css";

/**
 * A toggle switch.
 *
 * A real <button role="switch">, not a styled checkbox: it carries its own state to
 * a screen reader, takes focus the way every other control on the page does, and
 * needs no hidden input to be read back out.
 */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** What this switch is for. Not shown — the row next to it already says it. */
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={checked ? `${s.track} ${s.on}` : s.track}
      onClick={() => onChange(!checked)}
    >
      <span className={s.knob} aria-hidden="true" />
    </button>
  );
}
