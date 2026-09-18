/** Twaalf wettelijke indicatoren, gegroepeerd in de vier Deliveroo-pijlers. */

export const PILLARS = [
  {
    id: "gezag",
    nr: "01",
    title: "Gezagsverhouding",
    legal: "Leiding en toezicht · art. 7:610 BW",
    blurb: "Wie bepaalt werktijden, methodiek en dagelijkse werkwijze?",
  },
  {
    id: "inbedding",
    nr: "02",
    title: "Inbedding",
    legal: "Organisatorische inbedding · Deliveroo-arrest",
    blurb: "Hoort het werk bij de kern van de onderneming en het vaste team?",
  },
  {
    id: "vervanging",
    nr: "03",
    title: "Vervangbaarheid",
    legal: "Persoonlijke arbeid · vrije vervanging",
    blurb: "Mag de zzp’er zich laten vervangen zonder voorafgaande toestemming?",
  },
  {
    id: "ondernemerschap",
    nr: "04",
    title: "Ondernemerschap",
    legal: "Economisch risico · rechtsvermoeden tarief",
    blurb: "Tarief, eigen middelen, verzekering, debiteuren en meerdere opdrachtgevers.",
  },
];

export const QUESTIONS = [
  {
    id: "q1",
    pillar: "gezag",
    weight: 10,
    title: "Werktijden en aanwezigheid",
    help: "Een aanwezigheidsplicht of vast rooster wijst op gezag. Een zelfstandige plant het werk rond het overeengekomen resultaat.",
    options: [
      { value: "a", risk: 0, label: "Zelf indelen", text: "De zzp’er bepaalt zelf wanneer en waar wordt gewerkt, binnen de opleverafspraak." },
      { value: "b", risk: 0.45, label: "Overleg", text: "Er is een indicatieve planning in overleg, met ruimte voor eigen indeling." },
      { value: "c", risk: 1, label: "Rooster", text: "Vaste diensten, een rooster of een feitelijke aanwezigheidsplicht." },
    ],
  },
  {
    id: "q2",
    pillar: "gezag",
    weight: 10,
    title: "Aanwijzingen over de werkwijze",
    help: "Kwaliteitskaders mogen. Dwingende instructies over hóe het werk wordt uitgevoerd, niet.",
    options: [
      { value: "a", risk: 0, label: "Vrije methodiek", text: "Volledig vrije professionele methodiek. Alleen het resultaat is overeengekomen." },
      { value: "b", risk: 0.4, label: "Kaders", text: "Kwaliteitsnormen of veiligheidsvoorschriften, uitvoering verder vrij." },
      { value: "c", risk: 1, label: "Instructie", text: "Dwingende aanwijzingen over werkwijze, volgorde of hulpmiddelen." },
    ],
  },
  {
    id: "q3",
    pillar: "gezag",
    weight: 10,
    title: "Leiding en toezicht tijdens de opdracht",
    help: "Functioneringsgesprekken, een intern leidinggevende of dagelijkse controle zijn sterke werknemerssignalen.",
    options: [
      { value: "a", risk: 0, label: "Geen sturing", text: "Geen inhoudelijke sturing tijdens de uitvoering. Contact gaat over het resultaat." },
      { value: "b", risk: 0.4, label: "Resultaatoverleg", text: "Periodiek overleg over voortgang, zonder dagelijkse aansturing." },
      { value: "c", risk: 1, label: "Hiërarchie", text: "Direct leidinggevende, beoordelingsgesprekken of dagelijks toezicht." },
    ],
  },
  {
    id: "q4",
    pillar: "inbedding",
    weight: 10,
    title: "Positie ten opzichte van de kernactiviteit",
    help: "Werk dat tot de kern van de onderneming behoort, wordt sneller als arbeidsovereenkomst geduid.",
    options: [
      { value: "a", risk: 0, label: "Specialisme", text: "Afbakend specialisme buiten de kernactiviteit van de opdrachtgever." },
      { value: "b", risk: 0.5, label: "Ondersteunend", text: "Terugkerend, ondersteunend werk dat niet de kern is maar wel structureel voorkomt." },
      { value: "c", risk: 1, label: "Kernwerk", text: "Het werk is identiek aan de kernactiviteit van het bedrijf." },
    ],
  },
  {
    id: "q5",
    pillar: "inbedding",
    weight: 9,
    title: "Vergelijking met werknemers",
    help: "Zelfde werk, zelfde team, zelfde output als loondienstcollega’s is een klassiek schijnzelfstandigheidssignaal.",
    options: [
      { value: "a", risk: 0, label: "Unieke opdracht", text: "Geen vergelijkbare werknemers. De opdracht is niet inwisselbaar met loondienstwerk." },
      { value: "b", risk: 0.5, label: "Deels overlap", text: "Gedeeltelijke overlap met taken van medewerkers." },
      { value: "c", risk: 1, label: "Zelfde werk", text: "Zelfde werk, in hetzelfde team, met dezelfde output als werknemers." },
    ],
  },
  {
    id: "q6",
    pillar: "inbedding",
    weight: 9,
    title: "Organisatorische inbedding",
    help: "Bedrijfs-e-mail, vaste werkplek, interne overlegstructuur en HR-cyclus wijzen op inbedding.",
    options: [
      { value: "a", risk: 0, label: "Buiten de linie", text: "Eigen e-mail en systemen. Geen vaste werkplek of interne HR-cyclus." },
      { value: "b", risk: 0.45, label: "Tijdelijke toegang", text: "Tijdelijke toegang tot locatie of systemen, strikt voor deze opdracht." },
      { value: "c", risk: 1, label: "Ingebed", text: "Bedrijfs-e-mail, vaste plek, intern overleg en/of functioneringsgesprekken." },
    ],
  },
  {
    id: "q7",
    pillar: "vervanging",
    weight: 10,
    title: "Vrije vervanging",
    help: "Een reëel recht om zich te laten vervangen door een gekwalificeerde derde, zonder voorafgaande toestemming, spreekt tegen persoonlijke arbeid.",
    options: [
      { value: "a", risk: 0, label: "Vrij", text: "Mag zich vrij laten vervangen door een gekwalificeerde derde, zonder voorafgaande toestemming." },
      { value: "b", risk: 0.5, label: "Na melding", text: "Vervanging is mogelijk, maar pas na melding of instemming." },
      { value: "c", risk: 1, label: "Persoonlijk", text: "Persoonlijke arbeid is verplicht. Vervanging is uitgesloten of louter theoretisch." },
    ],
  },
  {
    id: "q8",
    pillar: "vervanging",
    weight: 8,
    title: "Resultaat of beschikbaarheid",
    help: "Uren draaien en ‘er zijn’ is inspanningsarbeid. Een afgebakend resultaat past bij opdracht.",
    options: [
      { value: "a", risk: 0, label: "Resultaat", text: "Overeengekomen oplevering of resultaat. Niet de uren zelf zijn de prestatie." },
      { value: "b", risk: 0.45, label: "Mix", text: "Mix van resultaat en een zekere mate van beschikbaarheid." },
      { value: "c", risk: 1, label: "Uren", text: "De prestatie is beschikbaarheid of het maken van uren." },
    ],
  },
  {
    id: "q9",
    pillar: "ondernemerschap",
    weight: 8,
    title: "Uurtarief",
    help: "Onder het rechtsvermoeden (richttarief €38 excl. btw, 2026) ligt het initiatief bij de werkende om zelfstandigheid aannemelijk te maken. Een laag tarief is geen automatisch dienstverband, wel een zwaar gewicht.",
    options: [
      { value: "a", risk: 0, label: "€38 of hoger", text: "€38 of hoger per uur, marktconform voor de discipline." },
      { value: "b", risk: 0.55, label: "€32 – €37,99", text: "Tarief ligt op of rond de grens van het rechtsvermoeden." },
      { value: "c", risk: 1, label: "Onder €32", text: "Lager dan €32, of vergelijkbaar met de loonkosten van een werknemer." },
    ],
  },
  {
    id: "q10",
    pillar: "ondernemerschap",
    weight: 6,
    title: "Eigen gereedschap en licenties",
    help: "Eigen bus, gereedschap, laptop en softwarelicenties zijn zichtbaar ondernemerschap. Structureel werken met bedrijfsmiddelen van de opdrachtgever niet.",
    options: [
      { value: "a", risk: 0, label: "Eigen middelen", text: "Eigen gereedschap, vervoer, hardware en/of licenties." },
      { value: "b", risk: 0.5, label: "Mix", text: "Deels eigen middelen, deels middelen van de opdrachtgever." },
      { value: "c", risk: 1, label: "Bedrijfsmiddelen", text: "Werkt vrijwel volledig met middelen, kleding of systemen van de opdrachtgever." },
    ],
  },
  {
    id: "q11",
    pillar: "ondernemerschap",
    weight: 5,
    title: "Aansprakelijkheid en debiteurenrisico",
    help: "Een zelfstandige draagt ondernemersrisico: AVB, herstel voor eigen rekening, geen loondoorbetaling bij ziekte, facturatie met incassorisico.",
    options: [
      { value: "a", risk: 0, label: "Vol risico", text: "Eigen AVB, herstel voor eigen rekening, factureert en draagt debiteurenrisico." },
      { value: "b", risk: 0.45, label: "Beperkt", text: "Beperkte aansprakelijkheid of gedeeltelijk afgedekt door de opdrachtgever." },
      { value: "c", risk: 1, label: "Geen risico", text: "Geen ondernemersrisico. Ziekte, fouten en leegloop liggen bij de opdrachtgever." },
    ],
  },
  {
    id: "q12",
    pillar: "ondernemerschap",
    weight: 5,
    title: "Meerdere opdrachtgevers",
    help: "Structureel één opdrachtgever, zonder acquisitie, lijkt op een verkapte dienstbetrekking. Zichtbare spreiding wijst op een onderneming.",
    options: [
      { value: "a", risk: 0, label: "Spreiding", text: "Drie of meer opdrachtgevers per jaar, met zichtbare acquisitie." },
      { value: "b", risk: 0.5, label: "Beperkt", text: "Twee opdrachtgevers, of recent gestart met de onderneming." },
      { value: "c", risk: 1, label: "Eén opdrachtgever", text: "Feitelijk één opdrachtgever, structureel en zonder spreiding." },
    ],
  },
];

