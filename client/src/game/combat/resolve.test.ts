import { describe, expect, it } from "vitest";
import {
  applyStatus,
  heal,
  resolveDamage,
  resolveDodge,
  resolveEnemyAttack,
  resolvePlayerAttack,
  resolveSkill,
  tickStatuses,
} from "./resolve";
import type { StatusEffect } from "./types";
import {
  createCombatant,
  createCooldowns,
  deriveCombatStats,
  tickCooldowns,
} from "./types";

const fighter = (id: string) =>
  createCombatant(id, 100, 100, {
    ...deriveCombatStats({
      vitality: 10,
      power: 10,
      ether: 10,
      agility: 10,
      resolve: 10,
    }),
    minDamage: 20,
    maxDamage: 20,
    critChance: 0,
    dodgeChance: 0,
    blockChance: 0,
    defense: 0,
    magicDefense: 0,
  });

describe("resolução de combate", () => {
  it("respeita dano mínimo/máximo e marca a morte sem mutar o alvo", () => {
    const attacker = fighter("player");
    const target = { ...fighter("enemy"), health: 10 };
    const result = resolveDamage(attacker, target, { random: () => 0.9 });
    expect(result.damage).toBe(20);
    expect(result.defeated).toBe(true);
    expect(target.health).toBe(10);
  });
  it("usa defesa física e defesa mágica separadamente", () => {
    const attacker = fighter("player");
    const target = fighter("enemy");
    target.stats.defense = 100;
    expect(
      resolveDamage(attacker, target, { baseDamage: 20, random: () => 0.9 })
        .damage
    ).toBe(10);
    expect(
      resolveDamage(attacker, target, {
        baseDamage: 20,
        damageType: "magical",
        random: () => 0.9,
      }).damage
    ).toBe(20);
  });
  it("distingue crítico, bloqueio e esquiva", () => {
    const attacker = fighter("player"),
      target = fighter("enemy");
    attacker.stats.critChance = 1;
    expect(
      resolveDamage(attacker, target, { baseDamage: 20, random: () => 0 })
        .damage
    ).toBe(33);
    target.stats.blockChance = 1;
    expect(
      resolveDamage(attacker, target, { baseDamage: 20, random: () => 0 })
        .blocked
    ).toBe(true);
    target.stats.dodgeChance = 1;
    const dodged = resolveDamage(attacker, target, {
      baseDamage: 20,
      random: () => 0,
    });
    expect(dodged.dodged).toBe(true);
    expect(dodged.damage).toBe(0);
  });
  it("mantém cooldowns de ataque, técnica e esquiva independentes", () => {
    const attacker = fighter("player"),
      target = fighter("enemy");
    const attack = resolvePlayerAttack(
      attacker,
      target,
      createCooldowns(),
      () => 0.9
    );
    expect(
      resolvePlayerAttack(attacker, target, attack.cooldowns, () => 0.9).hit
    ).toBe(false);
    const skill = resolveSkill(attacker, target, attack.cooldowns, {
      random: () => 0.9,
    });
    expect(skill.hit).toBe(true);
    expect(skill.cooldowns.attack).toBe(0.33);
    const dodge = resolveDodge(skill.cooldowns);
    expect(dodge.accepted).toBe(true);
    expect(dodge.cooldowns.skill).toBe(2.5);
    expect(resolveDodge(dodge.cooldowns).accepted).toBe(false);
    expect(tickCooldowns(dodge.cooldowns, 3)).toEqual(createCooldowns());
  });
  it("ataque mágico do inimigo usa poder mágico, não dano físico", () => {
    const attacker = fighter("enemy"),
      target = fighter("player");
    attacker.stats.magicAttack = 100;
    const physical = resolveEnemyAttack(attacker, target, createCooldowns(), {
      random: () => 0.9,
    });
    const magic = resolveEnemyAttack(attacker, target, createCooldowns(), {
      damageType: "magical",
      random: () => 0.9,
    });
    expect(magic.damage).toBeGreaterThan(physical.damage);
  });
  it("cura só até a vida máxima e calcula excesso", () => {
    expect(heal({ health: 95, maxHealth: 100 }, 25)).toEqual({
      health: 100,
      amount: 5,
      overheal: 20,
    });
    expect(heal({ health: 50, maxHealth: 100 }, -10).health).toBe(50);
  });
  it("dano contínuo é acumulado por tempo, não arredondado por frame", () => {
    let target: {
      health: number;
      maxHealth: number;
      statuses: StatusEffect[];
    } = {
      health: 100,
      maxHealth: 100,
      statuses: [
        { kind: "poison" as const, remaining: 1, duration: 1, potency: 2 },
      ],
    };
    for (let frame = 0; frame < 20; frame += 1) {
      const result = tickStatuses(target, 0.05);
      target = { ...target, health: result.health, statuses: result.statuses };
    }
    expect(target.health).toBe(98);
    expect(tickStatuses({ ...target, statuses: [] }, 0.1).damage).toBe(0);
  });
  it("renova um status da mesma espécie sem duplicá-lo", () => {
    const statuses = applyStatus(
      [{ kind: "burn", remaining: 4, duration: 4, potency: 1 }],
      { kind: "burn", remaining: 2, duration: 2, potency: 2 }
    );
    expect(statuses).toHaveLength(1);
    expect(statuses[0].remaining).toBe(4);
    expect(statuses[0].potency).toBe(2);
  });
});
