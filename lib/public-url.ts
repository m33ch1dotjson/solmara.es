/*
 * Absolute URLs that point at the public site.
 *
 * A redirect built from `request.url` is wrong behind a tunnel: the app listens on
 * 0.0.0.0:3000, so that is what the request carries, and the browser is sent to
 * https://0.0.0.0:3000 — an address that cannot resolve.
 *
 * The forwarded headers are what cloudflared actually knows about the outside world,
 * so they come first. The configured domain is the fallback, which also means a
 * direct request to the container's IP still redirects somewhere usable.
 */

import { brand } from "./brand";

export function publicOrigin(headers: Headers): string {
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  const proto = headers.get("x-forwarded-proto") ?? "https";

  // 0.0.0.0 and friends mean the header came from the listening socket rather than
  // from a proxy; they are never a host a browser can use.
  const unusable = !host || /^(0\.0\.0\.0|127\.0\.0\.1|\[?::\]?)(:\d+)?$/.test(host);
  if (unusable) return `https://${brand.portalDomain}`;

  return `${proto}://${host}`;
}

export function publicUrl(headers: Headers, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${publicOrigin(headers)}${clean}`;
}
