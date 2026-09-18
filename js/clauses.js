import { QUESTIONS, PILLARS } from "./questions.js";
import { answerMatrix } from "./scoring.js";

function opt(answers, id) {
  return answers[id] || "";
}

function clause(id, title, body, severity = "info") {
  return { id, title, body, severity };
}

export function remedialClauses(answers) {
  const items = [];

  if (opt(answers, "q1") !== "a") {
    items.push(
      clause(
        "werktijd",
        "Geen aanwezigheidsplicht",
        "Opdrachtnemer deelt werktijd en werkplek zelf in, met inachtneming van de overeengekomen oplevermomenten. Opdrachtgever stelt geen rooster, dienstindeling of aanwezigheidsplicht vast.",
        opt(answers, "q1") === "c" ? "critical" : "warn",
      ),
    );
  }

  if (opt(answers, "q2") !== "a" || opt(answers, "q3") !== "a") {
    items.push(
      clause(
        "gezag",
        "Geen leiding of toezicht",
        "Opdrachtnemer bepaalt de professionele methode. Overleg is beperkt tot het overeengekomen resultaat, planning van oplevering en wettelijke veiligheidsvoorschriften. Er is geen functionerings-, beoordelings- of hiërarchisch overleg.",
        opt(answers, "q2") === "c" || opt(answers, "q3") === "c" ? "critical" : "warn",
      ),
    );
  }

  if (opt(answers, "q4") === "c" || opt(answers, "q5") === "c") {
    items.push(
      clause(
        "afbakening",
        "Afbakening ten opzichte van kerntaken",
        "De opdracht betreft een afgebakend, niet-inwisselbaar specialisme. Opdrachtnemer verricht geen werkzaamheden die identiek zijn aan de kerntaken van werknemers van opdrachtgever en maakt geen deel uit van de interne teamstructuur.",
        "critical",
      ),
    );
  }

  if (opt(answers, "q6") !== "a") {
    items.push(
      clause(
        "inbedding",
        "Geen organisatorische inbedding",
        "Opdrachtnemer ontvangt geen bedrijfs-e-mailadres, geen interne rang of personeelsnummer, en neemt niet deel aan de HR-cyclus. Eventuele systeemtoegang is tijdelijk, beperkt tot de opdracht en wordt na oplevering ingetrokken.",
        opt(answers, "q6") === "c" ? "critical" : "warn",
      ),
    );
  }

  if (opt(answers, "q7") !== "a") {
    items.push(
      clause(
        "vervanging",
        "Vrije vervanging",
        "Opdrachtnemer mag zich bij verhindering laten vervangen door een naar eigen inzicht gekwalificeerde derde. Vervanging vereist geen voorafgaande toestemming. Opdrachtnemer blijft verantwoordelijk voor de deugdelijke nakoming.",
        opt(answers, "q7") === "c" ? "critical" : "warn",
      ),
    );
  }

  if (opt(answers, "q8") !== "a") {
    items.push(
      clause(
        "resultaat",
        "Resultaatsverplichting",
        "Partijen komen een meetbaar resultaat of oplevering overeen. Beschikbaarheid of het maken van uren is niet de prestatie. Facturatie volgt de overeengekomen mijlpalen of aantoonbaar verrichte prestaties, niet een vast weekrooster.",
        "warn",
      ),
    );
  }

  if (opt(answers, "q9") !== "a") {
    items.push(
      clause(
        "tarief",
        "Marktconform tarief",
        "Het tarief wordt vastgesteld op een marktconform niveau van ten minste €38 excl. btw per uur, of een equivalent projecttarief, zodat geen beroep op het rechtsvermoeden arbeidsrelatie kan worden gedaan op grond van het tarief alleen.",
        opt(answers, "q9") === "c" ? "critical" : "warn",
      ),
    );
  }

  if (opt(answers, "q10") !== "a") {
    items.push(
      clause(
        "middelen",
        "Eigen bedrijfsmiddelen",
        "Opdrachtnemer zet eigen gereedschap, vervoer, hardware en softwarelicenties in. Middelen van opdrachtgever worden alleen gebruikt indien de aard van de locatie dat dwingend vereist, en dan zonder exclusiviteit of huisstijlverplichting buiten de veiligheidseisen.",
        "warn",
      ),
    );
  }

  if (opt(answers, "q11") !== "a") {
    items.push(
      clause(
        "risico",
        "Ondernemersrisico",
        "Opdrachtnemer draagt het debiteurenrisico, herstelt gebreken voor eigen rekening, en houdt een adequate beroepsaansprakelijkheidsverzekering (AVB) in stand. Er is geen loondoorbetaling bij ziekte of leegloop.",
        "warn",
      ),
    );
  }

  if (opt(answers, "q12") !== "a") {
    items.push(
      clause(
        "spreiding",
        "Meerdere opdrachtgevers",
        "Opdrachtnemer verklaart een zelfstandige onderneming te drijven met (beoogd) meerdere opdrachtgevers. Deze overeenkomst schept geen exclusiviteit en geen uren- of omzetgarantie.",
        "warn",
      ),
    );
  }

  if (items.length === 0) {
    items.push(
      clause(
        "bevestiging",
        "Bevestiging zelfstandige praktijk",
        "De antwoorden sluiten aan bij een zelfstandige praktijk. De overeenkomst legt resultaat, vrije vervanging, eigen middelen en het ontbreken van gezag vast, zodat de papieren werkelijkheid de feiten volgt.",
        "info",
      ),
    );
  }

  return items;
}