export const QUICK_SCAN = [
  {
    id: "qs1",
    pillar: "gezag",
    title: "Wie bepaalt de dagelijkse werkwijze?",
    options: [
      { value: "a", risk: 0, text: "De zzp’er. Wij kopen een resultaat, geen uren." },
      { value: "b", risk: 0.45, text: "In overleg. Er zijn kaders, geen dagelijkse sturing." },
      { value: "c", risk: 1, text: "Wij. Rooster, leidinggevende of vaste instructies." },
    ],
  },
  {
    id: "qs2",
    pillar: "inbedding",
    title: "Doet de zzp’er hetzelfde werk als uw mensen?",
    options: [
      { value: "a", risk: 0, text: "Nee. Het is een afgebakend specialisme buiten de kern." },
      { value: "b", risk: 0.5, text: "Deels. Overlap met taken van het vaste team." },
      { value: "c", risk: 1, text: "Ja. Zelfde werk, vaak op onze locatie, in onze lijn." },
    ],
  },
  {
    id: "qs3",
    pillar: "vervanging",
    title: "Mag de zzp’er zich vrij laten vervangen?",
    options: [
      { value: "a", risk: 0, text: "Ja, door een gekwalificeerde derde, zonder voorafgaande toestemming." },
      { value: "b", risk: 0.5, text: "Alleen na overleg of goedkeuring." },
      { value: "c", risk: 1, text: "Nee. Het moet deze persoon zijn." },
    ],
  },
  {
    id: "qs4",
    pillar: "ondernemerschap",
    title: "Ondernemerskenmerken",
    options: [
      { value: "a", risk: 0, text: "Tarief ≥ €38, eigen middelen, meerdere opdrachtgevers." },
      { value: "b", risk: 0.5, text: "Mix: tarief rond de grens, of deels onze middelen." },
      { value: "c", risk: 1, text: "Laag tarief, onze spullen, feitelijk één opdrachtgever." },
    ],
  },
];

