import { mobs } from "../aetherionAtlas";
import type { EnemyKind, Enemy } from "../runtime/types";
import { createCooldowns, deriveCombatStats } from "../combat/types";
import type { StatusKind } from "../combat/types";

export type EnemyBehavior =
  | "agressivo"
  | "defensivo"
  | "mágico"
  | "venenoso"
  | "fugitivo"
  | "curandeiro"
  | "enraged"
  | "flank"
  | "chamador";

export type EnemyCategory = "common" | "elite" | "rare" | "miniBoss";

export type LootEntry = {
  id: string;
  name: string;
  chance: number;
  rarity: "comum" | "incomum" | "raro" | "épico" | "lendário";
};

export type EnemyDefinition = {
  id: string;
  kind: EnemyKind;
  atlasId?: string;
  category?: EnemyCategory;
  tier: number;
  level: number;
  name: string;
  maxHealth: number;
  attack: number;
  magicAttack: number;
  defense: number;
  magicDefense: number;
  speed: number;
  attackRange: number;
  aggroRange: number;
  leashRange: number;
  attackCooldown: number;
  behavior: EnemyBehavior;
  xp: number;
  gold: number;
  loot: LootEntry[];
  respawnSeconds: number;
  boss?: boolean;
  statusOnHit?: { kind: StatusKind; duration: number; potency: number };
  rarity?: "comum" | "incomum" | "raro" | "épico" | "lendário";
  displayKind?: EnemyKind;
  maxAllies?: number;
};

const atlasIdFor = (name: string) => mobs.find(mob => mob.name === name)?.id;
const entry = (definition: EnemyDefinition): EnemyDefinition => definition;

export const enemyCatalog: Record<string, EnemyDefinition> = {
  wolf: entry({
    id: "lobo-cinzento",
    kind: "wolf",
    atlasId: atlasIdFor("Lobo Cinzento"),
    category: "common",
    tier: 1,
    level: 1,
    name: "Lobo Cinzento",
    maxHealth: 18,
    attack: 8,
    magicAttack: 2,
    defense: 3,
    magicDefense: 2,
    speed: 1.35,
    attackRange: 0.9,
    aggroRange: 4.8,
    leashRange: 8,
    attackCooldown: 1.15,
    behavior: "agressivo",
    xp: 14,
    gold: 3,
    loot: [
      {
        id: "fragmento-eter",
        name: "Fragmento de Éter",
        chance: 0.7,
        rarity: "incomum",
      },
    ],
    respawnSeconds: 30,
    rarity: "comum",
  }),
  boar: entry({
    id: "javali-selvagem",
    kind: "boar",
    atlasId: atlasIdFor("Javali Selvagem"),
    category: "common",
    tier: 1,
    level: 1,
    name: "Javali Selvagem",
    maxHealth: 24,
    attack: 10,
    magicAttack: 1,
    defense: 7,
    magicDefense: 2,
    speed: 0.92,
    attackRange: 1,
    aggroRange: 3.7,
    leashRange: 7,
    attackCooldown: 1.4,
    behavior: "defensivo",
    xp: 17,
    gold: 4,
    loot: [
      {
        id: "racao-de-viagem",
        name: "Ração de viagem",
        chance: 0.8,
        rarity: "comum",
      },
    ],
    respawnSeconds: 30,
    rarity: "comum",
  }),
  goblin: entry({
    id: "goblin",
    kind: "goblin",
    atlasId: atlasIdFor("Goblin"),
    category: "common",
    tier: 1,
    level: 1,
    name: "Goblin Saqueador",
    maxHealth: 16,
    attack: 7,
    magicAttack: 3,
    defense: 5,
    magicDefense: 4,
    speed: 1.08,
    attackRange: 1.15,
    aggroRange: 4.2,
    leashRange: 7.5,
    attackCooldown: 1.2,
    behavior: "defensivo",
    xp: 16,
    gold: 6,
    loot: [
      {
        id: "minerio-runico",
        name: "Minério rúnico",
        chance: 0.35,
        rarity: "incomum",
      },
    ],
    respawnSeconds: 30,
    rarity: "comum",
  }),
  slime: entry({
    id: "slime-acido",
    kind: "slime",
    atlasId: atlasIdFor("Slime Ácido"),
    category: "rare",
    tier: 3,
    level: 3,
    name: "Slime Ácido",
    maxHealth: 28,
    attack: 5,
    magicAttack: 9,
    defense: 4,
    magicDefense: 8,
    speed: 0.72,
    attackRange: 2.4,
    aggroRange: 4.5,
    leashRange: 8,
    attackCooldown: 1.65,
    behavior: "venenoso",
    xp: 28,
    gold: 8,
    loot: [
      {
        id: "gelatina-de-slime",
        name: "Gelatina de Slime",
        chance: 0.8,
        rarity: "comum",
      },
    ],
    respawnSeconds: 30,
    statusOnHit: { kind: "poison", duration: 4, potency: 2 },
    rarity: "raro",
  }),
  "root-guardian": entry({
    id: "root-guardian",
    kind: "boss",
    category: "miniBoss",
    tier: 2,
    level: 4,
    name: "Guardião da Raiz",
    maxHealth: 120,
    attack: 15,
    magicAttack: 12,
    defense: 13,
    magicDefense: 11,
    speed: 0.62,
    attackRange: 1.35,
    aggroRange: 7,
    leashRange: 12,
    attackCooldown: 1.8,
    behavior: "enraged",
    xp: 90,
    gold: 35,
    loot: [
      {
        id: "fragmento-eter",
        name: "Fragmento de Éter",
        chance: 1,
        rarity: "raro",
      },
    ],
    respawnSeconds: 0,
    boss: true,
    rarity: "lendário",
    statusOnHit: { kind: "slow", duration: 3, potency: 0.35 },
  }),
};

