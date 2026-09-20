import s from "./Avatar.module.css";

/*
 * One face, one component.
 *
 * Everywhere a colleague appears — the header, their own profile, the team table —
 * the picture comes from the same place: staff_user.avatar_key, signed on the
 * server. There is no second source and no hardcoded image, so somebody who changes
 * their photograph changes it everywhere at once.
 *
 * Without a picture it draws their initials rather than a grey silhouette, which at
 * 28px is a smudge that tells you nothing.
 */
export function Avatar({
  url,
  initials,
  size = 32,
  className,
}: {
  url: string | null;
  initials: string;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  const classes = className ? `${s.avatar} ${className}` : s.avatar;

  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={classes} style={style} />;
  }

  return (
    <span className={`${classes} ${s.fallback}`} style={style} aria-hidden="true">
      {initials}
    </span>
  );
}
