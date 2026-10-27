import { describe, expect, it } from "vitest";
import { bosses } from "../aetherionAtlas";
import { regions } from "../worldContent";
import {
  createEnemy,
  getEnemyDefinition,
  resetEnemyForRespawn,
} from "./catalog";
import { updateEnemyAi } from "./ai";
import { MAX_ACTIVE_ENEMIES, spawnEnemiesForRegion } from "./spawn";

const context = (
  player: {
    x: number;
    y: number;
    health?: number;
    maxHealth?: number;
    facing?: number;
  },
  delta = 0.016
) => ({
  delta,
  player: {
    x: player.x,
    y: player.y,
    health: player.health ?? 100,
    maxHealth: player.maxHealth ?? 100,
    facing: player.facing,
  },
  isBlocked: () => false,
  minX: -100,
  maxX: 100,
  minY: -100,
  maxY: 100,
});

describe("IA e ciclo de vida dos inimigos", () => {
  it("inicia telegraph somente sem cooldown, completa uma vez e respeita a animação/cooldown", () => {
    const definition = getEnemyDefinition("wolf");
    const enemy = createEnemy("wolf-1", "wolf", 0, 0);

    enemy.cooldowns!.attack = definition.attackCooldown;
    expect(updateEnemyAi(enemy, definition, context({ x: 0.5, y: 0 }))).toEqual(
      {
        type: "none",
      }
    );
    expect(enemy.telegraph).toBe("");

    enemy.cooldowns!.attack = 0;
    const telegraph = updateEnemyAi(
      enemy,
      definition,
      context({ x: 0.5, y: 0 })
    );
    expect(telegraph.type).toBe("telegraph");
    expect(enemy.telegraph).toBe("attack");

    const attack = updateEnemyAi(
      enemy,
      definition,
      context({ x: 0.5, y: 0 }, 0.4)
    );
    expect(attack.type).toBe("attack");
    expect(enemy.telegraph).toBe("");

    // This models the core's resolver result: both fields are now busy.
    enemy.attack = 0.35;
    enemy.cooldowns!.attack = definition.attackCooldown;
    expect(updateEnemyAi(enemy, definition, context({ x: 0.5, y: 0 }))).toEqual(
      {
        type: "none",
      }
    );
  });

  it("cancela o windup quando o jogador sai do alcance de conclusão", () => {
    const definition = getEnemyDefinition("wolf");
    const enemy = createEnemy("wolf-2", "wolf", 0, 0);
    const first = updateEnemyAi(enemy, definition, context({ x: 0.5, y: 0 }));
    expect(first.type).toBe("telegraph");

    const cancelled = updateEnemyAi(
      enemy,
      definition,
      context({ x: 1.4, y: 0 })
    );
    expect(cancelled.type).toBe("none");
    expect(enemy.telegraph).toBe("");
    expect(enemy.aiState).toBe("chase");
  });

  it("mantém fuga sem bloquear movimento e limita o feedback a aproximadamente dois segundos", () => {
    const definition = getEnemyDefinition("esqueleto");
    const enemy = createEnemy("flee-1", "goblin", 0, 0, 4, {
      definitionId: "esqueleto",
    });
    enemy.health = enemy.maxHealth * 0.2;

    const first = updateEnemyAi(enemy, definition, context({ x: 1, y: 0 }));
    expect(first).toMatchObject({ type: "telegraph", duration: 2 });
    const afterFirst = { x: enemy.x, y: enemy.y };

    const second = updateEnemyAi(
      enemy,
      definition,
      context({ x: 1, y: 0 }, 0.1)
    );
    expect(second.type).toBe("none");
    expect(enemy.x !== afterFirst.x || enemy.y !== afterFirst.y).toBe(true);
  });

  it("latcheia retorno até ficar a menos de meio tile e regenera 2 HP/s longe do jogador", () => {
    const definition = getEnemyDefinition("wolf");
    const enemy = createEnemy("return-1", "wolf", 0, 0);
    enemy.x = definition.leashRange + 1;
    enemy.health = 5;

    updateEnemyAi(enemy, definition, context({ x: 30, y: 0 }, 0.5));
    expect(enemy.aiState).toBe("return");
    expect(enemy.health).toBe(6);

    enemy.x = 0.6;
    updateEnemyAi(enemy, definition, context({ x: 30, y: 0 }, 0.1));
    expect(enemy.aiState).toBe("return");

    enemy.x = 0.4;
    updateEnemyAi(enemy, definition, context({ x: 30, y: 0 }, 0.1));
    expect(enemy.x).toBe(0);
    expect(enemy.aiState).toBe("idle");
  });

  it("cura 8% uma vez e não deixa o core duplicar o valor", () => {
    const definition = getEnemyDefinition("troll");
    const enemy = createEnemy("healer-1", "boar", 0, 0, 5, {
      definitionId: "troll",
    });
    enemy.health = enemy.maxHealth * 0.2;
    const before = enemy.health;

    const action = updateEnemyAi(enemy, definition, context({ x: 0.8, y: 0 }));
    const amount = Math.ceil(enemy.maxHealth * 0.08);
    expect(action).toMatchObject({ type: "heal", amount });
    expect(enemy.health).toBe(Math.min(enemy.maxHealth, before + amount));
    expect(enemy.healCooldown).toBe(5);
  });

  it("aplica enrage de velocidade e ataque exatamente uma vez", () => {
    const definition = getEnemyDefinition("orc-berserker", 6);
    const enemy = createEnemy("rage-1", "boar", 0, 0, 6, {
      definitionId: "orc-berserker",
    });
    enemy.health = enemy.maxHealth * 0.2;
    const before = {
      speed: enemy.stats!.speed,
      physicalAttack: enemy.stats!.physicalAttack,
      maxDamage: enemy.stats!.maxDamage,
    };

    expect(
      updateEnemyAi(enemy, definition, context({ x: 0.8, y: 0 })).type
    ).toBe("telegraph");
    expect(enemy.enrageTriggered).toBe(true);
    expect(enemy.stats!.speed).toBeCloseTo(before.speed * 1.3);
    expect(enemy.stats!.physicalAttack).toBeCloseTo(
      before.physicalAttack * 1.3
    );
    expect(enemy.stats!.maxDamage).toBeCloseTo(before.maxDamage * 1.3);

    const enragedStats = { ...enemy.stats! };
    updateEnemyAi(enemy, definition, context({ x: 0.8, y: 0 }, 0.1));
    expect(enemy.stats).toEqual(enragedStats);
  });

  it("reseta flags, cooldowns, vida e posição, preservando killCount", () => {
    const definition = getEnemyDefinition("wolf");
    const enemy = createEnemy("reset-1", "wolf", 2, 3);
    enemy.x = 20;
    enemy.y = 21;
    enemy.health = 1;
    enemy.lootClaimed = true;
    enemy.killCount = 4;
    enemy.defeated = true;
    enemy.enrageTriggered = true;
    enemy.telegraph = "attack";
    enemy.telegraphLabel = "Ataque";
    enemy.telegraphTime = 2;
    enemy.healCooldown = 5;
    enemy.callCooldown = 8;
    enemy.cooldowns = { attack: 1, skill: 2, dodge: 3 };
    enemy.statuses = [
      { kind: "poison", remaining: 3, duration: 3, potency: 1 },
    ];

    resetEnemyForRespawn(enemy, definition);
    expect(enemy).toMatchObject({
      x: 2,
      y: 3,
      health: definition.maxHealth,
      maxHealth: definition.maxHealth,
      alive: true,
      lootClaimed: false,
      defeated: false,
      killCount: 4,
      enrageTriggered: false,
      telegraph: "",
      telegraphLabel: "",
      telegraphTime: 0,
      healCooldown: 0,
      callCooldown: 0,
      cooldowns: { attack: 0, skill: 0, dodge: 0 },
      statuses: [],
    });
  });
});