export function contractArticles(dossier, assessment) {
  const { opdrachtgever: og, zzp } = dossier;
  const answers = dossier.answers;
  const clauses = remedialClauses(answers);
  const rate = zzp.uurtarief ? `€${zzp.uurtarief} excl. btw per uur` : "het in de opdrachtbevestiging vermelde tarief";
  const blocked = assessment.level === "rood";

  const articles = [
    {
      nr: "1",
      title: "Partijen",
      body: `Opdrachtgever: ${og.bedrijfsnaam || "[bedrijfsnaam]"}, KvK ${og.kvk || "[kvk]"}, ten deze vertegenwoordigd door ${og.contact || "[contactpersoon]"}.\n\nOpdrachtnemer: ${zzp.naam || "[naam]"}, handelend als zelfstandige zonder personeel, KvK ${zzp.kvk || "[kvk]"}, beroep: ${zzp.beroep || "[beroep]"}.`,
    },
    {
      nr: "2",
      title: "Aard van de overeenkomst",
      body: blocked
        ? "Deze tekst is een herstructureringskader. De huidige feiten wijzen op een (fictieve) dienstbetrekking. Partijen mogen deze overeenkomst niet gebruiken als bewijs dat géén arbeidsovereenkomst bestaat, zolang de hierna genoemde feiten ongewijzigd blijven."
        : "Partijen sluiten een overeenkomst van opdracht in de zin van artikel 7:400 BW. Er is uitdrukkelijk geen arbeidsovereenkomst in de zin van artikel 7:610 BW beoogd. Opdrachtnemer is niet verplicht de werkzaamheden persoonlijk te verrichten, behoudens het bepaalde in artikel 5.",
    },
    {
      nr: "3",
      title: "Opdracht en resultaat",
      body: `Opdrachtnemer aanvaardt de opdracht tot het zelfstandig tot stand brengen van de overeengekomen prestatie op het vakgebied ${zzp.beroep || "van opdrachtnemer"}, voor de sector ${og.sector || "van opdrachtgever"}. De prestatie is een resultaat, niet het ‘beschikbaar zijn’. Nadere specificatie volgt in de opdrachtbevestiging, die onderdeel van deze overeenkomst uitmaakt.`,
    },
    {
      nr: "4",
      title: "Uitvoering zonder gezag",
      body: "Opdrachtnemer bepaalt de wijze waarop de opdracht wordt uitgevoerd. Opdrachtgever geeft geen leiding of toezicht in de zin van artikel 7:610 BW. Aanwijzingen blijven beperkt tot het overeengekomen resultaat, planning van oplevering, en voorschriften die uit wet of locatieveiligheid voortvloeien. Opdrachtnemer neemt geen deel aan functioneringsgesprekken, teamhiërarchie of interne beoordelingscycli.",
    },
    {
      nr: "5",
      title: "Vervanging",
      body: "Opdrachtnemer mag zich laten vervangen door een gekwalificeerde derde. Voorafgaande toestemming is niet vereist. Opdrachtnemer blijft verantwoordelijk voor deugdelijke nakoming. Opdrachtgever kan een vervanger alleen weigeren op objectieve, vooraf kenbare kwalificatie-eisen die de opdracht zelf betreffen.",
    },
    {
      nr: "6",
      title: "Vergoeding en facturatie",
      body: `De vergoeding bedraagt ${rate}. Opdrachtnemer factureert onder vermelding van btw, tenzij een wettelijke vrijstelling geldt. Betalingstermijn: 14 dagen na factuurdatum. Opdrachtnemer draagt het debiteurenrisico. Er is geen loon, geen vakantiegeld, geen doorbetaling bij ziekte.`,
    },
    {
      nr: "7",
      title: "Middelen, verzekering en risico",
      body: "Opdrachtnemer zet in beginsel eigen gereedschap, vervoer, hardware en licenties in, en houdt een adequate AVB in stand. Gebreken worden voor eigen rekening hersteld, behoudens opzet of grove schuld van opdrachtgever. Opdrachtnemer is vrij om voor derden te werken; deze overeenkomst schept geen exclusiviteit.",
    },
    {
      nr: "8",
      title: "Duur en beëindiging",
      body: "De overeenkomst eindigt van rechtswege bij oplevering van het resultaat, of op de in de opdrachtbevestiging genoemde einddatum. Tussentijdse opzegging is mogelijk met een termijn van 14 dagen, zonder dat daaraan een ontslagrechtelijke regeling is verbonden. Bij beëindiging levert opdrachtnemer het werk af in de staat waarin het zich bevindt en factureert de tot dan toe deugdelijk verrichte prestatie.",
    },
    {
      nr: "9",
      title: "Fiscale positie en Wet DBA",
      body: `Partijen hebben de arbeidsrelatie getoetst aan de holistische maatstaf van het Deliveroo-arrest (HR 24 maart 2023, ECLI:NL:HR:2023:443) en de handhaving van de Wet DBA. Risicoscore van dit dossier: ${assessment.score}/100 (${assessment.level}). Deze overeenkomst volgt die toetsing. Partijen weten dat de Belastingdienst de feiten laat voorgaan op de kwalificatie in deze akte. Wijzigingen in de werkwijze verplichten tot hertoetsing.`,
    },
    {
      nr: "10",
      title: "Slot",
      body: "Wijzigingen gelden slechts schriftelijk. Nederlands recht is van toepassing. Geschillen worden voorgelegd aan de bevoegde rechter in het arrondissement van de vestigingsplaats van opdrachtgever, onverminderd dwingend recht.",
    },
  ];

  return { articles, clauses, blocked };
}

export function dossierNarrative(dossier, assessment) {
  const matrix = answerMatrix(dossier.answers);
  const pillars = PILLARS.map((pillar) => {
    const ratio = assessment.pillars[pillar.id].ratio;
    const pct = Math.round(ratio * 100);
    let tone = "laag";
    if (pct >= 65) tone = "hoog";
    else if (pct >= 35) tone = "middel";
    const rows = matrix.filter((row) => row.pillar === pillar.id);
    return { ...pillar, pct, tone, rows };
  });
  return { matrix, pillars };
}
