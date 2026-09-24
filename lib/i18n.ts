/*
 * The interface, in three languages.
 *
 * Every visible string lives here, keyed by screen. The pattern is the one
 * lib/status.ts already uses: T(en, nl, es) — one entry, three languages side by
 * side, so a translation that drifts is visible in the diff rather than discovered
 * by a client.
 *
 * Two registers are deliberate and must survive translation:
 *   - client-facing copy is formal (Dutch "u", Spanish "usted"), because we are
 *     asking strangers for their passport;
 *   - staff copy is informal ("je", "tú"), because it is a tool for colleagues.
 *
 * This file is imported by client components, so it must never reach for
 * next/headers. Resolving which language a visitor gets is lib/locale.ts.
 */

import type { Locale } from "./brand";

export const LOCALES: readonly Locale[] = ["nl", "en", "es"];

/** Short form, for the switcher. */
export const LOCALE_SHORT: Record<Locale, string> = { nl: "NL", en: "EN", es: "ES" };

/** Endonyms: a language is named in itself, so you can find yours without reading ours. */
export const LOCALE_NAME: Record<Locale, string> = {
  nl: "Nederlands",
  en: "English",
  es: "Español",
};

/** BCP 47 tags, for dates. */
export const LOCALE_TAG: Record<Locale, string> = { nl: "nl-NL", en: "en-GB", es: "es-ES" };

export function isLocale(value: unknown): value is Locale {
  return value === "nl" || value === "en" || value === "es";
}

/** A day in the visitor's language: "14 maart 2026", "14 March 2026", "14 de marzo de 2026". */
export function formatDate(
  value: Date | string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" },
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return typeof value === "string" ? value : "";
  return date.toLocaleDateString(LOCALE_TAG[locale], options);
}

/**
 * How a colleague wants dates written. LONG is the language's own long form, which
 * is what the client portal always uses; the other three are fixed orders.
 */
export type DateStyle = "LONG" | "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";

export const DATE_STYLES: readonly DateStyle[] = [
  "LONG",
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
];

export function isDateStyle(value: unknown): value is DateStyle {
  return typeof value === "string" && (DATE_STYLES as readonly string[]).includes(value);
}

/*
 * A fixed field order is easier to borrow than to build: en-GB is day first, en-US
 * month first, sv-SE is the ISO order. Asking Intl for a known locale's order beats
 * assembling the string by hand and getting the padding wrong in one of them.
 */
const STYLE_TAG: Record<Exclude<DateStyle, "LONG">, string> = {
  "DD/MM/YYYY": "en-GB",
  "MM/DD/YYYY": "en-US",
  "YYYY-MM-DD": "sv-SE",
};

export type DatePrefs = { style: DateStyle; timeZone?: string };

export const DATE_DEFAULTS: DatePrefs = { style: "LONG" };

/** A date the way this colleague asked for it, in the time zone they work in. */
export function formatDateFor(
  value: Date | string,
  locale: Locale,
  prefs: DatePrefs = DATE_DEFAULTS,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return typeof value === "string" ? value : "";

  const timeZone = prefs.timeZone || undefined;

  if (prefs.style === "LONG") {
    return date.toLocaleDateString(LOCALE_TAG[locale], {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone,
    });
  }

  return date.toLocaleDateString(STYLE_TAG[prefs.style], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone,
  });
}

/**
 * Fills {placeholders}. Used only where a sentence carries a number or a name; the
 * alternative — gluing fragments together at the call site — produces word order
 * that is right in Dutch and wrong in Spanish.
 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}

/* ------------------------------------------------------------------ the dictionary */

type Phrase = Record<Locale, string>;

const T = (en: string, nl: string, es: string): Phrase => ({ en, nl, es });

