"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconClients,
  IconDocuments,
  IconOverview,
  IconProcedures,
  IconProperties,
  IconSettings,
  IconTasks,
} from "@/components/ui/Icons";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useCopy } from "@/components/ui/LocaleProvider";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import s from "./AdminTabs.module.css";

/*
 * The staff navigation: a top bar on a phone, a left rail from 900px.
 *
 * Grouped under two headings, Portal and Account, so the working screens and the
 * things you touch once a year do not sit in one undifferentiated list. Each row
 * carries an icon, which is what makes a long list scannable rather than read.
 */
export function AdminTabs({ brandName, user }: { brandName: string; user: string }) {
  const { t, locale } = useCopy();
  const pathname = usePathname();

  // The hrefs are inline on each Link below rather than held in a list: typedRoutes
  // infers a route from the literal, and a variable widened to string does not pass.
  function isActive(href: string) {
    // /admin is the overview, so it matches exactly rather than prefixing the others.
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
        <Logo size={36} className={s.logo} />
        <span className={s.brandName}>{brandName}</span>
      </div>

      <nav className={s.tabs} aria-label={t.nav.portal}>
        <span className={s.group}>{t.nav.portal}</span>

        <Link href="/admin" className={tabClass("/admin")} aria-current={current("/admin")}>
          <IconOverview />
          {t.nav.overview}
        </Link>
        <Link
          href="/admin/clients"
          className={tabClass("/admin/clients")}
          aria-current={current("/admin/clients")}
        >
          <IconClients />
          {t.nav.clients}
        </Link>
        <Link
          href="/admin/properties"
          className={tabClass("/admin/properties")}
          aria-current={current("/admin/properties")}
        >
          <IconProperties />
          {t.nav.properties}
        </Link>
        <Link
          href="/admin/sop"
          className={tabClass("/admin/sop")}
          aria-current={current("/admin/sop")}
        >
          <IconProcedures />
          {t.nav.procedures}
        </Link>
        <Link
          href="/admin/documents"
          className={tabClass("/admin/documents")}
          aria-current={current("/admin/documents")}
        >
          <IconDocuments />
          {t.nav.documents}
        </Link>
        <Link
          href="/admin/tasks"
          className={tabClass("/admin/tasks")}
          aria-current={current("/admin/tasks")}
        >
          <IconTasks />
          {t.nav.tasks}
        </Link>

        <span className={`${s.group} ${s.groupLater}`}>{t.nav.account}</span>

        <Link
          href="/admin/account"
          className={tabClass("/admin/account")}
          aria-current={current("/admin/account")}
        >
          <IconSettings />
          {t.nav.settings}
        </Link>
      </nav>

      <div className={s.right}>
        <span className={s.user}>{user}</span>
        <div className={s.controls}>
          <LanguageSwitcher locale={locale} />
          <ThemeToggle />
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
