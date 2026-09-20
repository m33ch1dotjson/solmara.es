"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import s from "./AdminTabs.module.css";

const TABS: Array<{ href: Route; label: string }> = [
  { href: "/admin", label: "Klanten" },
  { href: "/admin/sop", label: "SOP" },
  { href: "/admin/properties", label: "Properties" },
];

export function AdminTabs({ brandName, user }: { brandName: string; user: string }) {
  const pathname = usePathname();

  function isActive(href: string) {
    // /admin is the clients tab, so it matches exactly rather than prefixing the others.
    return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  }

  return (
    <header className={s.bar}>
      <div className={s.brand}>
        <span className={s.logo} aria-hidden="true" />
        <span className={s.brandName}>{brandName}</span>
      </div>

      <nav className={s.tabs}>
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={isActive(tab.href) ? `${s.tab} ${s.tabOn}` : s.tab}
            aria-current={isActive(tab.href) ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className={s.right}>
        <Link href="/admin/account" className={s.user}>
          {user}
        </Link>
        <ThemeToggle variant="compact" />
        <form action="/auth/signout" method="post">
          <button type="submit" className={s.signout}>
            Uitloggen
          </button>
        </form>
      </div>
    </header>
  );
}
