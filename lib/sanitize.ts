/*
 * The one place where HTML from a browser becomes HTML we are willing to render.
 *
 * A Process Guide is written in a contentEditable field, which means the string that
 * arrives is whatever the browser produced — and, if somebody is determined, whatever
 * they pasted or posted directly to the server action. It is rendered back with
 * dangerouslySetInnerHTML, so this function is the only thing standing between a
 * colleague's paste and a script tag running in somebody else's session.
 *
 * It is an allowlist, not a blocklist: anything not named here is dropped, including
 * every attribute. That is the only shape of this that stays safe as browsers grow
 * new ways to execute things.
 *
 * Deliberately hand-written rather than pulling in a sanitiser: this runs on a
 * closed staff tool with seven known authors, the tag list is short, and a dependency
 * that parses untrusted HTML is a thing to keep up to date for a decade. If guide
 * content ever becomes client-visible or author-untrusted, replace this with a real
 * parser-based sanitiser — the seam is this single function.
 */

/** Structure a handbook needs, and nothing that loads, runs or frames anything. */
const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "h1",
  "h2",
  "h3",
  "h4",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "blockquote",
  "hr",
  "a",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "div",
  "span",
  "code",
  "pre",
]);

/** Tags whose *content* goes too, not just the tag. */
const DROP_WITH_CONTENT = ["script", "style", "iframe", "object", "embed", "noscript", "template"];

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel", "title"]),
  img: new Set(["src", "alt", "title"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan"]),
};

const VOID_TAGS = new Set(["br", "hr", "img"]);

/**
 * Where a link may point. Anything else — javascript:, data:, vbscript:, a bare
 * colon-scheme we have not thought about — is dropped rather than repaired.
 */
function safeHref(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  // Same-origin, and not protocol-relative (//evil.example is not a local path).
  if (/^\/(?!\/)/.test(trimmed)) return trimmed;
  if (/^#/.test(trimmed)) return trimmed;
  return null;
}

/**
 * Where an image may point: only at our own file route. Every picture in a guide is
 * uploaded through us, so an <img> reaching out to another host would be either a
 * mistake or a tracking pixel.
 */
function safeSrc(value: string): string | null {
  const trimmed = value.trim();
  return /^\/admin\/process-guide\/file\/[a-f0-9-]{36}$/i.test(trimmed) ? trimmed : null;
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;");
}

/** Pulls name="value" pairs out of the inside of a tag. */
function attributes(raw: string): Array<[string, string]> {
  const found: Array<[string, string]> = [];
  const pattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw)) !== null) {
    found.push([(match[1] ?? "").toLowerCase(), match[3] ?? match[4] ?? match[5] ?? ""]);
  }
  return found;
}

export function sanitizeGuideHtml(input: string): string {
  if (!input) return "";

  let html = input;

  // Comments first: a comment can hide a tag from the naked eye but not from a parser.
  html = html.replace(/<!--[\s\S]*?-->/g, "");

  // Then the tags whose content is as dangerous as the tag.
  for (const tag of DROP_WITH_CONTENT) {
    html = html.replace(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}\\s*>`, "gi"), "");
    html = html.replace(new RegExp(`<${tag}\\b[^>]*>`, "gi"), "");
  }

  const open: string[] = [];
  let out = "";
  let index = 0;

  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(html)) !== null) {
    out += escapeText(html.slice(index, match.index));
    index = match.index + match[0].length;

    const closing = match[0].startsWith("</");
    const tag = (match[1] ?? "").toLowerCase();

    if (!ALLOWED_TAGS.has(tag)) continue;

    if (closing) {
      // Only close what we actually opened, so a stray </div> cannot break out of
      // the container this html is rendered into.
      const at = open.lastIndexOf(tag);
      if (at === -1) continue;
      while (open.length > at) out += `</${open.pop()}>`;
      continue;
    }

    const kept: string[] = [];
    for (const [name, value] of attributes(match[2] ?? "")) {
      if (!ALLOWED_ATTRS[tag]?.has(name)) continue;

      if (tag === "a" && name === "href") {
        const href = safeHref(value);
        if (href) kept.push(`href="${escapeAttr(href)}"`);
        continue;
      }
      if (tag === "img" && name === "src") {
        const src = safeSrc(value);
        if (src) kept.push(`src="${escapeAttr(src)}"`);
        continue;
      }
      if (name === "target") {
        kept.push(`target="_blank"`);
        continue;
      }
      if (name === "rel") continue; // set below, not taken on trust
      if ((name === "colspan" || name === "rowspan") && !/^\d{1,3}$/.test(value)) continue;

      kept.push(`${name}="${escapeAttr(value)}"`);
    }

    // An <img> without a src we would serve is not an image, it is a broken icon.
    if (tag === "img" && !kept.some((a) => a.startsWith("src="))) continue;

    // A new tab must not be handed a reference back to this one.
    if (tag === "a" && kept.some((a) => a.startsWith("target="))) {
      kept.push(`rel="noreferrer noopener"`);
    }

    const attrs = kept.length > 0 ? " " + kept.join(" ") : "";

    if (VOID_TAGS.has(tag)) {
      out += `<${tag}${attrs}>`;
      continue;
    }

    out += `<${tag}${attrs}>`;
    open.push(tag);
  }

  out += escapeText(html.slice(index));
  while (open.length > 0) out += `</${open.pop()}>`;

  return out.trim();
}

/**
 * The two or three lines a card shows. Tags out, whitespace collapsed, cut on a word
 * boundary — a preview that ends mid-word reads as a bug.
 */
export function guidePreview(html: string, limit = 180): string {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut) + "…";
}
