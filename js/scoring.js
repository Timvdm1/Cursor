import { QUESTIONS, PILLARS, TOTAL_WEIGHT, QUICK_SCAN } from "./questions.js";

const THRESHOLD_GREEN = 35;
const THRESHOLD_ORANGE = 65;

function optionFor(question, value) {
  return question.options.find((option) => option.value === value) || null;
}

export function pillarScore(answers, pillarId) {
  const items = QUESTIONS.filter((question) => question.pillar === pillarId);
  const weight = items.reduce((sum, question) => sum + question.weight, 0);
  const points = items.reduce((sum, question) => {
    const picked = optionFor(question, answers[question.id]);
    const risk = picked ? picked.risk : 0;
    return sum + risk * question.weight;
  }, 0);
  return {
    points,
    weight,
    ratio: weight ? points / weight : 0,
  };
}

export function baseScore(answers) {
  const points = QUESTIONS.reduce((sum, question) => {
    const picked = optionFor(question, answers[question.id]);
    const risk = picked ? picked.risk : 0;
    return sum + risk * question.weight;
  }, 0);
  return (points / TOTAL_WEIGHT) * 100;
}

/**
 * Holistische weging naar Deliveroo (HR 24 maart 2023, ECLI:NL:HR:2023:443).
 * Gezag en inbedding kunnen een ogenschijnlijk laag gewogen cijfer overrulen.
 */
export function assess(answers) {
  const pillars = Object.fromEntries(
    PILLARS.map((pillar) => [pillar.id, pillarScore(answers, pillar.id)]),
  );

  let score = baseScore(answers);
  const flags = [];

  const gezag = pillars.gezag.ratio;
  const inbedding = pillars.inbedding.ratio;
  const vervanging = pillars.vervanging.ratio;
  const ondernemerschap = pillars.ondernemerschap.ratio;

  if (gezag >= 0.75 && inbedding >= 0.7) {
    score = Math.max(score, 78);
    flags.push("gezag-inbedding");
  } else if (gezag >= 0.8) {
    score = Math.max(score, 48);
    flags.push("gezag-zwaar");
  }

  if (vervanging >= 0.85 && gezag >= 0.45) {
    score = Math.max(score, 52);
    flags.push("persoonlijke-arbeid");
  }

  if (ondernemerschap >= 0.7 && gezag >= 0.4) {
    score = Math.min(100, score + 6);
    flags.push("zwak-ondernemerschap");
  }

  if (gezag <= 0.3 && inbedding <= 0.35 && vervanging <= 0.35 && ondernemerschap <= 0.25) {
    score = Math.min(score, 28);
    flags.push("klassiek-zelfstandig");
  }

  score = Math.round(Math.max(0, Math.min(100, score)));

  let level = "groen";
  if (score >= THRESHOLD_ORANGE) level = "rood";
  else if (score >= THRESHOLD_GREEN) level = "oranje";

  const unanswered = QUESTIONS.filter((question) => !answers[question.id]).map((question) => question.id);

  return {
    score,
    level,
    flags,
    pillars,
    unanswered,
    complete: unanswered.length === 0,
  };
}

export function assessQuick(answers) {
  const weights = { qs1: 30, qs2: 28, qs3: 18, qs4: 24 };
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  const points = QUICK_SCAN.reduce((sum, question) => {
    const picked = question.options.find((option) => option.value === answers[question.id]);
    const risk = picked ? picked.risk : 0;
    return sum + risk * weights[question.id];
  }, 0);
  const score = Math.round((points / total) * 100);
  let level = "groen";
  if (score >= THRESHOLD_ORANGE) level = "rood";
  else if (score >= THRESHOLD_GREEN) level = "oranje";
  return { score, level, source: "quick" };
}

export const RISK_COPY = {
  groen: {
    title: "Laag risico",
    kicker: "Groen",
    summary:
      "De feiten wijzen op sterk ondernemerschap, beperkte gezagsuitoefening en ruimte voor vrije vervanging. Inhuur is onder deze inrichting verdedigbaar, mits de praktijk het contract volgt.",
    advice:
      "Leg de zelfstandigheid schriftelijk vast en toets jaarlijks of de feiten nog kloppen. Een groene score is geen ruling van de Belastingdienst.",
  },
  oranje: {
    title: "Middelmatig risico",
    kicker: "Oranje",
    summary:
      "Er zijn twijfelpunten. Zonder aanpassing van werkwijze én contract blijft de relatie kwetsbaar bij een holistische toetsing.",
    advice:
      "Pas de werksituatie aan vóór aanvang. Gebruik de voorgestelde clausules niet als vensterbekleding: de inspecteur kijkt naar de feiten.",
  },
  rood: {
    title: "Hoog risico op schijnzelfstandigheid",
    kicker: "Rood",
    summary:
      "Hoge kans op naheffing loonheffing, rente en mogelijke vergrijpboete. Een overeenkomst van opdracht dekt dit niet af zolang de feiten op dienstbetrekking wijzen.",
    advice:
      "Noodrem: herontwerp de opdracht, kies payroll/uitzend, of sluit een arbeidsovereenkomst. Start niet op de huidige voet.",
  },
};

export function answerMatrix(answers) {
  return QUESTIONS.map((question) => {
    const picked = optionFor(question, answers[question.id]);
    return {
      id: question.id,
      pillar: question.pillar,
      title: question.title,
      answer: picked ? picked.text : "Niet beantwoord",
      label: picked ? picked.label : "—",
      risk: picked ? picked.risk : null,
    };
  });
}
