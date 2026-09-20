"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "./LocaleProvider";
import { CLIENT_TERMS } from "@/lib/client-terms";
import s from "./ClientNav.module.css";

/*
 * Four destinations, fixed to the bottom of the screen where a thumb reaches.
 *
 * Four is the whole nav. A client visits twice per case and does not want a menu —
 * they want to know what is needed, and to get their NIE certificate back when they
 * are standing at a bank counter.
 *
 * Hidden on sign-in, where there is nothing to navigate to yet.
 */
export function ClientNav() {
  const pathname = usePathname();
  const { locale } = useLocale();
  const terms = CLIENT_TERMS[locale];

  if (pathname.startsWith("/signin")) return null;

  // `Route` keeps typedRoutes happy: the hrefs are checked against the real routes
  // rather than being plain strings.
  const items: Array<{ href: Route; label: string; glyph: string }> = [
    { href: "/", label: terms.services, glyph: "▤" },
    { href: "/documents", label: terms.documents, glyph: "▣" },
    { href: "/profile", label: terms.profile, glyph: "◉" },
  ];

  function isActive(href: string): boolean {
    // The home route is the client portal's root, so it must match exactly —
    // startsWith("/") would light up every item on every screen.
    if (href === "/") return pathname === "/" || pathname.startsWith("/services");
    return pathname.startsWith(href);
  }

  return (
    <nav className={s.nav} aria-label={terms.home}>
      <div className={s.inner}>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(item.href) ? `${s.item} ${s.itemOn}` : s.item}
            aria-current={isActive(item.href) ? "page" : undefined}
          >
            <span className={s.glyph} aria-hidden="true">
              {item.glyph}
            </span>
            <span className={s.label}>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
