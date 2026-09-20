import Link from "next/link";
import s from "./LegalPage.module.css";

/*
 * Privacy and Terms, which are the same page with a different heading.
 *
 * They say plainly that the text is not written yet rather than carrying invented
 * legal wording — a made-up privacy statement is worse than an empty one, because
 * somebody would believe it.
 *
 * They live in the client shell, so they are readable to anyone with the link and
 * carry the language switcher: a visitor who lands here from a footer may not be
 * signed in to anything.
 */
export function LegalPage({
  title,
  body,
  back,
}: {
  title: string;
  body: string;
  back: string;
}) {
  return (
    <article className={s.page}>
      <h1 className={s.title}>{title}</h1>
      <p className={s.body}>{body}</p>
      <Link href="/" className={s.back}>
        {back}
      </Link>
    </article>
  );
}
