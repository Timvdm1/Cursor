import { RISK_COPY } from "./scoring.js";
import { contractArticles, dossierNarrative, remedialClauses } from "./clauses.js";

const PAGE_W = 210;
const PAGE_H = 297;

function fmtDate(iso) {
  const date = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stamp(level) {
  const labels = { groen: "LAAG RISICO", oranje: "AANDACHT", rood: "HOOG RISICO" };
  return labels[level] || level;
}

function pageShell(inner, footer) {
  return `<section class="pdf-page">
    <div class="pdf-rule"></div>
    <header class="pdf-head">
      <div>
        <p class="pdf-kicker">DBA DOSSIER · WET DBA 2026</p>
        <p class="pdf-brand">Fiscaal toetsingsstuk</p>
      </div>
      <p class="pdf-ref">${esc(footer.ref)}</p>
    </header>
    ${inner}
    <footer class="pdf-foot">
      <span>${esc(footer.left)}</span>
      <span>${esc(footer.right)}</span>
    </footer>
  </section>`;
}

function contractHtml(dossier, assessment) {
  const { articles, clauses, blocked } = contractArticles(dossier, assessment);
  const og = dossier.opdrachtgever || {};
  const zzp = dossier.zzp || {};
  const ref = (dossier.id || "CONCEPT").toUpperCase();

  const articlePages = articles
    .map(
      (article) => `<article class="pdf-art">
        <h2>Artikel ${esc(article.nr)}. ${esc(article.title)}</h2>
        <p>${esc(article.body).replace(/\n/g, "<br>")}</p>
      </article>`,
    )
    .join("");

  const clauseList = clauses
    .map(
      (item) => `<li>
        <strong>${esc(item.title)}</strong>
        <span>${esc(item.body)}</span>
      </li>`,
    )
    .join("");

  const cover = pageShell(
    `<div class="pdf-cover">
      <p class="pdf-eyebrow">${blocked ? "Herstructureringskader — niet gebruiken als schijnveilige akte" : "Overeenkomst van opdracht"}</p>
      <h1>Overeenkomst van opdracht</h1>
      <p class="pdf-lead">Opgesteld op basis van de holistische toetsing naar het Deliveroo-arrest (HR 24 maart 2023, ECLI:NL:HR:2023:443) en de handhaving van de Wet DBA.</p>
      <dl class="pdf-meta">
        <div><dt>Opdrachtgever</dt><dd>${esc(og.bedrijfsnaam)} · KvK ${esc(og.kvk)}</dd></div>
        <div><dt>Opdrachtnemer</dt><dd>${esc(zzp.naam)} · KvK ${esc(zzp.kvk)}</dd></div>
        <div><dt>Dossier</dt><dd>${esc(ref)}</dd></div>
        <div><dt>Tijdstempel</dt><dd>${esc(fmtDate(dossier.updatedAt))}</dd></div>
        <div><dt>Risicoscore</dt><dd>${assessment.score}/100 · ${stamp(assessment.level)}</dd></div>
      </dl>
      <p class="pdf-note">Dit stuk is een besluitvormingsdossier. Het is geen standpunt of ruling van de Belastingdienst. De feiten gaan boven de akte.</p>
    </div>`,
    { ref, left: `${og.bedrijfsnaam || ""} / ${zzp.naam || ""}`, right: "OVO · blad 1" },
  );

  const body = pageShell(
    `<div class="pdf-body">${articlePages}</div>`,
    { ref, left: "Overeenkomst van opdracht", right: "OVO · blad 2" },
  );

  const annex = pageShell(
    `<div class="pdf-body">
      <h1 class="pdf-h">Bijlage — Aanpassingsclausules</h1>
      <p>Clausules die volgen uit de beantwoording. Bij oranje of rood: eerst de werksituatie aanpassen, daarna tekenen.</p>
      <ol class="pdf-clauses">${clauseList}</ol>
      <div class="pdf-sign">
        <div>
          <p>Opdrachtgever</p>
          <p class="pdf-line">${esc(og.contact)}</p>
          <p>Datum / handtekening</p>
        </div>
        <div>
          <p>Opdrachtnemer</p>
          <p class="pdf-line">${esc(zzp.naam)}</p>
          <p>Datum / handtekening</p>
        </div>
      </div>
    </div>`,
    { ref, left: "Bijlage clausules", right: "OVO · blad 3" },
  );

  return cover + body + annex;
}

function dossierHtml(dossier, assessment) {
  const copy = RISK_COPY[assessment.level];
  const { pillars } = dossierNarrative(dossier, assessment);
  const og = dossier.opdrachtgever || {};
  const zzp = dossier.zzp || {};
  const ref = (dossier.id || "CONCEPT").toUpperCase();
  const clauses = remedialClauses(dossier.answers);

  const cover = pageShell(
    `<div class="pdf-cover">
      <p class="pdf-eyebrow">Fiscaal toetsingsdossier · niet-openbaar</p>
      <h1>Toetsingsdossier Wet DBA</h1>
      <p class="pdf-lead">${esc(copy.summary)}</p>
      <div class="pdf-score pdf-score--${esc(assessment.level)}">
        <span>${assessment.score}</span>
        <em>${esc(stamp(assessment.level))}</em>
      </div>
      <dl class="pdf-meta">
        <div><dt>Opdrachtgever</dt><dd>${esc(og.bedrijfsnaam)} · ${esc(og.sector)}</dd></div>
        <div><dt>Opdrachtnemer</dt><dd>${esc(zzp.naam)} · ${esc(zzp.beroep)}</dd></div>
        <div><dt>Tarief</dt><dd>${zzp.uurtarief ? `€${esc(zzp.uurtarief)} excl. btw` : "niet opgegeven"}</dd></div>
        <div><dt>Tijdstempel</dt><dd>${esc(fmtDate(dossier.updatedAt))}</dd></div>
      </dl>
      <p class="pdf-note">${esc(copy.advice)} Bronmaatstaf: art. 7:610 BW; Deliveroo HR 24 maart 2023, ECLI:NL:HR:2023:443; handhavingsplan arbeidsrelaties Belastingdienst.</p>
    </div>`,
    { ref, left: "Toetsingsdossier", right: "FTD · blad 1" },
  );

  const pillarBlocks = pillars
    .map((pillar) => {
      const rows = pillar.rows
        .map(
          (row) => `<tr>
            <th>${esc(row.title)}</th>
            <td>${esc(row.label)}</td>
            <td>${esc(row.answer)}</td>
          </tr>`,
        )
        .join("");
      return `<section class="pdf-pillar">
        <header>
          <h2>${esc(pillar.nr)} ${esc(pillar.title)}</h2>
          <span>${pillar.pct}% risicogewicht · ${esc(pillar.legal)}</span>
        </header>
        <table>${rows}</table>
      </section>`;
    })
    .join("");

  const matrix = pageShell(
    `<div class="pdf-body">
      <h1 class="pdf-h">Antwoordenmatrix</h1>
      <p>Holistische weging. Geen enkel antwoord is doorslaggevend; gezag en inbedding wegen zwaar.</p>
      ${pillarBlocks}
    </div>`,
    { ref, left: "Antwoordenmatrix", right: "FTD · blad 2" },
  );

  const advice = pageShell(
    `<div class="pdf-body">
      <h1 class="pdf-h">Juridische onderbouwing en advies</h1>
      <p>${esc(copy.summary)}</p>
      <p>${esc(copy.advice)}</p>
      <h2>Concrete aanpassingen</h2>
      <ol class="pdf-clauses">${clauses.map((item) => `<li><strong>${esc(item.title)}</strong><span>${esc(item.body)}</span></li>`).join("")}</ol>
      <p class="pdf-note">Bewaar dit dossier bij de administratie van de opdracht. Bij een boekenonderzoek toont het de zorgvuldigheid van de toetsing, de datum en de gevolgde maatstaf. Het vervangt geen advocaat- of belastingadvies in een concreet geschil.</p>
    </div>`,
    { ref, left: "Onderbouwing", right: "FTD · blad 3" },
  );

  return cover + matrix + advice;
}

function ensureRoot() {
  let root = document.getElementById("print-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "print-root";
    root.setAttribute("aria-hidden", "true");
    document.body.appendChild(root);
  }
  return root;
}

async function canvasToPdf(pages, filename) {
  const jspdfNs = window.jspdf;
  if (!jspdfNs?.jsPDF || !window.html2canvas) {
    throw new Error("PDF-bibliotheken zijn niet geladen.");
  }
  const pdf = new jspdfNs.jsPDF({ unit: "mm", format: "a4", compress: true });
  for (let i = 0; i < pages.length; i += 1) {
    const canvas = await window.html2canvas(pages[i], {
      scale: 2,
      backgroundColor: "#f7f4ee",
      useCORS: true,
    });
    const img = canvas.toDataURL("image/jpeg", 0.92);
    if (i > 0) pdf.addPage();
    pdf.addImage(img, "JPEG", 0, 0, PAGE_W, PAGE_H);
  }
  pdf.save(filename);
}

function slug(value) {
  return String(value || "dossier")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export async function exportContractPdf(dossier, assessment) {
  const root = ensureRoot();
  root.innerHTML = contractHtml(dossier, assessment);
  const pages = [...root.querySelectorAll(".pdf-page")];
  const name = `OVO-${slug(dossier.zzp?.naam)}-${new Date().toISOString().slice(0, 10)}.pdf`;
  await canvasToPdf(pages, name);
  root.innerHTML = "";
  return name;
}

export async function exportDossierPdf(dossier, assessment) {
  const root = ensureRoot();
  root.innerHTML = dossierHtml(dossier, assessment);
  const pages = [...root.querySelectorAll(".pdf-page")];
  const name = `Toetsingsdossier-${slug(dossier.zzp?.naam)}-${new Date().toISOString().slice(0, 10)}.pdf`;
  await canvasToPdf(pages, name);
  root.innerHTML = "";
  return name;
}

export function previewHtml(dossier, assessment, kind) {
  return kind === "ovo" ? contractHtml(dossier, assessment) : dossierHtml(dossier, assessment);
}
