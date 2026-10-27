import type {
  Combatant,
  CombatResult,
  Cooldowns,
  DamageType,
  HealingResult,
  StatusEffect,
  StatusKind,
} from "./types";

export type CombatRandom = () => number;

const defaultRandom: CombatRandom = () => Math.random();
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const cooldownResult = (
  cooldowns: Cooldowns,
  message: string
): CombatResult => ({
  hit: false,
  damage: 0,
  critical: false,
  blocked: false,
  dodged: false,
  defeated: false,
  events: [],
  cooldowns,
  message,
});

export const resolveDamage = (
  attacker: Combatant,
  target: Combatant,
  options: {
    damageType?: DamageType;
    baseDamage?: number;
    status?: { kind: StatusKind; duration: number; potency: number };
    random?: CombatRandom;
  } = {}
): Omit<CombatResult, "cooldowns"> => {
  const random = options.random ?? defaultRandom;
  const damageType = options.damageType ?? "physical";
  const attackPower =
    options.baseDamage ??
    Math.floor(
      attacker.stats.minDamage +
        random() * (attacker.stats.maxDamage - attacker.stats.minDamage + 1)
    );
  const defense =
    damageType === "magical" ? target.stats.magicDefense : target.stats.defense;
  const reduction = clamp(defense / (defense + 100), 0, 0.78);
  const critical = random() < attacker.stats.critChance;
  const blocked = random() < target.stats.blockChance;
  const dodged = random() < target.stats.dodgeChance;
  if (dodged) {
    return {
      hit: false,
      damage: 0,
      critical: false,
      blocked: false,
      dodged: true,
      defeated: false,
      events: [
        {
          sourceId: attacker.id,
          targetId: target.id,
          amount: 0,
          damageType,
          critical: false,
          blocked: false,
          dodged: true,
        },
      ],
    };
  }
  const criticalDamage = critical ? 1.65 : 1;
  const blockDamage = blocked ? 0.35 : 1;
  const amount = Math.max(
    1,
    Math.floor(attackPower * criticalDamage * blockDamage * (1 - reduction))
  );
  const status: StatusEffect | undefined = options.status
    ? {
        ...options.status,
        remaining: options.status.duration,
        sourceId: attacker.id,
      }
    : undefined;
  return {
    hit: true,
    damage: amount,
    critical,
    blocked,
    dodged: false,
    defeated: target.health - amount <= 0,
    events: [
      {
        sourceId: attacker.id,
        targetId: target.id,
        amount,
        damageType,
        critical,
        blocked,
        dodged: false,
        status,
      },
    ],
    status,
  };
};

export const resolvePlayerAttack = (
  attacker: Combatant,
  target: Combatant,
  cooldowns: Cooldowns,
  random?: CombatRandom
): CombatResult => {
  if (cooldowns.attack > 0)
    return cooldownResult(cooldowns, "Ataque ainda em recarga.");
  return {
    ...resolveDamage(attacker, target, { random }),
    cooldowns: { ...cooldowns, attack: 0.33 },
  };
};

export const resolveSkill = (
  attacker: Combatant,
  target: Combatant,
  cooldowns: Cooldowns,
  options: {
    random?: CombatRandom;
    status?: { kind: StatusKind; duration: number; potency: number };
  } = {}
): CombatResult => {
  if (cooldowns.skill > 0)
    return cooldownResult(cooldowns, "A habilidade ainda está em recarga.");
  const skillDamage = Math.max(2, attacker.stats.magicAttack * 0.72);
  return {
    ...resolveDamage(attacker, target, {
      damageType: "magical",
      baseDamage: skillDamage,
      status: options.status ?? { kind: "burn", duration: 3.5, potency: 1 },
      random: options.random,
    }),
    cooldowns: { ...cooldowns, skill: 2.5 },
  };
};

export const resolveEnemyAttack = (
  attacker: Combatant,
  target: Combatant,
  cooldowns: Cooldowns,
  options: {
    damageType?: DamageType;
    random?: CombatRandom;
    status?: { kind: StatusKind; duration: number; potency: number };
    cooldown?: number;
  } = {}
): CombatResult => {
  if (cooldowns.attack > 0)
    return cooldownResult(cooldowns, "A ameaça ainda se prepara.");
  return {
    ...resolveDamage(attacker, target, {
      damageType: options.damageType,
      baseDamage:
        options.damageType === "magical"
          ? attacker.stats.magicAttack * 0.72
          : undefined,
      status: options.status,
      random: options.random,
    }),
    cooldowns: {
      ...cooldowns,
      attack: options.cooldown ?? 1.2,
    },
  };
};

export const resolveDodge = (
  cooldowns: Cooldowns,
  cooldown = 1.1
): { accepted: boolean; cooldowns: Cooldowns } => {
  if (cooldowns.dodge > 0) return { accepted: false, cooldowns };
  return { accepted: true, cooldowns: { ...cooldowns, dodge: cooldown } };
};

export const heal = (
  target: Pick<Combatant, "health" | "maxHealth">,
  amount: number
): HealingResult => {
  const health = Math.min(
    target.maxHealth,
    target.health + Math.max(0, amount)
  );
  return {
    amount: health - target.health,
    health,
    overheal: Math.max(0, amount - (health - target.health)),
  };
};

export const applyStatus = (
  current: StatusEffect[] | undefined,
  next: StatusEffect
): StatusEffect[] => {
  const statuses = [...(current ?? [])];
  const index = statuses.findIndex(status => status.kind === next.kind);
  if (index < 0) statuses.push(next);
  else
    statuses[index] = {
      ...statuses[index],
      ...next,
      remaining: Math.max(statuses[index].remaining, next.remaining),
    };
  return statuses;
};

export const tickStatuses = (
  target: Pick<Combatant, "health" | "maxHealth"> & {
    statuses?: StatusEffect[];
  },
  delta: number
): {
  health: number;
  statuses: StatusEffect[];
  damage: number;
  messages: string[];
} => {
  let health = target.health;
  let damage = 0;
  const messages: string[] = [];
  const statuses: StatusEffect[] = [];
  for (const status of target.statuses ?? []) {
    const activeTime = Math.min(delta, status.remaining);
    if (
      status.kind === "poison" ||
      status.kind === "burn" ||
      status.kind === "curse"
    ) {
      const carried = status.accumulatedDamage ?? 0;
      const totalDamage = Math.max(0, status.potency * activeTime + carried);
      const tickDamage = Math.floor(totalDamage + 1e-9);
      health = Math.max(0, health - tickDamage);
      damage += tickDamage;
      if (tickDamage > 0)
        messages.push(
          status.kind === "curse"
            ? "Maldição"
            : status.kind === "burn"
              ? "Queimadura"
              : "Veneno"
        );
    }
    const remaining = status.remaining - delta;
    if (remaining > 0) {
      const carried = status.accumulatedDamage ?? 0;
      const totalDamage = Math.max(0, status.potency * activeTime + carried);
      statuses.push({
        ...status,
        remaining,
        accumulatedDamage: Math.max(
          0,
          totalDamage - Math.floor(totalDamage + 1e-9)
        ),
      });
    }
  }
  return {
    health: Math.min(target.maxHealth, health),
    statuses,
    damage,
    messages,
  };
};
