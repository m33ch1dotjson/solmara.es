import { InviteSignup } from "@/components/client/InviteSignup";
import { brand } from "@/lib/brand";
import { lookupInvite } from "@/lib/queries";
import s from "./invite.module.css";

export const metadata = { title: "Uitnodiging" };

/*
 * Where the link from a staff member lands.
 *
 * The visitor is not signed in, so this page reads the invite through a database
 * function that takes the token as its only key — there is no query here that could
 * return somebody else's file.
 *
 * An invalid or expired token gets the same neutral screen as an unknown one: no
 * hint about whether it ever existed, and no address shown.
 */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await lookupInvite(token);

  if (!invite || !invite.valid) {
    return (
      <main className={`themeClient ${s.shell}`}>
        <div className={s.column}>
          <span className={s.logo} aria-hidden="true" />
          <h1 className={s.h1}>Deze link werkt niet meer</h1>
          <p className={s.body}>
            De link is verlopen of al gebruikt. Vraag uw contactpersoon bij {brand.clientName} om
            een nieuwe — dat kost hen één klik.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={`themeClient ${s.shell}`}>
      <div className={s.column}>
        <span className={s.logo} aria-hidden="true" />
        <h1 className={s.h1}>Welkom {invite.client_name.split(" ")[0]}</h1>
        <p className={s.body}>
          Wij hebben een account voor u klaargezet bij {brand.clientName}. U krijgt een link per
          e-mail waarmee u meteen bent ingelogd — geen wachtwoord om te bedenken of te onthouden.
        </p>

        <InviteSignup email={invite.email} />

        <p className={s.note}>
          Daarna vult u uw gegevens in en stuurt u een foto van uw paspoort en een pasfoto. Dat
          duurt ongeveer vijf minuten met de camera van uw telefoon.
        </p>
      </div>
    </main>
  );
}
