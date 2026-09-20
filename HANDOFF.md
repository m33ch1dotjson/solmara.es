# Handoff

For whoever picks this up next. Written in English to match the code comments; the
commit messages are Dutch, as is the product owner.

Everything in here is either verified against the running system or explains *why* a
decision was made. Where something is a guess, it says so.

---

## What this is

A portal for **Solmavera**, a relocation, administration and real-estate business in
Spain. It replaces an Airtable + Make + Fillout stack.

Two audiences that never meet:

- **Clients** sign in at the domain root and see one page: their own details, and the
  two files we ask for (passport page, passport photograph).
- **Staff** sign in at `/admin` and get three tabs — Klanten, Service Procedures,
  Properties. Staff create a client, generate an invite link, and hand it over
  (WhatsApp, in practice — outbound mail is not configured yet).

The public marketing site is **not this**. `solmara.es` is a WordPress site managed by
an agency at Strato, and the brand there is being renamed to Solmavera. Do not touch
that domain's DNS.

It is deliberately small. A previous, much larger design (13 screens: cases, invoices,
timelines) was stripped back on the owner's instruction. Fragments of it survive as
unused code — see *Open items*.

---

## Where it runs, and how to deploy

| | |
|---|---|
| Host | Proxmox LXC, `192.168.1.230`, hostname `solmara` |
| Runtime | Node v22, `next start -H 0.0.0.0 -p 3000` |
| Service | `systemctl {status,restart} solmara`, unit at `/etc/systemd/system/solmara.service` |
| App root | `/opt/solmara`, owned by user `solmara` |
| Public URL | `https://solmara.pixelize.nl` via a Cloudflare Tunnel in a *different* container |
| Database | Supabase project `cifzbfjoceyzjnxzkelj`, region `eu-west-1` (Ireland) |

```sh
bash scripts/deploy.sh          # tar the tree over SSH, build there, restart on success
```

It builds **in the container**, not locally — npm on the owner's Windows machine is
frequently firewalled. `npm run typecheck` locally will usually fail with
`ECONNREFUSED`; the deploy's build is the typecheck.

Two things about that script that are load-bearing:

- It **only restarts if the build succeeds**. An earlier version restarted
  unconditionally and took the site down with a 502 on a broken build.
- It **excludes `.env.local`**. The container's copy holds the `app_server` database
  password, generated there by `scripts/set-app-role-password.sh`. Syncing the local
  file over it breaks the database connection in a way that looks exactly like an auth
  bug. This cost an hour once.

Binding to `0.0.0.0` is not sloppiness: `cloudflared` runs in another container and
cannot reach a process listening only on loopback.

---

## The shape of the thing

```
app/
  layout.tsx              root: resolves language, sets <html lang>, mounts LocaleProvider
  locale-actions.ts       the language switcher's server action
  (client)/               the client portal, on the root path
    page.tsx              details + two upload slots
    signin/               password first, magic link second
  admin/                  staff, behind a check in the layout
    page.tsx              Klanten
    sop/ properties/ account/ clients/[id]/
    actions.ts            staff server actions
  invite/[token]/         where the link a staff member sends lands
  auth/callback/ signout/
lib/
  brand.ts                brand as configuration; Locale type lives here
  i18n.ts                 every visible string, in three languages
  locale.ts               which language a visitor gets (server only)
  db/{schema,index,act}.ts
  auth/{session,supabase,supabase-browser}.ts
  queries.ts              every read and write, all through asActor()
  storage.ts              server-side uploads, signed URLs
  status.ts               the status vocabulary
drizzle/000{0..4}_*.sql   migrations, applied in order
```

**Styling is CSS Modules with design tokens, not Tailwind.** This is a documented
deviation from the original design handoff. The design is token-driven with values
like 13.5px, font-weight 550 and `color-mix()` in oklch — expressing that in utility
classes meant arbitrary-value soup. Tokens live in `app/tokens.css`: one accent hue
(`--accent-h`) generates every accent surface, and the dark palette is *separately
picked, not derived* — do not "simplify" it into a filter over light.

---

## Invariants

These look like things you could remove or shortcut. They are not. Each one is there
because its absence caused a real bug or a real leak.

### The database

**Everything lives in the `app` schema, never `public`.** Supabase's Data API only
exposes `public`, so passport numbers are not reachable over HTTP at all — the only
way in is our own server. Adding a table to `public` would quietly undo that.

**RLS is enabled *and forced* on every table, and the app connects as a role that
cannot bypass it.** Verified live:

