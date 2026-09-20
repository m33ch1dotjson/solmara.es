import s from "./LongText.module.css";

/*
 * A block of text that a colleague typed, folded down to a few lines when it is long
 * enough to push everything under it off the screen.
 *
 * It is a <details>, not a React state toggle: the fold is then pure CSS, so it works
 * in a server component, needs no JavaScript, and cannot flash open-then-shut on load.
 * That last one is why the obvious useState version was not written — it has to render
 * unfolded on the server to stay readable without JavaScript, and then folds visibly
 * on hydration.
 *
 * Short text stays a plain paragraph. A "show more" under three lines is noise.
 */

/** Long enough that folding it saves more than it costs. Judged by eye, not measured. */
const MAX_CHARS = 260;
const MAX_LINES = 5;

export function LongText({
  text,
  className,
  more,
  less,
}: {
  text: string;
  /**
   * The caller's own typography for this text; the fold adds nothing to it.
   * Optional because a CSS module's keys are typed `string | undefined`.
   */
  className?: string;
  more: string;
  less: string;
}) {
  const isLong = text.length > MAX_CHARS || text.split("\n").length > MAX_LINES;

  if (!isLong) return <p className={className}>{text}</p>;

  const folded = [className, s.clamped].filter(Boolean).join(" ");

  return (
    <details className={s.fold}>
      {/* Everything lives inside the summary, because that is the part of a details
          element that stays visible when it is closed. */}
      <summary className={s.summary}>
        <span className={folded}>{text}</span>
        <span className={s.toggle}>
          <span className={s.more}>{more}</span>
          <span className={s.less}>{less}</span>
        </span>
      </summary>
    </details>
  );
}
