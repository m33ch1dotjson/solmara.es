import { cookies, headers } from "next/headers";
import { brand, type Locale } from "./brand";
import { DATE_DEFAULTS, isDateStyle, isLocale, type DatePrefs } from "./i18n";

/*
 * Which language a visitor gets.
 *
 * Server only — it reads cookies and headers. Client components get the answer
 * through LocaleProvider rather than working it out again.
 *
 * Three sources, in order:
 *   1. the cookie, which is the visitor's own choice and always wins;
 *   2. Accept-Language, so a Spanish phone opening an invite link is in Spanish
 *      before anyone touches the switcher;
 *   3. the brand default.
 *
 * The cookie is deliberately not HttpOnly: it holds a display preference, nothing
 * that identifies anyone, and the sign-out route has no business clearing it — a
 * client who signs out and comes back should still find their language.
 */

export const LOCALE_COOKIE = "solmavera-locale";

/** A year. A language preference does not go stale. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Picks our best match out of an Accept-Language header, honouring q-weights.
 * "es-419,es;q=0.9,en;q=0.7" gives Spanish; a header we share nothing with gives null.
 */
export function preferredFromHeader(header: string | null): Locale | null {
  if (!header) return null;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="))
        ?.slice(2);
      const weight = q === undefined ? 1 : Number.parseFloat(q);
      return { base: tag.trim().toLowerCase().split("-")[0] ?? "", weight };
    })
    .filter((entry) => entry.base !== "" && Number.isFinite(entry.weight) && entry.weight > 0)
    .sort((a, b) => b.weight - a.weight);

  for (const { base } of ranked) {
    if (isLocale(base)) return base;
  }
  return null;
}

export async function currentLocale(): Promise<Locale> {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;

  return preferredFromHeader((await headers()).get("accept-language")) ?? brand.defaultLocale;
}

/*
 * Date preferences travel the same way the language does: stored on the colleague's
 * row, mirrored into a cookie when they save them, read from the cookie on every
 * render. The cookie is what makes them apply before anything queries the database,
 * and the row is what carries them to the next machine.
 */

export const DATE_STYLE_COOKIE = "solmavera-dates";
export const TIME_ZONE_COOKIE = "solmavera-tz";

export async function currentDatePrefs(): Promise<DatePrefs> {
  const jar = await cookies();
  const style = jar.get(DATE_STYLE_COOKIE)?.value;
  const timeZone = jar.get(TIME_ZONE_COOKIE)?.value;

  return {
    style: isDateStyle(style) ? style : DATE_DEFAULTS.style,
    // Not validated against a list: the zone names change more often than we would
    // update the list, and Intl falls back to UTC on a name it does not know.
    timeZone: timeZone || undefined,
  };
}
