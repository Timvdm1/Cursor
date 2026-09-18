import { QUESTIONS, PILLARS, QUICK_SCAN, SECTORS, SCENARIOS } from "./questions.js";
import { assess, assessQuick, RISK_COPY, answerMatrix } from "./scoring.js";
import { remedialClauses } from "./clauses.js";
import { store, STATUSES, uid } from "./storage.js";
import { exportContractPdf, exportDossierPdf, previewHtml } from "./pdf.js";

const panel = () => document.getElementById("panel");
const landing = () => document.getElementById("view-landing");
const appView = () => document.getElementById("view-app");

const wizard = {
  step: 0,
  dossier: blankDossier(),
};

const scan = {
  answers: {},
  lead: { naam: "", email: "", bedrijf: "" },
  result: null,
};

let dashFilter = "alle";
let preview = null;

function blankDossier() {
  return {
    id: uid(),
    status: "actief",
    answers: {},
    opdrachtgever: {
      bedrijfsnaam: "",
      kvk: "",
      contact: "",
      email: "",
      sector: "Zakelijke dienstverlening",
    },
    zzp: {
      naam: "",
      kvk: "",
      email: "",
      telefoon: "",
      uurtarief: "",
      beroep: "",
    },
  };
}

function parseHash() {
  const raw = location.hash.replace(/^#/, "") || "/";
  const [pathPart, queryPart] = raw.split("?");
  const path = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
  const query = new URLSearchParams(queryPart || "");
  const parts = path.split("/").filter(Boolean);
  return { path, parts, query };
}

function setActiveNav(path) {
  const key = path.split("/").filter(Boolean)[0] || "";
  const activeHref = {
    scan: "#/scan",
    toetsing: "#/toetsing",
    dashboard: "#/dashboard",
    juridisch: "#/juridisch",
    resultaat: "#/dashboard",
  }[key] || "#/";
  document.querySelectorAll(".nav a[data-nav]").forEach((link) => {
    const href = link.getAttribute("href") || "";
    const isHome = (href === "#/" || href === "#") && !key;
    link.classList.toggle("is-active", href === activeHref || isHome);
  });
}

function showLanding(yes) {
  landing().hidden = !yes;
  appView().hidden = yes;
}

function icons() {
  if (window.lucide?.createIcons) window.lucide.createIcons({ attrs: { "stroke-width": 1.6 } });
}

function toast(message) {
  document.querySelectorAll(".toast").forEach((node) => node.remove());
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function field(name, label, value, type = "text", extra = "") {
  return `<label class="field">
    <span>${label}</span>
    <input name="${name}" type="${type}" value="${escapeAttr(value || "")}" ${extra} />
  </label>`;
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function choiceList(name, options, selected) {
  return `<div class="choices">
    ${options
      .map((option) => {
        const on = selected === option.value;
        return `<label class="choice ${on ? "is-on" : ""}">
          <input type="radio" name="${name}" value="${option.value}" ${on ? "checked" : ""} />
          <span>
            ${option.label ? `<strong>${escapeHtml(option.label)}</strong>` : ""}
            <span>${escapeHtml(option.text)}</span>
          </span>
        </label>`;
      })
      .join("")}
  </div>`;
}

function renderScan() {
  const questions = QUICK_SCAN.map((question, index) => {
    return `<article class="q-block">
      <p class="kicker" style="color:#a8843a">Vraag 0${index + 1}</p>
      <h2>${escapeHtml(question.title)}</h2>
      ${choiceList(question.id, question.options, scan.answers[question.id])}
    </article>`;
  }).join("");

  const result = scan.result
    ? renderScanResult()
    : `<form id="lead-form" class="form-grid mt-6">
        ${field("bedrijf", "Bedrijf", scan.lead.bedrijf, "text", "required")}
        ${field("naam", "Uw naam", scan.lead.naam, "text", "required")}
        ${field("email", "Werk-e-mail", scan.lead.email, "email", "required")}
      </form>
      <div class="actions">
        <span class="muted">Indicatie op vier pijlers. Geen PDF, geen dossier.</span>
        <button class="btn" data-action="scan-submit">Toon stoplicht</button>
      </div>`;

  panel().innerHTML = `<div class="sheet">
    <p class="kicker" style="color:#a8843a">Gratis Quick Scan</p>
    <h1 class="mt-0 mb-2 text-[32px]">Vier vragen. Eén stoplicht.</h1>
    <p class="muted mt-0">Voor directeuren en HR die willen weten of een inhuur de toets van 2026 haalt.</p>
    <form id="scan-form">${questions}</form>
    ${result}
  </div>`;
}

function renderScanResult() {
  const copy = RISK_COPY[scan.result.level];
  return `<div class="result-hero mt-8">
    ${traffic(scan.result.level)}
    <div>
      <p class="badge badge--${scan.result.level}">${copy.kicker}</p>
      <h2 class="mt-3 mb-2">${escapeHtml(copy.title)}</h2>
      <p class="score-num">${scan.result.score}<span class="text-[18px] text-[#5d6673]"> / 100</span></p>
      <p>${escapeHtml(copy.summary)}</p>
      <div class="hero-actions">
        <a class="btn" href="#/toetsing">Maak het volledige dossier</a>
        <a class="btn btn--ghost" href="#/dashboard" style="color:#17202b;border-color:#cfc6b6">Naar dashboard</a>
      </div>
    </div>
  </div>`;
}

function traffic(level) {
  return `<div class="stoplicht is-${level}" aria-label="Stoplicht ${level}">
    <i class="l-r"></i><i class="l-a"></i><i class="l-g"></i>
  </div>`;
}

function renderWizard() {
  const steps = ["Partijen", ...PILLARS.map((item) => item.title)];
  const stepper = `<div class="stepper" aria-label="Voortgang">
    ${steps
      .map((label, index) => {
        const state = index < wizard.step ? "is-done" : index === wizard.step ? "is-on" : "";
        return `<div><span class="${state}"></span><small>0${index + 1} ${escapeHtml(label)}</small></div>`;
      })
      .join("")}
  </div>`;

  const body = wizard.step === 0 ? partyForm() : pillarForm(PILLARS[wizard.step - 1]);
  const back = wizard.step === 0
    ? `<a class="btn btn--ghost" href="#/" style="color:#17202b;border-color:#cfc6b6">Annuleren</a>`
    : `<button class="btn btn--ghost" data-action="wiz-back" style="color:#17202b;border-color:#cfc6b6">Terug</button>`;
  const nextLabel = wizard.step === 4 ? "Bereken risico" : "Volgende";

  panel().innerHTML = `<div class="sheet">
    <p class="kicker" style="color:#a8843a">Intake-wizard · Deliveroo-toetsing</p>
    <h1 class="mt-0 mb-2 text-[32px]">${wizard.step === 0 ? "Wie huurt wie in?" : escapeHtml(PILLARS[wizard.step - 1].title)}</h1>
    <p class="muted mt-0">${wizard.step === 0 ? "Eerst de partijen. Daarna de twaalf indicatoren, per pijler." : escapeHtml(PILLARS[wizard.step - 1].blurb)}</p>
    ${stepper}
    ${body}
    <div class="actions">
      ${back}
      <button class="btn" data-action="wiz-next">${nextLabel}</button>
    </div>
  </div>`;
}

function partyForm() {
  const og = wizard.dossier.opdrachtgever;
  const zzp = wizard.dossier.zzp;
  const sectorOptions = SECTORS.map(
    (item) => `<option ${item === og.sector ? "selected" : ""}>${escapeHtml(item)}</option>`,
  ).join("");
  return `<div class="grid gap-8 md:grid-cols-2">
    <fieldset class="m-0 p-0 border-0">
      <legend class="font-serif text-[20px] mb-3">Opdrachtgever</legend>
      <div class="form-grid">
        ${field("og-bedrijfsnaam", "Bedrijfsnaam", og.bedrijfsnaam, "text", "required")}
        ${field("og-kvk", "KvK-nummer", og.kvk)}
        ${field("og-contact", "Contactpersoon", og.contact)}
        ${field("og-email", "E-mail", og.email, "email")}
        <label class="field">
          <span>Sector</span>
          <select name="og-sector">${sectorOptions}</select>
        </label>
      </div>
    </fieldset>
    <fieldset class="m-0 p-0 border-0">
      <legend class="font-serif text-[20px] mb-3">Zzp’er / opdrachtnemer</legend>
      <div class="form-grid">
        ${field("zzp-naam", "Naam", zzp.naam, "text", "required")}
        ${field("zzp-kvk", "KvK-nummer", zzp.kvk)}
        ${field("zzp-beroep", "Beroep / discipline", zzp.beroep)}
        ${field("zzp-uurtarief", "Uurtarief excl. btw", zzp.uurtarief, "number", "min=0 step=1")}
        ${field("zzp-email", "E-mail", zzp.email, "email")}
        ${field("zzp-telefoon", "Telefoon (WhatsApp)", zzp.telefoon, "tel")}
      </div>
    </fieldset>
  </div>`;
}

function pillarForm(pillar) {
  const questions = QUESTIONS.filter((item) => item.pillar === pillar.id);
  return questions
    .map(
      (question) => `<article class="q-block">
        <p class="kicker" style="color:#a8843a">${escapeHtml(question.id.toUpperCase())} · ${escapeHtml(pillar.legal)}</p>
        <h2>${escapeHtml(question.title)}</h2>
        <p class="help">${escapeHtml(question.help)}</p>
        ${choiceList(question.id, question.options, wizard.dossier.answers[question.id])}
      </article>`,
    )
    .join("");
}

function renderResult(id) {
  const dossier = store.getDossier(id);
  if (!dossier) {
    panel().innerHTML = `<div class="sheet"><p>Dossier niet gevonden.</p><a href="#/dashboard">Terug naar dashboard</a></div>`;
    return;
  }
  const assessment = assess(dossier.answers);
  const copy = RISK_COPY[assessment.level];
  const clauses = remedialClauses(dossier.answers);
  const matrix = answerMatrix(dossier.answers);
  const bars = PILLARS.map((pillar) => {
    const pct = Math.round(assessment.pillars[pillar.id].ratio * 100);
    return `<div class="bar">
      <span>${escapeHtml(pillar.title)}</span>
      <i><em style="width:${pct}%"></em></i>
      <span>${pct}%</span>
    </div>`;
  }).join("");

  const clauseHtml = clauses
    .map(
      (item) => `<li>
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.body)}</span>
      </li>`,
    )
    .join("");

  const answersHtml = matrix
    .map(
      (row) => `<tr>
        <td>${escapeHtml(row.title)}</td>
        <td><span class="badge badge--${row.risk >= 0.75 ? "rood" : row.risk >= 0.4 ? "oranje" : "groen"}">${escapeHtml(row.label)}</span></td>
      </tr>`,
    )
    .join("");

  panel().innerHTML = `<div class="sheet">
    <p class="kicker" style="color:#a8843a">Dossier ${escapeHtml(dossier.id)}</p>
    <div class="result-hero">
      ${traffic(assessment.level)}
      <div>
        <p class="badge badge--${assessment.level}">${copy.kicker}</p>
        <h1 class="mt-3 mb-2 text-[36px]">${escapeHtml(copy.title)}</h1>
        <p class="score-num">${assessment.score}<span class="text-[18px] text-[#5d6673]"> / 100</span></p>
        <p>${escapeHtml(copy.summary)}</p>
        <p class="muted">${escapeHtml(copy.advice)}</p>
        <p class="muted mt-2">${escapeHtml(dossier.opdrachtgever.bedrijfsnaam)} · ${escapeHtml(dossier.zzp.naam)} · ${escapeHtml(dossier.zzp.beroep || "zzp")}</p>
      </div>
    </div>
    <div class="pillars-bars mb-8">${bars}</div>
    <div class="grid gap-8 md:grid-cols-2">
      <div>
        <h2 class="mt-0">Aanpassingsclausules</h2>
        <p class="muted">Deze teksten gaan de overeenkomst in. Bij rood: eerst de feiten wijzigen.</p>
        <ul class="clause-list">${clauseHtml}</ul>
      </div>
      <div>
        <h2 class="mt-0">Antwoorden</h2>
        <table class="ledger" style="color:#17202b">
          <thead><tr><th>Indicator</th><th>Keuze</th></tr></thead>
          <tbody>${answersHtml}</tbody>
        </table>
      </div>
    </div>
    <div class="actions flex-wrap">
      <a class="btn btn--ghost" href="#/dashboard" style="color:#17202b;border-color:#cfc6b6">Dashboard</a>
      <div class="flex flex-wrap gap-2">
        <button class="btn btn--ghost" data-action="preview" data-id="${dossier.id}" data-kind="ftd" style="color:#17202b;border-color:#cfc6b6">Voorbeeld dossier</button>
        <button class="btn btn--ghost" data-action="pdf-ftd" data-id="${dossier.id}" style="color:#17202b;border-color:#cfc6b6">PDF toetsingsdossier</button>
        <button class="btn" data-action="pdf-ovo" data-id="${dossier.id}">PDF overeenkomst</button>
      </div>
    </div>
  </div>`;
}

function renderDashboard() {
  const dossiers = store.listDossiers();
  const visible = dashFilter === "alle" ? dossiers : dossiers.filter((item) => (item.level || assess(item.answers).level) === dashFilter || item.status === dashFilter);
  const groene = dossiers.filter((item) => assess(item.answers).level === "groen").length;
  const her = dossiers.filter((item) => item.status === "herbeoordelen").length;

  const rows = visible
    .map((item) => {
      const assessment = assess(item.answers);
      return `<tr>
        <td>
          <strong>${escapeHtml(item.zzp?.naam || "Naamloos")}</strong>
          <div class="muted text-[12px]">${escapeHtml(item.opdrachtgever?.bedrijfsnaam || "")} · ${escapeHtml(item.zzp?.beroep || "")}</div>
        </td>
        <td><span class="badge badge--${assessment.level}">${assessment.level} · ${assessment.score}</span></td>
        <td>${escapeHtml(STATUSES.find((row) => row.id === item.status)?.label || item.status)}</td>
        <td>${new Date(item.updatedAt).toLocaleDateString("nl-NL")}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" data-action="open" data-id="${item.id}" title="Openen"><i data-lucide="folder-open"></i></button>
            <button class="icon-btn" data-action="invite-wa" data-id="${item.id}" title="WhatsApp"><i data-lucide="message-circle"></i></button>
            <button class="icon-btn" data-action="invite-mail" data-id="${item.id}" title="E-mail"><i data-lucide="mail"></i></button>
            <button class="icon-btn" data-action="status" data-id="${item.id}" title="Status"><i data-lucide="refresh-cw"></i></button>
            <button class="icon-btn" data-action="pdf-ovo" data-id="${item.id}" title="PDF"><i data-lucide="file-text"></i></button>
          </div>
        </td>
      </tr>`;
    })
    .join("");

  const empty = `<div class="empty">
    <h2 class="mt-0">Nog geen zzp-dossiers.</h2>
    <p class="muted">Start een toetsing of laad de drie ijkzaken (groen, oranje, rood) om het dashboard te vullen.</p>
    <div class="hero-actions">
      <a class="btn" href="#/toetsing?nieuw=1">Nieuwe toetsing</a>
      <button class="btn btn--ghost" data-action="load-demos">Laad voorbeeldzaken</button>
    </div>
  </div>`;

  panel().innerHTML = `
    <p class="kicker">MKB-opdrachtgevers</p>
    <div class="section-head" style="padding:0">
      <h1 class="mt-0 mb-0 text-[36px] font-serif">Dossierbeheer</h1>
      <div class="hero-actions">
        <a class="btn" href="#/toetsing?nieuw=1">Nieuwe zzp’er toetsen</a>
        <button class="btn btn--ghost" data-action="load-demos">Voorbeeldzaken</button>
      </div>
    </div>
    <div class="stats">
      <div class="stat"><b>${dossiers.length}</b><span>Dossiers in deze browser</span></div>
      <div class="stat"><b>${groene}</b><span>Groen — laag risico</span></div>
      <div class="stat"><b>${her}</b><span>Te herbeoordelen</span></div>
      <div class="stat"><b>${store.listLeads().length}</b><span>Quick Scan-leads</span></div>
    </div>
    <div class="filter-row">
      ${["alle", "groen", "oranje", "rood", "actief", "herbeoordelen", "afgerond"]
        .map((item) => `<button class="chip ${dashFilter === item ? "is-on" : ""}" data-action="filter" data-filter="${item}">${item}</button>`)
        .join("")}
    </div>
    ${
      dossiers.length === 0
        ? empty
        : `<div class="overflow-x-auto"><table class="ledger">
            <thead><tr><th>Zzp’er</th><th>Stoplicht</th><th>Status</th><th>Bijgewerkt</th><th></th></tr></thead>
            <tbody>${rows || `<tr><td colspan="5">Geen dossiers in dit filter.</td></tr>`}</tbody>
          </table></div>`
    }
  `;
}

function renderLegal() {
  panel().innerHTML = `<div class="sheet">
    <p class="kicker" style="color:#a8843a">Maatstaf</p>
    <h1 class="mt-0 text-[36px]">Waar de engine op toetst</h1>
    <p>De applicatie volgt de holistische toets van de Hoge Raad. Geen enkel kenmerk is doorslaggevend; gezag en inbedding wegen zwaar.</p>
    <blockquote class="legal-cite">
      HR 24 maart 2023, ECLI:NL:HR:2023:443 (Deliveroo). Alle omstandigheden van het geval, in onderling verband.
    </blockquote>
    <blockquote class="legal-cite">
      Art. 7:610 BW: arbeid, loon, en gezag. Ontbreekt gezag in de feiten, dan is er geen arbeidsovereenkomst — ook niet als het contract dat woord vermijdt.
    </blockquote>
    <blockquote class="legal-cite">
      Wet DBA en het handhavingsplan arbeidsrelaties van de Belastingdienst: vanaf 2025/2026 wordt gehandhaafd, met naheffing loonheffing als de relatie een (fictieve) dienstbetrekking is.
    </blockquote>
    <p>Het richttarief van €38 excl. btw is het rechtsvermoeden-ondernemerschap in dit model. Daaronder moet zelfstandigheid extra aannemelijk zijn. Daarboven is geen vrijwaring.</p>
    <p class="muted">Deze tool geeft geen zekerheid vooraf. Bewaar het toetsingsdossier met tijdstempel bij de administratie.</p>
  </div>`;
}

function collectParty() {
  const root = panel();
  const val = (name) => root.querySelector(`[name="${name}"]`)?.value?.trim() || "";
  wizard.dossier.opdrachtgever = {
    bedrijfsnaam: val("og-bedrijfsnaam"),
    kvk: val("og-kvk"),
    contact: val("og-contact"),
    email: val("og-email"),
    sector: val("og-sector"),
  };
  wizard.dossier.zzp = {
    naam: val("zzp-naam"),
    kvk: val("zzp-kvk"),
    beroep: val("zzp-beroep"),
    uurtarief: val("zzp-uurtarief"),
    email: val("zzp-email"),
    telefoon: val("zzp-telefoon"),
  };
}

function collectAnswers(form) {
  const data = {};
  form.querySelectorAll("input[type=radio]:checked").forEach((input) => {
    data[input.name] = input.value;
  });
  return data;
}

function finishWizard() {
  const assessment = assess(wizard.dossier.answers);
  if (!assessment.complete) {
    toast("Beantwoord alle vragen van deze pijler.");
    return false;
  }
  const saved = store.saveDossier({
    ...wizard.dossier,
    level: assessment.level,
    score: assessment.score,
    status: assessment.level === "rood" ? "herbeoordelen" : "actief",
  });
  location.hash = `#/resultaat/${saved.id}`;
  return true;
}

function loadDemos() {
  Object.entries(SCENARIOS).forEach(([level, scenario]) => {
    store.saveDossier({
      id: `demo-${level}`,
      status: level === "rood" ? "herbeoordelen" : level === "oranje" ? "actief" : "afgerond",
      answers: scenario.answers,
      opdrachtgever: scenario.party.opdrachtgever,
      zzp: scenario.party.zzp,
      level,
      score: assess(scenario.answers).score,
    });
  });
  toast("Drie ijkzaken geladen.");
  renderDashboard();
  icons();
}

function inviteUrl(id) {
  return `${location.origin}${location.pathname}#/toetsing?invite=${encodeURIComponent(id)}`;
}

function inviteWhatsApp(dossier) {
  const url = inviteUrl(dossier.id);
  const text = `Beste ${dossier.zzp.naam || "ondernemer"},

Voor onze inhuur onder de Wet DBA vragen wij je de intake in DBA Dossier in te vullen, vóór aanvang van de opdracht.

${url}

Met vriendelijke groet,
${dossier.opdrachtgever.contact || dossier.opdrachtgever.bedrijfsnaam || "Opdrachtgever"}`;
  const digits = String(dossier.zzp.telefoon || "").replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `31${digits.slice(1)}` : digits;
  const base = intl ? `https://wa.me/${intl}` : "https://wa.me/";
  window.open(`${base}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
}

function inviteMail(dossier) {
  const url = inviteUrl(dossier.id);
  const subject = `Intake Wet DBA — ${dossier.opdrachtgever.bedrijfsnaam || "opdracht"}`;
  const body = `Beste ${dossier.zzp.naam || "ondernemer"},

Vul de DBA-intake in via:
${url}

Met vriendelijke groet,
${dossier.opdrachtgever.contact || ""}`;
  const to = dossier.zzp.email || "";
  window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function cycleStatus(dossier) {
  const order = STATUSES.map((item) => item.id);
  const next = order[(order.indexOf(dossier.status) + 1) % order.length];
  store.setStatus(dossier.id, next);
  toast(`Status: ${STATUSES.find((item) => item.id === next).label}`);
  renderDashboard();
  icons();
}

async function handlePdf(id, kind) {
  const dossier = store.getDossier(id);
  if (!dossier) return toast("Dossier ontbreekt.");
  const assessment = assess(dossier.answers);
  toast("PDF wordt opgemaakt…");
  try {
    const name = kind === "ovo" ? await exportContractPdf(dossier, assessment) : await exportDossierPdf(dossier, assessment);
    toast(`Gedownload: ${name}`);
  } catch (error) {
    console.error(error);
    toast("PDF-export mislukt. Controleer of jsPDF is geladen.");
  }
}

function showPreview(id, kind) {
  const dossier = store.getDossier(id);
  if (!dossier) return;
  const assessment = assess(dossier.answers);
  preview = document.createElement("div");
  preview.className = "preview-modal";
  preview.innerHTML = `${previewHtml(dossier, assessment, kind)}
    <div class="max-w-[210mm] mx-auto flex gap-2 justify-end">
      <button class="btn btn--paper" data-action="close-preview">Sluiten</button>
    </div>`;
  document.body.appendChild(preview);
}

function closePreview() {
  preview?.remove();
  preview = null;
}

function route() {
  const { path, parts, query } = parseHash();
  setActiveNav(`/${parts[0] || ""}` === "/" ? "/" : `/${parts[0]}`);
  closePreview();

  if (path === "/" || path === "") {
    showLanding(true);
    icons();
    return;
  }

  showLanding(false);

  if (path === "/scan") {
    renderScan();
  } else if (path.startsWith("/toetsing")) {
    if (query.get("nieuw")) {
      wizard.dossier = blankDossier();
      wizard.step = 0;
    }
    if (query.get("invite")) {
      const existing = store.getDossier(query.get("invite"));
      if (existing) {
        wizard.dossier = structuredClone(existing);
        wizard.step = 0;
      }
    }
    const demoKey = query.get("demo");
    if (demoKey && SCENARIOS[demoKey]) {
      const scenario = SCENARIOS[demoKey];
      const saved = store.saveDossier({
        id: `demo-${demoKey}`,
        status: demoKey === "rood" ? "herbeoordelen" : demoKey === "oranje" ? "actief" : "afgerond",
        answers: scenario.answers,
        opdrachtgever: scenario.party.opdrachtgever,
        zzp: scenario.party.zzp,
        level: demoKey,
        score: assess(scenario.answers).score,
      });
      location.replace(`#/resultaat/${saved.id}`);
      return;
    }
    renderWizard();
  } else if (parts[0] === "resultaat" && parts[1]) {
    renderResult(parts[1]);
  } else if (path === "/dashboard") {
    renderDashboard();
  } else if (path === "/juridisch") {
    renderLegal();
  } else {
    panel().innerHTML = `<div class="sheet"><p>Pagina niet gevonden.</p><a href="#/">Naar start</a></div>`;
  }
  icons();
}

document.addEventListener("change", (event) => {
  const target = event.target;
  if (target.matches(".choice input")) {
    target.closest(".choice")?.parentElement.querySelectorAll(".choice").forEach((node) => node.classList.remove("is-on"));
    target.closest(".choice")?.classList.add("is-on");
    if (target.name.startsWith("q")) wizard.dossier.answers[target.name] = target.value;
    if (target.name.startsWith("qs")) scan.answers[target.name] = target.value;
  }
});

document.addEventListener("click", async (event) => {
  const btn = event.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === "scan-submit") {
    event.preventDefault();
    if (Object.keys(scan.answers).length < QUICK_SCAN.length) {
      toast("Beantwoord de vier vragen.");
      return;
    }
    const form = document.getElementById("lead-form");
    if (form && !form.reportValidity()) return;
    scan.lead = {
      bedrijf: form.bedrijf.value.trim(),
      naam: form.naam.value.trim(),
      email: form.email.value.trim(),
    };
    scan.result = assessQuick(scan.answers);
    store.saveLead({ ...scan.lead, score: scan.result.score, level: scan.result.level });
    renderScan();
    icons();
  }

  if (action === "wiz-back") {
    collectParty();
    wizard.step = Math.max(0, wizard.step - 1);
    renderWizard();
    icons();
  }

  if (action === "wiz-next") {
    if (wizard.step === 0) {
      collectParty();
      if (!wizard.dossier.opdrachtgever.bedrijfsnaam || !wizard.dossier.zzp.naam) {
        toast("Bedrijfsnaam opdrachtgever en naam zzp’er zijn verplicht.");
        return;
      }
      wizard.step = 1;
      renderWizard();
      icons();
      return;
    }
    const formQuestions = QUESTIONS.filter((item) => item.pillar === PILLARS[wizard.step - 1].id);
    const missing = formQuestions.some((item) => !wizard.dossier.answers[item.id]);
    if (missing) {
      toast("Beantwoord alle vragen van deze pijler.");
      return;
    }
    if (wizard.step === 4) {
      finishWizard();
      return;
    }
    wizard.step += 1;
    renderWizard();
    icons();
  }

  if (action === "load-demos") loadDemos();
  if (action === "filter") {
    dashFilter = btn.dataset.filter;
    renderDashboard();
    icons();
  }
  if (action === "open") location.hash = `#/resultaat/${id}`;
  if (action === "invite-wa") {
    const dossier = store.getDossier(id);
    if (dossier) inviteWhatsApp(dossier);
  }
  if (action === "invite-mail") {
    const dossier = store.getDossier(id);
    if (dossier) inviteMail(dossier);
  }
  if (action === "status") {
    const dossier = store.getDossier(id);
    if (dossier) cycleStatus(dossier);
  }
  if (action === "pdf-ovo") await handlePdf(id, "ovo");
  if (action === "pdf-ftd") await handlePdf(id, "ftd");
  if (action === "preview") showPreview(id, btn.dataset.kind || "ftd");
  if (action === "close-preview") closePreview();
});

window.addEventListener("hashchange", () => {
  if (!location.hash.startsWith("#/toetsing")) wizard.step = 0;
  route();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closePreview();
});

route();
