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

    overview: T("Overview", "Overzicht", "Resumen"),
    clients: T("Clients", "Klanten", "Clientes"),
    /* Broader than "Service Procedures" on purpose: it holds internal processes
       too, not only the services we sell. */
    guides: T("Process Guide", "Process Guide", "Guía de procesos"),
    properties: T("Properties", "Properties", "Propiedades"),
    documents: T("Documents", "Documenten", "Documentos"),
    tasks: T("Tasks", "Taken", "Tareas"),
    settings: T("Settings", "Instellingen", "Ajustes"),
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
      "What still has to happen, and who is doing it.",
      "Wat er nog moet gebeuren, en wie het doet.",
      "Lo que todavía tiene que pasar, y quién lo hace.",
    ),
    notYet: T("Not built yet", "Nog niet gebouwd", "Todavía sin construir"),
    notYetBody: T(
      "This tab is here, the feature behind it is not: there is no task list in the database yet. Say what a task should hold — a deadline, an owner, a client it belongs to — and it can be built.",
      "Dit tabblad staat er, wat erachter hoort nog niet: er is nog geen takenlijst in de database. Zeg wat er in een taak moet staan — een deadline, wie hem doet, bij welke klant hij hoort — dan kan het gebouwd worden.",
      "Esta pestaña ya está; lo que va detrás, todavía no: aún no hay lista de tareas en la base de datos. Diga qué debe contener una tarea — un plazo, quién la hace, a qué cliente pertenece — y se puede construir.",
    ),
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
    formTitle: T("Title", "Titel", "Título"),
    formAddress: T("Address", "Adres", "Dirección"),
    formNotes: T("Note", "Notitie", "Nota"),
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
    title: T("Account", "Account", "Cuenta"),
    signedInAs: T(
      "You are signed in as {name} — {email}, role {role}.",
      "Je bent ingelogd als {name} — {email}, rol {role}.",
      "Has iniciado sesión como {name} — {email}, rol {role}.",
    ),
    roleAdmin: T("admin", "admin", "administrador"),
    roleStaff: T("staff", "medewerker", "empleado"),
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
