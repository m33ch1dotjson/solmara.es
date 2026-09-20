import { brand } from "@/lib/brand";
import s from "./ClientHeader.module.css";

/*
 * A header, not a navigation bar.
 *
 * The client portal is one page. The bottom bar it used to have came from the
 * phone-first design, where navigation sits under the thumb — but with a single
 * destination there is nothing to navigate to, and a bar holding one live button
 * reads as clutter.
 */
export function ClientHeader({ name }: { name: string }) {
  return (
    <header className={s.bar}>
      <div className={s.brand}>
        <span className={s.logo} aria-hidden="true" />
        <span className={s.wordmark}>{brand.clientName}</span>
      </div>

      <div className={s.right}>
        <span className={s.name}>{name}</span>
        <form action="/auth/signout" method="post">
          <button type="submit" className={s.signout}>
            Uitloggen
          </button>
        </form>
      </div>
    </header>
  );
}
