/*
 * The three flags of the language switcher.
 *
 * Drawn rather than typed as emoji: Chrome on Windows has no flag glyphs and renders
 * 🇳🇱 as the letters "NL", which would have put the letters straight back on screen.
 * These also stay legible at 20×14, where an emoji is a smudge.
 *
 * A flag is not a language — Spanish is not Spain's alone, and English is not the
 * United Kingdom's. They are a picture to find your own row by, which is why every
 * button keeps the language's own name as its title and its accessible label.
 */

const NL = "flag-nl";
const GB = "flag-gb";
const ES = "flag-es";

function Frame({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 20 14" width="20" height="14" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={id}>
          <rect width="20" height="14" rx="2.5" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>{children}</g>
      {/* A hairline, so a white band does not bleed into a white background. */}
      <rect
        x="0.5"
        y="0.5"
        width="19"
        height="13"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.18"
      />
    </svg>
  );
}

export function FlagNL() {
  return (
    <Frame id={NL}>
      <rect width="20" height="14" fill="#FFFFFF" />
      <rect width="20" height="4.67" fill="#AE1C28" />
      <rect y="9.33" width="20" height="4.67" fill="#21468B" />
    </Frame>
  );
}

export function FlagGB() {
  return (
    <Frame id={GB}>
      <rect width="20" height="14" fill="#012169" />
      <path d="M0 0 L20 14 M20 0 L0 14" stroke="#FFFFFF" strokeWidth="3.2" />
      <path d="M0 0 L20 14 M20 0 L0 14" stroke="#C8102E" strokeWidth="1.6" />
      <path d="M10 0 V14 M0 7 H20" stroke="#FFFFFF" strokeWidth="4.6" />
      <path d="M10 0 V14 M0 7 H20" stroke="#C8102E" strokeWidth="2.6" />
    </Frame>
  );
}

export function FlagES() {
  return (
    <Frame id={ES}>
      <rect width="20" height="14" fill="#AA151B" />
      <rect y="3.5" width="20" height="7" fill="#F1BF00" />
    </Frame>
  );
}

export const FLAG = { nl: FlagNL, en: FlagGB, es: FlagES } as const;
