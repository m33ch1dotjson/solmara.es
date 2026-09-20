import Link from "next/link";
import { NotificationForm } from "@/components/staff/NotificationForm";
import { PasswordForm } from "@/components/staff/PasswordForm";
import { PreferencesForm } from "@/components/staff/PreferencesForm";
import { ProfileForm } from "@/components/staff/ProfileForm";
import { SecurityExtras } from "@/components/staff/SecurityExtras";
import { staffOrRedirect } from "@/lib/auth/session";
import { copy } from "@/lib/i18n";
import { currentLocale } from "@/lib/locale";
import { myStaffProfile, NOTIFY_DEFAULTS } from "@/lib/queries";
import { BUCKET_WORKSPACE, signedUrl } from "@/lib/storage";
import shell from "../staff.module.css";
import s from "./account.module.css";

/*
 * One screen, four tabs: Profile, Security, Notifications, Preferences.
 *
 * The tabs are links with a query parameter, not client state. A tab you can link
 * to, open in a second window and reload is worth more than one that animates, and
 * it keeps three of the four panels out of the browser's hands entirely.
 */

const TABS = ["profile", "security", "notifications", "preferences"] as const;
type Tab = (typeof TABS)[number];

export async function generateMetadata() {
  return { title: copy(await currentLocale()).account.title };
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [actor, locale, query] = await Promise.all([
    staffOrRedirect(),
    currentLocale(),
    searchParams,
  ]);
  const t = copy(locale);

  const tab: Tab = TABS.includes(query.tab as Tab) ? (query.tab as Tab) : "profile";
  const me = await myStaffProfile(actor);

  const avatarUrl = me?.avatarKey ? await signedUrl(BUCKET_WORKSPACE, me.avatarKey) : null;
  const notify = { ...NOTIFY_DEFAULTS, ...((me?.notify as Record<string, boolean>) ?? {}) };

  const roleLabel =
    actor.role === "ADMIN"
      ? t.account.roleAdmin
      : actor.role === "EXTERNAL"
        ? t.account.roleExternal
        : t.account.roleStaff;

  const label: Record<Tab, string> = {
    profile: t.account.tabProfile,
    security: t.account.tabSecurity,
    notifications: t.account.tabNotifications,
    preferences: t.account.tabPreferences,
  };

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>{t.account.title}</h1>
      </div>
      <p className={shell.pageLead}>{t.account.lead}</p>

      <nav className={s.tabs} aria-label={t.account.title}>
        {/* Spelled out rather than mapped: typedRoutes infers a route from the
            literal, and a variable widened to string does not pass. */}
        <Link
          href="/admin/account?tab=profile"
          className={tab === "profile" ? `${s.tab} ${s.tabOn}` : s.tab}
          aria-current={tab === "profile" ? "page" : undefined}
        >
          {label.profile}
        </Link>
        <Link
          href="/admin/account?tab=security"
          className={tab === "security" ? `${s.tab} ${s.tabOn}` : s.tab}
          aria-current={tab === "security" ? "page" : undefined}
        >
          {label.security}
        </Link>
        <Link
          href="/admin/account?tab=notifications"
          className={tab === "notifications" ? `${s.tab} ${s.tabOn}` : s.tab}
          aria-current={tab === "notifications" ? "page" : undefined}
        >
          {label.notifications}
        </Link>
        <Link
          href="/admin/account?tab=preferences"
          className={tab === "preferences" ? `${s.tab} ${s.tabOn}` : s.tab}
          aria-current={tab === "preferences" ? "page" : undefined}
        >
          {label.preferences}
        </Link>
      </nav>

      {tab === "profile" && (
        <ProfileForm
          name={me?.name ?? actor.name}
          email={actor.email}
          roleLabel={roleLabel}
          initials={me?.initials ?? "?"}
          avatarUrl={avatarUrl}
        />
      )}

      {tab === "security" && (
        <>
          <section className={s.card}>
            <h2 className={s.cardTitle}>{t.account.setPassword}</h2>
            <p className={s.cardLead}>{t.account.setPasswordLead}</p>
            <PasswordForm />
          </section>
          <SecurityExtras />
        </>
      )}

      {tab === "notifications" && <NotificationForm values={notify} />}

      {tab === "preferences" && (
        <PreferencesForm
          locale={locale}
          theme={me?.theme ?? "light"}
          timeZone={me?.timeZone ?? "Europe/Madrid"}
          dateStyle={me?.dateStyle ?? "LONG"}
        />
      )}
    </div>
  );
}
