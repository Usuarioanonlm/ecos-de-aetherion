import { describe, expect, it } from "vitest";
import {
  createProgression,
  experienceRequired,
  getDerivedStats,
  grantExperience,
  levelProgress,
  recommendLevel,
} from "./progression";

describe("progressão", () => {
  it("preserva o limiar level * 40", () => {
    expect(experienceRequired(1)).toBe(40);
    expect(experienceRequired(3)).toBe(120);
    const state = createProgression({
      vitality: 7,
      power: 6,
      ether: 5,
      agility: 5,
      resolve: 7,
    });
    const result = grantExperience(state, 39);
    expect(result.nextLevel).toBe(1);
    expect(result.state.experience).toBe(39);
    expect(levelProgress(result.state)).toMatchObject({
      current: 39,
      required: 40,
    });
  });

  it("processa vários níveis sem perder XP excedente", () => {
    const state = createProgression({
      vitality: 7,
      power: 6,
      ether: 5,
      agility: 5,
      resolve: 7,
    });
    const result = grantExperience(state, 40 + 80 + 120 + 17);
    expect(result.previousLevel).toBe(1);
    expect(result.nextLevel).toBe(4);
    expect(result.levelsGained).toBe(3);
    expect(result.state.experience).toBe(17);
  });

  it("deriva atributos a partir do nível e dos bônus equipados", () => {
    const state = createProgression(
      { vitality: 7, power: 6, ether: 5, agility: 5, resolve: 7 },
      3,
      12
    );
    const base = getDerivedStats(state);
    const boosted = getDerivedStats(state, {
      power: 2,
      defense: 3,
      maxHealth: 10,
      criticalChance: 0.1,
    });
    expect(boosted.attack).toBe(base.attack + 2);
    expect(boosted.defense).toBe(base.defense + 3);
    expect(boosted.maxHealth).toBe(base.maxHealth + 10);
    expect(boosted.criticalChance).toBeGreaterThan(base.criticalChance);
  });

  it("recomenda conteúdo equilibrado sem números explosivos", () => {
    expect(recommendLevel(1, 4)).toBe("acima");
    expect(recommendLevel(4, 4)).toBe("equilibrado");
    expect(recommendLevel(8, 4)).toBe("abaixo");
  });
});
