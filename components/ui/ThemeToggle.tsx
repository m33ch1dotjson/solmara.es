"use client";

import { useEffect, useState } from "react";
import s from "./ThemeToggle.module.css";

type Theme = "light" | "dark";

const STORAGE_KEY = "solmara-theme";

/**
 * Flips `data-theme` on the document element and persists the choice per user.
 * The initial value is read from the DOM, which the inline script in the root
 * layout has already set — so there is no flash and no hydration mismatch.
 */
export function ThemeToggle({ variant = "labelled" }: { variant?: "labelled" | "compact" }) {
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

  const glyph = theme === "dark" ? "☾" : "☀";
  const label = theme === "dark" ? "Dark theme" : "Light theme";

  return (
    <button
      type="button"
      onClick={toggle}
      className={variant === "compact" ? s.compact : s.labelled}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      <span className={s.glyph} aria-hidden="true">
        {glyph}
      </span>
      {variant === "labelled" && <span>{label}</span>}
    </button>
  );
}
