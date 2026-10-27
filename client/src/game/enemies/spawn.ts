import { bosses, mobs } from "../aetherionAtlas";
import type { RegionDefinition } from "../worldContent";
import type { Enemy, EnemyKind } from "../runtime/types";
import {
  bossDefinitionIdForName,
  createEnemy,
  getEnemyDefinition,
} from "./catalog";

const spawnPoints = [
  { x: 13.5, y: 7.8 },
  { x: 16.7, y: 10.6 },
  { x: 22.5, y: 6.5 },
  { x: 9.1, y: 20.5 },
  { x: 33.5, y: 11.5 },
  { x: 35.2, y: 18.4 },
  { x: 11.8, y: 14.2 },
  { x: 27.2, y: 9.4 },
];

export const MAX_ACTIVE_ENEMIES = 12;

const normalize = (value: string) =>
  value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const knownVariant = new Set([
  "lobo-cinzento",
  "lobo-sombrio",
  "javali-selvagem",
  "goblin",
  "goblin-saqueador",
  "goblin-xama",
  "aranha-gigante",
  "slime",
  "slime-acido",
  "orc-berserker",
  "troll",
  "espirito-errante",
  "esqueleto",
]);

const baseKindFor = (name: string): EnemyKind => {
  const value = normalize(name);
  if (value.includes("lobo")) return "wolf";
  if (
    value.includes("javali") ||
    value.includes("orc") ||
    value.includes("troll") ||
    value.includes("ogro")
  )
    return "boar";
  if (value.includes("slime") || value.includes("espirito")) return "slime";
  return "goblin";
};

const candidateDefinitions = (region: RegionDefinition) => {
  const habitat = mobs.filter(mob => mob.habitats.includes(region.biomeName));
  const names = habitat.length
    ? habitat.map(mob => mob.name)
    : region.enemyNames;
  const unique = Array.from(new Set(names.map(normalize)));
  const known = unique.filter(name => knownVariant.has(name));
  const base = region.enemyKinds.map(kind => String(kind));
  return Array.from(new Set([...known, ...base])).slice(
    0,
    region.mapKind === "settlement" ? 2 : region.mapKind === "dungeon" ? 5 : 8
  );
};

const atlasBossesForRegion = (region: RegionDefinition) =>
  bosses.filter(boss => boss.dungeon === region.name);

const legacyBossForRegion = (region: RegionDefinition) => {
  if (!region.bossName) return undefined;
  const canonicalId = bossDefinitionIdForName(region.bossName);
  return {
    id: canonicalId ?? normalize(region.bossName).split("-")[0],
    name: region.bossName.split(",")[0]?.trim() || region.bossName,
    title: region.bossName.includes(",")
      ? region.bossName.slice(region.bossName.indexOf(",") + 1).trim()
      : "",
    tier: region.tier,
    dungeon: region.name,
  };
};

export const spawnEnemiesForRegion = (region: RegionDefinition): Enemy[] => {
  if (!region.enemyKinds.length || region.mapKind === "settlement") return [];

  const firstForest = region.biomeName === "Floresta de Elaris";
  const definitions = candidateDefinitions(region);
  const nonWolfDefinitions = definitions.filter(
    definitionId =>
      !normalize(definitionId).includes("lobo") && definitionId !== "wolf"
  );
  const mobCount = firstForest
    ? Math.min(8, Math.max(5, definitions.length + 2))
    : region.mapKind === "dungeon"
      ? Math.min(5, Math.max(2, definitions.length))
      : Math.min(8, Math.max(5, definitions.length));
  const enemies: Enemy[] = [];

  for (let index = 0; index < mobCount; index += 1) {
    const point = spawnPoints[index % spawnPoints.length];
    // The first map starts with three nearby-but-separated wolves so the first
    // hunt quest can progress immediately; later regions keep normal variety.
    const availableDefinitions =
      firstForest && nonWolfDefinitions.length
        ? nonWolfDefinitions
        : definitions;
    const definitionId =
      firstForest && index < 3
        ? "wolf"
        : availableDefinitions[
            (index - (firstForest ? 3 : 0)) % availableDefinitions.length
          ];
    const kind = baseKindFor(definitionId);
    enemies.push(
      createEnemy(
        `${region.id}-enemy-${index + 1}`,
        kind,
        point.x,
        point.y,
        region.tier,
        { definitionId }
      )
    );
  }

  // A region may have two bosses (Fortaleza de Ferro). The atlas also places
  // Kaelgor on the frozen biome rather than a dungeon name, hence the dual
  // name/biome matching above. Each canonical first-word ID is distinct.
  const regionBosses = atlasBossesForRegion(region);
  const bossesToSpawn = regionBosses.length
    ? regionBosses
    : legacyBossForRegion(region)
      ? [legacyBossForRegion(region)!]
      : [];
  for (const boss of bossesToSpawn) {
    if (enemies.length >= MAX_ACTIVE_ENEMIES) break;
    const point = spawnPoints[enemies.length % spawnPoints.length];
    const definitionId =
      bossDefinitionIdForName(boss.name) ?? normalize(boss.id).split("-")[0];
    const fullName = boss.title ? `${boss.name}, ${boss.title}` : boss.name;
    enemies.push(
      createEnemy(
        `${region.id}-boss-${definitionId}`,
        "boss",
        point.x,
        point.y,
        Math.max(region.tier, boss.tier),
        {
          bossName: fullName,
          boss: true,
          definitionId,
        }
      )
    );
  }

  return enemies.slice(0, MAX_ACTIVE_ENEMIES);
};

export const respawnableEnemy = (enemy: Enemy, regionTier: number) => {
  const definition = getEnemyDefinition(
    enemy.definitionId ?? enemy.kind,
    regionTier,
    enemy.name
  );
  return !enemy.boss && definition.respawnSeconds > 0 ? definition : null;
};
