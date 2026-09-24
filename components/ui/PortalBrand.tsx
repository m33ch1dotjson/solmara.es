import type { Route } from "next";
import Link from "next/link";
import { Logo } from "./Logo";
import s from "./PortalBrand.module.css";

/*
 * The mark and the name, top left, always a way back.
 *
 * A logo in the corner reads as "home" to everybody who has ever used a website, so
 * it had better behave like one. Every screen that shows it — the sign-in, the
 * registration, the new-password screen, the invitation — hands it the page you
 * would expect to land on from there, which for a signed-out visitor is the sign-in
 * screen and for a signed-in client is their own page.
 *
 * The staff side does the same thing with its own sidebar brand, pointing at the
 * overview. One rule, both portals.
 */
export function PortalBrand({
  href,
  label,
  size = 38,
}: {
  href: Route;
  /** Omitted on the invitation screen, where the mark stands on its own. */
  label?: string;
  size?: number;
}) {
  return (
    <Link href={href} className={s.brand} aria-label={label}>
      <Logo size={size} className={s.logo} />
      {label && <span className={s.name}>{label}</span>}
    </Link>
  );
}
