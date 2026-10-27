import type { Enemy } from "../runtime/types";
import { enemyCombatStats } from "./catalog";
import type { EnemyDefinition } from "./catalog";
import { moveWithCollision } from "../systems/movement";

export type EnemyAiAction =
  | { type: "none" }
  | { type: "telegraph"; message: string; duration: number }
  | { type: "attack"; message: string }
  | { type: "heal"; amount: number; message: string }
  | { type: "call-allies"; message: string };

export type EnemyAiContext = {
  delta: number;
  player: {
    x: number;
    y: number;
    health: number;
    maxHealth: number;
    facing?: number;
  };
  isBlocked: (x: number, y: number) => boolean;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

type Point = { x: number; y: number };

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

const movementOptions = (context: EnemyAiContext) => ({
  minX: context.minX,
  maxX: context.maxX,
  minY: context.minY,
  maxY: context.maxY,
  radius: 0.35,
  isBlocked: context.isBlocked,
});

const moveTowards = (
  enemy: Enemy,
  target: Point,
  speed: number,
  delta: number,
  context: EnemyAiContext
) => {
  const direction = { x: target.x - enemy.x, y: target.y - enemy.y };
  const length = Math.hypot(direction.x, direction.y);
  if (length <= 0.001) return;
  const next = moveWithCollision(
    enemy,
    { x: (direction.x / length) * speed, y: (direction.y / length) * speed },
    delta,
    movementOptions(context)
  );
  enemy.x = next.x;
  enemy.y = next.y;
};

const attackCooldown = (enemy: Enemy) => enemy.cooldowns?.attack ?? 0;
const attackAnimation = (enemy: Enemy) => Math.max(0, enemy.attack ?? 0);
const movementSpeed = (enemy: Enemy, definition: EnemyDefinition) =>
  Math.max(0, enemy.stats?.speed ?? definition.speed);

const attackMessage = (definition: EnemyDefinition) => {
  if (definition.behavior === "mágico")
    return `${definition.name} canaliza magia!`;
  if (definition.behavior === "venenoso")
    return `${definition.name} prepara uma mordida venenosa!`;
  return `${definition.name} prepara um ataque!`;
};

export const updateEnemyAi = (
  enemy: Enemy,
  definition: EnemyDefinition,
  context: EnemyAiContext
): EnemyAiAction => {
  if (!enemy.alive || enemy.death) return { type: "none" };

  const d = distance(enemy, context.player);
  const spawn = { x: enemy.spawnX ?? enemy.x, y: enemy.spawnY ?? enemy.y };
  let fromSpawn = distance(enemy, spawn);
  const lowHealth = enemy.health <= enemy.maxHealth * 0.3;
  const leashReturn = enemy.aiState === "return";
  const attackRange = definition.attackRange;
  const completionRange = attackRange + 0.3;
  const speed = movementSpeed(enemy, definition);

  // Cooldowns used by the AI are independent from combat.cooldowns, which the
  // core ticks once per frame. In particular, AI must never tick attack here.
  enemy.telegraphTime = Math.max(0, (enemy.telegraphTime ?? 0) - context.delta);
  enemy.attack = Math.max(0, (enemy.attack ?? 0) - context.delta);
  enemy.guard = Math.max(0, (enemy.guard ?? 0) - context.delta);
  enemy.healCooldown = Math.max(0, (enemy.healCooldown ?? 0) - context.delta);
  enemy.callCooldown = Math.max(0, (enemy.callCooldown ?? 0) - context.delta);

  // A leash return is latched. Once it starts, the enemy does not resume
  // chasing or attacking merely because it crossed back inside the leash.
  if (leashReturn) {
    if (fromSpawn >= 0.5) {
      if (enemy.telegraph === "attack") enemy.telegraph = "";
      enemy.telegraphTime = 0;
      enemy.aiState = "return";
      if (d > definition.aggroRange)
        enemy.health = Math.min(
          enemy.maxHealth,
          enemy.health + 2 * context.delta
        );
      moveTowards(enemy, spawn, speed, context.delta, context);
      return { type: "none" };
    }
    enemy.x = spawn.x;
    enemy.y = spawn.y;
    fromSpawn = 0;
    enemy.aiState = "idle";
  }

  // Crossing the leash cancels an in-flight attack before returning home.
  if (fromSpawn > definition.leashRange) {
    if (enemy.telegraph === "attack") enemy.telegraph = "";
    enemy.telegraphTime = 0;
    enemy.aiState = "return";
    if (d > definition.aggroRange)
      enemy.health = Math.min(
        enemy.maxHealth,
        enemy.health + 2 * context.delta
      );
    moveTowards(enemy, spawn, speed, context.delta, context);
    return { type: "none" };
  }

  // A player who leaves the completion range cancels the attack windup. The
  // raw telegraph is kept only for the attack itself; flee feedback uses the
  // display label action with duration zero, so it never blocks movement.
  if (
    enemy.telegraph === "attack" &&
    (enemy.telegraphTime ?? 0) > 0 &&
    d > completionRange
  ) {
    enemy.telegraph = "";
    enemy.telegraphTime = 0;
    enemy.aiState = "chase";
  }

  if (enemy.aiState === "windup" && (enemy.telegraphTime ?? 0) > 0) {
    enemy.aiState = "windup";
    return { type: "none" };
  }

  // Windup completion is a one-shot transition. It can only resolve when the
  // player is still close enough and both the combat cooldown and animation
  // timer are clear; the core resolver records the actual cooldown on hit.
  if (enemy.telegraph === "attack") {
    enemy.telegraph = "";
    if (
      d <= completionRange &&
      attackCooldown(enemy) <= 0 &&
      attackAnimation(enemy) <= 0
    ) {
      enemy.aiState = "attack";
      return { type: "attack", message: `${definition.name} ataca!` };
    }
    enemy.aiState = d <= definition.aggroRange ? "chase" : "idle";
  } else if (enemy.telegraph) {
    // Enrage/call feedback is not an attack telegraph and must not linger.
    enemy.telegraph = "";
  }

  if (
    definition.behavior === "fugitivo" &&
    lowHealth &&
    d < definition.aggroRange
  ) {
    enemy.aiState = "flee";
    moveTowards(
      enemy,
      {
        x: enemy.x + (enemy.x - context.player.x),
        y: enemy.y + (enemy.y - context.player.y),
      },
      speed,
      context.delta,
      context
    );
    const feedbackReady = (enemy.callCooldown ?? 0) <= 0;
    if (feedbackReady) enemy.callCooldown = 2;
    return feedbackReady
      ? {
          type: "telegraph",
          message: `${definition.name} está tentando fugir!`,
          duration: 2,
        }
      : { type: "none" };
  }

  if (d > definition.aggroRange) {
    enemy.aiState = "idle";
    return { type: "none" };
  }

  if (
    definition.behavior === "enraged" &&
    lowHealth &&
    !enemy.enrageTriggered
  ) {
    enemy.enrageTriggered = true;
    enemy.stats ??= enemyCombatStats(definition);
    const stats = enemy.stats;
    stats.power *= 1.3;
    stats.physicalAttack *= 1.3;
    stats.magicAttack *= 1.3;
    stats.minDamage = Math.max(1, stats.minDamage * 1.3);
    stats.maxDamage = Math.max(stats.minDamage, stats.maxDamage * 1.3);
    stats.speed *= 1.3;
    enemy.telegraph = "enraged";
    enemy.aiState = "windup";
    enemy.attack = Math.max(enemy.attack ?? 0, 0.1);
    enemy.telegraphTime = 0.75;
    return {
      type: "telegraph",
      message: `${definition.name} está enfurecido!`,
      duration: 0.75,
    };
  }

  if (definition.behavior === "defensivo" && d < attackRange + 0.35) {
    enemy.aiState = "hurt";
    enemy.guard = Math.max(enemy.guard ?? 0, 0.35);
  }

  if (
    definition.behavior === "curandeiro" &&
    lowHealth &&
    enemy.health < enemy.maxHealth &&
    (enemy.healCooldown ?? 0) <= 0
  ) {
    const amount = Math.ceil(enemy.maxHealth * 0.08);
    enemy.healCooldown = 5;
    enemy.health = Math.min(enemy.maxHealth, enemy.health + amount);
    enemy.aiState = "attack";
    return {
      type: "heal",
      amount,
      message: `${definition.name} recompõe sua forma.`,
    };
  }

  if (
    definition.behavior === "chamador" &&
    d < definition.aggroRange &&
    (enemy.callCooldown ?? 0) <= 0 &&
    (enemy.alliesCalled ?? 0) < (definition.maxAllies ?? 2)
  ) {
    enemy.callCooldown = 8;
    enemy.alliesCalled = (enemy.alliesCalled ?? 0) + 1;
    enemy.aiState = "windup";
    return {
      type: "call-allies",
      message: `${definition.name} chama aliados da região!`,
    };
  }

  const flankEngagementRange = definition.behavior === "flank" ? 0.3 : 0;
  if (d > attackRange + flankEngagementRange) {
    enemy.aiState = "chase";
    let target: Point = context.player;
    if (definition.behavior === "flank") {
      const facing = context.player.facing ?? 1;
      const back = facing >= 0 ? -1 : 1;
      // Unit-length side/back offset: approach the player's back rather than
      // following the player's centre line.
      target = {
        x: context.player.x + back * 0.8,
        y: context.player.y + 0.6,
      };
    }
    moveTowards(enemy, target, speed, context.delta, context);
    return { type: "none" };
  }

  // Never begin a telegraph while the resolver cooldown or attack animation is
  // active. This also prevents an attack action from being emitted every frame.
  if (attackCooldown(enemy) > 0 || attackAnimation(enemy) > 0) {
    enemy.aiState = "attack";
    return { type: "none" };
  }

  enemy.aiState = "windup";
  enemy.telegraphTime = definition.behavior === "mágico" ? 0.65 : 0.38;
  enemy.telegraph = "attack";
  return {
    type: "telegraph",
    message: attackMessage(definition),
    duration: enemy.telegraphTime,
  };
};