export const SECTORS = [
  "Bouw",
  "Installatietechniek",
  "Zorg",
  "ICT",
  "Zakelijke dienstverlening",
  "Overig",
];

export const TOTAL_WEIGHT = QUESTIONS.reduce((sum, question) => sum + question.weight, 0);

/** Drie ijksituaties voor de verificatie van het stoplicht. */
export const SCENARIOS = {
  groen: {
    label: "Echte zelfstandige",
    answers: {
      q1: "a",
      q2: "a",
      q3: "a",
      q4: "a",
      q5: "a",
      q6: "a",
      q7: "a",
      q8: "a",
      q9: "a",
      q10: "a",
      q11: "a",
      q12: "a",
    },
    party: {
      opdrachtgever: {
        bedrijfsnaam: "Noordwal Installatie B.V.",
        kvk: "24188901",
        contact: "Marieke de Vries",
        email: "m.devries@noordwal.example",
        sector: "Installatietechniek",
      },
      zzp: {
        naam: "Lars Bakker",
        kvk: "82344109",
        email: "lars@bakkertechniek.example",
        telefoon: "0612345678",
        uurtarief: "92",
        beroep: "Wtb-monteur / inregelaar",
      },
    },
  },
  oranje: {
    label: "Twijfelgeval",
    answers: {
      q1: "b",
      q2: "b",
      q3: "b",
      q4: "b",
      q5: "b",
      q6: "c",
      q7: "b",
      q8: "b",
      q9: "a",
      q10: "c",
      q11: "b",
      q12: "b",
    },
    party: {
      opdrachtgever: {
        bedrijfsnaam: "Havenkwartier Advies B.V.",
        kvk: "30122618",
        contact: "Timo van Dijk",
        email: "t.vandijk@havenkwartier.example",
        sector: "Zakelijke dienstverlening",
      },
      zzp: {
        naam: "Sanne Veldhuis",
        kvk: "77412033",
        email: "sanne@veldhuis.example",
        telefoon: "0687654321",
        uurtarief: "78",
        beroep: "Interim controller",
      },
    },
  },
  rood: {
    label: "Schijnzelfstandige",
    answers: {
      q1: "c",
      q2: "c",
      q3: "c",
      q4: "c",
      q5: "c",
      q6: "c",
      q7: "c",
      q8: "c",
      q9: "c",
      q10: "c",
      q11: "c",
      q12: "c",
    },
    party: {
      opdrachtgever: {
        bedrijfsnaam: "Zorggroep Lindehof",
        kvk: "56882144",
        contact: "Fatima El Idrissi",
        email: "f.elidrissi@lindehof.example",
        sector: "Zorg",
      },
      zzp: {
        naam: "Peter Molenaar",
        kvk: "61200987",
        email: "peter.molenaar@example.com",
        telefoon: "0699988776",
        uurtarief: "28",
        beroep: "Verzorgende IG",
      },
    },
  },
};
