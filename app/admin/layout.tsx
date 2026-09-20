import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/staff/AdminShell";
import { StaffLogin } from "@/components/staff/StaffLogin";
import { currentActor } from "@/lib/auth/session";
import { brand } from "@/lib/brand";
import { copy } from "@/lib/i18n";
import { currentLocale } from "@/lib/locale";
import { initialsFor, myStaffProfile } from "@/lib/queries";
import { BUCKET_WORKSPACE, signedUrl } from "@/lib/storage";
import s from "./staff.module.css";

export const metadata: Metadata = {
  title: { default: brand.staffName, template: `%s · ${brand.staffName}` },
};

/*
 * Every admin screen sits behind this. The check lives in the layout rather than in
 * each page, so a page added later is protected by default instead of by someone
 * remembering.
 *
 * A signed-out visitor gets the staff sign-in here, on /admin itself — no bounce to
 * the client portal's door. A signed-in client gets sent to their own side, because
 * this is not their building.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await currentActor();

  if (!actor) {
    /*
     * The theme class, but not the shell: above 900px the shell is a two-column grid
     * whose first column is the 240px navigation. With only the sign-in card inside
     * it, the card landed in that 240px column — squeezed against the left edge of a
     * desktop screen instead of centred. The card brings its own full-height, centred
     * screen.
     */
    return (
      <div className="themeStaff">
        <StaffLogin brandName={brand.staffName} />
      </div>
    );
  }

  if (actor.kind !== "staff") redirect("/");

  /*
   * EXTERNAL exists as a role but has no data yet: app.is_staff() excludes it, so
   * every query would come back empty. An empty portal looks broken; this says what
   * is actually going on.
   */
  if (actor.role === "EXTERNAL") {
    const t = copy(await currentLocale());
    return (
      <div className={`themeStaff ${s.shell}`}>
        <main className={s.main}>
          <div className={s.screen}>
            <h1 className={s.pageTitle}>{t.team.externalTitle}</h1>
            <p className={s.pageLead}>{t.team.externalBody}</p>
            <form action="/auth/signout" method="post">
              <button type="submit" className={s.pageLead}>
                {t.common.signOut}
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  /*
   * The face in the header comes from the same row as the one in the team table and
   * the one on the profile screen: staff_user.avatar_key, signed here. One source,
   * so a colleague who changes their photograph changes it everywhere.
   */
  const [locale, me] = await Promise.all([currentLocale(), myStaffProfile(actor)]);
  const avatarUrl = me?.avatarKey ? await signedUrl(BUCKET_WORKSPACE, me.avatarKey) : null;

  return (
    <div className={`themeStaff ${s.shell}`}>
      <AdminShell
        brandName={brand.staffName}
        isAdmin={actor.role === "ADMIN"}
        locale={locale}
        supportEmail={brand.supportEmail}
        user={{
          name: me?.name ?? actor.name,
          initials: me?.initials ?? initialsFor(actor.name),
          avatarUrl,
        }}
      >
        {children}
      </AdminShell>
    </div>
  );
}
