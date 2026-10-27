import type { ItemModifiers } from "../items";

export type ProgressionState = {
  level: number;
  experience: number;
  baseStats: {
    vitality: number;
    power: number;
    ether: number;
    agility: number;
    resolve: number;
  };
};

export type DerivedStats = ProgressionState["baseStats"] & {
  attack: number;
  defense: number;
  magicAttack: number;
  speed: number;
  criticalChance: number;
  evasion: number;
  maxHealth: number;
  maxFocus: number;
};

export type ExperienceResult = {
  state: ProgressionState;
  gained: number;
  levelsGained: number;
  previousLevel: number;
  nextLevel: number;
  experienceToNext: number;
};

export const experienceRequired = (level: number) => Math.max(1, level * 40);

export const createProgression = (
  baseStats: ProgressionState["baseStats"],
  level = 1,
  experience = 0
): ProgressionState => ({
  level: Math.max(1, Math.floor(level)),
  experience: Math.max(0, Math.floor(experience)),
  baseStats: { ...baseStats },
});

export const grantExperience = (
  source: ProgressionState,
  amount: number
): ExperienceResult => {
  const gained = Math.max(0, Math.floor(amount));
  const state: ProgressionState = {
    ...source,
    baseStats: { ...source.baseStats },
    experience: source.experience + gained,
  };
  const previousLevel = state.level;
  while (state.experience >= experienceRequired(state.level)) {
    state.experience -= experienceRequired(state.level);
    state.level += 1;
  }
  return {
    state,
    gained,
    levelsGained: state.level - previousLevel,
    previousLevel,
    nextLevel: state.level,
    experienceToNext: experienceRequired(state.level) - state.experience,
  };
};

export const getDerivedStats = (
  state: ProgressionState,
  modifiers: ItemModifiers = {}
): DerivedStats => {
  const vitality = state.baseStats.vitality + (modifiers.vitality ?? 0);
  const power = state.baseStats.power + (modifiers.power ?? 0);
  const ether = state.baseStats.ether + (modifiers.ether ?? 0);
  const agility = state.baseStats.agility + (modifiers.agility ?? 0);
  const resolve = state.baseStats.resolve + (modifiers.resolve ?? 0);
  return {
    vitality,
    power,
    ether,
    agility,
    resolve,
    attack: power + state.level + (modifiers.attack ?? 0),
    defense:
      Math.floor(vitality / 2) +
      Math.floor(resolve / 3) +
      (modifiers.defense ?? 0),
    magicAttack: ether + state.level + (modifiers.magicAttack ?? 0),
    speed: Math.max(1, agility + (modifiers.speed ?? 0)),
    criticalChance: Math.min(
      0.75,
      0.03 + agility * 0.005 + (modifiers.criticalChance ?? 0)
    ),
    evasion: Math.min(0.5, agility * 0.008 + (modifiers.evasion ?? 0)),
    maxHealth: 70 + vitality * 7 + state.level * 4 + (modifiers.maxHealth ?? 0),
    maxFocus: 100 + ether * 3 + state.level * 2 + (modifiers.maxFocus ?? 0),
  };
};

export type Recommendation = "abaixo" | "equilibrado" | "acima";

export const recommendLevel = (
  playerLevel: number,
  recommendedLevel: number
): Recommendation => {
  const delta = playerLevel - recommendedLevel;
  if (delta <= -2) return "acima";
  if (delta >= 2) return "abaixo";
  return "equilibrado";
};

export const levelProgress = (state: ProgressionState) => ({
  current: state.experience,
  required: experienceRequired(state.level),
  percent: Math.min(
    100,
    Math.round((state.experience / experienceRequired(state.level)) * 100)
  ),
});