/** Variantes data-driven: cada variante preserva identidade, categoria, tier,
 * nível, habitat visual, IA e números próprios. */
export const enemyVariants: Record<string, EnemyDefinition> = {
  "lobo-cinzento": enemyCatalog.wolf,
  "lobo-sombrio": {
    ...enemyCatalog.wolf,
    id: "lobo-sombrio",
    name: "Lobo Sombrio",
    category: "elite",
    tier: 4,
    level: 4,
    maxHealth: 34,
    attack: 14,
    defense: 7,
    speed: 1.55,
    behavior: "flank",
    xp: 34,
    gold: 9,
    respawnSeconds: 30,
    rarity: "incomum",
  },
  "javali-selvagem": enemyCatalog.boar,
  goblin: enemyCatalog.goblin,
  "goblin-saqueador": {
    ...enemyCatalog.goblin,
    id: "goblin-saqueador",
    name: "Goblin Saqueador",
    category: "elite",
    tier: 2,
    level: 2,
    maxHealth: 22,
    attack: 10,
    defense: 6,
    behavior: "chamador",
    maxAllies: 2,
    xp: 24,
    gold: 8,
    rarity: "incomum",
  },
  "goblin-xama": {
    ...enemyCatalog.goblin,
    id: "goblin-xama",
    name: "Goblin Xamã",
    category: "rare",
    tier: 4,
    level: 4,
    maxHealth: 30,
    attack: 7,
    magicAttack: 15,
    magicDefense: 9,
    attackRange: 2.5,
    behavior: "mágico",
    statusOnHit: { kind: "curse", duration: 4, potency: 2 },
    xp: 38,
    gold: 12,
    rarity: "raro",
  },
  "aranha-gigante": {
    ...enemyCatalog.slime,
    id: "aranha-gigante",
    kind: "goblin",
    name: "Aranha Gigante",
    category: "rare",
    tier: 3,
    level: 3,
    maxHealth: 26,
    attack: 11,
    magicAttack: 6,
    defense: 5,
    speed: 1.35,
    behavior: "venenoso",
    statusOnHit: { kind: "poison", duration: 5, potency: 2 },
    xp: 30,
    gold: 9,
    rarity: "incomum",
  },
  slime: enemyCatalog.slime,
  "slime-acido": enemyCatalog.slime,
  "orc-berserker": {
    ...enemyCatalog.boar,
    id: "orc-berserker",
    kind: "boar",
    name: "Orc Berserker",
    category: "elite",
    tier: 6,
    level: 6,
    maxHealth: 62,
    attack: 22,
    defense: 13,
    speed: 1.05,
    behavior: "enraged",
    xp: 70,
    gold: 24,
    rarity: "raro",
  },
  troll: {
    ...enemyCatalog.boar,
    id: "troll",
    kind: "boar",
    name: "Troll",
    category: "rare",
    tier: 5,
    level: 5,
    maxHealth: 76,
    attack: 18,
    defense: 18,
    speed: 0.7,
    behavior: "curandeiro",
    xp: 62,
    gold: 18,
    rarity: "raro",
  },
  "espirito-errante": {
    ...enemyCatalog.slime,
    id: "espirito-errante",
    kind: "slime",
    name: "Espírito Errante",
    category: "rare",
    tier: 5,
    level: 5,
    maxHealth: 42,
    attack: 8,
    magicAttack: 18,
    defense: 8,
    magicDefense: 14,
    speed: 0.95,
    behavior: "mágico",
    xp: 58,
    gold: 20,
    rarity: "raro",
  },
  esqueleto: {
    ...enemyCatalog.goblin,
    id: "esqueleto",
    kind: "goblin",
    name: "Esqueleto",
    category: "elite",
    tier: 4,
    level: 4,
    maxHealth: 38,
    attack: 13,
    defense: 10,
    speed: 0.85,
    behavior: "fugitivo",
    xp: 44,
    gold: 14,
    rarity: "incomum",
  },
};

