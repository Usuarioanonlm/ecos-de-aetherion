import type { Stats } from "../content";

export type DamageType = "physical" | "magical";
export type StatusKind = "poison" | "burn" | "slow" | "stun" | "curse";

export type StatusEffect = {
  kind: StatusKind;
  remaining: number;
  duration: number;
  potency: number;
  accumulatedDamage?: number;
  sourceId?: string;
};

export type Cooldowns = {
  attack: number;
  skill: number;
  dodge: number;
};

export type CombatStats = Stats & {
  physicalAttack: number;
  magicAttack: number;
  defense: number;
  magicDefense: number;
  critChance: number;
  dodgeChance: number;
  blockChance: number;
  minDamage: number;
  maxDamage: number;
  reduction: number;
  speed: number;
};

export type Combatant = {
  id: string;
  health: number;
  maxHealth: number;
  stats: CombatStats;
  statuses?: StatusEffect[];
};

export type DamageEvent = {
  sourceId: string;
  targetId: string;
  amount: number;
  damageType: DamageType;
  critical: boolean;
  blocked: boolean;
  dodged: boolean;
  status?: StatusEffect;
};

export type CombatResult = {
  hit: boolean;
  damage: number;
  critical: boolean;
  blocked: boolean;
  dodged: boolean;
  defeated: boolean;
  events: DamageEvent[];
  cooldowns: Cooldowns;
  status?: StatusEffect;
  message?: string;
};

export type HealingResult = {
  amount: number;
  health: number;
  overheal: number;
};

export type DeathEvent = {
  sourceId: string;
  targetId: string;
  kind: "enemy" | "player";
  xp?: number;
  gold?: number;
};

export const createCooldowns = (): Cooldowns => ({
  attack: 0,
  skill: 0,
  dodge: 0,
});

export const tickCooldowns = (
  cooldowns: Cooldowns,
  delta: number
): Cooldowns => ({
  attack: Math.max(0, cooldowns.attack - delta),
  skill: Math.max(0, cooldowns.skill - delta),
  dodge: Math.max(0, cooldowns.dodge - delta),
});

export const deriveCombatStats = (
  stats: Stats,
  level = 1,
  speed = 1
): CombatStats => {
  const minDamage = Math.max(1, Math.floor(stats.power * 0.55 + level));
  const maxDamage = Math.max(
    minDamage,
    Math.floor(stats.power * 1.1 + level * 2)
  );
  const defense = stats.vitality * 1.5 + stats.resolve;
  const magicDefense = stats.ether + stats.resolve * 1.5;
  return {
    ...stats,
    physicalAttack: Math.round(6 + stats.power * 1.8 + level),
    magicAttack: Math.round(6 + stats.ether * 1.8 + level),
    defense,
    magicDefense,
    critChance: Math.min(0.45, 0.05 + stats.agility * 0.008),
    dodgeChance: Math.min(0.35, 0.025 + stats.agility * 0.006),
    blockChance: Math.min(0.35, 0.025 + stats.resolve * 0.007),
    minDamage,
    maxDamage,
    reduction: Math.min(0.68, defense / (defense + 100)),
    speed,
  };
};

export const createCombatant = (
  id: string,
  health: number,
  maxHealth: number,
  stats: CombatStats,
  statuses?: StatusEffect[]
): Combatant => ({ id, health, maxHealth, stats, statuses });
