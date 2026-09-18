# Solmara Portal

Operationeel CRM, dossierbeheer en workflowsysteem voor een internationaal relocation-, administratie- en vastgoedkantoor in Spanje.

Dit systeem wordt de bron van waarheid voor klanten, dossiers, workflowstages, documentvereisten, taken, afspraken, betalingen, notities en activiteitenhistorie. Het vervangt Airtable, Make en Fillout. WordPress blijft de publieke website, Gmail blijft de e-mailclient voor mensen, Slack blijft interne communicatie, Google Calendar blijft de agenda, Stripe verwerkt betalingen en de boekhouding blijft extern.

## Documentatie

| Document | Waarvoor |
| --- | --- |
| [Plan van aanpak](docs/plan-van-aanpak.md) | Hóé het gebouwd wordt: architectuur, datamodel, techstack, fasering, beveiliging en kosten |
| [Service Workflow Specification](docs/service-workflow-specification.md) | Wát het systeem moet doen: per dienst de intakevragen, documenten, stages, taken, automatiseringen, mails en deadlines |

Begin bij het plan van aanpak voor het overzicht, en gebruik de service-specificatie als dagelijkse referentie tijdens het bouwen.

## Drie eisen die alles raken

**1. Diensten zijn nooit hardcoded.** Elke dienst is een versioneerd Service Template met eigen intakevragen, stages, verplichte documenten, standaardtaken, SLA-regels en automatiseringsregels. Er staat nergens `if service == 'NIE'` in de code. Een vierde dienst toevoegen is data invoeren, geen ontwikkelopdracht.

**2. Branding is configuratie.** Solmara is de tijdelijke merknaam en het tijdelijke domein waaronder dit systeem wordt ontwikkeld en getest. De productienaam wordt later Solmavera. Bedrijfsnaam, domeinen, logo's, kleuren, afzenderadressen en dossiercodeprefix moeten instelbaar zijn en mogen nergens hardcoded staan. Zie *Merknaam en domein als configuratie* in het plan van aanpak.

**3. Interne taal is Engels, klanttaal is die van de klant.** Database, identifiers en interface in het Engels. Klantgerichte content moet meerdere talen ondersteunen, in eerste instantie Nederlands, Engels en Spaans. Diensten hebben daarom zowel een `internal_name` als een `display_name` per taal.

## Status

De repo bevat op dit moment alleen documentatie. De technische keuzes uit het plan van aanpak liggen nog niet vast in code — als de ontwikkelaar gemotiveerd iets anders wil voorstellen, is dat het moment om dat te doen, vóórdat de bouw begint.
