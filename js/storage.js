const KEY = "dba-dossier-ai.v1";

function empty() {
  return { dossiers: [], leads: [] };
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    return {
      dossiers: Array.isArray(parsed.dossiers) ? parsed.dossiers : [],
      leads: Array.isArray(parsed.leads) ? parsed.leads : [],
    };
  } catch {
    return empty();
  }
}

function write(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
  return state;
}

export function uid(prefix = "dos") {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export const store = {
  all() {
    return read();
  },

  listDossiers() {
    return read().dossiers.slice().sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  },

  getDossier(id) {
    return read().dossiers.find((item) => item.id === id) || null;
  },

  saveDossier(dossier) {
    const state = read();
    const now = new Date().toISOString();
    const next = {
      status: "actief",
      answers: {},
      opdrachtgever: {},
      zzp: {},
      ...dossier,
      id: dossier.id || uid(),
      updatedAt: now,
      createdAt: dossier.createdAt || now,
    };
    const index = state.dossiers.findIndex((item) => item.id === next.id);
    if (index >= 0) state.dossiers[index] = { ...state.dossiers[index], ...next };
    else state.dossiers.push(next);
    write(state);
    return next;
  },

  setStatus(id, status) {
    const dossier = this.getDossier(id);
    if (!dossier) return null;
    return this.saveDossier({ ...dossier, status });
  },

  removeDossier(id) {
    const state = read();
    state.dossiers = state.dossiers.filter((item) => item.id !== id);
    write(state);
  },

  saveLead(lead) {
    const state = read();
    const next = {
      id: uid("lead"),
      createdAt: new Date().toISOString(),
      ...lead,
    };
    state.leads.unshift(next);
    write(state);
    return next;
  },

  listLeads() {
    return read().leads;
  },
};

export const STATUSES = [
  { id: "actief", label: "Actief" },
  { id: "herbeoordelen", label: "Te herbeoordelen" },
  { id: "afgerond", label: "Afgerond" },
];
