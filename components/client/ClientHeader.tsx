import { Logo } from "@/components/ui/Logo";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { brand, type Locale } from "@/lib/brand";
import { copy } from "@/lib/i18n";
import s from "./ClientHeader.module.css";

/*
 * A header, not a navigation bar.
 *
 * The client portal is one page. The bottom bar it used to have came from the
 * phone-first design, where navigation sits under the thumb — but with a single
 * destination there is nothing to navigate to, and a bar holding one live button
 * reads as clutter.
 */
export function ClientHeader({ name, locale }: { name: string; locale: Locale }) {
  const t = copy(locale);

  return (
    <header className={s.bar}>
      <div className={s.brand}>
        <Logo size={30} className={s.logo} />
        <span className={s.wordmark}>{brand.clientName}</span>
      </div>

      <div className={s.right}>
        <span className={s.name}>{name}</span>
        <LanguageSwitcher locale={locale} size="tall" />
        <form action="/auth/signout" method="post">
          <button type="submit" className={s.signout}>
            {t.common.signOut}
          </button>
        </form>
      </div>
    </header>
  );
}
