"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { useCopy } from "@/components/ui/LocaleProvider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import s from "./AccountMenu.module.css";

/*
 * Who you are, top right, with the things you do to your own account behind it.
 *
 * This replaces the block of controls that used to sit at the bottom of the rail:
 * a name pill, a language switcher, a theme button and a sign-out button, stacked,
 * eating the bottom fifth of the navigation. The rail is navigation again.
 */
export function AccountMenu({
  name,
  initials,
  avatarUrl,
  isAdmin,
}: {
  name: string;
  initials: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}) {
  const { t } = useCopy();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onDown(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={s.wrap} ref={box}>
      <button
        type="button"
        className={s.button}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
      >
        <span className={s.name}>{name}</span>
        <Avatar url={avatarUrl} initials={initials} size={28} />
        <span className={s.chevron} aria-hidden="true" />
      </button>

      {open && (
        <div className={s.menu} role="menu">
          <div className={s.who}>
            <Avatar url={avatarUrl} initials={initials} size={36} />
            <span className={s.whoName}>{name}</span>
          </div>

          <Link
            href="/admin/account"
            role="menuitem"
            className={s.item}
            onClick={() => setOpen(false)}
          >
            {t.nav.myAccount}
          </Link>

          {isAdmin && (
            <>
              <Link
                href="/admin/workspace"
                role="menuitem"
                className={s.item}
                onClick={() => setOpen(false)}
              >
                {t.nav.workspace}
              </Link>
              <Link
                href="/admin/team"
                role="menuitem"
                className={s.item}
                onClick={() => setOpen(false)}
              >
                {t.nav.team}
              </Link>
            </>
          )}

          <span className={s.line} />

          {/* The theme button keeps its own label and its own memory; it is only
              rehoused here, not reimplemented. */}
          <div className={s.themeRow}>
            <span className={s.themeLabel}>{t.account.appearance}</span>
            <ThemeToggle />
          </div>

          <span className={s.line} />

          <form action="/auth/signout" method="post">
            <button type="submit" role="menuitem" className={`${s.item} ${s.danger}`}>
              {t.common.signOut}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
