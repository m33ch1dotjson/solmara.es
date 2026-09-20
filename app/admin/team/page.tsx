import { TeamTable } from "@/components/staff/TeamTable";
import { adminOrRedirect } from "@/lib/auth/session";
import { copy, formatDateFor } from "@/lib/i18n";
import { currentDatePrefs, currentLocale } from "@/lib/locale";
import { listTeam } from "@/lib/queries";
import { BUCKET_WORKSPACE, signedUrl } from "@/lib/storage";
import shell from "../staff.module.css";

/*
 * Who may open the portal at all.
 *
 * Admin only. The roles here are not decoration: STAFF and ADMIN differ by the two
 * administration screens, and EXTERNAL is currently locked out of everything by
 * app.is_staff() until per-client assignment exists. See the note on the page.
 */

export async function generateMetadata() {
  return { title: copy(await currentLocale()).team.title };
}

export default async function TeamPage() {
  const [actor, locale, dates] = await Promise.all([
    adminOrRedirect(),
    currentLocale(),
    currentDatePrefs(),
  ]);
  const t = copy(locale);
  const team = await listTeam(actor);

  const rows = await Promise.all(
    team.map(async (member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      active: member.active,
      initials: member.initials,
      hasSignedIn: member.authUserId !== null,
      since: formatDateFor(member.createdAt, locale, dates),
      avatarUrl: member.avatarKey ? await signedUrl(BUCKET_WORKSPACE, member.avatarKey) : null,
    })),
  );

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>{t.team.title}</h1>
      </div>
      <p className={shell.pageLead}>{t.team.lead}</p>

      <TeamTable rows={rows} meId={actor.id} />
    </div>
  );
}