const bossDefinition = (
  definition: Omit<
    EnemyDefinition,
    "kind" | "boss" | "category" | "respawnSeconds"
  >
): EnemyDefinition => ({
  ...definition,
  kind: "boss",
  category: "miniBoss",
  boss: true,
  respawnSeconds: 0,
});

/** Canonical short IDs deliberately use the first slug word. These definitions
 * keep every atlas boss physically distinct instead of falling back to a root
 * guardian with a renamed display string. */
const bossDefinitions: EnemyDefinition[] = [
  bossDefinition({
    id: "gorvath",
    tier: 3,
    level: 7,
    name: "Gorvath",
    maxHealth: 180,
    attack: 27,
    magicAttack: 8,
    defense: 22,
    magicDefense: 15,
    speed: 0.76,
    attackRange: 1.45,
    aggroRange: 8,
    leashRange: 13,
    attackCooldown: 1.65,
    behavior: "defensivo",
    xp: 190,
    gold: 75,
    loot: [
      {
        id: "minerio-runico",
        name: "Minério rúnico",
        chance: 1,
        rarity: "raro",
      },
      {
        id: "martelo-runico",
        name: "Martelo rúnico",
        chance: 0.2,
        rarity: "incomum",
      },
    ],
    rarity: "lendário",
    statusOnHit: { kind: "slow", duration: 3, potency: 0.3 },
  }),
  bossDefinition({
    id: "seraphyne",
    tier: 7,
    level: 10,
    name: "Seraphyne",
    maxHealth: 240,
    attack: 24,
    magicAttack: 38,
    defense: 20,
    magicDefense: 30,
    speed: 0.72,
    attackRange: 4.2,
    aggroRange: 9,
    leashRange: 14,
    attackCooldown: 1.7,
    behavior: "mágico",
    xp: 280,
    gold: 115,
    loot: [
      {
        id: "cristal-magico",
        name: "Cristal mágico",
        chance: 1,
        rarity: "raro",
      },
      {
        id: "cajado-de-eco",
        name: "Cajado de eco",
        chance: 0.12,
        rarity: "comum",
      },
    ],
    rarity: "lendário",
    statusOnHit: { kind: "burn", duration: 4, potency: 2 },
  }),
  bossDefinition({
    id: "mordrak",
    tier: 7,
    level: 10,
    name: "Mordrak",
    maxHealth: 280,
    attack: 42,
    magicAttack: 18,
    defense: 32,
    magicDefense: 20,
    speed: 0.82,
    attackRange: 1.5,
    aggroRange: 8.5,
    leashRange: 14,
    attackCooldown: 1.55,
    behavior: "enraged",
    xp: 310,
    gold: 130,
    loot: [
      {
        id: "martelo-runico",
        name: "Martelo rúnico",
        chance: 0.35,
        rarity: "incomum",
      },
      {
        id: "minerio-runico",
        name: "Minério rúnico",
        chance: 1,
        rarity: "raro",
      },
    ],
    rarity: "lendário",
    statusOnHit: { kind: "slow", duration: 3, potency: 0.35 },
  }),
  bossDefinition({
    id: "veylora",
    tier: 5,
    level: 8,
    name: "Veylora",
    maxHealth: 200,
    attack: 18,
    magicAttack: 36,
    defense: 17,
    magicDefense: 32,
    speed: 0.8,
    attackRange: 4.1,
    aggroRange: 9,
    leashRange: 13,
    attackCooldown: 1.75,
    behavior: "mágico",
    xp: 245,
    gold: 100,
    loot: [
      {
        id: "cajado-de-eco",
        name: "Cajado de eco",
        chance: 0.18,
        rarity: "comum",
      },
      {
        id: "cristal-magico",
        name: "Cristal mágico",
        chance: 1,
        rarity: "raro",
      },
    ],
    rarity: "lendário",
    statusOnHit: { kind: "curse", duration: 4, potency: 2 },
  }),
  bossDefinition({
    id: "tharok",
    tier: 7,
    level: 10,
    name: "Tharok",
    maxHealth: 310,
    attack: 38,
    magicAttack: 10,
    defense: 35,
    magicDefense: 18,
    speed: 0.62,
    attackRange: 1.65,
    aggroRange: 8,
    leashRange: 14,
    attackCooldown: 1.8,
    behavior: "curandeiro",
    xp: 325,
    gold: 138,
    loot: [
      {
        id: "racao-de-viagem",
        name: "Ração de viagem",
        chance: 1,
        rarity: "comum",
      },
      {
        id: "selo-de-alianca",
        name: "Selo de aliança",
        chance: 0.08,
        rarity: "raro",
      },
    ],
    rarity: "lendário",
    statusOnHit: { kind: "poison", duration: 4, potency: 2 },
  }),
  bossDefinition({
    id: "azhrael",
    tier: 8,
    level: 11,
    name: "Azhrael",
    maxHealth: 340,
    attack: 45,
    magicAttack: 30,
    defense: 38,
    magicDefense: 27,
    speed: 0.68,
    attackRange: 1.55,
    aggroRange: 8.5,
    leashRange: 14,
    attackCooldown: 1.7,
    behavior: "defensivo",
    xp: 360,
    gold: 150,
    loot: [
      {
        id: "broche-da-vigilia",
        name: "Broche da Vigília",
        chance: 0.2,
        rarity: "comum",
      },
      {
        id: "cristal-magico",
        name: "Cristal mágico",
        chance: 1,
        rarity: "raro",
      },
    ],
    rarity: "lendário",
    statusOnHit: { kind: "stun", duration: 1.2, potency: 1 },
  }),
  bossDefinition({
    id: "kaelgor",
    tier: 9,
    level: 12,
    name: "Kaelgor",
    maxHealth: 380,
    attack: 48,
    magicAttack: 42,
    defense: 40,
    magicDefense: 34,
    speed: 0.86,
    attackRange: 1.8,
    aggroRange: 9,
    leashRange: 15,
    attackCooldown: 1.65,
    behavior: "enraged",
    xp: 420,
    gold: 175,
    loot: [
      {
        id: "escama-primordial",
        name: "Escama primordial",
        chance: 1,
        rarity: "épico",
      },
      {
        id: "cristal-magico",
        name: "Cristal mágico",
        chance: 0.75,
        rarity: "raro",
      },
    ],
    rarity: "lendário",
    statusOnHit: { kind: "burn", duration: 4, potency: 2 },
  }),
  bossDefinition({
    id: "nexarion",
    tier: 11,
    level: 14,
    name: "Nexarion",
    maxHealth: 420,
    attack: 36,
    magicAttack: 55,
    defense: 42,
    magicDefense: 48,
    speed: 0.78,
    attackRange: 4.5,
    aggroRange: 10,
    leashRange: 16,
    attackCooldown: 1.9,
    behavior: "mágico",
    xp: 480,
    gold: 220,
    loot: [
      {
        id: "fragmento-vazio",
        name: "Fragmento do Vazio",
        chance: 1,
        rarity: "lendário",
      },
      {
        id: "cristal-magico",
        name: "Cristal mágico",
        chance: 1,
        rarity: "raro",
      },
    ],
    rarity: "lendário",
    statusOnHit: { kind: "curse", duration: 5, potency: 3 },
  }),
];

