"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useCopy } from "@/components/ui/LocaleProvider";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import s from "./AdminTabs.module.css";

export function AdminTabs({ brandName, user }: { brandName: string; user: string }) {
  const { t, locale } = useCopy();
  const pathname = usePathname();

  // The hrefs are inline on each Link below rather than held in a list: typedRoutes
  // infers a route from the literal, and a variable widened to string does not pass.
  function isActive(href: string) {
    // /admin is the clients tab, so it matches exactly rather than prefixing the others.
    return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  }

  function tabClass(href: Route) {
    return isActive(href) ? `${s.tab} ${s.tabOn}` : s.tab;
  }

  function current(href: Route) {
    return isActive(href) ? ("page" as const) : undefined;
  }

  return (
    <header className={s.bar}>
      <div className={s.brand}>
        <Logo size={30} className={s.logo} />
        <span className={s.brandName}>{brandName}</span>
      </div>

      <nav className={s.tabs}>
        <Link href="/admin" className={tabClass("/admin")} aria-current={current("/admin")}>
          {t.nav.clients}
        </Link>
        <Link
          href="/admin/sop"
          className={tabClass("/admin/sop")}
          aria-current={current("/admin/sop")}
        >
          {t.nav.procedures}
        </Link>
        <Link
          href="/admin/properties"
          className={tabClass("/admin/properties")}
          aria-current={current("/admin/properties")}
        >
          {t.nav.properties}
        </Link>
      </nav>

      <div className={s.right}>
        <Link href="/admin/account" className={s.user}>
          {user}
        </Link>
        <div className={s.controls}>
          <LanguageSwitcher locale={locale} />
          <ThemeToggle variant="compact" />
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" className={s.signout}>
            {t.common.signOut}
          </button>
        </form>
      </div>
    </header>
  );
}
