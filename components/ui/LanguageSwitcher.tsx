import { setLocaleAction } from "@/app/locale-actions";
import type { Locale } from "@/lib/brand";
import { LOCALES, LOCALE_NAME } from "@/lib/i18n";
import { FLAG } from "./Flags";
import s from "./LanguageSwitcher.module.css";

/*
 * Three flags in a row: Dutch · English · Spanish.
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
        const Flag = FLAG[option];
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
            <Flag />
            {/* The name is what a screen reader reads out; the flag is only the
                picture. Without this the button would announce as empty. */}
            <span className={s.srOnly}>{LOCALE_NAME[option]}</span>
          </button>
        );
      })}
    </form>
  );
}
