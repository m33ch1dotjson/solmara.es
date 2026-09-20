import { setLocaleAction } from "@/app/locale-actions";
import type { Locale } from "@/lib/brand";
import { LOCALES, LOCALE_NAME, LOCALE_SHORT } from "@/lib/i18n";
import s from "./LanguageSwitcher.module.css";

/*
 * Three buttons in a row: NL · EN · ES.
 *
 * A form rather than a dropdown, and no client-side state. Three options fit on a
 * phone, and a plain form POST means the switcher works before any JavaScript has
 * arrived — which matters most on the sign-in and invite screens, where somebody
 * who cannot read the page yet is the one who needs it.
 *
 * Each button is titled with its language's own name. Somebody looking for Spanish
 * is looking for "Español", not for the Dutch word for it.
 *
 * No directive of its own: it uses no hooks, so it compiles into whichever graph
 * imports it — the header on the staff side is a client component, the client
 * portal's is not.
 */
export function LanguageSwitcher({
  locale,
  size = "compact",
}: {
  locale: Locale;
  size?: "compact" | "tall";
}) {
  return (
    <form
      action={setLocaleAction}
      className={size === "tall" ? `${s.group} ${s.tall}` : s.group}
      aria-label={LOCALE_NAME[locale]}
    >
      {LOCALES.map((option) => {
        const current = option === locale;
        return (
          <button
            key={option}
            type="submit"
            name="locale"
            value={option}
            className={current ? `${s.option} ${s.on}` : s.option}
            title={LOCALE_NAME[option]}
            lang={option}
            aria-current={current ? "true" : undefined}
          >
            {LOCALE_SHORT[option]}
          </button>
        );
      })}
    </form>
  );
}
