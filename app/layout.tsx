import type { Metadata, Viewport } from "next";
import { LocaleProvider } from "@/components/ui/LocaleProvider";
import { brand } from "@/lib/brand";
import { currentDatePrefs, currentLocale } from "@/lib/locale";
import "./globals.css";

/*
 * The root is the client portal, so the default title is the client-facing brand.
 * The staff side overrides it in app/admin/layout.tsx.
 */
export const metadata: Metadata = {
  title: { default: brand.clientName, template: `%s · ${brand.clientName}` },
  description: "Follow your case, send us what we need, and keep your documents.",
  applicationName: brand.clientName,
  manifest: "/manifest.webmanifest",

  /*
   * The tab and the home screen.
   *
   * app/icon.svg is picked up by the framework on its own; the rest is listed here
   * because a browser that cannot read SVG still needs somewhere to go, and iOS only
   * ever looks for an apple-touch-icon. All of them are generated from the same
   * vector by scripts/make-icons.mjs — see the note there about why the wordmark is
   * not in any of them.
   */
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico", sizes: "48x48" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },

  /*
   * Added to a home screen this opens without browser chrome, under the short name.
   * "Solmavera" rather than "Solmavera Portal": iOS truncates a home-screen label at
   * roughly twelve characters, and "Solmavera P…" is worse than no subtitle at all.
   */
  appleWebApp: {
    capable: true,
    title: brand.clientName,
    // The status bar keeps its own background and the page starts below it. Not
    // "black-translucent", which slides the layout under the clock.
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the page reach into the notch area, which the safe-area padding in
  // globals.css then keeps content out of.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f7" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1d21" },
  ],
};

/*
 * Theme is resolved before first paint so the page never flashes the wrong one.
 *
 * Light unless somebody asked for dark. It used to follow the operating system,
 * which meant a colleague with a dark laptop was handed a dark portal they had never
 * chosen — the owner saw it on a strange machine and did not recognise his own
 * product. Following the system is still available, but only if somebody picks it in
 * Preferences; it is no longer what happens when nobody has said anything.
 */
const themeScript = `
(function(){
  try {
    var stored = localStorage.getItem('solmara-theme');
    var theme = stored === 'dark' ? 'dark'
      : stored === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : 'light';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`;

/*
 * Language is resolved once, here, and put in two places: `lang` on <html>, so
 * screen readers and spellcheckers pronounce the page correctly, and the provider,
 * so every client component below can read its own copy.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, dates] = await Promise.all([currentLocale(), currentDatePrefs()]);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/*
          Fonts are loaded with a stylesheet link rather than next/font, which
          fetches the files at build time. A link keeps the build runnable on a
          network where the font CDN is unreachable; self-host these before going
          to production so the portal does not depend on Google at runtime.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        {/*
          The framework emits the modern `mobile-web-app-capable`, which Safari only
          learned to read in 16.4. An iPhone a year or two older still looks for the
          Apple-prefixed one, and without it "Add to Home Screen" opens the portal in
          a browser tab rather than as an app. Two bytes of legacy, several years of
          phones.
        */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body style={{ ["--accent-h" as string]: String(brand.accentHue) }}>
        <LocaleProvider locale={locale} dates={dates}>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
