# Solmavera Portal

Portaal voor een internationaal relocation-, administratie- en vastgoedkantoor in
Spanje. Vervangt Airtable, Make en Fillout. WordPress blijft de publieke website,
Gmail de e-mailclient, Slack de interne communicatie.

Twee schermen die elkaar nooit tegenkomen:

- **Klanten** loggen in op de domeinroot en zien één pagina: hun eigen gegevens, en de
  twee bestanden die wij vragen — paspoortpagina en pasfoto.
- **Medewerkers** loggen in op `/admin` en krijgen drie tabs: Klanten, Service
  Procedures, Properties. Een medewerker maakt een klant aan, genereert een
  uitnodigingslink en stuurt die door.

Draait op `https://solmara.pixelize.nl`, met Supabase als database, auth en opslag.

## Begin hier

| Document | Waarvoor |
| --- | --- |
| **[HANDOFF.md](HANDOFF.md)** | **Waar het draait, hoe je deployt, wat je niet mag weghalen en waarom, en wat er open staat. Lees dit eerst.** |
| [Plan van aanpak](docs/plan-van-aanpak.md) | Hóé het gebouwd zou worden: architectuur, datamodel, techstack, beveiliging en kosten |
| [Service Workflow Specification](docs/service-workflow-specification.md) | Wát het systeem moet doen: per dienst de intakevragen, documenten, stages, taken en deadlines |

De twee documenten beschrijven een **groter ontwerp dan wat er nu staat.** Het portaal
is op verzoek teruggebracht tot de drie tabs hierboven; dossiers, facturen, tijdlijnen
en service templates zijn er niet. Lees ze als intentie, niet als beschrijving van deze
code. `HANDOFF.md` beschrijft wat er echt is.

## Drie eisen die alles raken

Deze staan er sinds de opdracht en gelden nog steeds.

**1. Diensten zijn nooit hardcoded.** Elke dienst hoort een versioneerd Service
Template te zijn: eigen intakevragen, stages, verplichte documenten, taken en
SLA-regels. Een vierde dienst toevoegen is data invoeren, geen ontwikkelopdracht.
*Nog niet gebouwd* — de huidige versie kent geen diensten, alleen klanten met twee
documenten. Maar er staat ook nergens `if service == 'NIE'`, dus de weg is vrij.

**2. Branding is configuratie.** Bedrijfsnaam, domeinen, kleuren, afzenderadressen en
dossiercodeprefix staan in [lib/brand.ts](lib/brand.ts) en zijn per omgevingsvariabele
te overschrijven. De naamswijziging van Solmara naar Solmavera was een wijziging van
waarden daar, geen zoek-en-vervang. Eén uitzondering: `caseCodePrefix` geldt alleen
voor níeuwe codes — een klant die `SM-C-0002` heeft gekregen houdt die.

**3. Interne taal Engels, klanttaal die van de klant.** Database, identifiers en
codecommentaar in het Engels. De interface staat in drie talen — Nederlands, Engels,
Spaans — in [lib/i18n.ts](lib/i18n.ts), met een taalkiezer die ook zonder JavaScript
werkt. Nieuwe bezoekers krijgen hun browsertaal.

## Aan de slag

```sh
npm install
npm run typecheck
npm run dev            # klantportaal op /, medewerkers op /admin
```

Kopieer `.env.example` naar `.env.local` en vul aan. De live waarden staan op de
container in `/opt/solmara/.env.local`, niet in deze repo.

Uitrollen gaat naar de container, die daar zelf bouwt:

```sh
bash scripts/deploy.sh
```

## Status

Live en in gebruik voor de drie tabs hierboven. Wat er nog niet is — uitgaande mail,
de definitieve DNS-naam, een wachtwoordherstel voor klanten — staat met reden in
[HANDOFF.md](HANDOFF.md#open-items).