describe("spawn físico do atlas", () => {
  it("materializa os oito chefes canônicos, com nomes/títulos e IDs distintos, sem exceder cap 12", () => {
    const bossSpawns = Object.values(regions).flatMap(region =>
      spawnEnemiesForRegion(region).filter(enemy => enemy.boss)
    );
    const ids = bossSpawns.map(enemy => enemy.definitionId);

    expect(bosses).toHaveLength(8);
    expect(bossSpawns).toHaveLength(8);
    expect(new Set(ids).size).toBe(8);
    expect(bossSpawns.every(enemy => enemy.alive)).toBe(true);
    expect(bossSpawns.every(enemy => enemy.name?.includes(","))).toBe(true);
    expect(
      bossSpawns.every(enemy => enemy.definitionId !== "root-guardian")
    ).toBe(true);
    expect(
      Object.values(regions).every(
        region => spawnEnemiesForRegion(region).length <= MAX_ACTIVE_ENEMIES
      )
    ).toBe(true);
  });

  it("começa a primeira região com três lobos e respawn mínimo de 30 segundos", () => {
    const region = Object.values(regions).find(
      candidate =>
        candidate.biomeName === "Floresta de Elaris" &&
        candidate.mapKind === "biome"
    );
    expect(region).toBeDefined();
    const enemies = spawnEnemiesForRegion(region!);
    expect(
      enemies.filter(enemy => enemy.definitionId === "lobo-cinzento")
    ).toHaveLength(3);
    expect(enemies.length).toBeLessThanOrEqual(8);
    expect(getEnemyDefinition("wolf").respawnSeconds).toBe(30);
  });
});
