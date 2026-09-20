"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale } from "@/lib/brand";
import { copy, type Copy } from "@/lib/i18n";

/*
 * How a client component learns which language it is in.
 *
 * The server resolves the language once, in the root layout, and hands it down as
 * one string. Threading it through props instead would mean every form and button
 * carrying a locale prop it does not otherwise care about, and the deepest ones —
 * an upload slot, a delete button — are four layers from anything that knows.
 *
 * Server components do not use this: they call copy(await currentLocale()) directly,
 * which is cheaper than rendering a provider they cannot read anyway.
 */

interface LocaleContext {
  locale: Locale;
  t: Copy;
}

/** Only reached if a client component renders outside the root layout, which none do. */
const FALLBACK: Locale = "en";

const Ctx = createContext<LocaleContext>({ locale: FALLBACK, t: copy(FALLBACK) });

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ locale, t: copy(locale) }), [locale]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The dictionary in the visitor's language, plus the language itself for dates. */
export function useCopy(): LocaleContext {
  return useContext(Ctx);
}
