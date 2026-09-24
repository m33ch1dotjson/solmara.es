import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";

/*
 * What a phone needs before it will treat this as an app.
 *
 * Served at /manifest.webmanifest by the framework, so there is no static file to
 * keep in step with the brand: the names come from lib/brand.ts like everything else.
 *
 * start_url is the portal root rather than the sign-in screen. A client who is still
 * signed in lands on their own page; one who is not is sent to sign in by the page
 * itself. Pointing the icon straight at /signin would send the first group through a
 * redirect on every launch.
 *
 * The two shortcuts are for the long-press menu: colleagues live in /admin and
 * clients in /, and one icon on a home screen cannot know which of the two you are.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.clientName} Portal`,
    short_name: brand.clientName,
    description: `${brand.clientName} Client Portal`,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    /* The portal's own surfaces, not invented ones: the page background a launch
       screen fades in over, and the mark's orange for the browser's chrome. */
    background_color: "#f5f6f7",
    theme_color: "#f16b3c",
    lang: brand.defaultLocale,
    dir: "ltr",
    categories: ["business", "productivity"],
    icons: [
      { src: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: `${brand.clientName} Portal`, url: "/", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: brand.staffName, url: "/admin", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
