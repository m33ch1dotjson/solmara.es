"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { StaffUser } from "@/lib/domain";
import { STAFF_TERMS } from "@/lib/staff-terms";
import s from "./StaffNav.module.css";

/*
 * Six things and an admin group. Nothing more earns a permanent place in the nav.
 *
 * "Client upload link" used to sit here and no longer does: requesting documents is
 * something you do to a case, so the button lives on the case. A menu item that only
 * makes sense once you have already chosen a case does not belong in the nav.
 */

interface NavItem {
  /** Checked against the real routes by typedRoutes, not a free string. */
  href: Route;
  label: string;
  glyph: string;
  /** Mono count on the right. Empty for items that do not carry one. */
  count: string;
}

const MAIN: NavItem[] = [
  { href: "/admin/clients", label: STAFF_TERMS.clients, glyph: "◉", count: "96" },
  { href: "/admin", label: "My work", glyph: "◆", count: "14" },
  { href: "/admin/cases", label: STAFF_TERMS.cases, glyph: "▤", count: "38" },
  { href: "/admin/review", label: "Document review", glyph: "▣", count: "5" },
  { href: "/admin/calendar", label: "Calendar", glyph: "▦", count: "" },
];

const SETTINGS: NavItem[] = [
  { href: "/admin/settings/services", label: "Services & workflows", glyph: "⚙", count: "3" },
  { href: "/admin/settings/team", label: "Team", glyph: "◍", count: "4" },
  { href: "/admin/settings/branding", label: "Branding", glyph: "◈", count: "" },
];

export function StaffNav({ user, brandName }: { user: StaffUser; brandName: string }) {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    // /admin is the staff landing screen, so it matches exactly rather than
    // prefixing every other admin route.
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  function item(entry: NavItem) {
    return (
      <Link
        key={entry.href}
        href={entry.href}
        className={isActive(entry.href) ? `${s.item} ${s.itemActive}` : s.item}
        aria-current={isActive(entry.href) ? "page" : undefined}
      >
        <span className={s.itemGlyph} aria-hidden="true">
          {entry.glyph}
        </span>
        <span className={s.itemLabel}>{entry.label}</span>
        <span className={s.itemCount}>{entry.count}</span>
      </Link>
    );
  }

  return (
    <aside className={s.nav}>
      <div className={s.brand}>
        {/* Placeholder for the real mark; keep the 26px footprint. */}
        <div className={s.logo} aria-hidden="true" />
        <div className={s.brandName}>{brandName}</div>
      </div>

      <nav className={s.items}>{MAIN.map(item)}</nav>

      {/* Settings is for people who change how the system works, so it sits apart. */}
      {user.role === "ADMIN" || user.role === "CASE_MANAGER" ? (
        <nav className={s.adminGroup}>
          <div className={s.groupLabel}>Settings</div>
          {SETTINGS.map(item)}
        </nav>
      ) : null}

      <div className={s.footer}>
        <ThemeToggle />
        <div className={s.user}>
          <div className={s.avatar} aria-hidden="true">
            {user.initials}
          </div>
          <div className={s.userText}>
            <div className={s.userName}>{user.name}</div>
            <div className={s.userTitle}>{user.title}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
