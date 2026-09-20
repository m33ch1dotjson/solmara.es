# Solmara Portal

Two interfaces over one database: a **staff portal** for case managers and a **client portal** for the people whose cases they handle. Same client, same documents, same cases — no duplicated data.

Built from the Claude Design handoff (`Solmara Portal.dc.html`, `Solmara Client.dc.html`).

## Status

Not yet verified. The dependencies have never been installed on this machine — npm was unreachable on the network where this was written — so nothing here has been compiled, type-checked or opened in a browser. Expect to fix a handful of small things on first run.

```bash
npm install
npm run typecheck   # do this first
npm run dev
```

Staff portal at `/`, client portal at `/portal/signin`.

## What is implemented

All thirteen screens from the handoff, plus six changes Solmara asked for afterwards.

| Staff | Route |
| --- | --- |
| My work | `/` |
| Clients | `/clients` |
| Client detail, six tabs | `/clients/SM-C-0021?tab=overview` |
| Cases | `/cases` |
| Case detail | `/cases/ES-2481` |
| Document review | `/review` and `/review/doc-1` |
| Calendar | `/calendar` |
| Services & workflows | `/admin/services` |
| Team | `/admin/team` |
| Settings | `/admin/settings` |
| Upload-link preview | `/upload-link` |

| Client | Route |
| --- | --- |
| Sign in, three states | `/portal/signin` |
| My services | `/portal/services` |
| Service detail | `/portal/services/ES-2481` |
| My documents | `/portal/documents` |
| My details | `/portal/profile` |
| Upload a document | `/portal/upload/doc-1` |
| Rejected document | `/portal/rejected/doc-2` |
| Intake questionnaire | `/portal/intake` |
| Completed service | `/portal/done` |

Data is mock data, typed against `lib/domain.ts`. There is no database, no auth and no file storage yet.

## Where this departs from the design handoff

The handoff says its copy and structure are final. Six changes were made on top of it at Solmara's request, because they are business decisions rather than design preferences. They are listed here so the next person does not read them as mistakes.

1. **Documents belong to the client, not the case.** `ClientDocument` carries `caseCodes`, and a case's checklist is the client's documents that the case relies on (`checklistFor`). A passport is uploaded once and reused across the NIE, the mortgage and the purchase.
2. **Structured identity data sits beside the files.** `ClientIdentity` holds the passport number, expiry, NIE, NUSS and SIP as fields. "What is his NIE?" is answered by a text field, never by opening a PDF. The certificate is a separate thing in the vault.
3. **The client never reads the word "case".** `lib/client-terms.ts` overrides the design's Case / Dossier / Expediente with service wording in all three languages. It is a separate file because `lib/mock/client-copy.json` is regenerated from the design.
4. **Two client screens that were never designed:** My documents (`/portal/documents`) and My details (`/portal/profile`), plus a bottom nav. These are extrapolated from the token system, not drawn. Worth a second pass through Claude Design if they should match the rest exactly.
5. **The staff nav gained Calendar and an Admin group** (Services & workflows, Team, Settings) and lost Client upload link. Requesting documents is something you do to a case, so it is a button on the case (`components/staff/RequestDocuments.tsx`); the preview page still exists at `/upload-link`.
6. **Client detail is six tabs**, with the tab in the URL so a colleague can be sent straight to a client's documents.

## Decisions worth knowing

**CSS Modules, not Tailwind or shadcn/ui.** The plan of approach named Tailwind. This design is token-driven with specific values — 13.5px, weight 550, `color-mix()` in oklch — which in Tailwind becomes `text-[13.5px] font-[550]` on every element, and shadcn components would have to be overridden one by one. CSS Modules keep `app/tokens.css` as the single source of truth. Revisit if the team prefers utility classes.

**Copy is extracted, not retyped.** `lib/mock/extract.mjs` pulls the data literals out of the design files, so every Dutch and Spanish string is verbatim. Re-run it if the design changes:

```bash
node lib/mock/extract.mjs <handoff dir> lib/mock
```

**Brand is configuration.** `lib/brand.ts` holds the company name, domains, sender addresses, accent hue and case-code prefix, all overridable by environment variable. Nothing brand-specific is in layout, copy or identifiers, so the move from Solmara to Solmavera is a change of values. One deliberate exception: `caseCodePrefix` applies to new codes only — a case already communicated as `SM-CASE-0042` keeps that code.

**Two neutral scales.** The staff tool uses hue 95, the client portal 85. Both read as neutral; the client side is slightly warmer. They are separate classes (`.themeStaff`, `.themeClient`) rather than one set of tokens, which is why a screen must sit inside the right layout to look right.

**Status can never be colour alone.** `components/ui` has no way to render a tone without its word and glyph. `lib/status.ts` marks the statuses that have no client-facing form — `overdue` among them — and `StatusPill` returns nothing rather than falling back to staff wording. That is where "never tell a client their case is late" is enforced.

**The client-safe projection is a domain boundary.** `lib/client-view.ts` maps an internal case onto what a client may see, and the result is branded, so passing a raw `CaseRecord` into a client-portal component is a type error. It is written but not yet wired: the client screens currently read the design copy directly. Connect it when real cases land.

## Known gaps

- Loading and error states are not built. The handoff specifies skeleton rows at `--row` height for the staff tables, a determinate byte-progress indicator for client uploads, and a dedicated screen for an expired magic link.
- Filter state is component-local; it should live in the URL so returning from a case keeps the view.
- Fonts load from Google via a stylesheet link. Self-host before production.
- The logo is a rounded square in the accent colour. Document previews and photo thumbnails are striped placeholders with a caption naming what belongs there.
