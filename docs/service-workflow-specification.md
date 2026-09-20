# Solmara Portal — Service Workflow Specification

Bijgewerkt 18 september 2026

Deze spec beschrijft wat het systeem moet dóén; het [plan van aanpak](plan-van-aanpak.md) beschrijft hoe het gebouwd wordt. Elke dienst hieronder is bedoeld als één rij data in `service_template`, niet als code.

## Leeswijzer en status

De structuur in dit document staat vast, de inhoud per dienst is een concept dat Solmara moet bevestigen. Dat onderscheid is belangrijk: een developer kan meteen bouwen op de vorm van een template, maar de documentlijst van een NIE-aanvraag verschilt per provincie en per reden van aanvraag. Wat hieronder staat is een goed onderbouwd startpunt, geen juridisch advies.

| Onderdeel | Status |
| --- | --- |
| Templatestructuur, veldnamen, regelgrammatica | Vast — hierop kan gebouwd worden |
| Stagevocabulaire en documentstatussen | Vast |
| Documentlijsten per dienst | Concept — Solmara bevestigt |
| SLA's en doorlooptijden | Concept — gebaseerd op aannames, niet op hun cijfers |
| Teksten van klantmails | Concept — alleen de bedoeling, niet de eindtekst |

Twee conventies door het hele document. Alle identifiers, stagenamen, documenttypes en veldnamen staan in het Engels en zijn letterlijk de waarden die in de database komen; de uitleg eromheen is Nederlands. En de merknaam komt nergens in een identifier voor — `Solmara` is een instelling, geen onderdeel van een sleutel, zodat de overgang naar Solmavera later niets meer is dan een waarde wijzigen.

De twee commerciële hoofdcategorieën zijn `REAL_ESTATE` en `SERVICES`. Elke dienst hangt onder precies één categorie; de categorie stuurt rapportage en standaardtoewijzing, niet de workflow zelf.

## Anatomie van een service template

Eén template beschrijft een complete dienst. De engine leest hem en weet dan alles: welke vragen de klant krijgt, welke documenten nodig zijn, welke stages er zijn, welke taken bij elke stage horen en wanneer er automatisch iets gebeurt. Er staat nergens `if service == 'NIE'` in de code.

```json
{
  "slug": "nie-application",
  "version": 3,
  "category": "SERVICES",
  "internal_name": "NIE Application",
  "display_name": { "en": "NIE application", "nl": "NIE aanvragen", "es": "Solicitud de NIE" },
  "default_role": "case_manager",
  "default_price": { "amount": 25000, "currency": "EUR" },
  "expected_duration_days": 35,
  "intake": [ /* vragen, zie hieronder */ ],
  "documents": [ /* checklist */ ],
  "stages": [ /* volgorde, SLA, taken */ ],
  "automations": [ /* regels */ ],
  "emails": [ /* sjablonen per taal */ ]
}
```

Bedragen staan in centen als geheel getal, nooit als decimaal. Dat voorkomt afrondingsfouten bij de koppeling met Stripe.

### De vijf onderdelen

| Onderdeel | Velden | Opmerking |
| --- | --- | --- |
| `intake` | `key`, `type`, `label` per taal, `required`, `options`, `show_if` | `show_if` maakt vervolgvragen mogelijk zonder code |
| `documents` | `key`, `label` per taal, `required`, `accepts`, `max_mb`, `expires_after_days`, `help` | `required` bepaalt of de stage kan doorschakelen |
| `stages` | `key`, `order`, `sla_days`, `entry_tasks`, `auto_advance_when`, `client_visible` | `client_visible` bepaalt wat het klantportaal later toont |
| `automations` | `on`, `if`, `then`, `once_per` | De regelgrammatica staat in de volgende sectie |
| `emails` | `key`, `subject` en `body` per taal, `variables` | Alleen automatische mail; menselijke mail blijft Gmail |

### Versionering

Een template wordt nooit gewijzigd, alleen opgevolgd. Bij het aanmaken van een dossier legt `case.template_version` vast welke versie gold. Pas je de NIE-checklist morgen aan, dan blijven de dossiers van vandaag hun eigen checklist houden. Zonder dit krijg je dossiers die plotseling een document missen dat er bij de start niet was, en dat is precies het soort verwarring waar een klant een klacht over indient.

Voor lopende dossiers komt er één knop: *migreer naar versie 4*. Die laat zien wat er verandert en vraagt bevestiging. Nooit automatisch.

## Gedeelde bouwstenen

Alle diensten gebruiken hetzelfde vocabulaire. Een nieuwe dienst verzint geen eigen statussen; hij kiest uit onderstaande lijsten en bepaalt alleen de volgorde.

### Documentstatussen

