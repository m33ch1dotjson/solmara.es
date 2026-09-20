"use client";

import { useEffect, useState } from "react";
import { useCopy } from "./LocaleProvider";
import s from "./ThemeToggle.module.css";

type Theme = "light" | "dark";

const STORAGE_KEY = "solmara-theme";

/**
 * Flips `data-theme` on the document element and persists the choice per user.
 * The initial value is read from the DOM, which the inline script in the root
 * layout has already set — so there is no flash and no hydration mismatch.
 *
 * The label says which theme you are *in*, not which one the button would give you.
 * Both readings are defensible; this one matches how the rest of the interface
 * states the current state and leaves the action to the tooltip.
 */
export function ThemeToggle({ variant = "labelled" }: { variant?: "labelled" | "compact" }) {
  const { t } = useCopy();
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // A blocked storage API must not break the toggle for this session.
    }
  }

  const dark = theme === "dark";
  const action = dark ? t.common.switchToLight : t.common.switchToDark;

  return (
    <button
      type="button"
      onClick={toggle}
      className={variant === "compact" ? s.compact : s.labelled}
      aria-label={action}
      title={action}
    >
      <span className={s.glyph} aria-hidden="true">
        {dark ? "☾" : "☀"}
      </span>
      {variant === "labelled" && <span>{dark ? t.common.themeDark : t.common.themeLight}</span>}
    </button>
  );
}