for (const definition of bossDefinitions)
  enemyVariants[definition.id] = definition;

const normalizeDefinitionId = (value: string) =>
  value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const canonicalBossIds = new Set(
  bossDefinitions.map(definition => definition.id)
);

export const bossDefinitionIdForName = (value: string) => {
  const firstWord = normalizeDefinitionId(value).split("-")[0] ?? "";
  return canonicalBossIds.has(firstWord) ? firstWord : undefined;
};

const definitionFor = (kind: EnemyKind | string, bossName?: string) => {
  const bossId =
    (bossName ? bossDefinitionIdForName(bossName) : undefined) ??
    bossDefinitionIdForName(String(kind));
  const normalizedKind = normalizeDefinitionId(String(kind));
  return (
    (bossId ? enemyVariants[bossId] : undefined) ??
    enemyVariants[normalizedKind] ??
    enemyCatalog[normalizedKind] ??
    enemyCatalog[String(kind)] ??
    enemyCatalog.goblin
  );
};

export const getEnemyDefinition = (
  kind: EnemyKind | string,
  regionTier = 1,
  bossName?: string
): EnemyDefinition => {
  const base = definitionFor(kind, bossName);
  const scale = Math.max(0, regionTier - base.tier);
  return {
    ...base,
    level: base.level + scale,
    name: bossName ?? base.name,
    maxHealth: Math.round(base.maxHealth * (1 + scale * 0.18)),
    attack: Math.round(base.attack * (1 + scale * 0.12)),
    magicAttack: Math.round(base.magicAttack * (1 + scale * 0.12)),
    defense: Math.round(base.defense * (1 + scale * 0.1)),
    magicDefense: Math.round(base.magicDefense * (1 + scale * 0.1)),
    xp: Math.round(base.xp * (1 + scale * 0.2)),
    gold: Math.round(base.gold * (1 + scale * 0.16)),
  };
};

