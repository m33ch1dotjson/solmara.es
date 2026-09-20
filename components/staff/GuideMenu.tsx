"use client";

import { useEffect, useRef, useState } from "react";
import { useCopy } from "@/components/ui/LocaleProvider";
import s from "./GuideList.module.css";

/**
 * The ••• on a card and at the top of a document.
 *
 * Delete lives in here rather than on the card, and asks a second time before it
 * happens: it is the one irreversible thing on the screen, and a permanent red
 * button next to a document somebody wrote is an invitation to lose it.
 */
export function GuideMenu({
  onEdit,
  onDuplicate,
  onPrint,
  onDelete,
  placement = "up",
}: {
  onEdit: () => void;
  onDuplicate: () => void;
  onPrint: () => void;
  onDelete: () => void;
  /** On a card the menu sits at the bottom, so it opens upwards; in the document
      header there is nothing above it and it opens down. */
  placement?: "up" | "down";
}) {
  const { t } = useCopy();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onDown(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) close();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setConfirming(false);
  }

  function run(action: () => void) {
    close();
    action();
  }

  return (
    <div className={s.menuWrap} ref={box}>
      <button
        type="button"
        className={s.menuButton}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.guides.moreActions}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <span aria-hidden="true">•••</span>
      </button>

      {open && (
        <div className={placement === "down" ? `${s.menu} ${s.menuDown}` : s.menu} role="menu">
          <button type="button" role="menuitem" className={s.menuItem} onClick={() => run(onEdit)}>
            {t.guides.edit}
          </button>
          <button
            type="button"
            role="menuitem"
            className={s.menuItem}
            onClick={() => run(onDuplicate)}
          >
            {t.guides.duplicate}
          </button>
          <button type="button" role="menuitem" className={s.menuItem} onClick={() => run(onPrint)}>
            {t.guides.print}
          </button>

          <span className={s.menuLine} />

          {confirming ? (
            <button
              type="button"
              role="menuitem"
              className={`${s.menuItem} ${s.menuDanger}`}
              onClick={() => run(onDelete)}
            >
              {t.common.confirmDelete}
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              className={`${s.menuItem} ${s.menuDanger}`}
              onClick={() => setConfirming(true)}
            >
              {t.common.delete}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
