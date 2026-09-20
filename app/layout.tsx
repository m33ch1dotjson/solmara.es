import type { Metadata, Viewport } from "next";
import { brand } from "@/lib/brand";
import "./globals.css";

/*
 * The root is the client portal, so the default title is the client-facing brand.
 * The staff side overrides it in app/admin/layout.tsx.
 */
export const metadata: Metadata = {
  title: { default: brand.clientName, template: `%s · ${brand.clientName}` },
  description: "Follow your case, send us what we need, and keep your documents.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/*
 * Theme is resolved before first paint so the page never flashes light before
 * switching to dark. It reads the stored preference, falls back to the system
 * setting, and writes `data-theme` on the document element.
 */
const themeScript = `
(function(){
  try {
    var stored = localStorage.getItem('solmara-theme');
    var system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', stored || system);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={brand.defaultLocale} suppressHydrationWarning>
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
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body style={{ ["--accent-h" as string]: String(brand.accentHue) }}>{children}</body>
    </html>
  );
}