| Status | Betekenis | Wie zet hem |
| --- | --- | --- |
| `REQUIRED` | Staat op de checklist, nog niets ontvangen | Systeem bij aanmaken dossier |
| `RECEIVED` | Bestand geüpload, nog niet beoordeeld | Klant of medewerker |
| `APPROVED` | Beoordeeld en akkoord | Alleen een medewerker |
| `REJECTED` | Afgekeurd, met verplichte reden | Alleen een medewerker |
| `EXPIRED` | Geldigheid verlopen | Systeem via `expires_after_days` |
| `WAIVED` | Niet van toepassing voor dit dossier | Alleen een admin, met reden |

Alleen `APPROVED` telt mee voor het doorschakelen van een stage. `WAIVED` telt óók mee — dat is de ontsnapping voor het geval waarin een document terecht niet geleverd kan worden, en die moet er zijn, anders blijven dossiers hangen.

### Rollen

| Rol | Ziet | Mag |
| --- | --- | --- |
| `ADMIN` | Alles | Alles, inclusief templates beheren en documenten op `WAIVED` zetten |
| `CASE_MANAGER` | Eigen toegewezen dossiers | Documenten beoordelen, stages doorzetten, taken afronden |
| `VIEWER` | Alle dossiers, zonder documenten | Alleen lezen |
| `CLIENT` | Eigen dossiers | Intake invullen, uploaden, betalen |

De rol `CLIENT` bouw je nu al in het rechtenmodel, ook al komt het klantportaal pas in fase 4. Achteraf een rol toevoegen betekent elke policy opnieuw langslopen.

### Grammatica van een automatiseringsregel

Elke regel heeft dezelfde vier onderdelen. Meer vormen zijn er niet, en dat is opzet: hoe kleiner de taal, hoe minder er stuk kan.

```json
{
  "on": "document.status_changed",
  "if": "all_required_documents_approved",
  "then": [
    { "advance_stage_to": "DOCS_COMPLETE" },
    { "create_task": "Review complete file", "assign": "case.assignee", "due_in_days": 2 },
    { "notify_slack": "docs_complete" }
  ],
  "once_per": "case"
}
```

| Veld | Betekenis |
| --- | --- |
| `on` | Het event dat de regel aanbiedt: `case.created`, `document.status_changed`, `stage.entered`, `payment.succeeded`, `schedule.daily` |
| `if` | Voorwaarde uit een vaste lijst; onbekende voorwaarde is een fout bij het opslaan van de template, niet tijdens het draaien |
| `then` | Acties in volgorde: `advance_stage_to`, `create_task`, `send_email`, `notify_slack`, `assign_to`, `set_due_date`, `create_calendar_event` |
| `once_per` | `case`, `document` of `day` — dit is de idempotentiesleutel |

Drie eisen die letterlijk als acceptatiecriterium mee mogen naar de developer:

1. Een regel die al gelopen heeft voor dezelfde `once_per`-sleutel loopt nooit opnieuw, ook niet na een herstart of een dubbele opslag.
2. Wachten gebeurt via `schedule.daily` in cron, nooit via een flow die blijft openstaan.
3. Elke automatische actie is door een medewerker te overrulen, en de reden komt verplicht in `event`.

### Stagevocabulaire

Stages zijn per dienst anders, maar deze vier komen overal terug en betekenen overal hetzelfde: `NEW`, `INTAKE`, `WAITING_FOR_DOCS`, `COMPLETED`. Daarnaast bestaat `ON_HOLD` als zijspoor bij elke dienst, met verplichte reden en zonder SLA-telling.

## NIE Application

`slug: nie-application` · `category: SERVICES` · verwachte doorlooptijd 35 dagen

