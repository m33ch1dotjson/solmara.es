"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import s from "./ClientNav.module.css";

const ITEMS: Array<{ href: Route; label: string; glyph: string }> = [
  { href: "/", label: "Mijn gegevens", glyph: "◉" },
];

/** Sits at the bottom, where a thumb is. Nothing here depends on hover. */
export function ClientNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <nav className={s.nav} aria-label="Hoofdmenu">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={isActive(item.href) ? `${s.item} ${s.itemOn}` : s.item}
          aria-current={isActive(item.href) ? "page" : undefined}
        >
          <span className={s.glyph} aria-hidden="true">
            {item.glyph}
          </span>
          {item.label}
        </Link>
      ))}
      <form action="/auth/signout" method="post" className={s.signoutForm}>
        <button type="submit" className={s.item}>
          <span className={s.glyph} aria-hidden="true">
            ⏻
          </span>
          Uitloggen
        </button>
      </form>
    </nav>
  );
}
