"use client";

import { useEffect, useRef } from "react";
import { useCopy } from "./LocaleProvider";
import s from "./Modal.module.css";

/*
 * A dialog over the page.
 *
 * Plain elements rather than <dialog>: the native one traps focus properly but
 * fights a phone keyboard, which resizes the viewport under an element positioned
 * against it. This one scrolls its own body, so a form stays reachable with the
 * keyboard open — which is the case that actually breaks on a phone.
 *
 * Escape and a click on the backdrop close it; the page behind it does not scroll.
 */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { t } = useCopy();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    // The first field is where somebody is going anyway.
    panel.current?.querySelector<HTMLElement>("input, textarea, select, button")?.focus();

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className={s.backdrop} onMouseDown={onClose}>
      <div
        className={s.panel}
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={s.head}>
          <h2 className={s.title}>{title}</h2>
          <button
            type="button"
            className={s.close}
            onClick={onClose}
            aria-label={t.common.close}
          >
            ×
          </button>
        </div>
        <div className={s.body}>{children}</div>
      </div>
    </div>
  );
}