De wettelijke kern is smal: het [formulier EX-15](https://sede.policia.gob.es/portalCiudadano/_es/tramites_extranjeria_tramite_asignacion_nie.php) plus een betaalbewijs van de [tasa modelo 790 código 012](https://sede.policia.gob.es/portalCiudadano/_es/tramites_extranjeria_tramite_asignacion_nie.php), en een opgave van de reden van aanvraag. Al het andere in de checklist hieronder is bewijs voor die reden of praktische noodzaak. De aanvraag kan bij een Oficina de Extranjería, een Comisaría of een Spaans consulaat in het buitenland worden ingediend, en moet formeel binnen vijf dagen na registratie beslist worden — in de praktijk bepaalt de wachttijd voor een cita previa de doorlooptijd, niet die termijn.

### Intakevragen

| `key` | Type | Verplicht | Opmerking |
| --- | --- | --- | --- |
| `full_name_passport` | text | ja | Exact zoals in het paspoort, niet de roepnaam |
| `passport_number` | text | ja | |
| `nationality` | select | ja | Stuurt of het EU- of niet-EU-traject geldt |
| `date_of_birth` | date | ja | |
| `place_of_birth` | text | ja | |
| `father_name` en `mother_name` | text | ja | Staan letterlijk op het EX-15 |
| `address_abroad` | address | ja | |
| `address_spain` | address | nee | `show_if: has_spanish_address` |
| `application_reason` | select | ja | `ECONOMIC`, `PROFESSIONAL`, `SOCIAL` — de drie categorieën van het formulier |
| `reason_detail` | textarea | ja | Vrije toelichting; bepaalt welk bewijsstuk nodig is |
| `filing_route` | select | ja | `SPAIN_POLICE`, `SPAIN_EXTRANJERIA`, `CONSULATE` |
| `represented_by_us` | boolean | ja | Zo ja, dan wordt de volmacht verplicht |
| `preferred_language` | select | ja | Overschrijft de taal op clientniveau |

### Documentchecklist

| `key` | Verplicht | Verloopt | Opmerking |
| --- | --- | --- | --- |
| `passport_copy` | ja | — | Alle bladzijden met gegevens of stempels |
| `ex15_signed` | ja | — | Systeem genereert vooringevuld, klant ondertekent |
| `tasa_790_012_receipt` | ja | — | Betaalbewijs, zonder dit wordt niets in behandeling genomen |
| `proof_of_reason` | ja | — | Inhoud hangt af van `application_reason` |
| `power_of_attorney` | `required_if: intake.represented_by_us == true` | — | Notarieel, gelegaliseerd of voorzien van apostille |
| `padron_certificate` | nee | 90 dagen | Alleen bij bepaalde kantoren; daarom optioneel met vervaldatum |
| `nie_resolution` | uitvoer | — | Het eindresultaat, geleverd aan de klant |

Het veld `required` accepteert `true`, `false` of een expressie. Dat is de reden dat de volmacht geen aparte dienst hoeft te zijn.

### Stages, SLA en taken bij binnenkomst

| Stage | SLA | Taken die automatisch ontstaan |
| --- | --- | --- |
| `NEW` | 1 dag | Lead kwalificeren en dienst bevestigen |
| `INTAKE` | 2 dagen | Intakelink versturen |
| `WAITING_FOR_DOCS` | 10 dagen | — |
| `DOCS_COMPLETE` | 2 dagen | Volledig dossier controleren |
| `IN_PREPARATION` | 3 dagen | EX-15 vullen en laten ondertekenen; tasa 790/012 betalen |
| `APPOINTMENT_SET` | tot afspraakdatum | Klant herinneren één dag vooraf |
| `SUBMITTED` | 5 dagen | Ontvangstbewijs vastleggen |
| `WAITING_AUTHORITY` | 10 dagen | Status navragen bij geen bericht |
| `COMPLETED` | — | — |

### Automatiseringen

| Wanneer | Voorwaarde | Wat er gebeurt |
| --- | --- | --- |
| `case.created` | altijd | Case-ID toekennen, checklist uit template kopiëren, behandelaar toewijzen, Slack melden |
| `stage.entered INTAKE` | altijd | Intakelink mailen in de taal van de klant |
| `intake.submitted` | altijd | Naar `WAITING_FOR_DOCS`, taak voor behandelaar |
| `document.status_changed` | alle verplichte documenten `APPROVED` of `WAIVED` | Naar `DOCS_COMPLETE`, taak "Volledig dossier controleren", Slack-melding |
| `document.status_changed` | status wordt `REJECTED` | Mail naar klant met de afkeurreden en wat er nodig is |
| `schedule.daily` | stage is `WAITING_FOR_DOCS` én drie dagen geen klantactiviteit | Herinneringsmail, maximaal drie keer |
| `schedule.daily` | afspraak is morgen | Herinnering naar klant en behandelaar |
| `schedule.daily` | `WAITING_AUTHORITY` langer dan tien dagen | Taak "Status navragen" en Slack-melding |
| `stage.entered COMPLETED` | altijd | Eindmail met resolutie, betaalstatus controleren, review-mail na zeven dagen |

### Mails

| `key` | Moment | Bedoeling |
| --- | --- | --- |
| `welcome_intake` | Bij `INTAKE` | Welkom, uitleg proces, intakelink |
| `document_request` | Bij `WAITING_FOR_DOCS` | Wat er nodig is en waarom, met uploadlink |
| `document_reminder` | Na drie dagen stilte | Vriendelijk, met alleen de ontbrekende stukken |
| `document_rejected` | Bij afkeuring | Reden en concrete herstelinstructie |
| `appointment_confirmed` | Bij `APPOINTMENT_SET` | Datum, adres, mee te nemen originelen |
| `case_completed` | Bij `COMPLETED` | NIE-resolutie als bijlage, vervolgstappen |
| `review_request` | Zeven dagen na afronding | Review vragen |

### Afronding

Een NIE-dossier is pas `COMPLETED` als drie dingen waar zijn: `nie_resolution` is geupload, de betaling staat op `PAID`, en er staan geen openstaande taken meer. De engine controleert dat en weigert de overgang anders. Dat is de enige plek in deze dienst waar het systeem een medewerker tegenhoudt — verder kan alles overruled worden.

## Mortgage Assistance

`slug: mortgage-assistance` · `category: REAL_ESTATE` · verwachte doorlooptijd 60 dagen

Deze dienst heeft één eigenschap die de NIE niet heeft: een **wettelijke wachttermijn die het systeem moet bewaken**. Onder de [Ley 5/2019](https://www.boe.es/buscar/act.php?id=BOE-A-2019-3814) moet de bank de FEIN minimaal tien kalenderdagen vóór ondertekening verstrekken, en moet de koper daarna bij een notaris naar keuze een *acta previa* tekenen, uiterlijk één dag voor de hypotheekakte. Die twee data zijn geen planning maar een harde volgorde, en daar hoort een timer op.

### Intakevragen

| `key` | Type | Verplicht | Opmerking |
| --- | --- | --- | --- |
| `applicants` | repeater | ja | Meerdere aanvragers; elk met eigen documentset |
| `employment_type` | select | ja | `EMPLOYED`, `SELF_EMPLOYED`, `RETIRED`, `COMPANY` — stuurt de checklist |
| `country_of_income` | select | ja | Bepaalt of vertaling of apostille nodig is |
| `gross_annual_income` | money | ja | |
| `existing_debts` | money | ja | |
| `property_found` | boolean | ja | Zo nee, dan start het dossier bij voorlopige haalbaarheid |
| `property_price` | money | `show_if: property_found` | |
| `deposit_available` | money | ja | |
| `is_fiscal_resident_spain` | boolean | ja | Niet-residenten krijgen doorgaans een lagere financiering |
| `preferred_banks` | multiselect | nee | |
| `linked_case_id` | reference | nee | Koppeling met een lopend aankoopdossier |

### Documentchecklist

De lijst verschilt per `employment_type`; hieronder de gemeenschappelijke kern plus de varianten.

| `key` | Verplicht | Verloopt | Opmerking |
| --- | --- | --- | --- |
| `passport_copy` | ja | — | Per aanvrager |
| `nie_document` | ja | — | Kan uit een gekoppeld NIE-dossier komen |
| `bank_statements` | ja | 60 dagen | Zes maanden, alle rekeningen |
| `payslips` | `employment_type == EMPLOYED` | 60 dagen | Drie maanden |
| `employment_contract` | `employment_type == EMPLOYED` | — | |
| `tax_return_last_2y` | ja | — | IRPF of buitenlands equivalent |
| `self_employed_accounts` | `employment_type == SELF_EMPLOYED` | — | Jaarcijfers plus kwartaalaangiften |
| `credit_report` | ja | 90 dagen | |
| `debt_overview` | `intake.existing_debts > 0` | 60 dagen | |
| `nota_simple` | `intake.property_found` | 90 dagen | Uit het Registro de la Propiedad |
| `purchase_contract` | `intake.property_found` | — | Contrato de arras of reserva |
| `valuation_report` | ja | 6 maanden | Tasación door erkend bureau |
| `fein` | ja | — | **Startpunt van de tiendagentermijn** |
| `fiae` | ja | — | Hoort bij de FEIN |
| `acta_previa` | ja | — | Notarieel, minimaal één dag voor de akte |
| `mortgage_deed` | uitvoer | — | Escritura de préstamo hipotecario |

De vervaldatums zijn hier geen detail. Een bank weigert bankafschriften van drie maanden oud, en een dossier dat zes weken stilligt heeft stilzwijgend documenten die opnieuw opgevraagd moeten worden. Daarom staat `expires_after_days` op deze stukken en genereert het systeem er vanzelf een taak voor.

### Stages, SLA en taken bij binnenkomst

| Stage | SLA | Taken die automatisch ontstaan |
| --- | --- | --- |
| `NEW` | 1 dag | Lead kwalificeren |
| `INTAKE` | 2 dagen | Intakelink versturen |
| `WAITING_FOR_DOCS` | 14 dagen | — |
| `DOCS_COMPLETE` | 2 dagen | Dossier controleren en bankselectie maken |
| `SUBMITTED_TO_BANKS` | 10 dagen | Per bank een opvolgtaak |
| `OFFER_RECEIVED` | 5 dagen | Aanbiedingen vergelijken en met klant bespreken |
| `FEIN_ISSUED` | 10 dagen, wettelijk | Wachttermijn bewaken, acta previa inplannen |
| `NOTARY_SCHEDULED` | tot afspraakdatum | Klant herinneren, originelen klaarleggen |
| `SIGNED` | 5 dagen | Akte en betaalbewijzen vastleggen |
| `COMPLETED` | — | — |

### Automatiseringen

| Wanneer | Voorwaarde | Wat er gebeurt |
| --- | --- | --- |
| `document.status_changed` | `fein` wordt `APPROVED` | `fein_received_at` vastleggen, `NOTARY_SCHEDULED` niet toestaan vóór dag tien, taak "Acta previa inplannen" |
| `schedule.daily` | tiendagentermijn verstrijkt morgen | Slack-melding en taak: notaristermijn komt vrij |
| `schedule.daily` | document verloopt binnen zeven dagen | Taak voor behandelaar en mail naar klant |
| `schedule.daily` | `SUBMITTED_TO_BANKS` langer dan tien dagen zonder reactie | Taak per bank, Slack-melding |
| `document.status_changed` | alle verplichte documenten `APPROVED` of `WAIVED` | Naar `DOCS_COMPLETE`, Slack-melding |
| `stage.entered OFFER_RECEIVED` | altijd | Mail naar klant met vergelijkingsoverzicht |
| `stage.entered SIGNED` | altijd | Aankoopdossier bijwerken als `linked_case_id` gevuld is |

### Mails

Dezelfde set als bij NIE, plus `offer_comparison` bij `OFFER_RECEIVED`, `fein_waiting_period` met uitleg waarom er tien dagen gewacht moet worden, en `notary_appointment` met de lijst originelen.

### Afronding

Afgerond als `mortgage_deed` binnen is, de betaling op `PAID` staat en het gekoppelde aankoopdossier — als dat er is — op de hoogte is gebracht. Deze dienst hangt vaak samen met een `property-purchase`-dossier van dezelfde klant; dat is precies waarom één klant meerdere cases moet kunnen hebben.

## Property Purchase Assistance

`slug: property-purchase` · `category: REAL_ESTATE` · verwachte doorlooptijd 90 dagen

De langste en duurste dienst, en de enige waarin het systeem geld van derden bewaakt. Het onderscheidende kenmerk is niet de documentlijst maar de **harde contractuele deadlines**: een contrato de arras noemt een uiterste datum voor de akte, en die datum overschrijden kost de koper zijn aanbetaling. Zo'n datum hoort niet in het hoofd van één medewerker.

### Intakevragen

| `key` | Type | Verplicht | Opmerking |
| --- | --- | --- | --- |
| `buyers` | repeater | ja | Met eigendomsverdeling in procenten |
| `property_address` | address | ja | |
| `property_type` | select | ja | `NEW_BUILD` of `RESALE` — stuurt belasting en checklist |
| `purchase_price` | money | ja | |
| `deposit_paid` | money | nee | |
| `arras_deadline` | date | nee | **Harde deadline**, zodra bekend verplicht |
| `needs_mortgage` | boolean | ja | Zo ja, dan een gekoppeld hypotheekdossier voorstellen |
| `seller_details` | group | ja | Naam, NIE of NIF, makelaar |
| `notary_preference` | text | nee | |
| `is_fiscal_resident_spain` | boolean | ja | Bepaalt of er 3% inhouding geldt bij een niet-residente verkoper |

### Documentchecklist

| `key` | Verplicht | Verloopt | Opmerking |
| --- | --- | --- | --- |
| `passport_copy` | ja | — | Per koper |
| `nie_document` | ja | — | Vaak uit een gekoppeld NIE-dossier |
| `nota_simple` | ja | 90 dagen | Eigendom, lasten en hypotheken op het pand |
| `reserva_contract` | nee | — | Als er een reservering vooraf was |
| `arras_contract` | ja | — | Bevat de uiterste aktedatum |
| `cadastral_certificate` | ja | — | |
| `energy_certificate` | ja | — | Verplicht bij overdracht |
| `habitation_certificate` | `property_type == RESALE` | — | Cédula de habitabilidad |
| `first_occupancy_licence` | `property_type == NEW_BUILD` | — | Licencia de primera ocupación |
| `community_fee_certificate` | `property_type == RESALE` | 30 dagen | Verklaring dat er geen achterstand is |
| `ibi_receipt` | `property_type == RESALE` | — | Laatste aanslag onroerendezaakbelasting |
| `utility_bills` | `property_type == RESALE` | — | Voor overzetten van de contracten |
| `proof_of_funds` | ja | — | Herkomst van het geld, nodig tegen witwasregels |
| `bank_transfer_proof` | ja | — | |
| `tax_payment_proof` | ja | — | Modelo 600 bij bestaande bouw, btw plus AJD bij nieuwbouw |
| `escritura` | uitvoer | — | Notariële akte |
| `registry_confirmation` | uitvoer | — | Inschrijving in het Registro de la Propiedad |

### Stages, SLA en taken bij binnenkomst

| Stage | SLA | Taken die automatisch ontstaan |
| --- | --- | --- |
| `NEW` | 1 dag | Lead kwalificeren |
| `INTAKE` | 2 dagen | Intakelink versturen |
| `DUE_DILIGENCE` | 10 dagen | Nota simple opvragen, lasten controleren, gemeente natrekken |
| `WAITING_FOR_DOCS` | 14 dagen | — |
| `CONTRACT_SIGNED` | 2 dagen | Arras vastleggen, deadline in agenda zetten |
| `FINANCING` | tot aktedatum | Hypotheekdossier bewaken als het gekoppeld is |
| `NOTARY_SCHEDULED` | tot afspraakdatum | Afrekening opstellen, originelen klaarleggen |
| `SIGNED` | 5 dagen | Belastingen aangeven en betalen |
| `REGISTRATION` | 30 dagen | Inschrijving volgen |
| `COMPLETED` | — | — |

### Automatiseringen

| Wanneer | Voorwaarde | Wat er gebeurt |
| --- | --- | --- |
| `intake.submitted` | `needs_mortgage == true` | Voorstel tot aanmaken van een `mortgage-assistance`-dossier voor dezelfde klant |
| `document.status_changed` | `arras_contract` wordt `APPROVED` | Taak: `arras_deadline` invullen; dossier kan niet verder zonder die datum |
| `schedule.daily` | nog dertig, veertien of zeven dagen tot `arras_deadline` | Slack-melding met oplopende urgentie plus taak voor de behandelaar |
| `schedule.daily` | `arras_deadline` is verstreken en stage is niet `SIGNED` | Rode Slack-melding naar admin, geen automatische stap |
| `schedule.daily` | `nota_simple` ouder dan 90 dagen | Taak: opnieuw opvragen voor de akte |
| `stage.entered SIGNED` | altijd | Taken voor Modelo 600 of btw en AJD, met wettelijke termijn als deadline |
| `stage.entered REGISTRATION` | altijd | Wekelijkse controletaak tot bevestiging binnen is |

Die oplopende waarschuwing vóór `arras_deadline` is de belangrijkste automatisering van de hele dienst. Eén gemiste datum kost de klant tienduizenden euro's, en dat is precies het soort ding dat in een Airtable-veld ongezien blijft staan.

### Mails

Naast de standaardset: `due_diligence_report` met de bevindingen uit het kadaster, `completion_statement` met de volledige afrekening inclusief belastingen en notariskosten, en `keys_handover` met de praktische afronding.

### Afronding

Afgerond als `escritura` en `registry_confirmation` binnen zijn, alle belastingtaken afgerond zijn en de betaling op `PAID` staat. Documenten van dit type bewaar je het langst; welke termijn precies geldt, is de vraag die de gestor moet beantwoorden voordat de opruimregel wordt aangezet.

## Automatiseringen voor elke dienst

Deze regels staan niet in een template maar in de engine zelf, omdat ze voor elke dienst hetzelfde betekenen. Een template kan ze uitzetten of de aantallen aanpassen, niet herschrijven.

| Regel | Trigger | Gedrag |
| --- | --- | --- |
| Klant reageert niet | `WAITING_FOR_DOCS` en drie dagen geen upload of intake-activiteit | Herinneringsmail, maximaal drie, daarna een taak voor de behandelaar in plaats van weer een mail |
| Dossier over SLA | Stage langer open dan `sla_days` | Slack-melding, dossier krijgt `overdue` en komt bovenaan in *My Work* |
| Klant wacht op ons | Vier dagen geen interne activiteit terwijl de bal bij Solmara ligt | Slack-melding naar de behandelaar, na zes dagen naar de admin |
| Afspraak morgen | Afspraak binnen 24 uur | Mail naar klant, melding naar behandelaar |
| Document verlopen | `expires_after_days` verstreken | Status naar `EXPIRED`, taak om opnieuw op te vragen, stage kan niet verder |
| Betaling ontvangen | Stripe-webhook `payment.succeeded` | Betaalstatus naar `PAID`, Slack-melding, eventuele blokkade opgeheven |
| Dossier afgerond | Stage naar `COMPLETED` | Eindmail, review-mail na zeven dagen, bewaartermijn ingaan |
| Bewaartermijn verlopen | Dagelijkse controle op afgeronde dossiers | Taak voor admin om te verwijderen; nooit automatisch wissen |

Die laatste regel is bewust halfautomatisch. Documenten definitief verwijderen op basis van een berekende datum is het soort automatisering dat precies één keer fout hoeft te gaan.

### Meldingen in Slack

Vier soorten, meer niet. Meer soorten betekent dat niemand ze nog leest.

| Melding | Wanneer |
| --- | --- |
| 🟢 Alle documenten binnen | Dossier bereikt `DOCS_COMPLETE` |
| 🔴 Dossier over tijd of harde deadline in zicht | SLA overschreden, of `arras_deadline` binnen zeven dagen |
| 💰 Betaling ontvangen | Stripe bevestigt |
| ⚠️ Klant wacht al vier dagen | Bal ligt bij Solmara |

Elk bericht bevat de casecode, de klantnaam en een link naar het dossier. Geen documenten, geen paspoortnummers, geen bedragen van derden.

## Drie dossiers van begin tot eind

Fictieve klanten, maar de stappen zijn precies wat het systeem moet doen. Als developer en opdrachtgever hetzelfde scherm voor zich zien, verdwijnt het grootste deel van de misverstanden.

### Dossier 1 — John Smith, NIE, met één afkeuring

Het gewone geval: alles gaat goed, op één onleesbare scan na.

| Dag | Gebeurtenis | Wat het systeem doet | Wat de behandelaar ziet |
| --- | --- | --- | --- |
| 0 | Formulier op de website ingevuld | `CLIENT SM-C-0021` aangemaakt, lead-event gelogd | Nieuwe lead in *My Work* |
| 0 | Medewerker kwalificeert en kiest de dienst | `CASE SM-CASE-0042`, template `nie-application v3` vastgeprikt, checklist gekopieerd, behandelaar toegewezen | Dossier op `INTAKE` |
| 0 | — | Intakemail in het Engels verstuurd met tokenlink | Taak afgevinkt |
| 2 | John vult de intake in, reden `PROFESSIONAL` | Stage naar `WAITING_FOR_DOCS`, `proof_of_reason` wordt arbeidscontract | Taak: intake beoordelen |
| 3 | Paspoort en contract geüpload | Beide op `RECEIVED`, taak om te beoordelen | Twee documenten wachten |
| 4 | Paspoortscan is onleesbaar | Medewerker zet op `REJECTED` met reden; mail naar John met herstelinstructie | Checklist toont één rood item |
| 6 | Nieuwe scan geüpload en goedgekeurd | — | — |
| 9 | Geen tasa-betaalbewijs, drie dagen stil | Automatische herinnering, eerste van drie | — |
| 11 | Betaalbewijs binnen en goedgekeurd | Alle verplichte documenten `APPROVED` → stage naar `DOCS_COMPLETE`, taak "Volledig dossier controleren", 🟢 in Slack | Dossier springt naar boven |
| 13 | EX-15 gegenereerd en ondertekend retour | Stage naar `IN_PREPARATION` | — |
| 20 | Cita previa geboekt | Stage `APPOINTMENT_SET`, agenda-item, bevestigingsmail met adres en originelen | Afspraak in de agenda |
| 27 | Ingediend bij de Comisaría | Stage `SUBMITTED`, ontvangstbewijs geüpload | — |
| 33 | Resolutie binnen | `nie_resolution` geüpload, betaling al `PAID`, geen open taken → `COMPLETED` toegestaan | Afrondknop wordt actief |
| 40 | — | Review-mail automatisch verstuurd | — |

### Dossier 2 — Anna de Vries, aankoop plus hypotheek

Eén klant, twee dossiers, één harde deadline die ze verbindt.

| Dag | Gebeurtenis | Wat het systeem doet |
| --- | --- | --- |
| 0 | Aanvraag voor woningaankoop | `CASE SM-CASE-0051`, template `property-purchase` |
| 1 | Intake: `needs_mortgage = true` | Systeem stelt een tweede dossier voor; medewerker bevestigt → `SM-CASE-0052` met `mortgage-assistance`, gekoppeld via `linked_case_id` |
| 4 | Nota simple opgevraagd, geen lasten | Aankoopdossier naar `DUE_DILIGENCE`, bevindingen naar klant |
| 12 | Contrato de arras getekend, akte uiterlijk dag 75 | `arras_deadline` verplicht ingevuld; agenda-item; teller loopt |
| 30 | Hypotheekdocumenten compleet | Hypotheekdossier naar `DOCS_COMPLETE` |
| 45 | Aanbiedingen van twee banken | Vergelijkingsmail naar Anna |
| 45 | — | 🔴 in Slack: nog dertig dagen tot `arras_deadline` |
| 52 | FEIN ontvangen | `fein_received_at` vastgelegd; notaris kan pas vanaf dag 62 |
| 61 | — | 🔴 nog veertien dagen, plus taak: acta previa inplannen |
| 63 | Acta previa getekend | Volgorde-eis voldaan |
| 68 | Escritura en hypotheekakte bij de notaris | Beide dossiers naar `SIGNED`, belastingtaken met wettelijke termijn aangemaakt |
| 70 | Modelo 600 betaald | Taak afgerond |
| 95 | Inschrijving bevestigd | Aankoopdossier `COMPLETED`; hypotheekdossier volgde op dag 73 |

### Dossier 3 — Marco Rossi, hypotheek die stilvalt

Het geval waar Airtable en Make het vaakst laten liggen: niets gaat kapot, het verdwijnt alleen uit beeld.

| Dag | Gebeurtenis | Wat het systeem doet |
| --- | --- | --- |
| 0 – 8 | Intake en de eerste documenten | Normaal verloop naar `WAITING_FOR_DOCS` |
| 11 | Jaarcijfers ontbreken, stil sinds dag 8 | Eerste herinnering |
| 14 | Nog steeds stil | Tweede herinnering |
| 17 | Nog steeds stil | Derde en laatste herinnering |
| 20 | Nog steeds stil | Geen mail meer, maar een taak: "Marco bellen", plus ⚠️ in Slack |
| 22 | Marco laat weten dat hij drie maanden wacht op zijn accountant | Medewerker zet dossier op `ON_HOLD` met reden; SLA-telling stopt |
| 68 | Bankafschriften zijn ouder dan zestig dagen | Status naar `EXPIRED`, taak om opnieuw op te vragen, stage kan niet door |
| 110 | Marco meldt zich terug | Medewerker haalt `ON_HOLD` eraf; systeem toont drie verlopen documenten |
| 118 | Nieuwe stukken binnen | Verder alsof er niets gebeurd is, met de volledige historie in het auditlog |

De kern van dit derde dossier: het systeem stopt met mailen en begint met eisen dat een mens iets doet. Een herinneringsmail die eindeloos herhaalt, is geen opvolging.

## Wat de business nog moet bevestigen

De developer kan met dit document beginnen; hij kan er niet mee afmaken. Onderstaande punten zijn de plekken waar is ingevuld wat plausibel is, en waar Solmara het laatste woord heeft.

| Onderwerp | Wat is aangenomen | Wie beslist |
| --- | --- | --- |
| Documentlijst NIE | Wettelijke kern plus gangbare praktijk | Solmara, op basis van hun eigen dossiers |
| Bewijsstukken per aanvraagreden | Vrij veld, medewerker beoordeelt | Solmara: vaste lijst per reden, of vrij laten |
| Documentlijst hypotheek per inkomenstype | Standaardpakket van Spaanse banken | Solmara, samen met de banken waar ze mee werken |
| Alle SLA's en doorlooptijden | Geschat, niet gemeten | Solmara, uit hun eigen historie |
| Prijzen per dienst | `default_price` als placeholder | Solmara |
| Aantal herinneringen voor opgeven | Drie, daarna bellen | Solmara |
| Bewaartermijnen | Instelbaar gelaten, geen waarde ingevuld | Hun gestor, wegens de antiwitwasregels |
| Slack-kanaalindeling | Eén kanaal met thread per dossier | Solmara |
| Wie templates mag wijzigen | Alleen `ADMIN` | Solmara |

De snelste manier om dit af te maken is niet vergaderen. Laat één medewerker een week lang bij elk dossier dat hij aanraakt opschrijven welke stap hij zette en waarop hij wachtte. Die week levert betere SLA's op dan welke schatting dan ook, en de documentlijsten vallen er vanzelf uit.

Voor een vierde dienst is dan geen nieuw document nodig: dezelfde acht kopjes invullen en er staat een werkende template.

## Bronnen

Geraadpleegd op 18 september 2026. Alleen de wettelijke punten zijn hier onderbouwd; de praktijkdelen van de checklists komen uit gangbare praktijk en moeten door Solmara bevestigd worden.

- [Asignación de NIE a instancia del interesado](https://sede.policia.gob.es/portalCiudadano/_es/tramites_extranjeria_tramite_asignacion_nie.php) — Policía Nacional: formulier EX-15, tasa modelo 790 código 012, opgave van de reden
- [Número de Identidad de Extranjero](https://www.interior.gob.es/opencms/es/servicios-al-ciudadano/tramites-y-gestiones/extranjeria/ciudadanos-de-la-union-europea/numero-de-Identidad-de-extranjero-nie/) — Ministerio del Interior: waar in te dienen en de beslistermijn van vijf dagen
- [Ley 5/2019 reguladora de los contratos de crédito inmobiliario](https://www.boe.es/buscar/act.php?id=BOE-A-2019-3814) — FEIN, FiAE, de termijn van tien kalenderdagen en de acta previa uit artikel 15

Wat hier niet onderbouwd is en dat ook niet kan zijn: de precieze documenteisen per provincie en per Oficina de Extranjería, de documentpakketten die individuele banken hanteren, en de bewaartermijnen die volgen uit de Spaanse antiwitwaswetgeving. Die drie horen bij hun gestor thuis, niet bij een specificatie.
