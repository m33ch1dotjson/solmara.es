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
  IconTeam,
  IconWorkspace,
} from "@/components/ui/Icons";
import { useCopy } from "@/components/ui/LocaleProvider";
import { Logo } from "@/components/ui/Logo";
import s from "./AdminTabs.module.css";

/*
 * The staff navigation, and nothing else.
 *
 * Grouped under three headings so the working screens, your own account and the two
 * admin screens do not sit in one undifferentiated list. Each row carries an icon,
 * which is what makes a list this long scannable rather than read.
 *
 * Below 900px it is a drawer: off-canvas until the header's hamburger opens it.
 */
export function AdminTabs({
  brandName,
  isAdmin,
  open,
}: {
  brandName: string;
  isAdmin: boolean;
  open: boolean;
}) {
  const { t } = useCopy();
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
    <nav
      className={open ? `${s.bar} ${s.barOpen}` : s.bar}
      aria-label={t.nav.portal}
      aria-hidden={undefined}
    >
      <div className={s.brand}>
        <Logo size={36} className={s.logo} />
        <span className={s.brandName}>{brandName}</span>
      </div>

      <div className={s.tabs}>
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
          href="/admin/process-guide"
          className={tabClass("/admin/process-guide")}
          aria-current={current("/admin/process-guide")}
        >
          <IconProcedures />
          {t.nav.guides}
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
          {t.nav.myAccount}
        </Link>

        {/* Hiding these is a courtesy, not the permission: both pages check the role
            again, and so does the database. */}
        {isAdmin && (
          <>
            <span className={`${s.group} ${s.groupLater}`}>{t.nav.administration}</span>

            <Link
              href="/admin/workspace"
              className={tabClass("/admin/workspace")}
              aria-current={current("/admin/workspace")}
            >
              <IconWorkspace />
              {t.nav.workspace}
            </Link>
            <Link
              href="/admin/team"
              className={tabClass("/admin/team")}
              aria-current={current("/admin/team")}
            >
              <IconTeam />
              {t.nav.team}
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