export const DICT = {
  common: {
    signOut: T("Sign out", "Uitloggen", "Cerrar sesión"),
    signIn: T("Sign in", "Inloggen", "Iniciar sesión"),
    busy: T("Working…", "Bezig…", "Un momento…"),
    cancel: T("Cancel", "Annuleren", "Cancelar"),
    delete: T("Delete", "Verwijderen", "Eliminar"),
    confirmDelete: T("Yes, delete", "Zeker weten", "Sí, eliminar"),
    copy: T("Copy", "Kopieer", "Copiar"),
    copied: T("Copied", "Gekopieerd", "Copiado"),
    email: T("Email address", "E-mailadres", "Correo electrónico"),
    password: T("Password", "Wachtwoord", "Contraseña"),
    passwordAgain: T("Once more", "Nog een keer", "Repítala"),
    or: T("or", "of", "o"),
    blank: T("—", "—", "—"),
    language: T("Language", "Taal", "Idioma"),
    changeLanguage: T("Change language", "Taal wijzigen", "Cambiar de idioma"),
    close: T("Close", "Sluiten", "Cerrar"),
    /* The arrow is part of the string: every back link in the portal wears it. */
    back: T("\u2039 Back to signing in", "\u2039 Terug naar inloggen", "\u2039 Volver a iniciar sesión"),
    showMore: T("Show more", "Meer tonen", "Ver más"),
    showLess: T("Show less", "Minder tonen", "Ver menos"),
    /* The theme button says which theme you are in; the tooltip says what it does. */
    themeLight: T("Light", "Licht", "Claro"),
    themeDark: T("Dark", "Donker", "Oscuro"),
    switchToLight: T("Switch to light", "Zet op licht", "Cambiar a claro"),
    switchToDark: T("Switch to dark", "Zet op donker", "Cambiar a oscuro"),
    /* The photo overlay: shared by property photographs and passport scans. */
    enlarge: T("View larger", "Groter bekijken", "Ver más grande"),
    previousPhoto: T("Previous photo", "Vorige foto", "Fotografía anterior"),
    nextPhoto: T("Next photo", "Volgende foto", "Fotografía siguiente"),
  },

  /* --------------------------------------------------------------- staff sign-in */

  staffLogin: {
    title: T("Sign in", "Inloggen", "Iniciar sesión"),
    wrong: T(
      "That combination is not right.",
      "Die combinatie klopt niet.",
      "Esa combinación no es correcta.",
    ),
  },

  /* ------------------------------------------------------------------- admin nav */

  nav: {
    /* The two group headings above the rows. */
    portal: T("Portal", "Portal", "Portal"),
    account: T("Account", "Account", "Cuenta"),

    administration: T("Administration", "Beheer", "Administración"),
    menu: T("Menu", "Menu", "Menú"),
    help: T("Help & Support", "Help & ondersteuning", "Ayuda y soporte"),

    overview: T("Overview", "Overzicht", "Resumen"),
    clients: T("Clients", "Klanten", "Clientes"),
    /* Broader than "Service Procedures" on purpose: it holds internal processes
       too, not only the services we sell. */
    guides: T("Process Guide", "Process Guide", "Guía de procesos"),
    properties: T("Properties", "Properties", "Propiedades"),
    documents: T("Documents", "Documenten", "Documentos"),
    tasks: T("Tasks", "Taken", "Tareas"),
    invoices: T("Invoices", "Facturatie", "Facturación"),
    myAccount: T("My Account", "Mijn account", "Mi cuenta"),
    workspace: T("Workspace Settings", "Werkruimte", "Espacio de trabajo"),
    team: T("Team & Permissions", "Team & rechten", "Equipo y permisos"),
    clientAccounts: T("Client Accounts", "Klantaccounts", "Cuentas de cliente"),
  },

  /* ---------------------------------------------------------------- overview */

  overview: {
    title: T("Overview", "Overzicht", "Resumen"),
    lead: T(
      "Where everything stands. The only thing here that is a job rather than a number is the documents waiting for a decision.",
      "Hoe alles ervoor staat. Het enige wat hier werk is in plaats van een getal, zijn de documenten die op een beslissing wachten.",
      "Cómo está todo. Lo único que aquí es trabajo y no una cifra son los documentos que esperan una decisión.",
    ),
    waitingOne: T(
      "document waiting for review",
      "document wacht op beoordeling",
      "documento esperando revisión",
    ),
    waitingMany: T(
      "documents waiting for review",
      "documenten wachten op beoordeling",
      "documentos esperando revisión",
    ),
    withoutAccount: T("{n} without an account", "{n} zonder account", "{n} sin cuenta"),
    photoCount: T("{n} photographs", "{n} foto’s", "{n} fotografías"),
    guidesNote: T(
      "How we do the work",
      "Hoe wij het werk doen",
      "Cómo hacemos el trabajo",
    ),
    documentsNote: T("Sent by clients", "Door klanten gestuurd", "Enviados por clientes"),
    tasksNote: T("Still to do", "Nog te doen", "Todavía por hacer"),
  },

  /* ------------------------------------------------------- documents (all clients) */

  documentsPage: {
    title: T("Documents", "Documenten", "Documentos"),
    lead: T(
      "Everything clients have sent, across all of them, with whatever still needs a decision at the top.",
      "Alles wat klanten hebben gestuurd, over alle klanten heen, met bovenaan wat nog een beslissing nodig heeft.",
      "Todo lo que han enviado los clientes, de todos ellos, con lo que aún necesita una decisión arriba del todo.",
    ),
    waitingOne: T("{n} waiting for review", "{n} wacht op beoordeling", "{n} esperando revisión"),
    waitingMany: T(
      "{n} waiting for review",
      "{n} wachten op beoordeling",
      "{n} esperando revisión",
    ),
    empty: T(
      "Nothing has been sent yet.",
      "Er is nog niets gestuurd.",
      "Todavía no se ha enviado nada.",
    ),
  },

  /* ----------------------------------------------------------------------- tasks */

  tasksPage: {
    title: T("Tasks", "Taken", "Tareas"),
    lead: T(
      "What still has to happen, and who is doing it. Ticking something off keeps it in the list.",
      "Wat er nog moet gebeuren, en wie het doet. Afvinken laat het in de lijst staan.",
      "Lo que todavía tiene que pasar, y quién lo hace. Marcarla no la quita de la lista.",
    ),

    add: T("Add", "Toevoegen", "Añadir"),
    addPlaceholder: T(
      "What needs doing?",
      "Wat moet er gebeuren?",
      "¿Qué hay que hacer?",
    ),
    titleRequired: T(
      "Give the task a line of text first.",
      "Geef de taak eerst een regel tekst.",
      "Escribe primero una línea para la tarea.",
    ),
    notFound: T("That task is gone.", "Die taak bestaat niet meer.", "Esa tarea ya no existe."),
    saved: T("Saved.", "Opgeslagen.", "Guardada."),

    filterLabel: T("Which tasks to show", "Welke taken je ziet", "Qué tareas se muestran"),
    filter: {
      OPEN: T("Open", "Open", "Abiertas"),
      DONE: T("Done", "Afgevinkt", "Hechas"),
      ALL: T("All", "Alles", "Todas"),
    },
    openOne: T("{n} still open", "{n} staat nog open", "{n} pendiente"),
    openMany: T("{n} still open", "{n} staan nog open", "{n} pendientes"),

    empty: T(
      "Nothing on the list. Type the first one above.",
      "Niets op de lijst. Typ hierboven de eerste.",
      "Nada en la lista. Escribe la primera arriba.",
    ),
    noneHere: T(
      "Nothing here. Try another filter.",
      "Hier staat niets. Probeer een ander filter.",
      "Aquí no hay nada. Prueba otro filtro.",
    ),

    expand: T("Open the task", "Taak openklappen", "Abrir la tarea"),
    collapse: T("Close the task", "Taak dichtklappen", "Cerrar la tarea"),
    taskTitle: T("Task", "Taak", "Tarea"),
    due: T("Deadline", "Deadline", "Fecha límite"),
    assignee: T("Who is doing it", "Wie doet het", "Quién la hace"),
    nobody: T("Nobody yet", "Nog niemand", "Nadie todavía"),
    client: T("About which client", "Over welke klant", "Sobre qué cliente"),
    noClient: T("Not about a client", "Niet over een klant", "No es sobre un cliente"),
    details: T("Details", "Toelichting", "Detalles"),
    openClient: T("Open the client", "Klant openen", "Abrir el cliente"),
  },

  /* -------------------------------------------------------------- clients (list) */

  clients: {
    title: T("Clients", "Klanten", "Clientes"),
    lead: T(
      "Create a client and send them the link. They fill in their own details and upload their passport and photograph — nobody here has to type any of it.",
      "Maak een klant aan en stuur de link. De klant vult daarna zelf zijn gegevens in en uploadt paspoort en pasfoto — zonder dat iemand hier iets hoeft over te typen.",
      "Crea un cliente y envíale el enlace. El cliente rellena sus propios datos y sube su pasaporte y su fotografía: aquí nadie tiene que teclear nada.",
    ),
    countOne: T("{n} client", "{n} klant", "{n} cliente"),
    countMany: T("{n} clients", "{n} klanten", "{n} clientes"),
    empty: T(
      "No clients yet. Create one above.",
      "Nog geen klanten. Maak er hierboven een aan.",
      "Todavía no hay clientes. Crea uno arriba.",
    ),
    hasAccount: T("Has an account", "Heeft een account", "Tiene una cuenta"),
    newClient: T("New client", "Nieuwe klant", "Nuevo cliente"),

    /* Grid and list */
    viewLabel: T("How to show clients", "Hoe klanten getoond worden", "Cómo se muestran los clientes"),
    gridView: T("Grid view", "Rasterweergave", "Vista de cuadrícula"),
    listView: T("List view", "Lijstweergave", "Vista de lista"),
    viewDetails: T("View details", "Details bekijken", "Ver detalles"),
    searchPlaceholder: T("Search clients…", "Zoek klanten…", "Buscar clientes…"),
    filterLabel: T("Filter by status", "Filter op status", "Filtrar por estado"),
    filterAll: T("All", "Alles", "Todos"),
    sortBy: T("Sort", "Sorteren", "Ordenar"),
    sort: {
      NAME_AZ: T("Name A–Z", "Naam A–Z", "Nombre A–Z"),
      NAME_ZA: T("Name Z–A", "Naam Z–A", "Nombre Z–A"),
      NEWEST: T("Newest first", "Nieuwste eerst", "Más recientes primero"),
      OLDEST: T("Oldest first", "Oudste eerst", "Más antiguos primero"),
    },
    countFiltered: T(
      "{shown} of {total} clients",
      "{shown} van {total} klanten",
      "{shown} de {total} clientes",
    ),
    noMatch: T("Nothing matches that.", "Daar past niets bij.", "No hay nada que coincida."),
    columnClient: T("Client", "Klant", "Cliente"),
    columnPlace: T("Place", "Plaats", "Localidad"),
    columnStatus: T("Status", "Status", "Estado"),
    columnCreated: T("Added", "Toegevoegd", "Añadido"),
    previous: T("Previous", "Vorige", "Anterior"),
    next: T("Next", "Volgende", "Siguiente"),
    pageOf: T("Page {page} of {pages}", "Pagina {page} van {pages}", "Página {page} de {pages}"),

    /* What the office keeps about a client */
    billingTitle: T("Details for invoicing", "Gegevens voor facturatie", "Datos para facturación"),
    billingLead: T(
      "What an invoice needs. Filled in by us, not by the client, and copied onto an invoice when one is made.",
      "Wat een factuur nodig heeft. Door ons ingevuld, niet door de klant, en overgenomen op een factuur zodra die wordt gemaakt.",
      "Lo que necesita una factura. Lo rellenamos nosotros, no el cliente, y se copia en la factura cuando se crea.",
    ),
    billingEmpty: T(
      "Nothing filled in yet. Without these an invoice still works — you just type them on the invoice itself.",
      "Nog niets ingevuld. Zonder dit werkt een factuur ook — je typt ze dan op de factuur zelf.",
      "Todavía sin rellenar. Sin esto una factura también funciona: los escribes en la propia factura.",
    ),
    billingSaved: T("Saved.", "Opgeslagen.", "Guardado."),
    choosePhoto: T("Choose a photo", "Kies een foto", "Elegir una foto"),
    savePhoto: T("Save photo", "Foto opslaan", "Guardar la foto"),
    removePhoto: T("Remove photo", "Foto weghalen", "Quitar la foto"),
    generateLink: T("Generate link", "Link genereren", "Generar enlace"),
    linkFor: T("Link for {name}", "Link voor {name}", "Enlace para {name}"),
    statusInvited: T("Invited", "Uitgenodigd", "Invitado"),
    statusActive: T("Active", "Actief", "Activo"),
    statusClosed: T("Closed", "Afgesloten", "Cerrado"),
  },

  newClient: {
    name: T("Name", "Naam", "Nombre"),
    language: T("Language", "Taal", "Idioma"),
    internalNote: T("Internal note", "Interne notitie", "Nota interna"),
    internalNoteHint: T(
      "For the team only. The client never sees this.",
      "Alleen voor het team. De klant ziet dit nooit.",
      "Solo para el equipo. El cliente nunca lo ve.",
    ),
    submit: T("Create client", "Klant aanmaken", "Crear cliente"),
  },

  /* ----------------------------------------------------------- one client (staff) */

  clientDetail: {
    back: T("‹ All clients", "‹ Alle klanten", "‹ Todos los clientes"),
    detailsFilledOn: T(
      "Details filled in on {date}",
      "Gegevens ingevuld op {date}",
      "Datos rellenados el {date}",
    ),
    detailsNotFilled: T(
      "Details not filled in yet",
      "Gegevens nog niet ingevuld",
      "Datos aún sin rellenar",
    ),
    sectionDetails: T("Details", "Gegevens", "Datos"),
    sectionNote: T("Internal note", "Interne notitie", "Nota interna"),
    sectionDocuments: T("Documents", "Documenten", "Documentos"),
    lastLinkUsed: T(
      "Last link created on {date}, since used.",
      "Laatste link aangemaakt op {date}, inmiddels gebruikt.",
      "Último enlace creado el {date}, ya utilizado.",
    ),
    lastLinkValid: T(
      "Last link created on {date}, valid until {until}.",
      "Laatste link aangemaakt op {date}, geldig tot {until}.",
      "Último enlace creado el {date}, válido hasta el {until}.",
    ),
  },

  /* ------------------------------------------------------------------- access */

  /*
   * Whether a client can actually sign in — a different question from the status of
   * their file, which is what the pill next to their name answers. Shared by the
   * directory, the client page and the Client Accounts screen, so all three call the
   * same state by the same name.
   */
  access: {
    title: T("Portal access", "Toegang tot het portaal", "Acceso al portal"),
    label: T("Portal", "Portaal", "Portal"),
    filterLabel: T("Filter by portal access", "Filter op portaaltoegang", "Filtrar por acceso al portal"),
    filterAll: T("Any access", "Elke toegang", "Cualquier acceso"),

    NO_ACCOUNT: T("No account", "Geen account", "Sin cuenta"),
    INVITED: T("Invited", "Uitgenodigd", "Invitado"),
    EXPIRED: T("Link expired", "Link verlopen", "Enlace caducado"),
    UNVERIFIED: T("Email not verified", "E-mail niet bevestigd", "Correo sin verificar"),
    ACTIVE: T("Active portal", "Portaal actief", "Portal activo"),
    DISABLED: T("Disabled", "Geblokkeerd", "Bloqueado"),

    activeSince: T(
      "Signed in for the first time on {date}, and can sign in whenever they like.",
      "Voor het eerst ingelogd op {date} en kan sindsdien inloggen wanneer hij wil.",
      "Entró por primera vez el {date} y desde entonces puede entrar cuando quiera.",
    ),
    activePlain: T(
      "There is a login for this client.",
      "Er is een login voor deze klant.",
      "Existe un acceso para este cliente.",
    ),
    unverifiedExplain: T(
      "They signed up, but have not opened the confirmation email yet.",
      "Hij heeft zich aangemeld, maar de bevestigingsmail nog niet geopend.",
      "Se registró, pero todavía no ha abierto el correo de confirmación.",
    ),
    disabledExplain: T(
      "An administrator switched this account off. Signing in is refused until it is switched back on.",
      "Een beheerder heeft dit account uitgezet. Inloggen wordt geweigerd tot het weer aan staat.",
      "Un administrador desactivó esta cuenta. No podrá entrar hasta que se reactive.",
    ),
    pendingUntil: T(
      "A link was sent and is still valid until {until}. Nobody has used it yet, so there is no login.",
      "Er is een link verstuurd die nog geldig is tot {until}. Niemand heeft hem gebruikt, dus er is nog geen login.",
      "Se envió un enlace válido hasta el {until}. Nadie lo ha usado todavía, así que aún no hay acceso.",
    ),
    expiredExplain: T(
      "The last link was never used and has run out. Generate a new one, or create an account here.",
      "De laatste link is nooit gebruikt en is verlopen. Maak een nieuwe aan, of maak hier een account.",
      "El último enlace nunca se usó y ha caducado. Genera uno nuevo o crea una cuenta aquí.",
    ),
    noneExplain: T(
      "This client only exists in our own records. No account and no link, so they cannot reach the portal.",
      "Deze klant staat alleen in onze eigen administratie. Geen account en geen link, dus hij kan niet bij het portaal.",
      "Este cliente solo existe en nuestra administración. Sin cuenta ni enlace, así que no puede acceder al portal.",
    ),
    howLoginsHappen: T(
      "A login exists once we send an invitation and the client uses it, once an administrator creates an account here, or once the client registers with this email address themselves.",
      "Een login bestaat zodra wij een uitnodiging sturen en de klant die gebruikt, zodra een beheerder hier een account aanmaakt, of zodra de klant zich zelf met dit e-mailadres aanmeldt.",
      "Existe un acceso cuando enviamos una invitación y el cliente la usa, cuando un administrador crea aquí una cuenta, o cuando el propio cliente se registra con este correo.",
    ),
    newLink: T("New link", "Nieuwe link", "Nuevo enlace"),
    statusIsFile: T(
      "\u201C{status}\u201D above is about their file, not about signing in.",
      "\u201C{status}\u201D hierboven gaat over hun dossier, niet over inloggen.",
      "\u00AB{status}\u00BB arriba se refiere a su expediente, no a entrar.",
    ),
  },

  /* --------------------------------------------------------- client accounts */

  accounts: {
    title: T("Client Accounts", "Klantaccounts", "Cuentas de cliente"),
    navLabel: T("Client Accounts", "Klantaccounts", "Cuentas de cliente"),
    lead: T(
      "Who can sign in to the client portal, with what address, and what to do about it. Staff accounts are on Team & Permissions; these are the customers.",
      "Wie er op het klantportaal kan inloggen, met welk adres, en wat je eraan kunt doen. Medewerkers staan bij Team & rechten; dit zijn de klanten.",
      "Quién puede entrar en el portal de clientes, con qué dirección y qué hacer al respecto. El personal está en Equipo y permisos; aquí están los clientes.",
    ),
    searchPlaceholder: T("Search client or email…", "Zoek klant of e-mail…", "Buscar cliente o correo…"),
    columnClient: T("Client", "Klant", "Cliente"),
    columnLogin: T("Login", "Login", "Acceso"),
    columnStatus: T("Account status", "Accountstatus", "Estado de la cuenta"),
    columnActivity: T("Activity", "Activiteit", "Actividad"),
    columnActions: T("Actions", "Acties", "Acciones"),
    password: T("Password", "Wachtwoord", "Contraseña"),
    passwordSet: T(
      "A password exists. It is stored hashed and cannot be read by anyone, including administrators.",
      "Er is een wachtwoord. Het staat versleuteld opgeslagen en is voor niemand leesbaar, ook niet voor beheerders.",
      "Existe una contraseña. Se guarda cifrada y nadie puede leerla, tampoco los administradores.",
    ),
    noPassword: T("No password yet", "Nog geen wachtwoord", "Todavía sin contraseña"),
    created: T("Account created", "Account aangemaakt", "Cuenta creada"),
    lastLogin: T("Last login", "Laatste keer ingelogd", "Último acceso"),
    never: T("Never", "Nooit", "Nunca"),
    verified: T("Email verified", "E-mail bevestigd", "Correo verificado"),
    yes: T("Yes", "Ja", "Sí"),
    no: T("No", "Nee", "No"),
    selfRegistered: T("Registered themselves", "Zelf aangemeld", "Se registró por su cuenta"),

    /* Actions */
    openClient: T("Open client", "Klant openen", "Abrir cliente"),
    createAccount: T("Create portal account", "Portaalaccount aanmaken", "Crear cuenta del portal"),
    createShort: T("Create account", "Account aanmaken", "Crear cuenta"),
    copyLoginLink: T("Copy login link", "Loginlink kopiëren", "Copiar enlace de acceso"),
    resendInvite: T("Send new invitation", "Nieuwe uitnodiging sturen", "Enviar nueva invitación"),
    sendReset: T("Send password reset", "Wachtwoordherstel sturen", "Enviar restablecimiento"),
    newPassword: T("Generate temporary password", "Tijdelijk wachtwoord maken", "Generar contraseña temporal"),
    disable: T("Disable access", "Toegang blokkeren", "Bloquear acceso"),
    enable: T("Enable access", "Toegang herstellen", "Restablecer acceso"),
    generate: T("Generate secure password", "Veilig wachtwoord genereren", "Generar contraseña segura"),

    /* The create form */
    createTitle: T("Create portal account", "Portaalaccount aanmaken", "Crear cuenta del portal"),
    createLead: T(
      "The client can sign in immediately with this address and password. Ask them to change it after the first sign-in.",
      "De klant kan meteen inloggen met dit adres en wachtwoord. Vraag hem het na de eerste keer inloggen te wijzigen.",
      "El cliente podrá entrar de inmediato con esta dirección y contraseña. Pídele que la cambie tras el primer acceso.",
    ),
    clientLabel: T("Client", "Klant", "Cliente"),
    emailLabel: T("Login email", "E-mailadres voor inloggen", "Correo de acceso"),
    temporaryPassword: T("Temporary password", "Tijdelijk wachtwoord", "Contraseña temporal"),

    /* The one-time modal */
    createdTitle: T("Portal account created", "Portaalaccount aangemaakt", "Cuenta del portal creada"),
    newPasswordTitle: T("New temporary password", "Nieuw tijdelijk wachtwoord", "Nueva contraseña temporal"),
    onceWarning: T(
      "This password is shown only once. After closing this window it cannot be retrieved — you can only generate a new one.",
      "Dit wachtwoord is maar één keer te zien. Na het sluiten van dit venster is het niet meer op te vragen — je kunt alleen een nieuw wachtwoord maken.",
      "Esta contraseña se muestra una sola vez. Al cerrar esta ventana no se podrá recuperar: solo podrás generar otra.",
    ),
    sendSecurely: T(
      "Send it to the client over a channel you trust.",
      "Stuur hem via een kanaal dat je vertrouwt naar de klant.",
      "Envíasela al cliente por un canal de confianza.",
    ),
    copyEmail: T("Copy email", "E-mail kopiëren", "Copiar correo"),
    copyPassword: T("Copy password", "Wachtwoord kopiëren", "Copiar contraseña"),

    /* Messages */
    passwordTooShort: T(
      "A password needs at least 8 characters.",
      "Een wachtwoord heeft minstens 8 tekens nodig.",
      "La contraseña necesita al menos 8 caracteres.",
    ),
    resetSent: T(
      "Password reset email sent.",
      "Mail met wachtwoordherstel verstuurd.",
      "Correo de restablecimiento enviado.",
    ),
    resetFailed: T(
      "That email could not be sent.",
      "Die mail kon niet verstuurd worden.",
      "No se ha podido enviar ese correo.",
    ),
    disabledDone: T("Access blocked.", "Toegang geblokkeerd.", "Acceso bloqueado."),
    enabledDone: T("Access restored.", "Toegang hersteld.", "Acceso restablecido."),
    confirmDisable: T(
      "Block this client from signing in?",
      "Deze klant het inloggen blokkeren?",
      "¿Bloquear el acceso de este cliente?",
    ),
    countOne: T("{n} client", "{n} klant", "{n} cliente"),
    countMany: T("{n} clients", "{n} klanten", "{n} clientes"),
    noMatch: T("Nothing matches that.", "Daar past niets bij.", "No hay nada que coincida."),
  },

  /* ------------------------------------------------------ the client's own fields */

  fields: {
    name: T("Full name", "Volledige naam", "Nombre completo"),
    nameHint: T(
      "As it appears in your passport.",
      "Zoals in uw paspoort staat.",
      "Tal como aparece en su pasaporte.",
    ),
    phone: T("Telephone number", "Telefoonnummer", "Número de teléfono"),
    dateOfBirth: T("Date of birth", "Geboortedatum", "Fecha de nacimiento"),
    nationality: T("Nationality", "Nationaliteit", "Nacionalidad"),
    passportNumber: T("Passport number", "Paspoortnummer", "Número de pasaporte"),
    passportExpiry: T("Passport valid until", "Paspoort geldig tot", "Pasaporte válido hasta"),
    addressHomeCountry: T(
      "Address in your own country",
      "Adres in uw eigen land",
      "Domicilio en su país",
    ),
    addressSpain: T("Address in Spain", "Adres in Spanje", "Domicilio en España"),
    addressSpainHint: T(
      "No address yet? Fill in the town where you are looking.",
      "Hebt u er nog geen, vul dan de plaats in waar u zoekt.",
      "¿Todavía no tiene? Indique la localidad donde busca.",
    ),
  },

  /* ------------------------------------------------------- document review (staff) */

  review: {
    statusRequired: T("Not received yet", "Nog niet ontvangen", "Aún no recibido"),
    statusReceived: T("Waiting for review", "Wacht op beoordeling", "Pendiente de revisión"),
    statusApproved: T("Approved", "Goedgekeurd", "Aprobado"),
    statusRejected: T("Rejected", "Afgekeurd", "Rechazado"),
    openFile: T("Open file", "Bestand openen", "Abrir archivo"),
    notSentYet: T(
      "The client has not sent this yet.",
      "De klant heeft dit nog niet gestuurd.",
      "El cliente todavía no lo ha enviado.",
    ),
    receivedOn: T("Received on {date}", "Ontvangen op {date}", "Recibido el {date}"),
    approve: T("Approve", "Goedkeuren", "Aprobar"),
    reject: T("Reject", "Afkeuren", "Rechazar"),
    whyNot: T("Why not?", "Waarom niet?", "¿Por qué no?"),
    whyNotPlaceholder: T(
      "The bottom edge is cut off, so the machine-readable line cannot be read.",
      "De onderrand staat er niet op, waardoor de machineleesbare regel niet te lezen is.",
      "Falta el borde inferior, por lo que no se puede leer la línea de lectura mecánica.",
    ),
    clientReads: T(
      "The client reads this text word for word.",
      "De klant leest deze tekst letterlijk.",
      "El cliente lee este texto literalmente.",
    ),
    rejectAndSend: T("Reject and send", "Afkeuren en versturen", "Rechazar y enviar"),
  },

  /* ------------------------------------------------------------------ invoicing */

  invoices: {
    title: T("Invoices", "Facturatie", "Facturación"),
    lead: T(
      "Manage, send and track Solmavera invoices.",
      "Beheer, verstuur en volg facturen van Solmavera.",
      "Gestiona, envía y realiza el seguimiento de las facturas de Solmavera.",
    ),
    newInvoice: T("New invoice", "Nieuwe factuur", "Nueva factura"),
    backToList: T("‹ Invoices", "‹ Facturatie", "‹ Facturación"),

    searchPlaceholder: T(
      "Search by number, client or email…",
      "Zoek op nummer, klant of e-mail…",
      "Buscar por número, cliente o correo…",
    ),
    filterLabel: T("Filter by status", "Filter op status", "Filtrar por estado"),
    sortBy: T("Sort", "Sorteren", "Ordenar"),
    noMatch: T("Nothing matches that.", "Daar past niets bij.", "No hay nada que coincida."),
    noNumberYet: T("Draft", "Concept", "Borrador"),
    dueShort: T("due", "vervalt", "vence"),

    emptyTitle: T("No invoices yet", "Nog geen facturen", "Todavía no hay facturas"),
    emptyBody: T(
      "Make your first invoice for a client.",
      "Maak je eerste factuur voor een klant.",
      "Crea tu primera factura para un cliente.",
    ),

    columnNumber: T("Invoice", "Factuur", "Factura"),
    columnClient: T("Client", "Klant", "Cliente"),
    columnIssued: T("Issued", "Datum", "Emitida"),
    columnDue: T("Due", "Vervaldatum", "Vence"),
    columnAmount: T("Amount", "Bedrag", "Importe"),
    columnStatus: T("Status", "Status", "Estado"),

    status: {
      DRAFT: T("Draft", "Concept", "Borrador"),
      FINALIZED: T("Finalized", "Definitief", "Finalizada"),
      SENT: T("Sent", "Verstuurd", "Enviada"),
      PAID: T("Paid", "Betaald", "Pagada"),
      OVERDUE: T("Overdue", "Te laat", "Vencida"),
      CANCELLED: T("Cancelled", "Geannuleerd", "Anulada"),
    },
    filter: {
      ALL: T("All", "Alles", "Todas"),
      DRAFT: T("Draft", "Concept", "Borrador"),
      FINALIZED: T("Finalized", "Definitief", "Finalizada"),
      SENT: T("Sent", "Verstuurd", "Enviada"),
      PAID: T("Paid", "Betaald", "Pagada"),
      OVERDUE: T("Overdue", "Te laat", "Vencida"),
    },
    sort: {
      NEWEST: T("Newest first", "Nieuwste eerst", "Más recientes primero"),
      OLDEST: T("Oldest first", "Oudste eerst", "Más antiguas primero"),
      NUMBER: T("Invoice number", "Factuurnummer", "Número de factura"),
      AMOUNT: T("Amount", "Bedrag", "Importe"),
    },

    /* The editor */
    draftTitle: T("Draft invoice", "Conceptfactuur", "Factura en borrador"),
    draftLead: T(
      "Nothing is final until you finalise it. The invoice number is assigned then, not before.",
      "Niets ligt vast tot je de factuur definitief maakt. Het factuurnummer wordt dán toegekend, niet eerder.",
      "Nada queda fijado hasta que finalices la factura. El número se asigna entonces, no antes.",
    ),
    customer: T("Recipient", "Ontvanger", "Destinatario"),
    customerLead: T(
      "Pick a client to fill this in, then adjust anything that is different for this invoice. Changes here stay on this invoice and do not touch the client's own record.",
      "Kies een klant om dit in te vullen en pas aan wat voor déze factuur anders is. Wijzigingen blijven op deze factuur en raken het klantdossier niet.",
      "Elige un cliente para rellenarlo y ajusta lo que sea distinto en esta factura. Los cambios se quedan en esta factura y no tocan la ficha del cliente.",
    ),
    pickClient: T("Choose a client", "Klant kiezen", "Elegir cliente"),
    changeClient: T("Choose another client", "Andere klant kiezen", "Elegir otro cliente"),
    searchClients: T("Search clients…", "Zoek klanten…", "Buscar clientes…"),
    noClients: T("No clients found.", "Geen klanten gevonden.", "No se han encontrado clientes."),
    linked: T("Linked to a client", "Gekoppeld aan een klant", "Vinculada a un cliente"),
    customerName: T("Name", "Naam", "Nombre"),
    companyName: T("Company", "Bedrijf", "Empresa"),
    taxId: T("Tax ID / NIE", "Fiscaal nummer / NIE", "NIF / NIE"),
    vatNumber: T("VAT number", "Btw-nummer", "Número de IVA"),
    address: T("Address", "Adres", "Dirección"),
    postalCode: T("Postal code", "Postcode", "Código postal"),
    city: T("City", "Plaats", "Ciudad"),
    province: T("Province", "Provincie", "Provincia"),
    country: T("Country", "Land", "País"),

    details: T("Invoice details", "Factuurgegevens", "Datos de la factura"),
    issueDate: T("Invoice date", "Factuurdatum", "Fecha de factura"),
    dueDate: T("Due date", "Vervaldatum", "Fecha de vencimiento"),
    language: T("Invoice language", "Taal van de factuur", "Idioma de la factura"),
    languageHint: T(
      "The language of the document itself, not of the portal.",
      "De taal van het document zelf, niet van het portaal.",
      "El idioma del documento en sí, no el del portal.",
    ),

    lines: T("Lines", "Regels", "Líneas"),
    description: T("Description", "Omschrijving", "Descripción"),
    quantity: T("Quantity", "Aantal", "Cantidad"),
    unitPrice: T("Unit price", "Prijs", "Precio"),
    vat: T("VAT", "Btw", "IVA"),
    lineTotal: T("Total", "Totaal", "Total"),
    addLine: T("Add line", "Regel toevoegen", "Añadir línea"),
    subtotal: T("Subtotal", "Subtotaal", "Subtotal"),
    total: T("Total", "Totaal", "Total"),

    notes: T("Notes and payment", "Opmerkingen en betaling", "Observaciones y pago"),
    notesLabel: T("Note on the invoice", "Opmerking op de factuur", "Nota en la factura"),
    paymentInstructions: T(
      "Payment instructions",
      "Betaalinstructies",
      "Instrucciones de pago",
    ),
    paymentHint: T(
      "The bank details come from Workspace Settings; this is anything you want to add for this invoice.",
      "De bankgegevens komen uit de Werkruimte; dit is wat je voor déze factuur wilt toevoegen.",
      "Los datos bancarios vienen del Espacio de trabajo; esto es lo que quieras añadir para esta factura.",
    ),

    saveDraft: T("Save draft", "Concept opslaan", "Guardar borrador"),
    saved: T("Saved.", "Opgeslagen.", "Guardado."),
    preview: T("Preview", "Voorbeeld", "Vista previa"),
    finalize: T("Finalize invoice", "Factuur definitief maken", "Finalizar factura"),
    finalizeTitle: T("Finalize this invoice?", "Deze factuur definitief maken?", "¿Finalizar esta factura?"),
    finalizeBody: T(
      "The invoice gets its official number, the sender and recipient are frozen as they are now, and the PDF is made. After this the amounts can no longer be changed.",
      "De factuur krijgt haar officiële nummer, afzender en ontvanger worden vastgelegd zoals ze nu zijn, en de PDF wordt gemaakt. Daarna kunnen de bedragen niet meer wijzigen.",
      "La factura recibe su número oficial, el emisor y el destinatario quedan fijados tal como están ahora, y se genera el PDF. Después ya no se pueden cambiar los importes.",
    ),
    finalizeHint: T(
      "A recipient name and at least one line with a quantity above zero are needed before this invoice can be finalised.",
      "Een naam van de ontvanger en minstens één regel met een aantal boven nul zijn nodig voordat deze factuur definitief kan worden.",
      "Hacen falta un nombre de destinatario y al menos una línea con cantidad mayor que cero antes de poder finalizar.",
    ),
    finalized: T(
      "Finalized. The PDF is ready.",
      "Definitief gemaakt. De PDF staat klaar.",
      "Finalizada. El PDF está listo.",
    ),
    finalizedNoPdf: T(
      "Finalized, but the PDF could not be made. The invoice is valid; make the PDF again from the invoice.",
      "Definitief gemaakt, maar de PDF lukte niet. De factuur is geldig; maak de PDF opnieuw vanaf de factuur.",
      "Finalizada, pero no se pudo generar el PDF. La factura es válida; genera el PDF de nuevo desde la factura.",
    ),
    deleteDraft: T("Delete draft", "Concept verwijderen", "Eliminar borrador"),
    deleteBody: T(
      "A draft can go; it has no invoice number and nothing depends on it.",
      "Een concept mag weg; het heeft geen factuurnummer en er hangt niets aan.",
      "Un borrador puede eliminarse; no tiene número de factura y nada depende de él.",
    ),

    /* Errors from the server */
    notFound: T("That invoice is gone.", "Die factuur bestaat niet meer.", "Esa factura ya no existe."),
    notADraft: T(
      "This invoice is final and cannot be changed.",
      "Deze factuur is definitief en kan niet meer wijzigen.",
      "Esta factura es definitiva y ya no se puede cambiar.",
    ),
    datesRequired: T(
      "Fill in both dates.",
      "Vul beide datums in.",
      "Rellena las dos fechas.",
    ),
    needCustomer: T(
      "The invoice needs a recipient name.",
      "De factuur heeft een naam van de ontvanger nodig.",
      "La factura necesita un nombre de destinatario.",
    ),
    needLines: T(
      "An invoice needs at least one line.",
      "Een factuur heeft minstens één regel nodig.",
      "Una factura necesita al menos una línea.",
    ),
    needIssuer: T(
      "Fill in the company's legal name under Workspace Settings first — an invoice cannot go out without a sender.",
      "Vul eerst de juridische bedrijfsnaam in bij Werkruimte — een factuur kan niet zonder afzender de deur uit.",
      "Rellena primero el nombre legal de la empresa en el Espacio de trabajo: una factura no puede salir sin emisor.",
    ),
    badAmount: T(
      "A line has a quantity of zero or less.",
      "Een regel heeft een aantal van nul of minder.",
      "Una línea tiene una cantidad de cero o menos.",
    ),

    /* The finalised invoice */
    amounts: T("Amounts", "Bedragen", "Importes"),
    history: T("History", "Verloop", "Historial"),
    locked: T("Final", "Definitief", "Definitiva"),
    lockedBody: T(
      "This invoice is part of the invoice history and is no longer edited. A correction is a credit note — that is the next thing to build, and deliberately not a quiet edit here.",
      "Deze factuur hoort bij de factuurhistorie en wordt niet meer bewerkt. Een correctie is een creditnota — dat is het volgende om te bouwen, en met opzet geen stille wijziging hier.",
      "Esta factura forma parte del historial y ya no se edita. Una corrección es un abono: eso es lo siguiente que construir, y deliberadamente no una edición silenciosa aquí.",
    ),
    viewPdf: T("View PDF", "PDF bekijken", "Ver PDF"),
    downloadPdf: T("Download", "Downloaden", "Descargar"),
    pdfMissing: T("The PDF was not made.", "De PDF is niet gemaakt.", "No se generó el PDF."),
    makePdf: T("Make the PDF", "PDF maken", "Generar el PDF"),
    pdfMade: T("The PDF is ready.", "De PDF staat klaar.", "El PDF está listo."),
    pdfFailed: T(
      "The PDF still could not be made.",
      "De PDF lukte opnieuw niet.",
      "El PDF sigue sin poder generarse.",
    ),
    markSent: T("Mark as sent", "Markeer als verstuurd", "Marcar como enviada"),
    markedSent: T("Marked as sent.", "Gemarkeerd als verstuurd.", "Marcada como enviada."),
    markPaid: T("Mark as paid", "Markeer als betaald", "Marcar como pagada"),
    markedPaid: T("Marked as paid.", "Gemarkeerd als betaald.", "Marcada como pagada."),
    paymentMethod: T("How was it paid?", "Hoe is er betaald?", "¿Cómo se ha pagado?"),
    paymentReference: T("Reference", "Kenmerk", "Referencia"),
    method: {
      TRANSFER: T("Bank transfer", "Overboeking", "Transferencia"),
      CASH: T("Cash", "Contant", "Efectivo"),
      CARD: T("Card", "Pin of creditcard", "Tarjeta"),
      OTHER: T("Other", "Anders", "Otro"),
    },
    openClient: T("Open the client", "Klant openen", "Abrir el cliente"),

    eventCreated: T("Invoice created", "Factuur aangemaakt", "Factura creada"),
    eventFinalized: T("Invoice finalized", "Factuur definitief gemaakt", "Factura finalizada"),
    eventSent: T("Marked as sent", "Gemarkeerd als verstuurd", "Marcada como enviada"),
    eventPaid: T("Marked as paid", "Gemarkeerd als betaald", "Marcada como pagada"),

    /* On the client's own page */
    clientSection: T("Invoices", "Facturen", "Facturas"),
    createForClient: T("Create invoice", "Factuur maken", "Crear factura"),
    noneForClient: T(
      "No invoices for this client yet.",
      "Nog geen facturen voor deze klant.",
      "Todavía no hay facturas para este cliente.",
    ),

    /* On the overview */
    outstanding: T("Awaiting payment", "Wacht op betaling", "Pendiente de cobro"),
    outstandingNote: T("Sent and not yet paid", "Verstuurd en nog niet betaald", "Enviadas y sin cobrar"),
  },

  /* ---------------------------------------------- the foot of the navigation */

  footer: {
    copyright: T("© {year} Solmavera", "© {year} Solmavera", "© {year} Solmavera"),
    privacy: T("Privacy", "Privacy", "Privacidad"),
    terms: T("Terms", "Voorwaarden", "Términos"),

    helpLead: T(
      "Need a hand with the Solmavera Portal?",
      "Hulp nodig met het Solmavera Portaal?",
      "¿Necesitas ayuda con el portal de Solmavera?",
    ),
    helpEmail: T("Email", "E-mail", "Correo"),
    helpHint: T(
      "Say which screen you were on and what you expected to happen — it saves a round of questions.",
      "Zeg op welk scherm je was en wat je verwachtte — dat scheelt een ronde vragen.",
      "Di en qué pantalla estabas y qué esperabas que ocurriera: ahorra una ronda de preguntas.",
    ),
  },

  legal: {
    privacyTitle: T("Privacy", "Privacy", "Privacidad"),
    termsTitle: T("Terms", "Voorwaarden", "Términos"),
    comingSoon: T(
      "This page is reserved for the text that belongs here. It has not been written yet, and nothing invented would be worth reading — a privacy statement or a set of terms says what a company actually does, and that is for Solmavera to write, not for the portal to guess.",
      "Deze pagina is gereserveerd voor de tekst die hier hoort. Die is nog niet geschreven, en iets verzonnens zou niets waard zijn — een privacyverklaring of een set voorwaarden zegt wat een bedrijf écht doet, en dat schrijft Solmavera zelf, niet het portaal.",
      "Esta página está reservada para el texto que le corresponde. Todavía no se ha escrito, y algo inventado no valdría nada: una política de privacidad o unas condiciones dicen lo que la empresa hace de verdad, y eso lo escribe Solmavera, no el portal.",
    ),
    back: T("‹ Back to the portal", "‹ Terug naar het portaal", "‹ Volver al portal"),
  },

  /* ------------------------------------------------------- workspace and team */

  workspace: {
    title: T("Workspace Settings", "Werkruimte", "Espacio de trabajo"),
    lead: T(
      "Manage your Solmavera workspace and client portal.",
      "Beheer de werkruimte van Solmavera en het klantportaal.",
      "Gestiona el espacio de trabajo de Solmavera y el portal de clientes.",
    ),
    company: T("Company information", "Bedrijfsgegevens", "Datos de la empresa"),
    companyLead: T(
      "What the office is called, and how to reach it.",
      "Hoe het kantoor heet, en hoe het te bereiken is.",
      "Cómo se llama la oficina y cómo contactarla.",
    ),
    companyName: T("Company name", "Bedrijfsnaam", "Nombre de la empresa"),
    companyEmail: T("Company email", "Bedrijfsmail", "Correo de la empresa"),
    phone: T("Phone number", "Telefoonnummer", "Teléfono"),
    website: T("Website", "Website", "Sitio web"),
    defaults: T("Client portal defaults", "Standaarden klantportaal", "Valores por defecto"),
    defaultsLead: T(
      "What a new client gets when nobody says otherwise.",
      "Wat een nieuwe klant krijgt als niemand iets anders zegt.",
      "Lo que recibe un cliente nuevo cuando nadie indica otra cosa.",
    ),
    defaultLanguage: T("Default client language", "Standaardtaal klant", "Idioma por defecto"),
    defaultCountry: T("Default country", "Standaardland", "País por defecto"),
    defaultCurrency: T("Default currency", "Standaardvaluta", "Moneda por defecto"),
    branding: T("Branding", "Huisstijl", "Marca"),
    brandingLead: T(
      "A logo and a name. Colours stay in configuration, where one hue generates the whole palette.",
      "Een logo en een naam. Kleuren blijven in de configuratie, waar één tint het hele palet maakt.",
      "Un logotipo y un nombre. Los colores siguen en la configuración, donde un solo tono genera toda la paleta.",
    ),
    chooseLogo: T("Choose a logo", "Kies een logo", "Elegir un logotipo"),
    removeLogo: T("Remove logo", "Logo weghalen", "Quitar el logotipo"),
    displayName: T("Portal display name", "Naam in het portaal", "Nombre en el portal"),
    displayNameHint: T(
      "Shown in the portal. Empty means the configured brand name.",
      "Staat in het portaal. Leeg betekent de ingestelde merknaam.",
      "Se muestra en el portal. Vacío significa el nombre de marca configurado.",
    ),
    saved: T("Workspace saved.", "Werkruimte opgeslagen.", "Espacio de trabajo guardado."),

    tabGeneral: T("General", "Algemeen", "General"),
    tabInvoicing: T("Invoicing", "Facturatie", "Facturación"),

    invoiceCompany: T(
      "Company details on invoices",
      "Bedrijfsgegevens op facturen",
      "Datos de la empresa en las facturas",
    ),
    invoiceCompanyLead: T(
      "Copied onto each invoice at the moment it is finalised. Changing something here changes future invoices and leaves the ones already sent exactly as they were.",
      "Wordt op elke factuur gezet op het moment dat die definitief wordt. Iets hier wijzigen verandert toekomstige facturen en laat de al verstuurde precies zoals ze waren.",
      "Se copia en cada factura en el momento de finalizarla. Cambiar algo aquí afecta a las facturas futuras y deja intactas las ya enviadas.",
    ),
    legalName: T("Legal name", "Juridische naam", "Nombre legal"),
    legalNameHint: T(
      "Required before an invoice can be finalised.",
      "Verplicht voordat een factuur definitief kan worden.",
      "Obligatorio antes de poder finalizar una factura.",
    ),
    taxId: T("Tax ID / NIF", "Fiscaal nummer / NIF", "NIF"),

    invoiceDefaults: T("Invoice defaults", "Standaarden factuur", "Valores por defecto"),
    invoiceDefaultsLead: T(
      "What a new invoice starts with. Each one can still be changed before it is finalised.",
      "Waarmee een nieuwe factuur begint. Per factuur nog aan te passen tot die definitief is.",
      "Con qué empieza una factura nueva. Cada una se puede cambiar antes de finalizarla.",
    ),
    invoicePrefix: T("Invoice prefix", "Prefix factuurnummer", "Prefijo de factura"),
    invoicePrefixHint: T(
      "SOL gives SOL-2026-001. Changing it only affects numbers handed out from now on.",
      "SOL geeft SOL-2026-001. Wijzigen raakt alleen nummers die vanaf nu worden uitgegeven.",
      "SOL da SOL-2026-001. Cambiarlo solo afecta a los números que se emitan a partir de ahora.",
    ),
    paymentTerms: T("Payment term (days)", "Betaaltermijn (dagen)", "Plazo de pago (días)"),
    invoiceLanguage: T("Default invoice language", "Standaardtaal factuur", "Idioma por defecto"),
    invoiceNotes: T("Default note", "Standaardopmerking", "Nota por defecto"),

    payment: T("Payment details", "Betaalgegevens", "Datos de pago"),
    paymentLead: T(
      "Printed on every invoice. Empty until you fill in the real details — there is nothing invented here.",
      "Staat op elke factuur. Leeg tot je de echte gegevens invult — hier is niets verzonnen.",
      "Se imprimen en cada factura. Vacíos hasta que introduzcas los datos reales: aquí no hay nada inventado.",
    ),
    accountHolder: T("Account holder", "Rekeninghouder", "Titular de la cuenta"),
    bankName: T("Bank", "Bank", "Banco"),

    invoiceLogo: T("Invoice logo", "Logo op de factuur", "Logotipo de la factura"),
    invoiceLogoLead: T(
      "PNG or JPEG. An invoice keeps the logo it was finalised with, so replacing this does not restyle old invoices.",
      "PNG of JPEG. Een factuur houdt het logo waarmee hij definitief werd, dus vervangen verandert oude facturen niet.",
      "PNG o JPEG. Una factura conserva el logotipo con el que se finalizó, así que sustituirlo no cambia las antiguas.",
    ),
    logoType: T(
      "Use a PNG or a JPEG — those are what a PDF can embed.",
      "Gebruik een PNG of een JPEG — die kan een PDF insluiten.",
      "Usa un PNG o un JPEG: son los que un PDF puede incrustar.",
    ),
  },

  team: {
    title: T("Team & Permissions", "Team & rechten", "Equipo y permisos"),
    lead: T(
      "Manage who has access to the Solmavera Portal.",
      "Beheer wie toegang heeft tot het Solmavera-portaal.",
      "Gestiona quién tiene acceso al portal de Solmavera.",
    ),
    invite: T("Invite team member", "Teamlid uitnodigen", "Invitar a alguien"),
    inviteLead: T(
      "They get a mail to choose a password. Access comes from this list, not from the mail.",
      "Diegene krijgt een mail om een wachtwoord te kiezen. Toegang komt uit deze lijst, niet uit die mail.",
      "Recibirá un correo para elegir una contraseña. El acceso viene de esta lista, no del correo.",
    ),
    sendInvite: T("Send invite", "Uitnodiging sturen", "Enviar invitación"),
    invited: T("Invited.", "Uitgenodigd.", "Invitación enviada."),
    addedButNoMail: T(
      "Added, but the invite mail did not go out. They can still be given a password.",
      "Toegevoegd, maar de uitnodigingsmail ging niet weg. Diegene kan alsnog een wachtwoord krijgen.",
      "Añadido, pero el correo de invitación no salió. Aun así se le puede dar una contraseña.",
    ),
    columnUser: T("User", "Gebruiker", "Usuario"),
    columnStatus: T("Status", "Status", "Estado"),
    columnActions: T("Actions", "Acties", "Acciones"),
    statusActive: T("Active", "Actief", "Activo"),
    statusInvited: T("Invited", "Uitgenodigd", "Invitado"),
    statusDisabled: T("Disabled", "Uitgezet", "Desactivado"),
    disable: T("Disable", "Uitzetten", "Desactivar"),
    enable: T("Enable", "Aanzetten", "Activar"),
    enabled: T("Enabled again.", "Weer aangezet.", "Activado de nuevo."),
    disabled: T("Disabled.", "Uitgezet.", "Desactivado."),
    you: T("that is you", "dat ben jij", "ese eres tú"),
    roleChanged: T("Role changed.", "Rol gewijzigd.", "Rol cambiado."),
    cannotDemoteSelf: T(
      "You cannot take your own admin rights away — nobody would be left to give them back.",
      "Je kunt je eigen adminrechten niet weghalen — dan is er niemand meer om ze terug te geven.",
      "No puedes quitarte tus propios permisos de administrador: no quedaría nadie para devolvértelos.",
    ),
    cannotDisableSelf: T(
      "You cannot switch yourself off.",
      "Jezelf uitzetten gaat niet.",
      "No puedes desactivarte a ti mismo.",
    ),
    role: {
      ADMIN: T("Admin", "Admin", "Administrador"),
      STAFF: T("Staff", "Medewerker", "Empleado"),
      EXTERNAL: T("External", "Extern", "Externo"),
    },
    whatRolesMean: T("What the roles mean", "Wat de rollen betekenen", "Qué significan los roles"),
    ruleAdmin: T(
      "everything a colleague can do, plus these two administration screens.",
      "alles wat een collega kan, plus deze twee beheerschermen.",
      "todo lo que puede un compañero, más estas dos pantallas de administración.",
    ),
    ruleStaff: T(
      "clients, documents, tasks, properties and the Process Guide. No administration.",
      "klanten, documenten, taken, properties en de Process Guide. Geen beheer.",
      "clientes, documentos, tareas, propiedades y la guía de procesos. Sin administración.",
    ),
    ruleExternal: T(
      "only the clients and documents assigned to them, and nothing of the rest.",
      "alleen de klanten en documenten die aan diegene zijn toegewezen, en niets van de rest.",
      "solo los clientes y documentos que se le asignen, y nada del resto.",
    ),
    externalNotYet: T(
      "Assigning individual clients is not built yet, so an External user currently signs in and sees nothing at all. That is deliberate: the database excludes the role from every policy rather than guessing, so nobody gets more than intended in the meantime.",
      "Losse klanten toewijzen is nog niet gebouwd, dus een externe logt nu in en ziet helemaal niets. Dat is met opzet: de database sluit de rol van elke policy uit in plaats van te gokken, zodat niemand ondertussen meer krijgt dan de bedoeling is.",
      "Asignar clientes concretos todavía no existe, así que un usuario externo inicia sesión y no ve nada. Es deliberado: la base de datos excluye el rol de todas las políticas en lugar de adivinar, para que nadie reciba más de lo previsto mientras tanto.",
    ),
    externalTitle: T(
      "Nothing assigned yet",
      "Nog niets toegewezen",
      "Todavía no hay nada asignado",
    ),
    externalBody: T(
      "Your account works, but no clients or documents have been assigned to it. Ask whoever invited you to assign them.",
      "Je account werkt, maar er zijn nog geen klanten of documenten aan toegewezen. Vraag degene die je uitnodigde om dat te doen.",
      "Tu cuenta funciona, pero no se le han asignado clientes ni documentos. Pídeselo a quien te invitó.",
    ),
  },

  /* --------------------------------------------------------------- process guide */

  guides: {
    title: T("Process Guide", "Process Guide", "Guía de procesos"),
    lead: T(
      "How we do the work: step by step, for the team. Clients never see any of this — there is no route by which they could reach it.",
      "Hoe wij het werk doen: stap voor stap, voor het team. Klanten zien hier niets van — er is geen enkele route waarlangs ze erbij kunnen.",
      "Cómo hacemos el trabajo: paso a paso, para el equipo. Los clientes no ven nada de esto: no existe ninguna vía por la que puedan llegar.",
    ),
    newGuide: T("New Process Guide", "Nieuwe Process Guide", "Nueva guía"),
    untitled: T("Untitled guide", "Nieuwe guide", "Guía sin título"),
    searchPlaceholder: T(
      "Search process guides…",
      "Zoek in Process Guides…",
      "Buscar en las guías…",
    ),
    filterLabel: T("Filter by category", "Filter op categorie", "Filtrar por categoría"),
    all: T("All", "Alles", "Todas"),
    empty: T(
      "No guides yet. Write the first one.",
      "Nog geen guides. Schrijf de eerste.",
      "Todavía no hay guías. Escribe la primera.",
    ),
    noMatch: T(
      "Nothing matches that.",
      "Daar past niets bij.",
      "No hay nada que coincida.",
    ),
    stillEmpty: T("Still empty.", "Nog leeg.", "Todavía vacía."),
    lastUpdated: T("Last updated {date}", "Bijgewerkt op {date}", "Actualizada el {date}"),
    backToList: T("‹ Process Guide", "‹ Process Guide", "‹ Guía de procesos"),

    /* Actions, on the card menu and in the document header. */
    moreActions: T("More", "Meer", "Más"),
    edit: T("Edit", "Bewerken", "Editar"),
    duplicate: T("Duplicate", "Dupliceren", "Duplicar"),
    print: T("Print / PDF", "Printen / PDF", "Imprimir / PDF"),
    copyPrefix: T("Copy of", "Kopie van", "Copia de"),
    saveChanges: T("Save changes", "Wijzigingen opslaan", "Guardar cambios"),
    saved: T("Saved.", "Opgeslagen.", "Guardada."),
    titleLabel: T("Title", "Titel", "Título"),
    titleRequired: T(
      "A guide needs a title.",
      "Een guide heeft een titel nodig.",
      "Una guía necesita un título.",
    ),
    categoryLabel: T("Category", "Categorie", "Categoría"),
    bodyLabel: T("Guide content", "Inhoud van de guide", "Contenido de la guía"),

    /* The editor toolbar. The one-character buttons are the same in every language. */
    toolbar: T("Formatting", "Opmaak", "Formato"),
    toolHeading1: T("Title", "Kop 1", "Título"),
    toolHeading2: T("Heading", "Kop 2", "Encabezado"),
    toolHeading3: T("Subheading", "Kop 3", "Subtítulo"),
    toolParagraph: T("Text", "Tekst", "Texto"),
    toolLink: T("Link", "Link", "Enlace"),
    toolTable: T("Table", "Tabel", "Tabla"),
    toolImage: T("Image", "Afbeelding", "Imagen"),
    linkPrompt: T(
      "Where should this link go?",
      "Waar moet deze link heen?",
      "¿A dónde debe llevar este enlace?",
    ),

    cover: T("Cover image", "Omslagfoto", "Imagen de portada"),
    coverLead: T(
      "Shown on the card in the list. Not required — a guide without one looks the same, only without a picture.",
      "Staat op de kaart in de lijst. Niet verplicht — een guide zonder ziet er hetzelfde uit, alleen zonder plaatje.",
      "Se muestra en la tarjeta de la lista. No es obligatoria: una guía sin ella se ve igual, solo que sin imagen.",
    ),
    chooseCover: T("Choose an image", "Kies een afbeelding", "Elegir una imagen"),
    replaceCover: T("Replace image", "Afbeelding vervangen", "Sustituir la imagen"),
    removeCover: T("Remove image", "Afbeelding weghalen", "Quitar la imagen"),
    attachments: T("Attachments", "Bijlagen", "Adjuntos"),
    noAttachments: T("No attachments.", "Geen bijlagen.", "Sin adjuntos."),
    addAttachment: T("Add attachment", "Bijlage toevoegen", "Añadir adjunto"),

    category: {
      RESIDENCY: T(
        "Residency & Immigration",
        "Verblijf & immigratie",
        "Residencia e inmigración",
      ),
      REAL_ESTATE: T("Real Estate", "Vastgoed", "Inmobiliaria"),
      ADMINISTRATION: T("Administration", "Administratie", "Administración"),
      TAX_BUSINESS: T("Tax & Business", "Belasting & zaken", "Fiscal y empresas"),
      VEHICLES: T("Vehicles", "Voertuigen", "Vehículos"),
      INSURANCE: T("Insurance", "Verzekeringen", "Seguros"),
      OTHER: T("Other", "Overig", "Otros"),
    },
  },

  /* ------------------------------------------------------------------- properties */

  properties: {
    title: T("Properties", "Properties", "Propiedades"),
    lead: T(
      "Properties worth a look, for the team only. Clients do not see this list — there is no route by which they could reach it.",
      "Interessante woningen, alleen voor het team. Klanten zien deze lijst niet — er is geen enkele route waarlangs ze erbij kunnen.",
      "Viviendas de interés, solo para el equipo. Los clientes no ven esta lista: no existe ninguna vía por la que puedan llegar a ella.",
    ),
    countOne: T("{n} property", "{n} property", "{n} propiedad"),
    countMany: T("{n} properties", "{n} properties", "{n} propiedades"),
    empty: T(
      "Nothing yet. Add the first one above.",
      "Nog niets. Voeg hierboven de eerste toe.",
      "Todavía nada. Añade la primera arriba.",
    ),
    photoOne: T("photo", "foto", "fotografía"),
    photoMany: T("photos", "foto’s", "fotografías"),
    photoAlt: T("{title}, photo {n}", "{title}, foto {n}", "{title}, fotografía {n}"),
    add: T("Add property", "Property toevoegen", "Añadir propiedad"),
    emptyNow: T(
      "No properties yet. Add the first one with the button above.",
      "Nog geen properties. Voeg de eerste toe met de knop hierboven.",
      "Todavía no hay propiedades. Añade la primera con el botón de arriba.",
    ),
    backToList: T("‹ Properties", "‹ Properties", "‹ Propiedades"),
    saved: T("Saved.", "Opgeslagen.", "Guardado."),
    addedOn: T("Added on {date}", "Toegevoegd op {date}", "Añadida el {date}"),
    noPhotos: T(
      "No photographs yet.",
      "Nog geen foto's.",
      "Todavía no hay fotografías.",
    ),
    addPhotos: T("Add photographs", "Foto's toevoegen", "Añadir fotografías"),
    deleteTitle: T("Delete this property", "Deze property verwijderen", "Eliminar esta propiedad"),
    deleteLead: T(
      "The property and its photographs go, including the files themselves. There is no undo.",
      "De property en de foto's gaan weg, ook de bestanden zelf. Dit kun je niet terugdraaien.",
      "La propiedad y sus fotografías desaparecen, también los archivos. No se puede deshacer.",
    ),
    formTitle: T("Title", "Titel", "Título"),
    formAddress: T("Address", "Adres", "Dirección"),
    formNotes: T("Note", "Notitie", "Nota"),
    price: T("Asking price", "Vraagprijs", "Precio"),
    askingPrice: T("Asking price", "Vraagprijs", "Precio de venta"),
    bedrooms: T("Bedrooms", "Slaapkamers", "Dormitorios"),
    bathrooms: T("Bathrooms", "Badkamers", "Baños"),
    area: T("Surface", "Oppervlakte", "Superficie"),
    descriptionLabel: T(
      "The listing text",
      "De advertentietekst",
      "El texto del anuncio",
    ),
    noDescription: T(
      "No text yet. Press Edit and write what makes this one worth a look.",
      "Nog geen tekst. Klik op Bewerken en schrijf waarom deze het bekijken waard is.",
      "Todavía sin texto. Pulsa Editar y escribe por qué merece la pena verla.",
    ),
    formPhotos: T("Photographs", "Foto’s", "Fotografías"),
    formPhotosHint: T(
      "JPEG, PNG, WebP or HEIC. At most 10 MB per photograph.",
      "JPEG, PNG, WebP of HEIC. Maximaal 10 MB per foto.",
      "JPEG, PNG, WebP o HEIC. Máximo 10 MB por fotografía.",
    ),
    submit: T("Save property", "Property opslaan", "Guardar propiedad"),
    uploading: T("Uploading…", "Bezig met uploaden…", "Subiendo…"),
  },

  /* ---------------------------------------------------------------- staff account */

  account: {
    title: T("My Account", "Mijn account", "Mi cuenta"),
    lead: T(
      "Manage your profile, security and personal preferences.",
      "Beheer je profiel, beveiliging en persoonlijke voorkeuren.",
      "Gestiona tu perfil, tu seguridad y tus preferencias personales.",
    ),
    signedInAs: T(
      "You are signed in as {name} — {email}, role {role}.",
      "Je bent ingelogd als {name} — {email}, rol {role}.",
      "Has iniciado sesión como {name} — {email}, rol {role}.",
    ),
    roleAdmin: T("Admin", "Admin", "Administrador"),
    roleStaff: T("Staff", "Medewerker", "Empleado"),
    roleExternal: T("External", "Extern", "Externo"),

    tabProfile: T("Profile", "Profiel", "Perfil"),
    tabSecurity: T("Security", "Beveiliging", "Seguridad"),
    tabNotifications: T("Notifications", "Meldingen", "Notificaciones"),
    tabPreferences: T("Preferences", "Voorkeuren", "Preferencias"),

    /* Profile */
    profileLead: T(
      "Your name and picture, as colleagues see them.",
      "Je naam en foto, zoals collega's die zien.",
      "Tu nombre y tu foto, tal como los ven tus compañeros.",
    ),
    fullName: T("Full name", "Volledige naam", "Nombre completo"),
    role: T("Role", "Rol", "Rol"),
    emailFixed: T(
      "Your address is your sign-in. An admin changes it.",
      "Je adres is je login. Een admin wijzigt dat.",
      "Tu correo es tu acceso. Lo cambia un administrador.",
    ),
    roleFixed: T("Set by an admin.", "Wordt door een admin gezet.", "Lo asigna un administrador."),
    chooseAvatar: T("Choose a picture", "Kies een foto", "Elegir una foto"),
    removeAvatar: T("Remove picture", "Foto weghalen", "Quitar la foto"),
    saveChanges: T("Save changes", "Wijzigingen opslaan", "Guardar cambios"),
    savedProfile: T("Profile saved.", "Profiel opgeslagen.", "Perfil guardado."),

    /* Security */
    twoFactor: T(
      "Two-factor authentication",
      "Tweestapsverificatie",
      "Verificación en dos pasos",
    ),
    twoFactorLead: T(
      "An extra code from an app on your phone, on top of your password.",
      "Een extra code uit een app op je telefoon, bovenop je wachtwoord.",
      "Un código adicional desde una app en tu móvil, además de la contraseña.",
    ),
    statusEnabled: T("Enabled", "Aan", "Activada"),
    statusDisabled: T("Disabled", "Uit", "Desactivada"),
    twoFactorEnable: T("Enable 2FA", "Zet 2FA aan", "Activar 2FA"),
    twoFactorDisable: T("Turn off", "Zet uit", "Desactivar"),
    twoFactorConfirm: T("Confirm", "Bevestigen", "Confirmar"),
    twoFactorScan: T(
      "Scan this with your authenticator app, then type the six digits it shows.",
      "Scan dit met je authenticator-app en typ daarna de zes cijfers die hij toont.",
      "Escanea esto con tu app de autenticación y escribe los seis dígitos que muestre.",
    ),
    twoFactorCode: T("Six-digit code", "Code van zes cijfers", "Código de seis dígitos"),
    twoFactorWrongCode: T(
      "That code is not right. Try the next one.",
      "Die code klopt niet. Probeer de volgende.",
      "Ese código no es correcto. Prueba el siguiente.",
    ),
    twoFactorFailed: T(
      "That did not work. Try again in a moment.",
      "Dat lukte niet. Probeer het zo nog eens.",
      "No ha funcionado. Inténtalo dentro de un momento.",
    ),
    twoFactorOn: T("Two-factor is on.", "Tweestapsverificatie staat aan.", "La verificación en dos pasos está activada."),
    twoFactorOff: T("Two-factor is off.", "Tweestapsverificatie staat uit.", "La verificación en dos pasos está desactivada."),
    sessions: T("Other devices", "Andere apparaten", "Otros dispositivos"),
    sessionsLead: T(
      "Signed in somewhere you would rather not be? End those sessions.",
      "Ergens ingelogd waar je dat liever niet bent? Beëindig die sessies.",
      "¿Sesión abierta donde preferirías que no lo estuviera? Ciérralas.",
    ),
    sessionsNote: T(
      "A list of devices is not shown: Supabase keeps sessions in its own schema and offers no way to read them. Signing out everywhere else does work, and is the part that protects you.",
      "Een lijst met apparaten staat er niet: Supabase bewaart sessies in zijn eigen schema en biedt geen manier om die uit te lezen. Overal elders uitloggen werkt wel, en dat is het deel dat je beschermt.",
      "No se muestra una lista de dispositivos: Supabase guarda las sesiones en su propio esquema y no ofrece forma de leerlas. Cerrar sesión en todo lo demás sí funciona, y es lo que realmente protege.",
    ),
    signOutOthers: T(
      "Sign out of all other devices",
      "Overal elders uitloggen",
      "Cerrar sesión en los demás dispositivos",
    ),
    sessionsDone: T(
      "Other sessions ended.",
      "Andere sessies beëindigd.",
      "Se han cerrado las demás sesiones.",
    ),
    sessionsFailed: T("That did not work.", "Dat lukte niet.", "No ha funcionado."),

    /* Notifications */
    notificationsLead: T(
      "Which events are worth an email.",
      "Welke gebeurtenissen een mail waard zijn.",
      "Qué eventos merecen un correo.",
    ),
    notificationsNotYet: T(
      "Your choices are saved, but nothing sends them yet — no notification mail is built. This is what it will follow when it is.",
      "Je keuzes worden bewaard, maar er verstuurt nog niets — meldingsmail is nog niet gebouwd. Dit is waar het zich straks aan houdt.",
      "Tus elecciones se guardan, pero todavía no se envía nada: el correo de notificaciones aún no existe. Esto es lo que seguirá cuando exista.",
    ),
    emailNotifications: T("Email notifications", "E-mailmeldingen", "Notificaciones por correo"),
    emailNotificationsHint: T(
      "Off here means off for everything below.",
      "Hier uit betekent alles hieronder uit.",
      "Aquí desactivado significa todo lo de abajo desactivado.",
    ),
    savePreferences: T("Save preferences", "Voorkeuren opslaan", "Guardar preferencias"),
    savedNotifications: T("Saved.", "Opgeslagen.", "Guardado."),
    notify: {
      clientAdded: T("New client added", "Nieuwe klant aangemaakt", "Nuevo cliente añadido"),
      documentUploaded: T(
        "Client uploads a document",
        "Klant uploadt een document",
        "Un cliente sube un documento",
      ),
      taskAssigned: T("Task assigned to me", "Taak aan mij toegewezen", "Tarea asignada a mí"),
      taskDueSoon: T("Task due soon", "Taak loopt bijna af", "Tarea a punto de vencer"),
      clientStatusChanged: T(
        "Client status changes",
        "Status van een klant verandert",
        "Cambia el estado de un cliente",
      ),
      noteAdded: T("New note or comment", "Nieuwe notitie of opmerking", "Nueva nota o comentario"),
    },

    /* Preferences */
    preferencesLead: T(
      "These follow you to any machine you sign in on. The two controls at the bottom of the rail change the same settings.",
      "Deze gaan met je mee naar elke computer waarop je inlogt. De twee knoppen onderin de balk wijzigen dezelfde instellingen.",
      "Estas te acompañan en cualquier equipo donde inicies sesión. Los dos controles del final de la barra cambian lo mismo.",
    ),
    appearance: T("Appearance", "Weergave", "Apariencia"),
    themeSystem: T("System", "Systeem", "Sistema"),
    timeZone: T("Time zone", "Tijdzone", "Zona horaria"),
    dateFormat: T("Date format", "Datumnotatie", "Formato de fecha"),
    dateLong: T("Written out", "Voluit", "Escrita"),
    savedPreferences: T("Preferences saved.", "Voorkeuren opgeslagen.", "Preferencias guardadas."),
    setPassword: T("Set a password", "Wachtwoord instellen", "Establecer contraseña"),
    setPasswordLead: T(
      "After this you can sign in with your email address and this password, without waiting for a link.",
      "Daarna kun je inloggen met je e-mailadres en dit wachtwoord, zonder op een link te wachten.",
      "Después podrás iniciar sesión con tu correo y esta contraseña, sin esperar ningún enlace.",
    ),
    newPassword: T("New password", "Nieuw wachtwoord", "Nueva contraseña"),
    submit: T("Set password", "Wachtwoord instellen", "Establecer contraseña"),
    done: T(
      "Done. You can sign in with this password now.",
      "Gelukt. Je kunt nu met dit wachtwoord inloggen.",
      "Hecho. Ya puedes iniciar sesión con esta contraseña.",
    ),
    tooShort: T(
      "Use at least {n} characters.",
      "Gebruik minstens {n} tekens.",
      "Usa al menos {n} caracteres.",
    ),
    mismatch: T(
      "The two passwords are not the same.",
      "De twee wachtwoorden zijn niet gelijk.",
      "Las dos contraseñas no coinciden.",
    ),
  },

  /* ------------------------------------------------------------- the client portal */

  home: {
    greeting: T("Hello {name}", "Hallo {name}", "Hola {name}"),
    allIn: T(
      "Everything is in. We need nothing from you at the moment.",
      "Alles is binnen. Wij hebben op dit moment niets van u nodig.",
      "Lo tenemos todo. Por el momento no necesitamos nada de usted.",
    ),
    missingOne: T(
      "One file is still missing. After that we have everything.",
      "Er ontbreekt nog één bestand. Daarna hebben wij alles.",
      "Falta un archivo. Después lo tendremos todo.",
    ),
    missingMany: T(
      "{n} files are still missing. After that we have everything.",
      "Er ontbreken nog {n} bestanden. Daarna hebben wij alles.",
      "Faltan {n} archivos. Después lo tendremos todo.",
    ),
    needTitle: T("What we need", "Wat wij nodig hebben", "Lo que necesitamos"),
    needLead: T(
      "A photograph taken with your phone is fine, a scanner is not necessary. We check every file by hand, usually within one working day.",
      "Een foto met uw telefoon is prima, een scanner hoeft niet. Wij controleren elk bestand met de hand, meestal binnen één werkdag.",
      "Una fotografía hecha con su teléfono es suficiente, no hace falta escáner. Revisamos cada archivo a mano, normalmente en un día laborable.",
    ),
    detailsTitle: T("Your details", "Uw gegevens", "Sus datos"),
    detailsLead: T(
      "Fill in what you know. You can always change this later.",
      "Vul aan wat u weet. U kunt dit later altijd aanpassen.",
      "Rellene lo que sepa. Siempre puede cambiarlo más adelante.",
    ),
    editDetails: T("Change details", "Gegevens aanpassen", "Modificar datos"),
    saveDetails: T("Save details", "Gegevens opslaan", "Guardar datos"),
  },

  documents: {
    passportTitle: T("Passport", "Paspoort", "Pasaporte"),
    passportHelp: T(
      "The page with your photograph on it. Make sure all four corners are in the picture.",
      "De pagina met uw foto erop. Zorg dat alle vier de hoeken op de foto staan.",
      "La página con su fotografía. Asegúrese de que se vean las cuatro esquinas.",
    ),
    photoTitle: T("Passport photograph", "Pasfoto", "Fotografía tipo carné"),
    photoHelp: T(
      "Plain white background, face fully visible, no glasses.",
      "Effen witte achtergrond, gezicht volledig zichtbaar, geen bril.",
      "Fondo blanco liso, cara completamente visible, sin gafas.",
    ),
    statusRequired: T("Still needed", "Nog nodig", "Aún necesario"),
    statusReceived: T("We are checking it", "Wij controleren hem", "Lo estamos comprobando"),
    statusApproved: T("Checked and accepted", "Gecontroleerd en akkoord", "Comprobado y aceptado"),
    statusRejected: T("Not accepted", "Niet geaccepteerd", "No aceptado"),
    previewAlt: T(
      "What you sent for {title}",
      "Wat u stuurde voor {title}",
      "Lo que envió para {title}",
    ),
    openSent: T(
      "Open the file you sent",
      "Het bestand openen dat u stuurde",
      "Abrir el archivo que envió",
    ),
    receivedOn: T("Received on {date}", "Ontvangen op {date}", "Recibido el {date}"),
    send: T("Send", "Versturen", "Enviar"),
    replace: T("Replace with a new one", "Vervangen door een nieuwe", "Sustituir por otro"),
    sending: T("Sending…", "Bezig met versturen…", "Enviando…"),
  },

  /* --------------------------------------------------------------- client sign-in */

  signin: {
    title: T("Sign in", "Inloggen", "Iniciar sesión"),
    lead: T(
      "Use the email address you gave us, with the password you chose yourself.",
      "Vul het e-mailadres in dat u aan ons hebt doorgegeven, met het wachtwoord dat u zelf hebt gekozen.",
      "Introduzca el correo electrónico que nos facilitó, con la contraseña que usted eligió.",
    ),
    wrong: T(
      "That combination is not right.",
      "Die combinatie klopt niet.",
      "Esa combinación no es correcta.",
    ),
    sendLink: T("Send me a sign-in link", "Stuur mij een inloglink", "Envíeme un enlace de acceso"),
    linkHint: T(
      "Fill in your email address first. The link works once and expires after 30 minutes.",
      "Vul eerst uw e-mailadres in. De link werkt één keer en vervalt na 30 minuten.",
      "Introduzca primero su correo electrónico. El enlace funciona una vez y caduca a los 30 minutos.",
    ),
    checkMail: T("Check your email", "Kijk in uw e-mail", "Consulte su correo"),
    checkMailLead: T(
      "If we have an account for that address, a sign-in link is on its way. Open it on this device and you are in.",
      "Als wij een account hebben voor dat adres, is er een inloglink onderweg. Open die op dit apparaat en u bent binnen.",
      "Si tenemos una cuenta para esa dirección, ya va en camino un enlace de acceso. Ábralo en este dispositivo y entrará.",
    ),
    backToSignIn: T("Back to signing in", "Terug naar inloggen", "Volver a iniciar sesión"),
    rateLimited: T(
      "Too many emails have been sent. Try again in an hour, or sign in with your password.",
      "Er zijn te veel mails verstuurd. Probeer het over een uur opnieuw, of log in met uw wachtwoord.",
      "Se han enviado demasiados correos. Inténtelo de nuevo en una hora o inicie sesión con su contraseña.",
    ),
    sendFailed: T(
      "Sending did not work. Sign in with your password or try again shortly.",
      "Versturen lukte niet. Log in met uw wachtwoord of probeer het zo opnieuw.",
      "No se pudo enviar. Inicie sesión con su contraseña o inténtelo de nuevo en un momento.",
    ),

    /* The branded header above the form. */
    portalTitle: T("{brand} Portal", "{brand} Portal", "Portal de {brand}"),
    signInToAccount: T(
      "Sign in to your account",
      "Log in op uw account",
      "Inicie sesión en su cuenta",
    ),
    forgot: T("Forgotten your password?", "Wachtwoord vergeten?", "¿Ha olvidado su contraseña?"),
    newHere: T("New to {brand}?", "Nieuw bij {brand}?", "¿Es nuevo en {brand}?"),
    createAccount: T("Create account", "Account aanmaken", "Crear una cuenta"),
    disabledAccount: T(
      "This account has been switched off. Please contact us.",
      "Dit account is uitgezet. Neem contact met ons op.",
      "Esta cuenta ha sido desactivada. Póngase en contacto con nosotros.",
    ),
    noAccountHere: T(
      "You are signed in, but there is nothing here for this address yet.",
      "U bent ingelogd, maar voor dit adres staat hier nog niets klaar.",
      "Ha iniciado sesión, pero todavía no hay nada aquí para esta dirección.",
    ),
  },

  /* ------------------------------------------------- registering and resetting */

  register: {
    metaTitle: T("Create account", "Account aanmaken", "Crear una cuenta"),
    title: T("Create your account", "Maak uw account", "Cree su cuenta"),
    lead: T(
      "Use the email address you have with us. If we already know you, your new login is attached to the file we have — no second file is created.",
      "Gebruik het e-mailadres dat u bij ons hebt. Kennen wij u al, dan wordt uw login aan uw bestaande dossier gekoppeld — er komt geen tweede dossier bij.",
      "Use el correo electrónico que tiene con nosotros. Si ya le conocemos, su acceso se vincula a su expediente actual: no se crea un segundo expediente.",
    ),
    nameLabel: T("Your name", "Uw naam", "Su nombre"),
    nameHint: T(
      "As it appears in your passport. You can change it later.",
      "Zoals het in uw paspoort staat. U kunt dit later wijzigen.",
      "Como aparece en su pasaporte. Puede cambiarlo más adelante.",
    ),
    terms: T(
      "I agree to the terms and the privacy statement.",
      "Ik ga akkoord met de voorwaarden en de privacyverklaring.",
      "Acepto las condiciones y la declaración de privacidad.",
    ),
    termsRequired: T(
      "Please agree to the terms first.",
      "Ga eerst akkoord met de voorwaarden.",
      "Acepte primero las condiciones.",
    ),
    submit: T("Create account", "Account aanmaken", "Crear cuenta"),
    haveAccount: T("Already have an account?", "Hebt u al een account?", "¿Ya tiene una cuenta?"),
    checkMailTitle: T("Confirm your email", "Bevestig uw e-mailadres", "Confirme su correo"),
    checkMailLead: T(
      "We have sent you a message. Open the link in it and your account is ready.",
      "We hebben u een bericht gestuurd. Open de link erin en uw account staat klaar.",
      "Le hemos enviado un mensaje. Abra el enlace y su cuenta estará lista.",
    ),
    exists: T(
      "That address already has an account. Sign in instead, or use “forgotten your password”.",
      "Dat adres heeft al een account. Log in, of gebruik “wachtwoord vergeten”.",
      "Esa dirección ya tiene una cuenta. Inicie sesión o use «¿ha olvidado su contraseña?».",
    ),
    failed: T(
      "Creating the account did not work. Please try again.",
      "Het account aanmaken lukte niet. Probeer het opnieuw.",
      "No se ha podido crear la cuenta. Inténtelo de nuevo.",
    ),
    staffAddress: T(
      "That address belongs to our team. Use the staff portal to sign in.",
      "Dat adres hoort bij ons team. Log in via het medewerkersportaal.",
      "Esa dirección pertenece a nuestro equipo. Use el portal del personal.",
    ),
  },

  reset: {
    metaTitle: T("New password", "Nieuw wachtwoord", "Nueva contraseña"),
    title: T("Choose a new password", "Kies een nieuw wachtwoord", "Elija una nueva contraseña"),
    lead: T(
      "Pick something only you know. The link you used stops working afterwards.",
      "Kies iets dat alleen u kent. De link die u gebruikte werkt daarna niet meer.",
      "Elija algo que solo usted conozca. El enlace que ha usado dejará de funcionar después.",
    ),
    submit: T("Save password", "Wachtwoord opslaan", "Guardar contraseña"),
    done: T(
      "Your password has been changed.",
      "Uw wachtwoord is gewijzigd.",
      "Su contraseña ha sido cambiada.",
    ),
    expired: T(
      "This link is no longer valid. Ask for a new one on the sign-in screen.",
      "Deze link is niet meer geldig. Vraag een nieuwe aan op het inlogscherm.",
      "Este enlace ya no es válido. Solicite uno nuevo en la pantalla de acceso.",
    ),
    forgotTitle: T("Forgotten password", "Wachtwoord vergeten", "Contraseña olvidada"),
    forgotLead: T(
      "Fill in your email address and we will send you a link to choose a new password.",
      "Vul uw e-mailadres in, dan sturen wij u een link om een nieuw wachtwoord te kiezen.",
      "Introduzca su correo y le enviaremos un enlace para elegir una nueva contraseña.",
    ),
    forgotSent: T(
      "If we have an account for that address, a link is on its way.",
      "Als wij een account hebben voor dat adres, is er een link onderweg.",
      "Si tenemos una cuenta para esa dirección, ya va en camino un enlace.",
    ),
    sendLink: T("Send the link", "Stuur de link", "Enviar el enlace"),
  },

  /* ------------------------------------------------------------------ the invite */

  invite: {
    metaTitle: T("Invitation", "Uitnodiging", "Invitación"),
    deadTitle: T(
      "This link no longer works",
      "Deze link werkt niet meer",
      "Este enlace ya no funciona",
    ),
    deadBody: T(
      "The link has expired or has already been used. Ask your contact at {brand} for a new one — it costs them one click.",
      "De link is verlopen of al gebruikt. Vraag uw contactpersoon bij {brand} om een nieuwe — dat kost hen één klik.",
      "El enlace ha caducado o ya se ha utilizado. Pida uno nuevo a su persona de contacto en {brand}: le cuesta un solo clic.",
    ),
    welcome: T("Welcome {name}", "Welkom {name}", "Bienvenido {name}"),
    body: T(
      "We have set up an account for you at {brand}. Choose a password and you can get started straight away.",
      "Wij hebben een account voor u klaargezet bij {brand}. Kies een wachtwoord en u kunt meteen verder.",
      "Le hemos preparado una cuenta en {brand}. Elija una contraseña y podrá empezar de inmediato.",
    ),
    note: T(
      "After that you fill in your details and send a photograph of your passport and a passport photograph. That takes about five minutes with your phone's camera.",
      "Daarna vult u uw gegevens in en stuurt u een foto van uw paspoort en een pasfoto. Dat duurt ongeveer vijf minuten met de camera van uw telefoon.",
      "Después rellenará sus datos y enviará una fotografía de su pasaporte y una fotografía tipo carné. Con la cámara del móvil son unos cinco minutos.",
    ),
    emailLabel: T("Your email address", "Uw e-mailadres", "Su correo electrónico"),
    emailHint: T(
      "Is this address wrong? Let your contact know and they will make a new link.",
      "Klopt dit adres niet? Laat het uw contactpersoon weten, dan maken zij een nieuwe link.",
      "¿La dirección no es correcta? Avise a su persona de contacto y le hará un enlace nuevo.",
    ),
    choosePassword: T("Choose a password", "Kies een wachtwoord", "Elija una contraseña"),
    minimum: T("At least {n} characters.", "Minstens {n} tekens.", "Al menos {n} caracteres."),
    submit: T("Create account", "Account aanmaken", "Crear cuenta"),
    tooShort: T(
      "Choose a password of at least {n} characters.",
      "Kies een wachtwoord van minstens {n} tekens.",
      "Elija una contraseña de al menos {n} caracteres.",
    ),
    mismatch: T(
      "The two passwords are not the same.",
      "De twee wachtwoorden zijn niet gelijk.",
      "Las dos contraseñas no coinciden.",
    ),
    existsWrongPassword: T(
      "An account already exists for this address, but this password does not belong to it. Ask your contact for help.",
      "Er bestaat al een account voor dit adres, maar dit wachtwoord hoort er niet bij. Vraag uw contactpersoon om hulp.",
      "Ya existe una cuenta para esta dirección, pero esta contraseña no le corresponde. Pida ayuda a su persona de contacto.",
    ),
    createFailed: T(
      "Creating the account did not work. Please try again shortly.",
      "Aanmaken lukte niet. Probeer het zo opnieuw.",
      "No se pudo crear la cuenta. Inténtelo de nuevo en un momento.",
    ),
    confirmationPending: T(
      "Your account has been created, but a confirmation by email is still being asked for. Ask your contact to switch that setting off and you can carry on.",
      "Uw account is aangemaakt, maar er wordt nog om een bevestiging per e-mail gevraagd. Laat uw contactpersoon die instelling uitzetten, dan kunt u meteen verder.",
      "Su cuenta se ha creado, pero todavía se pide una confirmación por correo. Pida a su persona de contacto que desactive ese ajuste y podrá continuar.",
    ),
  },

  /* -------------------------------------- what the server says back, per audience */

  saved: {
    details: T(
      "Your details have been saved.",
      "Uw gegevens zijn opgeslagen.",
      "Sus datos se han guardado.",
    ),
    documentReceived: T(
      "Received. We will look at it within one working day.",
      "Ontvangen. Wij kijken er binnen één werkdag naar.",
      "Recibido. Lo revisaremos en un día laborable.",
    ),
    clientCreated: T(
      "{name} created as {code}.",
      "{name} aangemaakt als {code}.",
      "{name} creado como {code}.",
    ),
    procedure: T(
      "Service Procedure saved.",
      "Service Procedure opgeslagen.",
      "Procedimiento guardado.",
    ),
    property: T("Property saved.", "Property opgeslagen.", "Propiedad guardada."),
    propertyWithPhotos: T(
      "Property saved with {n} photographs.",
      "Property opgeslagen met {n} foto’s.",
      "Propiedad guardada con {n} fotografías.",
    ),
    approved: T("Approved.", "Goedgekeurd.", "Aprobado."),
    rejected: T(
      "Rejected; the client sees the reason.",
      "Afgekeurd, de klant ziet de reden.",
      "Rechazado; el cliente ve el motivo.",
    ),
  },

  errors: {
    nameRequired: T("Fill in your name.", "Vul uw naam in.", "Indique su nombre."),
    nameRequiredStaff: T("Fill in a name.", "Vul een naam in.", "Indica un nombre."),
    adminOnly: T(
      "Only an admin can change this.",
      "Alleen een admin kan dit wijzigen.",
      "Solo un administrador puede cambiar esto.",
    ),
    emailInvalid: T(
      "Fill in a valid email address.",
      "Vul een geldig e-mailadres in.",
      "Indica un correo electrónico válido.",
    ),
    localeUnknown: T("Unknown language.", "Onbekende taal.", "Idioma desconocido."),
    dateOfBirthInvalid: T(
      "Date of birth is not a valid date.",
      "Geboortedatum is geen geldige datum.",
      "La fecha de nacimiento no es válida.",
    ),
    passportExpiryInvalid: T(
      "Passport expiry is not a valid date.",
      "Vervaldatum paspoort is geen geldige datum.",
      "La fecha de caducidad del pasaporte no es válida.",
    ),
    documentKindUnknown: T(
      "Unknown document type.",
      "Onbekend documenttype.",
      "Tipo de documento desconocido.",
    ),
    chooseFile: T("Choose a file first.", "Kies eerst een bestand.", "Elija primero un archivo."),
    fileEmpty: T("The file is empty.", "Het bestand is leeg.", "El archivo está vacío."),
    fileTooLarge: T(
      "The file is larger than 10 MB.",
      "Het bestand is groter dan 10 MB.",
      "El archivo supera los 10 MB.",
    ),
    fileType: T(
      "We do not accept this file type.",
      "Dit bestandstype accepteren we niet.",
      "No aceptamos este tipo de archivo.",
    ),
    uploadFailed: T(
      "Upload failed: {reason}",
      "Uploaden mislukt: {reason}",
      "Error al subir: {reason}",
    ),
    unknownReason: T("unknown error", "onbekende fout", "error desconocido"),
    duplicateEmail: T(
      "A client with this email address already exists.",
      "Er bestaat al een klant met dit e-mailadres.",
      "Ya existe un cliente con este correo electrónico.",
    ),
    createFailed: T(
      "Creating failed. Please try again.",
      "Aanmaken mislukt. Probeer het opnieuw.",
      "No se pudo crear. Inténtalo de nuevo.",
    ),
    noClient: T("No client given.", "Geen klant opgegeven.", "No se ha indicado ningún cliente."),
    inviteFailed: T(
      "Generating the link failed.",
      "Link genereren mislukt.",
      "No se pudo generar el enlace.",
    ),
    titleRequired: T("Fill in a title.", "Vul een titel in.", "Indica un título."),
    descriptionRequired: T(
      "Fill in a description.",
      "Vul een beschrijving in.",
      "Indica una descripción.",
    ),
    addressRequired: T("Fill in an address.", "Vul een adres in.", "Indica una dirección."),
    nothingToDelete: T(
      "Nothing given to delete.",
      "Niets opgegeven om te verwijderen.",
      "No se ha indicado nada que eliminar.",
    ),
    noProperty: T(
      "No property given.",
      "Geen property opgegeven.",
      "No se ha indicado ninguna propiedad.",
    ),
    photosFailed: T(
      "Property saved, but uploading the photographs failed: {reason}",
      "Property opgeslagen, maar foto’s uploaden mislukte: {reason}",
      "Propiedad guardada, pero falló la subida de las fotografías: {reason}",
    ),
    noDocument: T(
      "No document given.",
      "Geen document opgegeven.",
      "No se ha indicado ningún documento.",
    ),
    reasonRequired: T(
      "Give a reason. The client reads it and needs to know what is wrong.",
      "Geef een reden op. De klant leest die en moet weten wat er mis is.",
      "Indica un motivo. El cliente lo lee y necesita saber qué está mal.",
    ),
  },
} as const;

/* ----------------------------------------------------------------- the resolver */

type Dict = typeof DICT;

/** The dictionary with one language chosen: every phrase becomes a plain string. */
export type Copy<T = Dict> = T extends Phrase ? string : { readonly [K in keyof T]: Copy<T[K]> };

function isPhrase(node: unknown): node is Phrase {
  return (
    typeof node === "object" &&
    node !== null &&
    typeof (node as Record<string, unknown>).en === "string"
  );
}

const CACHE = new Map<Locale, Copy>();

/**
 * The dictionary in one language. Resolved once per language and cached, so a
 * request does not walk the tree again for every component that asks.
 */
export function copy(locale: Locale): Copy {
  const hit = CACHE.get(locale);
  if (hit) return hit;

  const walk = (node: unknown): unknown => {
    if (isPhrase(node)) return node[locale];
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      out[key] = walk(value);
    }
    return out;
  };

  const resolved = walk(DICT) as Copy;
  CACHE.set(locale, resolved);
  return resolved;
}
