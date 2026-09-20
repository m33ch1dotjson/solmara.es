import { PasswordForm } from "@/components/staff/PasswordForm";
import { staffOrRedirect } from "@/lib/auth/session";
import { copy, fill } from "@/lib/i18n";
import { currentLocale } from "@/lib/locale";
import shell from "../staff.module.css";
import s from "../admin.module.css";

export async function generateMetadata() {
  return { title: copy(await currentLocale()).account.title };
}

export default async function AccountPage() {
  const [actor, locale] = await Promise.all([staffOrRedirect(), currentLocale()]);
  const t = copy(locale);

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>{t.account.title}</h1>
      </div>
      <p className={shell.pageLead}>
        {fill(t.account.signedInAs, {
          name: actor.name,
          email: actor.email,
          role: actor.role === "ADMIN" ? t.account.roleAdmin : t.account.roleStaff,
        })}
      </p>

      <h2 className={s.sectionTitle}>{t.account.setPassword}</h2>
      <p className={shell.pageLead}>{t.account.setPasswordLead}</p>

      <PasswordForm />
    </div>
  );
}
