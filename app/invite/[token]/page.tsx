import { InviteSignup } from "@/components/client/InviteSignup";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { PortalBrand } from "@/components/ui/PortalBrand";
import { brand } from "@/lib/brand";
import { copy, fill } from "@/lib/i18n";
import { currentLocale } from "@/lib/locale";
import { lookupInvite } from "@/lib/queries";
import s from "./invite.module.css";

export async function generateMetadata() {
  return { title: copy(await currentLocale()).invite.metaTitle };
}

/*
 * Where the link from a staff member lands.
 *
 * The visitor is not signed in, so this page reads the invite through a database
 * function that takes the token as its only key — there is no query here that could
 * return somebody else's file.
 *
 * An invalid or expired token gets the same neutral screen as an unknown one: no
 * hint about whether it ever existed, and no address shown.
 *
 * This is often the first thing a client ever sees of us, and quite possibly in a
 * language they do not read, so the switcher sits at the top of both states.
 */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [invite, locale] = await Promise.all([lookupInvite(token), currentLocale()]);
  const t = copy(locale);

  if (!invite || !invite.valid) {
    return (
      <main className={`themeClient ${s.shell}`}>
        <div className={s.column}>
          <div className={s.topRow}>
            <LanguageSwitcher locale={locale} size="tall" />
          </div>
          <PortalBrand href="/signin" size={34} label={brand.clientName} />
          <h1 className={s.h1}>{t.invite.deadTitle}</h1>
          <p className={s.body}>{fill(t.invite.deadBody, { brand: brand.clientName })}</p>
        </div>
      </main>
    );
  }

  return (
    <main className={`themeClient ${s.shell}`}>
      <div className={s.column}>
        <div className={s.topRow}>
          <LanguageSwitcher locale={locale} size="tall" />
        </div>
        <PortalBrand href="/signin" size={34} label={brand.clientName} />
        <h1 className={s.h1}>
          {fill(t.invite.welcome, {
            name: invite.client_name.split(" ")[0] ?? invite.client_name,
          })}
        </h1>
        <p className={s.body}>{fill(t.invite.body, { brand: brand.clientName })}</p>

        <InviteSignup email={invite.email} />

        <p className={s.note}>{t.invite.note}</p>
      </div>
    </main>
  );
}