export const enemyCombatStats = (definition: EnemyDefinition) =>
  deriveCombatStats(
    {
      vitality: Math.max(1, Math.round(definition.maxHealth / 4)),
      power: definition.attack,
      ether: definition.magicAttack,
      agility: Math.max(1, Math.round(definition.speed * 5)),
      resolve: Math.max(1, Math.round(definition.defense / 2)),
    },
    definition.level,
    definition.speed
  );

export const createEnemy = (
  id: string,
  kind: EnemyKind,
  x: number,
  y: number,
  regionTier = 1,
  options: { bossName?: string; boss?: boolean; definitionId?: string } = {}
): Enemy => {
  const definition = getEnemyDefinition(
    options.definitionId ?? kind,
    regionTier,
    options.bossName
  );
  return {
    id,
    x,
    y,
    spawnX: x,
    spawnY: y,
    health: definition.maxHealth,
    maxHealth: definition.maxHealth,
    kind: definition.kind,
    definitionId: definition.id,
    name: definition.name,
    alive: true,
    hurt: 0,
    phase: 0,
    attack: 0,
    guard: 0,
    death: 0,
    aiState: "idle",
    behavior: definition.behavior,
    telegraph: "",
    telegraphLabel: "",
    telegraphTime: 0,
    healCooldown: 0,
    callCooldown: 0,
    enrageTriggered: false,
    alliesCalled: 0,
    cooldowns: createCooldowns(),
    stats: enemyCombatStats(definition),
    level: definition.level,
    gold: definition.gold,
    xp: definition.xp,
    boss: options.boss ?? definition.boss,
    rarity: definition.rarity,
    lootClaimed: false,
    statuses: [],
    defeated: false,
  };
};

export const resetEnemyForRespawn = (
  enemy: Enemy,
  definition: EnemyDefinition
) => {
  const spawnX = enemy.spawnX ?? enemy.x;
  const spawnY = enemy.spawnY ?? enemy.y;
  enemy.spawnX = spawnX;
  enemy.spawnY = spawnY;
  enemy.x = spawnX;
  enemy.y = spawnY;
  enemy.health = definition.maxHealth;
  enemy.maxHealth = definition.maxHealth;
  enemy.alive = true;
  enemy.hurt = 0;
  enemy.death = 0;
  enemy.attack = 0;
  enemy.guard = 0;
  enemy.aiState = "idle";
  enemy.telegraph = "";
  enemy.telegraphLabel = "";
  enemy.telegraphTime = 0;
  enemy.healCooldown = 0;
  enemy.callCooldown = 0;
  enemy.enrageTriggered = false;
  enemy.alliesCalled = 0;
  enemy.cooldowns = createCooldowns();
  enemy.stats = enemyCombatStats(definition);
  enemy.level = definition.level;
  enemy.gold = definition.gold;
  enemy.xp = definition.xp;
  enemy.rarity = definition.rarity;
  enemy.respawnRemaining = 0;
  enemy.defeated = false;
  enemy.lootClaimed = false;
  enemy.statuses = [];
  // killCount intentionally survives: a respawn is a new legitimate reward
  // opportunity, while its kill history remains monotonic.
};
