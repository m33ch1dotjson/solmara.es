"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/staff/AccountMenu";
import { AdminTabs } from "@/components/staff/AdminTabs";
import { LanguagePicker } from "@/components/ui/LanguagePicker";
import { useCopy } from "@/components/ui/LocaleProvider";
import type { Locale } from "@/lib/brand";
import s from "./AdminShell.module.css";

/*
 * The frame every staff screen sits in: navigation on the left, a thin header on
 * top, content below it.
 *
 * The header is where the account controls live now. They used to be stacked at the
 * bottom of the rail — a name, a language switcher, a theme button and a sign-out
 * button — which took a fifth of the navigation for things nobody clicks daily.
 *
 * On a phone the rail becomes a drawer behind the hamburger, because a 240px column
 * on a 390px screen is most of the screen.
 */
export function AdminShell({
  brandName,
  isAdmin,
  locale,
  user,
  supportEmail,
  children,
}: {
  brandName: string;
  isAdmin: boolean;
  locale: Locale;
  user: { name: string; initials: string; avatarUrl: string | null };
  supportEmail: string;
  children: React.ReactNode;
}) {
  const { t } = useCopy();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  // A tap on a link has to close the drawer: the route changes underneath it and an
  // open drawer over the page you just asked for is the classic mobile-nav bug.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setNavOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  /*
   * Which section you are in, in words, next to the hamburger. Longest match wins,
   * so /admin/clients/<id> still says Clients rather than falling through to the
   * overview. Not a breadcrumb trail: one word is enough to know where you are.
   */
  const sections: Array<[string, string]> = [
    ["/admin/clients", t.nav.clients],
    ["/admin/process-guide", t.nav.guides],
    ["/admin/properties", t.nav.properties],
    ["/admin/documents", t.nav.documents],
    ["/admin/tasks", t.nav.tasks],
    ["/admin/invoices", t.nav.invoices],
    ["/admin/account", t.nav.myAccount],
    ["/admin/workspace", t.nav.workspace],
    ["/admin/team", t.nav.team],
  ];
  const section = sections.find(([href]) => pathname.startsWith(href))?.[1] ?? t.nav.overview;

  return (
    <>
      <AdminTabs
        brandName={brandName}
        isAdmin={isAdmin}
        open={navOpen}
        supportEmail={supportEmail}
      />

      {navOpen && (
        <button
          type="button"
          className={s.backdrop}
          aria-label={t.common.close}
          onClick={() => setNavOpen(false)}
        />
      )}

      <div className={s.column}>
        <header className={s.header}>
          <button
            type="button"
            className={s.hamburger}
            aria-label={t.nav.menu}
            aria-expanded={navOpen}
            onClick={() => setNavOpen((was) => !was)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>

          <span className={s.section}>{section}</span>

          <div className={s.controls}>
            <LanguagePicker locale={locale} />
            <AccountMenu
              name={user.name}
              initials={user.initials}
              avatarUrl={user.avatarUrl}
              isAdmin={isAdmin}
            />
          </div>
        </header>

        <main className={s.main}>{children}</main>
      </div>
    </>
  );
}