```
app_server  rolbypassrls = false
postgres    rolbypassrls = true      ← which is why the app does not use it
all 9 app.* tables: rls = true, forced = true
```

`postgres` has `rolbypassrls`, so running the app as `postgres` would make every
policy decorative while all the tests still pass. Migrations run as `postgres`
(`DATABASE_URL`); the application runs as `app_server` (`APP_DATABASE_URL`). Those are
two different variables on purpose — see *Secrets*.

**Every query goes through `asActor(actor, run)`** in `lib/db/act.ts`. It opens a
transaction and calls `app.set_actor(...)` with `set_config(..., true)` — the `true`
makes it transaction-local. Without that, a pooled connection carries the previous
visitor's identity into the next request, which is a cross-tenant data leak that only
appears under concurrency. **There is no escape hatch, by design.** If you find
yourself wanting one, you want a SECURITY DEFINER function instead.

**Some helpers must be SECURITY DEFINER with a pinned `search_path`.** A policy helper
that reads a table it has no policy on runs as the caller and always answers "no" —
this made clients see zero cases for a while. `SET search_path = app, pg_temp` is not
decoration; without it a definer function is a privilege-escalation hole.

**There is no client policy on `app.client`, and that is deliberate.** RLS filters
*rows*, not *columns*, so a client policy let clients read `internal_notes`. The
profile is served by `app.client_self()`, which lists the columns it returns. Adding a
policy back would re-open that leak.

**`app.resolve_actor(email, uid)` exists to break a chicken-and-egg.** `currentActor()`
used to query `staff_user` directly, which its own policy blocked — you had to be
staff to discover that you were staff, so login looked broken. Do not "simplify" it
back into a plain select.

### Storage

Buckets `client-documents` and `property-photos` are **private with no storage
policies at all**. Uploads go through our server with the secret key; reads are signed
URLs valid for 600 seconds, minted per render. A screenshot of a page is therefore not
a permanent link to somebody's passport. Do not add a storage policy to "make it
easier" — that is the whole protection.

### The tunnel

Build public URLs with `publicOrigin()` / `publicUrl()` from `lib/public-url.ts`, which
read `x-forwarded-host`. Behind the tunnel `request.url` is `https://0.0.0.0:3000`,
which no browser can resolve — sign-out redirected there for a while.

### Connecting to Postgres

Use the **session pooler on 5432** (`aws-1-eu-west-1.pooler.supabase.com`), with the
project ref in the username (`app_server.cifzbfjoceyzjnxzkelj` — that is how the
pooler routes). The direct host `db.<ref>.supabase.co` is IPv6-only and this container
has no IPv6. The transaction pooler on 6543 would also work but disables prepared
statements.

### Brand and language

`lib/brand.ts` holds everything nameable, read from env with defaults. The rename from
Solmara to Solmavera was a change of values there, not a search-and-replace. One
deliberate exception: `caseCodePrefix` applies to **new** codes only — a client already
told their file is `SM-C-0002` keeps that forever.

The i18n layer (added last):

- Every visible string is in `lib/i18n.ts`, in the `T(en, nl, es)` shape that
  `lib/status.ts` already used. Three languages side by side, so drift shows in a diff.
- Language resolution order is: **cookie** (`solmavera-locale`, one year) →
  **`Accept-Language`** → `brand.defaultLocale`. A Spanish phone opening an invite link
  is already in Spanish.
- The switcher is a **plain form with three submit buttons**, so it works before any
  JavaScript arrives. That matters most on the sign-in and invite screens, where
  somebody who cannot read the page is the one who needs it. Verified by POSTing the
  form without the `Next-Action` header.
- Server components call `copy(await currentLocale())`. Client components call
  `useCopy()`. `lib/i18n.ts` must never import `next/headers` — that is what
  `lib/locale.ts` is for.
- Two registers are intentional: client copy is formal (Dutch *u*, Spanish *usted*),
  staff copy is informal. Keep that when adding strings.
- A staff member's rejection note is stored as typed and **not** translated. A Spanish
  client can receive a Dutch reason. This was a judgement call: machine-translating a
  reason that has legal weight seemed worse than the inconsistency.

---

## Traps that already cost time

- **`typedRoutes` is on.** An `href` must be **inline on the `<Link>`** so it can be
  inferred from the literal. A `const href: string` fails; so does a pre-typed array of
  routes. `AdminTabs.tsx` spells its three links out for exactly this reason.
- **Never let `next/headers` reach a client bundle.** That is why there are two Supabase
  clients (`lib/auth/supabase.ts` and `supabase-browser.ts`) and why they must stay split.
