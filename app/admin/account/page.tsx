import { PasswordForm } from "@/components/staff/PasswordForm";
import { Mono } from "@/components/ui";
import { staffOrRedirect } from "@/lib/auth/session";
import shell from "../staff.module.css";
import s from "../admin.module.css";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const actor = await staffOrRedirect();

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>Account</h1>
      </div>
      <p className={shell.pageLead}>
        Je bent ingelogd als <strong>{actor.name}</strong> — <Mono size={13}>{actor.email}</Mono>,
        rol {actor.role === "ADMIN" ? "admin" : "medewerker"}.
      </p>

      <h2 className={s.sectionTitle}>Wachtwoord instellen</h2>
      <p className={shell.pageLead}>
        Daarna kun je inloggen met je e-mailadres en dit wachtwoord, zonder op een link te wachten.
      </p>

      <PasswordForm />
    </div>
  );
}
