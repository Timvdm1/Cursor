import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SCENARIOS } from "../js/questions.js";
import { assess, assessQuick } from "../js/scoring.js";

describe("stoplichtmodel — ijksituaties", () => {
  it("echte zelfstandige (eigen middelen, hoog tarief, vervangbaar) → groen", () => {
    const result = assess(SCENARIOS.groen.answers);
    assert.equal(result.level, "groen");
    assert.ok(result.score < 35, `verwacht < 35, kreeg ${result.score}`);
    assert.ok(result.flags.includes("klassiek-zelfstandig"));
  });

  it("twijfelgeval (kantoor, geen eigen middelen) → oranje", () => {
    const result = assess(SCENARIOS.oranje.answers);
    assert.equal(result.level, "oranje");
    assert.ok(result.score >= 35 && result.score < 65, `verwacht 35–64, kreeg ${result.score}`);
  });

  it("schijnzelfstandige (gezag, laag tarief, kernactiviteit) → rood", () => {
    const result = assess(SCENARIOS.rood.answers);
    assert.equal(result.level, "rood");
    assert.ok(result.score >= 65, `verwacht ≥ 65, kreeg ${result.score}`);
    assert.ok(result.flags.includes("gezag-inbedding"));
  });
});

describe("holistische veto's", () => {
  it("zwaar gezag alleen tilt minstens naar oranje", () => {
    const answers = { ...SCENARIOS.groen.answers, q1: "c", q2: "c", q3: "c" };
    const result = assess(answers);
    assert.ok(result.score >= 48);
    assert.notEqual(result.level, "groen");
  });

  it("quick scan volgt dezelfde drie banden", () => {
    assert.equal(assessQuick({ qs1: "a", qs2: "a", qs3: "a", qs4: "a" }).level, "groen");
    assert.equal(assessQuick({ qs1: "b", qs2: "c", qs3: "b", qs4: "b" }).level, "oranje");
    assert.equal(assessQuick({ qs1: "c", qs2: "c", qs3: "c", qs4: "c" }).level, "rood");
  });
});