- **`db.execute<T>` needs `T extends Record<string, unknown>`.**
- **Supabase's built-in mailer is rate-limited per hour**, not per minute. On a 429 the
  honest message is "try again in an hour" — anything shorter sends people into a loop
  that cannot succeed. This is why password auth is currently the primary route for both
  audiences.
- **Long Bash heredocs get truncated in this agent harness** — the shell fails with
  `unexpected EOF while looking for matching`. Use the Write tool for anything sizeable.
- When testing Supabase Storage with `curl`, send **both** `Authorization` and `apikey`.
  Omitting `apikey` gives `400 Invalid Compact JWS`, which looks like an app bug and is not.

---

## Verifying a change

The build is the typecheck. Beyond that, the checks that have actually caught things:

```sh
H=192.168.1.230:3000

# languages, without signing in
curl -s -H 'Cookie: solmavera-locale=es' http://$H/signin | grep -o 'Iniciar sesión'
curl -s -H 'Accept-Language: es-ES,es;q=0.9' http://$H/signin | grep -o 'Introduzca el correo'
for L in nl en es; do curl -s -H "Cookie: solmavera-locale=$L" http://$H/signin \
  | grep -oE '<html lang="[a-z]{2}"'; done
```

For RLS, the meaningful test is **negative and from the client's seat**: set a client
actor and confirm a staff-only table returns zero rows. Testing as `app_server` with no
actor set proves nothing except that the fallback denies everything. My own first
attempt at this test was wrong in exactly that way.

---

## Open items

Roughly in the order they block things.

1. **No outbound mail.** Brevo SMTP was the plan and is not configured. Consequences:
   magic links are unreliable, and **a client who forgets their password cannot reset
   it** — the owner accepted that explicitly for now. Once SMTP works, magic link can
   become the default again by swapping which half of the sign-in screen leads.
2. **`portal.solmara.es` DNS is blocked.** Cloudflare will not accept a subdomain-only
   zone on their plan, and the owner does not want the apex in Cloudflare because the
   agency manages it. Options given: move the whole zone, use a VPS with a CNAME, or
   stay on `solmara.pixelize.nl`. Undecided.
3. **`BRAND_ACCENT_HUE` is 250 (blue) while the logo is orange.** Asked, unanswered.
   The logo keeps its own colour via a separate `--brand-mark` token, so the two do not
   fight — but they also do not match. Changing the hue is one number.
4. **The Spanish and English copy is unreviewed by a native speaker.** It is mine. The
   formal register and terms like *Fotografía tipo carné* deserve a check before a real
   client sees them.
5. **`client.preferred_locale` is written at creation and read nowhere.** The interface
   language lives in a cookie, so a client's choice does not follow them between devices.
   Wiring it up needs a migration: there is no client policy on `app.client`, so the
   write must go through a new SECURITY DEFINER function.
6. **The logo is a hand trace**, `components/ui/Logo.tsx` — three stroked arcs on a
   976×976 viewBox. It has never been compared against the original artwork
   side by side. If a real SVG turns up, replace it.
7. **Dead code from the stripped design.** `lib/format.ts` (money and date formatting)
   and parts of `lib/domain.ts` are imported by nothing. Kept for when invoicing comes
   back. `lib/format.ts` reads its locale tags from `lib/i18n.ts` so it cannot drift.
8. **The documentation repo is stale.** Two Claude Docs (a *plan van aanpak* and a
   *Service Workflow Specification* covering NIE / mortgage / property purchase) and the
   `m33ch1dotjson/solmara.es` repo all describe the larger pre-strip design. Treat them
   as intent, not as a description of this code.

---

## Secrets

Nothing secret is in this repo, and nothing secret should enter it.

| Variable | Used by | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser + server | public by design, protected by RLS |
| `SUPABASE_SECRET_KEY` | server only | **ignores RLS entirely** |
| `DATABASE_URL` | `drizzle.config.ts` | migrations, as `postgres` |
| `APP_DATABASE_URL` | `lib/db/index.ts` | runtime, as `app_server` (cannot bypass RLS) |

The live values are in `/opt/solmara/.env.local` on the container, which is gitignored
and excluded from deploys. `.env.example` lists the names. The `app_server` password is
generated by `scripts/set-app-role-password.sh` and exists only there.

If you need a credential you do not have, **ask for it** — do not go looking through
the owner's machine for it. Two such searches were blocked by a classifier during the
original build, and working around that block would have been the wrong move.
