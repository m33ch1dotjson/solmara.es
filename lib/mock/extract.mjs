// Extracts the data literals from the Claude Design handoff files so the copy
// (including all Dutch and Spanish strings) lands in the codebase verbatim
// rather than being retyped.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DIR = process.argv[2];
const OUT = process.argv[3];
mkdirSync(OUT, { recursive: true });

/** Find the balanced-bracket literal that starts at the first bracket after `marker`. */
function literalAfter(src, marker) {
  const at = src.indexOf(marker);
  if (at < 0) throw new Error(`marker not found: ${marker}`);
  // A marker may itself end on the opening bracket; do not skip past it.
  let i = at + marker.length;
  if (marker.endsWith("[") || marker.endsWith("{")) i -= 1;
  while (i < src.length && src[i] !== "{" && src[i] !== "[") i++;
  const open = src[i];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = null;
  let esc = false;
  const start = i;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") { inStr = ch; continue; }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced literal for: ${marker}`);
}

function evalLiteral(text) {
  // The prototype mixes data with style helpers. Stubbing them to the identity
  // keeps the semantic tone token ("ok", "danger") instead of inline CSS.
  const tone = (t) => t ?? null;
  // eslint-disable-next-line no-new-func
  return new Function("chip", "dot", "bar", `return (${text});`)(tone, tone, tone);
}

function pick(src, marker) {
  return evalLiteral(literalAfter(src, marker));
}

const staff = readFileSync(join(DIR, "Solmara Portal.dc.html"), "utf8");
const client = readFileSync(join(DIR, "Solmara Client.dc.html"), "utf8");

// ---- staff -----------------------------------------------------------------
const staffData = {
  cases: pick(staff, "cases(){ return"),
  documents: pick(staff, "const docs ="),
  documentProgress: pick(staff, "const docProgress ="),
  stageLabels: pick(staff, "const stages ="),
  tasks: pick(staff, "const tasks ="),
  payments: pick(staff, "const payments ="),
  activity: pick(staff, "const activity ="),
  rejectionReasons: pick(staff, "const reasons ="),
  clientCases: pick(staff, "const clientCases ="),
  uploadCopy: pick(staff, "const copy ="),
};

// The stage meta line lives inside the .map() body, so it is fetched separately.
staffData.stageMeta = pick(staff, "meta:[");

// ---- client ----------------------------------------------------------------
const clientCopy = pick(client, "copy(){ return");

writeFileSync(join(OUT, "staff-data.json"), JSON.stringify(staffData, null, 2) + "\n");
writeFileSync(join(OUT, "client-copy.json"), JSON.stringify(clientCopy, null, 2) + "\n");

const langs = Object.keys(clientCopy);
console.log("staff keys :", Object.keys(staffData).join(", "));
console.log("cases      :", staffData.cases.length);
console.log("documents  :", staffData.documents.length);
console.log("client lang:", langs.join(", "));
for (const l of langs) {
  console.log(`  ${l}: ${Object.keys(clientCopy[l]).length} sections, ${clientCopy[l].docs.length} docs, ${clientCopy[l].steps.length} steps`);
}
