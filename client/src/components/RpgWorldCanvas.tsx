/**
 * Linha dos Ecos — o mapa é desenhado em tiles no canvas: chão, árvores, criaturas e heróis são entidades 2D reais.
 * Nenhuma imagem de cenário ou marcador geométrico participa do campo de jogo.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { endingRequirements } from "../game/campaign";
import { classes, races, type Stats } from "../game/content";
import {
  firstRegion,
  regions as worldRegions,
  type RegionId,
  type ServicePoint,
} from "../game/worldContent";
import { moveWithCollision } from "../game/systems/movement";
import {
  createProgression,
  experienceRequired,
  getDerivedStats,
  grantExperience,
} from "../game/systems/progression";
import {
  deriveCombatStats,
  resolveEnemyAttack,
  resolvePlayerAttack,
  resolveSkill,
  resolveDodge,
  heal,
  applyStatus,
  tickCooldowns,
  tickStatuses,
  createCombatant,
  type CombatStats,
} from "../game/combat";
import {
  createEnemy,
  enemyCombatStats,
  getEnemyDefinition,
  resetEnemyForRespawn,
  type EnemyDefinition,
} from "../game/enemies";
import {
  MAX_ACTIVE_ENEMIES,
  spawnEnemiesForRegion,
} from "../game/enemies/spawn";
import { updateEnemyAi } from "../game/enemies/ai";
import {
  addItem,
  createInventory,
  deserializeInventory,
  migrateInventory,
  equip,
  getBonuses,
  removeItem,
  serializeInventory,
  unequip,
  use,
  rollLoot,
  lootTables,
  type InventoryState,
  type EquipmentSlot,
} from "../game/items";
import {
  accept,
  abandon,
  claimQuestReward,
  createQuestState,
  deserialize as deserializeQuestState,
  dispatchQuestEvent,
  getAvailableEndings,
  getQuestDefinition,
  getQuestProgress,
  selectQuestChoice,
  selectTrackedQuest,
  serialize as serializeQuestState,
  type QuestEvent,
  type QuestMutationResult,
} from "../game/quests";
import { readWorldSave, safePersistWorld } from "../game/systems/saveCodec";
import {
  createAudioBus,
  drawBoss,
  drawBuilding,
  drawCreature,
  drawDeath,
  drawNpc,
  drawPerson,
  drawServicePoint,
  drawTree,
  renderRegionDecorations,
  resolveNpcPositions,
  TerrainLayerCache,
  visibleTerrainTiles,
  type AudioBus,
} from "../game/rendering";
import {
  type AudioSettings,
  type AtlasTravel,
  type CombatText,
  type ControlAction,
  type ControlSettings,
  type Enemy,
  type Hud,
  type Menu,
  type Npc,
  type Player,
  type WorldState,
} from "../game/runtime/types";
import {
  isQaMapEnabled,
  isQaResetEnabled,
  qaMenuFromQuery,
  type AetherionQaApi,
  type QaAction,
  type QaSnapshot,
} from "../game/runtime/qa";
import AreaMapOverlay, { type LocalMapArea } from "./AreaMapOverlay";
import { travelCost } from "./rpg/RpgAtlas";
import { ControlsWindow, MenuWindow, ServiceWindow } from "./rpg/RpgMenus";
import { PlayerHud, QuestHud } from "./rpg/RpgHud";
import QuestJournal from "./rpg/QuestJournal";
import InventoryPanel from "./rpg/InventoryPanel";
import TouchControls from "./rpg/TouchControls";
import type { CharacterProfile } from "./RpgGame";
import { profileStats } from "./RpgGame";

const WORLD_W = 42;
const WORLD_H = 30;
const Npcs = (region: RegionId) => worldRegions[region].npcs;
const localMapAreaFor = (
  regionId: RegionId,
  playerX: number,
  playerY: number
): LocalMapArea => {
  const region = worldRegions[regionId];
  const markers: LocalMapArea["markers"] = [
    ...region.npcs.map(npc => ({
      id: npc.id,
      name: npc.name,
      type: npc.role.toLowerCase().includes("comer")
        ? ("merchant" as const)
        : ("npc" as const),
      x: (npc.x / WORLD_W) * 100,
      y: (npc.y / WORLD_H) * 100,
    })),
    ...region.services.map(service => ({
      id: service.id,
      name: service.label,
      type:
        service.kind === "shop"
          ? ("shop" as const)
          : service.kind === "chest"
            ? ("poi" as const)
            : service.kind === "gate"
              ? ("exit" as const)
              : ("poi" as const),
      x: (service.x / WORLD_W) * 100,
      y: (service.y / WORLD_H) * 100,
    })),
  ];
  return {
    id: region.id,
    name: region.name,
    kind:
      region.mapKind === "settlement"
        ? "village"
        : region.mapKind === "dungeon"
          ? "dungeon"
          : region.mapKind === "special" || region.mapKind === "final"
            ? "poi"
            : "biome",
    description: region.subtitle,
    markers: [
      ...markers,
      {
        id: "player",
        name: "Você",
        type: "player",
        x: (playerX / WORLD_W) * 100,
        y: (playerY / WORLD_H) * 100,
      },
    ],
  };
};

const dialogueChoices: Record<
  string,
  { label: string; effect: string; faction: string; amount: number }[]
> = {
  mira: [
    {
      label: "Defender a Vila de Musgo",
      effect: "A vila passa a confiar no seu eco.",
      faction: "Vila de Musgo",
      amount: 2,
    },
    {
      label: "Perguntar pela Ordem da Vigília",
      effect: "Você descobre que a Ordem esconde informações sobre a Ruptura.",
      faction: "Ordem da Vigília",
      amount: -1,
    },
  ],
  thalion: [
    {
      label: "Guardar o segredo da raiz",
      effect: "O Círculo Élfico reconhece sua prudência.",
      faction: "Círculo Élfico",
      amount: 2,
    },
    {
      label: "Levar o aviso à vila",
      effect: "A Vila de Musgo prepara defesas contra o que vem da mata.",
      faction: "Vila de Musgo",
      amount: 1,
    },
  ],
  nix: [
    {
      label: "Abrir uma rota de troca",
      effect: "A Liga dos Mercadores começa a acompanhar seu nome.",
      faction: "Liga dos Mercadores",
      amount: 2,
    },
    {
      label: "Pedir auxílio aos clãs",
      effect: "Os Clãs Monstruosos veem que você não esqueceu os seus.",
      faction: "Clãs Monstruosos",
      amount: 2,
    },
  ],
};

const initialEnemies = (region: RegionId = firstRegion): Enemy[] =>
  spawnEnemiesForRegion(worldRegions[region]);

const gatherNodes = [
  { id: "root-1", x: 8.6, y: 17.2, kind: "wood" as const },
  { id: "root-2", x: 21.8, y: 24.4, kind: "wood" as const },
  { id: "ore-1", x: 29.6, y: 14.7, kind: "ore" as const },
  { id: "ore-2", x: 35.2, y: 18.1, kind: "ore" as const },
];

const defaultControls: ControlSettings = {
  moveUp: "KeyW",
  moveDown: "KeyS",
  moveLeft: "KeyA",
  moveRight: "KeyD",
  attack: "Space",
  skill: "KeyR",
  inventory: "KeyI",
  map: "KeyM",
  interact: "KeyE",
  dodge: "ShiftLeft",
  menu: "Tab",
};
const reservedControlCodes = new Set([
  "KeyC",
  "KeyQ",
  "KeyB",
  "KeyJ",
  "KeyF",
  "KeyH",
]);
const formatControl = (code: string) =>
  code === "Space"
    ? "Espaço"
    : code === "ShiftLeft"
      ? "Shift"
      : code === "Tab"
        ? "Tab"
        : code
            .replace(/^Key/, "")
            .replace(/^Digit/, "")
            .replace(/^Arrow/, "↑");
const worldSaveKey = "aetherion-world-v2";
const qaResetHandled = new Set<string>();

const storageForSave = (): Storage | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

const legacyQuestInput = (world: Partial<WorldState>) => ({
  quest: world.quest,
  sideQuest: world.sideQuest,
});

const itemLegacyProjection = (inventory: InventoryState) => ({
  potions: inventory.items["pocao-musgo"] ?? 0,
  wood: inventory.items["madeira-viva"] ?? 0,
  ore: inventory.items["minerio-runico"] ?? 0,
  food: inventory.items["racao-de-viagem"] ?? 0,
});

const projectInventoryToLegacy = (world: WorldState) => {
  const inventory = world.inventory ?? createInventory();
  world.inventory = inventory;
  const projected = itemLegacyProjection(inventory);
  world.player.potions = projected.potions;
  world.resources.wood = projected.wood;
  world.resources.ore = projected.ore;
  world.resources.food = projected.food;
};

const refreshPlayerCombatStats = (world: WorldState, baseStats: Stats) => {
  const inventory = world.inventory ?? createInventory();
  world.inventory = inventory;
  const ratio =
    world.player.maxHealth > 0
      ? world.player.health / world.player.maxHealth
      : 1;
  const bonuses = getBonuses(inventory);
  const derived = getDerivedStats(
    createProgression(baseStats, world.player.level, world.player.xp),
    bonuses
  );
  world.player.maxHealth = derived.maxHealth;
  world.player.maxFocus = derived.maxFocus;
  world.player.health = Math.min(
    derived.maxHealth,
    Math.max(0, ratio * derived.maxHealth)
  );
  world.player.focus = Math.min(derived.maxFocus, world.player.focus);
  const combat = deriveCombatStats(
    derived,
    world.player.level,
    3 + derived.agility * 0.06 + (bonuses.speed ?? 0) * 0.12
  );
  world.player.stats = {
    ...combat,
    physicalAttack: combat.physicalAttack + (bonuses.attack ?? 0),
    minDamage: combat.minDamage + (bonuses.attack ?? 0),
    maxDamage: combat.maxDamage + (bonuses.attack ?? 0),
    magicAttack: combat.magicAttack + (bonuses.magicAttack ?? 0),
    defense: combat.defense + (bonuses.defense ?? 0),
    critChance: Math.min(
      0.55,
      combat.critChance + (bonuses.criticalChance ?? 0)
    ),
    dodgeChance: Math.min(0.45, combat.dodgeChance + (bonuses.evasion ?? 0)),
  };
  world.stats = baseStats;
  projectInventoryToLegacy(world);
};

const projectQuestToLegacy = (world: WorldState) => {
  const questState = world.questState;
  if (!questState) return;
  const tracked = questState.trackedQuestId
    ? getQuestDefinition(questState.trackedQuestId)
    : undefined;
  world.quest = tracked?.title ?? world.quest;
  const activeSide = Object.values(questState.quests).find(runtime => {
    const definition = getQuestDefinition(runtime.id);
    return (
      definition?.kind === "secundaria" &&
      (runtime.status === "active" || runtime.status === "completed")
    );
  });
  if (!activeSide) {
    world.sideQuest = null;
    return;
  }
  const definition = getQuestDefinition(activeSide.id);
  if (!definition) return;
  const objective = definition.objectives[0];
  const progress = objective ? (activeSide.progress[objective.id] ?? 0) : 0;
  world.sideQuest = {
    id: definition.id,
    title: definition.title,
    summary: definition.summary,
    target: objective?.required ?? 1,
    progress,
    claimed: activeSide.status === "claimed",
    reward: {
      gold: definition.rewards.gold ?? 0,
      potions: definition.rewards.items?.find(
        item => item.itemId === "pocao-musgo"
      )?.quantity,
      wood: definition.rewards.items?.find(
        item => item.itemId === "madeira-viva"
      )?.quantity,
      ore: definition.rewards.items?.find(
        item => item.itemId === "minerio-runico"
      )?.quantity,
    },
  };
};

const applyQuestReward = (
  world: WorldState,
  reward: import("../game/quests").QuestReward,
  baseStats: Stats
) => {
  if (reward.gold) world.resources.gold += reward.gold;
  if (reward.reputation)
    Object.entries(reward.reputation).forEach(([faction, amount]) => {
      world.reputation[faction] = (world.reputation[faction] ?? 0) + amount;
    });
  if (reward.items)
    reward.items.forEach(item => {
      world.inventory = addItem(
        world.inventory ?? createInventory(),
        item.itemId,
        item.quantity
      ).state;
    });
  if (reward.xp) {
    const result = grantExperience(
      createProgression(baseStats, world.player.level, world.player.xp),
      reward.xp
    );
    world.player.level = result.state.level;
    world.player.xp = result.state.experience;
    if (result.levelsGained > 0)
      world.notice = `Nível ${world.player.level}: a recompensa fortaleceu seu Eco.`;
  }
  refreshPlayerCombatStats(world, baseStats);
};

const dispatchWorldQuestEvent = (
  world: WorldState,
  event: QuestEvent,
  _baseStats: Stats
) => {
  if (!world.questState)
    world.questState = createQuestState(legacyQuestInput(world));
  const result = dispatchQuestEvent(world.questState, event);
  world.questState = result.state;
  projectQuestToLegacy(world);
  for (const effect of result.effects) {
    if (effect.type === "missao_concluida")
      world.notice = `Missão concluída: ${getQuestDefinition(effect.questId)?.title ?? effect.questId}.`;
    if (effect.type === "missao_liberada")
      world.notice = `Nova missão disponível: ${getQuestDefinition(effect.questId)?.title ?? effect.questId}.`;
  }
  return result;
};

const drawEtherBurst = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  phase: number,
  accent: string
) => {
  const radius = 48 * Math.max(0.2, 1 - phase / 0.62);
  ctx.save();
  ctx.globalAlpha = Math.max(0.1, phase / 0.62);
  ctx.fillStyle = accent;
  for (let index = 0; index < 12; index += 1) {
    const angle = (index * Math.PI) / 6;
    ctx.fillRect(
      Math.round(x + Math.cos(angle) * radius) - 3,
      Math.round(y + Math.sin(angle) * radius) - 3,
      6,
      6
    );
  }
  ctx.fillStyle = "#d8fff0";
  ctx.fillRect(Math.round(x - 5), Math.round(y - 5), 10, 10);
  ctx.restore();
};

const freshWorld = (stats: Stats, profile?: CharacterProfile): WorldState => {
  const inventory = createInventory(
    profile
      ? { profile: { classId: profile.classId, originId: profile.originId } }
      : undefined,
    { includeDefaults: true }
  );
  const progression = createProgression(stats);
  const derived = getDerivedStats(progression, getBonuses(inventory));
  const questState = createQuestState(undefined);
  const player: Player = {
    x: 20,
    y: 20,
    health: 70 + derived.vitality * 7,
    maxHealth: 70 + derived.vitality * 7,
    focus: derived.maxFocus,
    maxFocus: derived.maxFocus,
    level: 1,
    xp: 0,
    essence: 0,
    facing: 1,
    attack: 0,
    special: 0,
    invulnerable: 0,
    evolved: false,
    potions: inventory.items["pocao-musgo"] ?? 0,
    cooldowns: { attack: 0, skill: 0, dodge: 0 },
    statuses: [],
    stats: deriveCombatStats(derived, 1, derived.speed),
  };
  const world: WorldState = {
    player,
    region: firstRegion,
    unlockedRegions: [firstRegion],
    enemies: initialEnemies(),
    essences: [],
    gathered: new Set(),
    openedChests: new Set(),
    defeatedBosses: new Set(),
    notice:
      "A guardiã espera na Floresta de Elaris. A trilha norte está tomada por lobos.",
    quest: "O Lobo e a Raiz",
    sideQuest: null,
    questState,
    inventory,
    audio: { sfx: 0.7, music: 0.38 },
    controls: { ...defaultControls },
    buildings: ["Cabana"],
    resources: { wood: 20, ore: 8, food: 12, gold: 15 },
    reputation: {
      "Vila de Musgo": 0,
      "Ordem da Vigília": 0,
      "Círculo Élfico": 0,
      "Liga dos Mercadores": 0,
      "Clãs Monstruosos": 0,
    },
    stats,
  };
  projectQuestToLegacy(world);
  refreshPlayerCombatStats(world, stats);
  world.player.health = world.player.maxHealth;
  return world;
};
const profileKey = (profile: CharacterProfile) =>
  `${profile.raceId}:${profile.classId}:${profile.originId}:${profile.name}`;

const hydrateWorld = (
  profile: CharacterProfile,
  stats: Stats,
  saveKey: string,
  slotId: string
): WorldState => {
  const fresh = freshWorld(stats, profile);
  const storage = storageForSave();
  if (isQaResetEnabled() && !qaResetHandled.has(saveKey)) {
    try {
      storage?.removeItem(saveKey);
    } catch {
      /* QA reset best effort */
    }
    qaResetHandled.add(saveKey);
  }
  let rawState: Partial<WorldState> | null = null;
  try {
    const raw = storage?.getItem(saveKey);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const candidate =
        parsed.state && typeof parsed.state === "object"
          ? parsed.state
          : parsed;
      if (candidate && typeof candidate === "object")
        rawState = candidate as Partial<WorldState>;
    }
  } catch {
    rawState = null;
  }
  const result = readWorldSave<WorldState>(
    storage,
    saveKey,
    fresh,
    profileKey(profile),
    slotId
  );
  const state = result.state as WorldState;
  const legacy = legacyQuestInput(state);
  const rawPlayer = rawState?.player as Partial<Player> | undefined;
  const rawResources = rawState?.resources;
  const legacyInventory = {
    potions: rawPlayer?.potions,
    resources: rawResources
      ? {
          ...(rawResources.wood !== undefined
            ? { wood: rawResources.wood }
            : {}),
          ...(rawResources.ore !== undefined ? { ore: rawResources.ore } : {}),
          ...(rawResources.food !== undefined
            ? { food: rawResources.food }
            : {}),
        }
      : undefined,
    profile: { classId: profile.classId, originId: profile.originId },
  };
  const rawInventory = rawState?.inventory as
    | (Partial<InventoryState> & { schemaVersion?: number })
    | undefined;
  const hasRawInventory = Boolean(
    rawInventory && Object.prototype.hasOwnProperty.call(rawInventory, "items")
  );
  const inventory = hasRawInventory
    ? deserializeInventory(rawInventory, legacyInventory)
    : rawState
      ? migrateInventory(legacyInventory, { includeDefaults: false })
      : (fresh.inventory ??
        createInventory(undefined, { includeDefaults: true }));
  const questState = deserializeQuestState(state.questState, legacy);
  const world: WorldState = {
    ...fresh,
    ...state,
    player: { ...fresh.player, ...(state.player ?? {}) },
    gathered: state.gathered instanceof Set ? state.gathered : new Set(),
    openedChests:
      state.openedChests instanceof Set ? state.openedChests : new Set(),
    defeatedBosses:
      state.defeatedBosses instanceof Set ? state.defeatedBosses : new Set(),
    enemies:
      Array.isArray(state.enemies) && state.enemies.length
        ? state.enemies
        : fresh.enemies,
    essences: Array.isArray(state.essences) ? state.essences : [],
    unlockedRegions: Array.isArray(state.unlockedRegions)
      ? state.unlockedRegions
      : [firstRegion],
    inventory,
    questState,
    audio: { ...fresh.audio, ...(state.audio ?? {}) },
    controls: { ...fresh.controls, ...(state.controls ?? {}) },
    resources: { ...fresh.resources, ...(state.resources ?? {}) },
  };
  world.enemies = world.enemies.map(enemy => {
    const definitionId = enemy.definitionId ?? enemy.name ?? enemy.kind;
    const definition = getEnemyDefinition(
      definitionId,
      worldRegions[world.region]?.tier ?? 1,
      enemy.name
    );
    const ratio = enemy.maxHealth > 0 ? enemy.health / enemy.maxHealth : 1;
    const enriched = createEnemy(
      enemy.id,
      definition.kind,
      enemy.x,
      enemy.y,
      worldRegions[world.region]?.tier ?? 1,
      { bossName: enemy.name, boss: Boolean(enemy.boss), definitionId }
    );
    return {
      ...enriched,
      ...enemy,
      definitionId: definition.id,
      maxHealth: definition.maxHealth,
      health:
        enemy.alive === false
          ? 0
          : Math.min(
              definition.maxHealth,
              Math.max(0, Math.round(ratio * definition.maxHealth))
            ),
      stats: enemy.stats ?? enemyCombatStats(definition),
      cooldowns: enemy.cooldowns ?? { attack: 0, skill: 0, dodge: 0 },
      statuses: enemy.statuses ?? [],
      defeated: Boolean(enemy.defeated ?? enemy.alive === false),
      lootClaimed: Boolean(enemy.lootClaimed),
      alive: enemy.alive !== false && enemy.health > 0,
      death: 0,
      respawnRemaining:
        !enemy.boss && (enemy.alive === false || enemy.health <= 0)
          ? 30
          : undefined,
    };
  });
  if (!world.enemies.length && worldRegions[world.region])
    world.enemies = initialEnemies(world.region);
  refreshPlayerCombatStats(world, stats);
  projectQuestToLegacy(world);
  return world;
};

const persistWorld = (
  profile: CharacterProfile,
  world: WorldState,
  saveKey: string,
  slotId: string
) => {
  const storage = storageForSave();
  if (!storage) return { ok: false, warning: "Armazenamento indisponível." };
  const payload: WorldState = {
    ...world,
    questState: world.questState
      ? serializeQuestState(world.questState)
      : undefined,
    inventory: world.inventory
      ? serializeInventory(world.inventory)
      : undefined,
  };
  const result = safePersistWorld(
    storage,
    saveKey,
    payload,
    profileKey(profile),
    slotId
  );
  if (!result.ok && result.warning) world.notice = result.warning;
  return result;
};

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
const hash = (x: number, y: number) =>
  Math.abs(Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1;
const terrain = (x: number, y: number) => {
  if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) return "void";
  if ((x > 1 && x < 7 && y > 3 && y < 12) || (x > 34 && y > 6 && y < 14))
    return "water";
  if (x >= 25 && x <= 34 && y >= 18 && y <= 26) return "village";
  if ((x >= 17 && x <= 19) || (y >= 19 && y <= 21 && x >= 18 && x <= 30))
    return "path";
  return "grass";
};
const isTree = (x: number, y: number) =>
  terrain(x, y) === "grass" &&
  hash(x, y) > 0.82 &&
  !(
    (x > 10 && x < 25 && y > 5 && y < 14) ||
    (x > 8 && x < 16 && y > 17 && y < 22)
  );
const minimapTerrain = Array.from({ length: 15 * 21 }, (_, index) => {
  const mx = index % 21;
  const my = Math.floor(index / 21);
  const x = Math.floor((mx / 21) * WORLD_W);
  const y = Math.floor((my / 15) * WORLD_H);
  return { id: `${mx}-${my}`, type: terrain(x, y), tree: isTree(x, y) };
});
export default function RpgWorldCanvas({
  profile,
  slotId,
  onReturnToCreation,
  onLogout,
}: {
  profile: CharacterProfile;
  slotId: string;
  onReturnToCreation: () => void | Promise<void>;
  onLogout: () => void | Promise<void>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const audioBusRef = useRef<AudioBus | null>(null);
  const startingStats = profileStats(profile);
  const saveKey = `${worldSaveKey}:${slotId}`;
  const [initialWorld] = useState(() =>
    hydrateWorld(profile, startingStats, saveKey, slotId)
  );
  const stateRef = useRef<WorldState>(initialWorld);
  const [hud, setHud] = useState<Hud>(() => ({
    health: stateRef.current.player.health,
    maxHealth: stateRef.current.player.maxHealth,
    focus: 100,
    maxFocus: 100,
    level: 1,
    xp: 0,
    essence: 0,
    potions: 2,
    wolves: 0,
    notice: stateRef.current.notice,
    quest: stateRef.current.quest,
    menu: "none",
    buildings: ["Cabana"],
    wood: 20,
    ore: 8,
    food: 12,
    gold: 15,
    playerX: 20,
    playerY: 20,
  }));
  const [menu, setMenu] = useState<Menu>("none");
  const [dialogue, setDialogue] = useState<Npc | null>(null);
  const [service, setService] = useState<ServicePoint | null>(null);
  const menuRef = useRef<Menu>("none");
  const dialogueRef = useRef<Npc | null>(null);
  const serviceRef = useRef<ServicePoint | null>(null);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(
    () => stateRef.current.audio
  );
  const audioSettingsRef = useRef<AudioSettings>(stateRef.current.audio);
  const [controls, setControls] = useState<ControlSettings>(
    () => stateRef.current.controls
  );
  const controlsRef = useRef<ControlSettings>(stateRef.current.controls);
  const stats = useMemo(() => profileStats(profile), [profile]);
  const race = races.find(item => item.id === profile.raceId)!;
  useEffect(() => {
    menuRef.current = menu;
  }, [menu]);
  useEffect(() => {
    dialogueRef.current = dialogue;
  }, [dialogue]);
  useEffect(() => {
    serviceRef.current = service;
  }, [service]);
  useEffect(() => {
    const requestedMenu = qaMenuFromQuery();
    if (!requestedMenu) return;
    menuRef.current = requestedMenu;
    setMenu(requestedMenu);
  }, []);
  const bindControl = useCallback((action: ControlAction, code: string) => {
    if (
      reservedControlCodes.has(code) ||
      Object.entries(controlsRef.current).some(
        ([existing, value]) => existing !== action && value === code
      )
    )
      return false;
    const next = { ...controlsRef.current, [action]: code };
    controlsRef.current = next;
    stateRef.current.controls = next;
    setControls(next);
    return true;
  }, []);
  const restoreControls = useCallback(() => {
    const next = { ...defaultControls };
    controlsRef.current = next;
    stateRef.current.controls = next;
    setControls(next);
  }, []);

  useEffect(() => {
    const travelFromAtlas = (event: Event) => {
      const detail = (event as CustomEvent<AtlasTravel | RegionId>).detail;
      const destination =
        typeof detail === "string" ? detail : detail.destination;
      const payment = typeof detail === "string" ? "focus" : detail.payment;
      const nextRegion = worldRegions[destination];
      if (!nextRegion) return;
      const world = stateRef.current;
      if (!world.unlockedRegions.includes(destination)) {
        world.notice =
          "Explore essa região primeiro para desbloquear a viagem rápida.";
        return;
      }
      const cost = travelCost(nextRegion);
      if (payment === "focus" && world.player.focus < cost.focus) {
        world.notice = "Foco insuficiente para a viagem rápida.";
        return;
      }
      if (payment === "gold" && world.resources.gold < cost.gold) {
        world.notice = "Ouro insuficiente para a viagem rápida.";
        return;
      }
      if (payment === "focus") world.player.focus -= cost.focus;
      else world.resources.gold -= cost.gold;
      world.region = destination;
      dispatchWorldQuestEvent(
        world,
        {
          type: "region",
          targetId: destination,
          regionId: destination,
          eventId: `travel:${destination}:${Date.now()}`,
        },
        profileStats(profile)
      );
      world.unlockedRegions = Array.from(
        new Set([...world.unlockedRegions, destination])
      );
      world.enemies = initialEnemies(destination).filter(
        enemy =>
          !enemy.boss ||
          !world.defeatedBosses?.has(
            enemy.definitionId ?? enemy.name ?? enemy.id
          )
      );
      world.essences = [];
      world.gathered = new Set();
      world.player.x = 4;
      world.player.y = 15;
      world.notice = `O atlas conduz você para ${nextRegion.name} por ${payment === "focus" ? `${cost.focus} de foco` : `${cost.gold} de ouro`}.`;
      setHud(current => ({
        ...current,
        focus: world.player.focus,
        gold: world.resources.gold,
        notice: world.notice,
        playerX: world.player.x,
        playerY: world.player.y,
      }));
      menuRef.current = "none";
      dialogueRef.current = null;
      serviceRef.current = null;
      setMenu("none");
    };
    window.addEventListener("aetherion:atlas-travel", travelFromAtlas);
    return () =>
      window.removeEventListener("aetherion:atlas-travel", travelFromAtlas);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const keys = new Set<string>();
    const combatTexts: CombatText[] = [];
    const audioBus = createAudioBus({
      settings: audioSettingsRef.current,
      maxVoices: 8,
    });
    audioBusRef.current = audioBus;
    let audio: AudioContext | null = null;
    let musicStarted = false;
    const musicOscillators: OscillatorNode[] = [];
    const terrainCache = new TerrainLayerCache();
    let frame = 0;
    let previous = performance.now();
    let uiTimer = 0;
    let saveTimer = 0;
    let statusFeedbackTimer = 0;
    let raf = 0;
    const logicalWidth = 960;
    const logicalHeight = 540;
    const resize = () => {
      canvas.width = logicalWidth;
      canvas.height = logicalHeight;
      ctx.imageSmoothingEnabled = false;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    };
    const spawnCombatText = (
      x: number,
      y: number,
      text: string,
      color: string,
      scale = 1
    ) =>
      combatTexts.push({
        id: `${performance.now()}-${Math.random()}`,
        x,
        y,
        text,
        color,
        life: 0.72,
        maxLife: 0.72,
        scale,
      });
    const ensureAudio = () => {
      audio ??= new AudioContext();
      if (audio.state === "suspended") void audio.resume();
      return audio;
    };
    const startMusic = () => {
      try {
        const engine = ensureAudio();
        if (musicStarted) return;
        musicStarted = true;
        const gain = engine.createGain();
        gain.gain.setValueAtTime(
          audioSettingsRef.current.music * 0.028,
          engine.currentTime
        );
        const drone = engine.createOscillator();
        const shimmer = engine.createOscillator();
        const filter = engine.createBiquadFilter();
        drone.type = "sine";
        drone.frequency.value = 82.4;
        shimmer.type = "triangle";
        shimmer.frequency.value = 246.94;
        filter.type = "lowpass";
        filter.frequency.value = 620;
        shimmer.detune.value = 7;
        drone.connect(gain);
        shimmer.connect(filter).connect(gain);
        gain.connect(engine.destination);
        drone.start();
        shimmer.start();
        musicOscillators.push(drone, shimmer);
        musicGainRef.current = gain;
      } catch {
        /* música permanece opcional quando o navegador bloqueia áudio */
      }
    };
    const travelTo = (world: WorldState, destination: RegionId) => {
      const region = worldRegions[destination];
      if (!region) return;
      world.region = destination;
      world.unlockedRegions = Array.from(
        new Set([...world.unlockedRegions, destination])
      );
      world.enemies = initialEnemies(destination).filter(
        enemy =>
          !enemy.boss ||
          !world.defeatedBosses?.has(
            enemy.definitionId ?? enemy.name ?? enemy.id
          )
      );
      world.essences = [];
      world.gathered = new Set();
      world.player.x = 4;
      world.player.y = 15;
      world.notice = `Você atravessou a rota e chegou a ${region.village}, em ${region.name}.`;
      if (world.questState) {
        const reached = dispatchQuestEvent(world.questState, {
          type: "region",
          targetId: destination,
          regionId: destination,
          eventId: `region:${destination}`,
        });
        world.questState = reached.state;
        projectQuestToLegacy(world);
        if (
          world.unlockedRegions.includes(firstRegion) &&
          region.mapKind === "settlement"
        ) {
          const escort = dispatchQuestEvent(world.questState, {
            type: "escort",
            targetId: "moss-village-route",
            regionId: firstRegion,
            eventId: `escort:${destination}`,
          });
          world.questState = escort.state;
          projectQuestToLegacy(world);
        }
      }
      menuRef.current = "none";
      dialogueRef.current = null;
      serviceRef.current = null;
    };
    const isBlocked = (x: number, y: number) =>
      isTree(x, y) || terrain(x, y) === "water";
    const movePlayer = (
      world: WorldState,
      dx: number,
      dy: number,
      elapsed: number
    ) => {
      const length = Math.hypot(dx, dy);
      if (!length) return;
      if (world.player.statuses?.some(status => status.kind === "stun")) return;
      const slowed = world.player.statuses?.some(
        status => status.kind === "slow"
      );
      const speed =
        (world.player.stats?.speed ?? 3 + stats.agility * 0.06) *
        (slowed ? 0.6 : 1);
      const next = moveWithCollision(
        world.player,
        { x: (dx / length) * speed, y: (dy / length) * speed },
        elapsed,
        {
          minX: 1,
          maxX: WORLD_W - 2,
          minY: 1,
          maxY: WORLD_H - 2,
          radius: 0.2,
          isBlocked,
        }
      );
      if (next.x !== world.player.x || next.y !== world.player.y)
        world.player.facing = dx || world.player.facing;
      world.player.x = next.x;
      world.player.y = next.y;
    };
    let keydown: (event: KeyboardEvent) => void;
    const getQaSnapshot = (): QaSnapshot => {
      const world = stateRef.current;
      return {
        enabled: true,
        region: world.region,
        menu: menuRef.current,
        dialogueNpcId: dialogueRef.current?.id ?? null,
        serviceId: serviceRef.current?.id ?? null,
        simulationPaused:
          menuRef.current !== "none" ||
          dialogueRef.current !== null ||
          serviceRef.current !== null,
        notice: world.notice,
        quest: world.quest,
        sideQuest: world.sideQuest
          ? {
              id: world.sideQuest.id,
              progress: world.sideQuest.progress,
              target: world.sideQuest.target,
              claimed: world.sideQuest.claimed,
            }
          : null,
        player: {
          x: world.player.x,
          y: world.player.y,
          health: world.player.health,
          maxHealth: world.player.maxHealth,
          focus: world.player.focus,
          maxFocus: world.player.maxFocus,
          level: world.player.level,
          xp: world.player.xp,
          essence: world.player.essence,
          facing: world.player.facing,
          potions: world.player.potions,
        },
        resources: { ...world.resources },
        inventory: serializeInventory(
          world.inventory ??
            createInventory(undefined, { includeDefaults: false })
        ),
        quests: world.questState ?? createQuestState(legacyQuestInput(world)),
        cooldowns: {
          attack: world.player.cooldowns?.attack ?? 0,
          skill: world.player.cooldowns?.skill ?? 0,
          dodge: world.player.cooldowns?.dodge ?? 0,
        },
        stats: {
          vitality: world.player.stats?.vitality ?? stats.vitality,
          power: world.player.stats?.power ?? stats.power,
          ether: world.player.stats?.ether ?? stats.ether,
          agility: world.player.stats?.agility ?? stats.agility,
          resolve: world.player.stats?.resolve ?? stats.resolve,
        },
        enemies: world.enemies.map(enemy => ({
          id: enemy.id,
          kind: enemy.kind,
          name: enemy.name ?? null,
          x: enemy.x,
          y: enemy.y,
          health: enemy.health,
          maxHealth: enemy.maxHealth,
          alive: enemy.alive,
          death: enemy.death ?? 0,
          boss: Boolean(enemy.boss),
          behavior: enemy.behavior ?? null,
          telegraph: enemy.telegraphLabel || enemy.telegraph || null,
        })),
        essences: world.essences.map(essence => ({
          id: essence.id,
          x: essence.x,
          y: essence.y,
        })),
      };
    };
    const qaAction = (action: QaAction): QaSnapshot => {
      const world = stateRef.current;
      if (action.type === "setPlayer") {
        if (typeof action.x === "number")
          world.player.x = clamp(action.x, 1, WORLD_W - 2);
        if (typeof action.y === "number")
          world.player.y = clamp(action.y, 1, WORLD_H - 2);
        if (typeof action.health === "number")
          world.player.health = clamp(action.health, 0, world.player.maxHealth);
        if (typeof action.focus === "number")
          world.player.focus = clamp(action.focus, 0, world.player.maxFocus);
        if (typeof action.facing === "number")
          world.player.facing = action.facing < 0 ? -1 : 1;
        return getQaSnapshot();
      }
      if (action.type === "menu") {
        menuRef.current = action.menu;
        dialogueRef.current = null;
        serviceRef.current = null;
        setDialogue(null);
        setService(null);
        setMenu(action.menu);
        return getQaSnapshot();
      }
      if (action.type === "move") {
        if (getQaSnapshot().simulationPaused) return getQaSnapshot();
        const direction = action.direction;
        const vector =
          direction === "up"
            ? { x: 0, y: -1 }
            : direction === "down"
              ? { x: 0, y: 1 }
              : direction === "left"
                ? { x: -1, y: 0 }
                : direction === "right"
                  ? { x: 1, y: 0 }
                  : { x: action.dx ?? 0, y: action.dy ?? 0 };
        const length = Math.hypot(vector.x, vector.y);
        const moveDistance = Math.max(
          0,
          Math.min(8, action.distance ?? (length ? 1 : 0))
        );
        const speed = 3 + stats.agility * 0.06;
        movePlayer(world, vector.x, vector.y, moveDistance / speed);
        return getQaSnapshot();
      }
      if (action.type === "travel") {
        if (!worldRegions[action.destination]) {
          world.notice = "Destino QA inexistente.";
          return getQaSnapshot();
        }
        const payment = action.payment ?? "focus";
        const cost = travelCost(worldRegions[action.destination]);
        if (payment === "focus" && world.player.focus < cost.focus) {
          world.notice = "Foco insuficiente para a viagem rápida.";
          return getQaSnapshot();
        }
        if (payment === "gold" && world.resources.gold < cost.gold) {
          world.notice = "Ouro insuficiente para a viagem rápida.";
          return getQaSnapshot();
        }
        if (payment === "focus") world.player.focus -= cost.focus;
        else world.resources.gold -= cost.gold;
        travelTo(world, action.destination);
        return getQaSnapshot();
      }
      if (action.type === "talk") {
        if (getQaSnapshot().simulationPaused) return getQaSnapshot();
        const npc = Npcs(world.region).find(item =>
          action.npcId
            ? item.id === action.npcId
            : distance(world.player, item) < 1.45
        );
        if (!npc || distance(world.player, npc) >= 1.45) {
          world.notice = "O NPC QA está fora do alcance.";
          return getQaSnapshot();
        }
        dialogueRef.current = npc;
        setDialogue(npc);
        return getQaSnapshot();
      }
      if (action.type === "collect") {
        if (getQaSnapshot().simulationPaused) return getQaSnapshot();
        keydown(new KeyboardEvent("keydown", { code: "KeyF" }));
        keys.delete("KeyF");
        return getQaSnapshot();
      }
      if (action.type === "attack" || action.type === "skill") {
        if (getQaSnapshot().simulationPaused) return getQaSnapshot();
        const code =
          action.type === "attack"
            ? controlsRef.current.attack
            : controlsRef.current.skill;
        const target = action.targetId
          ? world.enemies.find(enemy => enemy.id === action.targetId)
          : undefined;
        if (target) {
          world.player.x = clamp(
            target.x - world.player.facing * 0.9,
            1,
            WORLD_W - 2
          );
          world.player.y = target.y;
        }
        keydown(new KeyboardEvent("keydown", { code }));
        keys.delete(code);
        return getQaSnapshot();
      }
      return getQaSnapshot();
    };
    const playerCombatStats = (world: WorldState): CombatStats =>
      world.player.stats ??
      deriveCombatStats(stats, world.player.level, Math.max(1, stats.agility));
    const syncInventory = (world: WorldState, inventory: InventoryState) => {
      world.inventory = inventory;
      refreshPlayerCombatStats(world, stats);
      projectInventoryToLegacy(world);
    };
    const dispatchGameplayQuestEvent = (
      world: WorldState,
      event: QuestEvent
    ) => {
      dispatchWorldQuestEvent(world, event, stats);
      if (event.type === "npc") audioBus.play("npc");
      if (event.type === "resource" || event.type === "item")
        audioBus.play("collect");
      if (
        event.type === "region" ||
        event.type === "escort" ||
        event.type === "boss"
      )
        audioBus.play("quest");
    };
    const beginDeath = (world: WorldState, enemy: Enemy) => {
      if (enemy.defeated || enemy.lootClaimed) return;
      const definition = getEnemyDefinition(
        enemy.definitionId ?? enemy.kind,
        worldRegions[world.region]?.tier ?? 1,
        enemy.name
      );
      const xp = Math.max(0, enemy.xp ?? definition.xp);
      const gold = Math.max(0, enemy.gold ?? definition.gold);
      enemy.health = 0;
      enemy.hurt = 0.24;
      enemy.death = 0.6;
      enemy.defeated = true;
      enemy.lootClaimed = true;
      enemy.killCount = (enemy.killCount ?? 0) + 1;
      const experience = grantExperience(
        createProgression(stats, world.player.level, world.player.xp),
        xp
      );
      world.player.level = experience.state.level;
      world.player.xp = experience.state.experience;
      world.resources.gold += gold;
      const namedTable = Object.keys(lootTables).find(key =>
        (enemy.name ?? definition.name).startsWith(key)
      );
      const lootKey =
        namedTable ??
        (enemy.boss
          ? "Chefe Antigo"
          : enemy.kind === "wolf"
            ? "Lobo Cinzento"
            : enemy.kind === "slime"
              ? "Slime"
              : "Goblin");
      const loot = rollLoot(
        world.inventory ??
          createInventory(undefined, { includeDefaults: false }),
        lootKey,
        Date.now() + enemy.killCount
      );
      syncInventory(world, loot.state);
      if (experience.levelsGained > 0) {
        world.player.health = world.player.maxHealth;
        world.player.focus = world.player.maxFocus;
      }
      dispatchGameplayQuestEvent(world, {
        type: "kill",
        targetId: enemy.boss
          ? (enemy.definitionId ?? enemy.name ?? enemy.kind)
          : enemy.kind,
        regionId: world.region,
        eventId: `kill:${enemy.id}:${enemy.killCount}`,
      });
      if (enemy.boss) {
        world.defeatedBosses ??= new Set<string>();
        world.defeatedBosses.add(enemy.definitionId ?? enemy.name ?? enemy.id);
        dispatchGameplayQuestEvent(world, {
          type: "boss",
          targetId: enemy.definitionId ?? enemy.name ?? enemy.id,
          regionId: world.region,
          eventId: `boss:${enemy.id}:${enemy.killCount}`,
        });
      }
      for (const drop of loot.drops) {
        dispatchGameplayQuestEvent(world, {
          type: "item",
          targetId: drop.itemId,
          amount: drop.quantity,
          regionId: world.region,
          eventId: `loot:${enemy.id}:${enemy.killCount}:${drop.itemId}`,
        });
      }
      const drops = loot.drops
        .map(drop => `${drop.quantity}× ${drop.itemId}`)
        .join(", ");
      world.notice = `+${xp} XP · +${gold} ouro${drops ? ` · ${drops}` : ""}.${experience.levelsGained > 0 ? ` Nível ${world.player.level}!` : ""}`;
      spawnCombatText(
        enemy.x,
        enemy.y - 0.7,
        `+${xp} XP · +${gold}¤`,
        "#e7bd58",
        1.05
      );
      if (drops)
        spawnCombatText(enemy.x, enemy.y - 1.25, drops, "#8ff3d0", 0.8);
      audioBus.play("defeat");
    };
    const applyEnemyResult = (
      world: WorldState,
      enemy: Enemy,
      result: ReturnType<typeof resolvePlayerAttack>
    ) => {
      if (result.dodged) {
        spawnCombatText(enemy.x, enemy.y - 0.55, "ESQUIVA", "#8bd5c0", 0.78);
        return;
      }
      if (!result.hit) {
        if (result.message) world.notice = result.message;
        return;
      }
      if (result.dodged) {
        spawnCombatText(enemy.x, enemy.y - 0.55, "ESQUIVA", "#8bd5c0", 0.78);
        return;
      }
      enemy.health = Math.max(0, enemy.health - result.damage);
      enemy.hurt = 0.24;
      enemy.guard = result.blocked ? 0.35 : 0;
      if (result.status)
        enemy.statuses = applyStatus(enemy.statuses, result.status);
      const label = result.critical
        ? `CRÍTICO -${result.damage}`
        : result.blocked
          ? `BLOQUEIO -${result.damage}`
          : `-${result.damage}`;
      spawnCombatText(
        enemy.x,
        enemy.y - 0.55,
        label,
        result.critical ? "#f3a95f" : result.blocked ? "#8bd5c0" : "#f2d18a",
        result.critical ? 1.2 : 0.95
      );
      audioBus.play(
        result.critical ? "crit" : result.blocked ? "block" : "hit"
      );
      if (result.defeated) beginDeath(world, enemy);
    };
    const dealEnemyAttack = (
      world: WorldState,
      enemy: Enemy,
      definition: EnemyDefinition
    ) => {
      const target = createCombatant(
        "player",
        world.player.health,
        world.player.maxHealth,
        playerCombatStats(world),
        world.player.statuses
      );
      const result = resolveEnemyAttack(
        createCombatant(
          enemy.id,
          enemy.health,
          enemy.maxHealth,
          enemy.stats ?? enemyCombatStats(definition),
          enemy.statuses
        ),
        target,
        enemy.cooldowns ?? { attack: 0, skill: 0, dodge: 0 },
        {
          damageType: definition.behavior === "mágico" ? "magical" : "physical",
          status: definition.statusOnHit,
          cooldown: definition.attackCooldown,
        }
      );
      enemy.cooldowns = result.cooldowns;
      enemy.attack = result.cooldowns.attack;
      if (!result.hit && !result.dodged) return;
      if (result.dodged) {
        spawnCombatText(
          world.player.x,
          world.player.y - 0.75,
          "ESQUIVA",
          "#8bd5c0",
          0.82
        );
        return;
      }
      world.player.health = Math.max(0, world.player.health - result.damage);
      if (result.status)
        world.player.statuses = applyStatus(
          world.player.statuses,
          result.status
        );
      spawnCombatText(
        world.player.x,
        world.player.y - 0.75,
        `-${result.damage}`,
        "#f07d72",
        1.05
      );
      audioBus.play(result.critical ? "crit" : "hurt");
      world.notice = `${definition.name} encontrou sua forma.`;
    };
    keydown = (event: KeyboardEvent) => {
      const control = controlsRef.current;
      if (
        Object.values(control).includes(event.code) ||
        event.code === "KeyF" ||
        event.code === "KeyH"
      )
        event.preventDefault();
      if (event.code === "Escape") {
        event.preventDefault();
        keys.clear();
        menuRef.current = "none";
        dialogueRef.current = null;
        serviceRef.current = null;
        setMenu("none");
        setDialogue(null);
        setService(null);
        return;
      }
      if (
        menuRef.current !== "none" ||
        dialogueRef.current !== null ||
        serviceRef.current !== null
      )
        return;
      keys.add(event.code);
      if (event.repeat) return;
      startMusic();
      const world = stateRef.current;
      const player = world.player;
      if (player.health <= 0) return;
      const pStats = playerCombatStats(world);
      const inCone = (enemy: Enemy, range: number) => {
        const dx = enemy.x - player.x;
        return (
          distance(player, enemy) <= range &&
          (Math.abs(dx) < 0.55 || dx * (player.facing || 1) >= -0.15)
        );
      };
      if (event.code === control.attack) {
        if ((player.cooldowns?.attack ?? 0) > 0) return;
        const targets = world.enemies.filter(
          enemy => enemy.alive && !enemy.death && inCone(enemy, 1.65)
        );
        if (!targets.length) {
          world.notice =
            "A lâmina encontrou apenas névoa. Aproxime-se da criatura.";
          return;
        }
        const cooldowns = player.cooldowns ?? { attack: 0, skill: 0, dodge: 0 };
        const attacker = createCombatant(
          "player",
          player.health,
          player.maxHealth,
          pStats,
          player.statuses
        );
        targets.forEach(enemy => {
          const definition = getEnemyDefinition(
            enemy.definitionId ?? enemy.kind,
            worldRegions[world.region]?.tier ?? 1,
            enemy.name
          );
          const result = resolvePlayerAttack(
            attacker,
            createCombatant(
              enemy.id,
              enemy.health,
              enemy.maxHealth,
              enemy.stats ?? enemyCombatStats(definition),
              enemy.statuses
            ),
            { ...cooldowns, attack: 0 }
          );
          applyEnemyResult(world, enemy, result);
        });
        player.cooldowns = { ...cooldowns, attack: 0.33 };
        player.attack = 0.33;
        return;
      }
      if (event.code === control.skill) {
        const cooldowns = player.cooldowns ?? { attack: 0, skill: 0, dodge: 0 };
        if (cooldowns.skill > 0) {
          world.notice = "A habilidade ainda está em recarga.";
          return;
        }
        if (player.focus < 35) {
          world.notice = "O foco de Éter ainda não responde.";
          return;
        }
        const targets = world.enemies.filter(
          enemy => enemy.alive && !enemy.death && distance(player, enemy) <= 2.7
        );
        player.focus -= 35;
        const attacker = createCombatant(
          "player",
          player.health,
          player.maxHealth,
          pStats,
          player.statuses
        );
        targets.forEach(enemy => {
          const definition = getEnemyDefinition(
            enemy.definitionId ?? enemy.kind,
            worldRegions[world.region]?.tier ?? 1,
            enemy.name
          );
          const result = resolveSkill(
            attacker,
            createCombatant(
              enemy.id,
              enemy.health,
              enemy.maxHealth,
              enemy.stats ?? enemyCombatStats(definition),
              enemy.statuses
            ),
            { ...cooldowns, skill: 0 },
            { status: { kind: "burn", duration: 3.5, potency: 1 } }
          );
          applyEnemyResult(world, enemy, result);
        });
        player.cooldowns = { ...cooldowns, skill: 2.5 };
        player.special = 0.62;
        audioBus.play("ether");
        world.notice = `${classes.find(item => item.id === profile.classId)?.skills[0] ?? "Técnica de Éter"} alcança ${targets.length || "nenhuma"} criatura.`;
        return;
      }
      if (event.code === control.dodge) {
        const result = resolveDodge(
          player.cooldowns ?? { attack: 0, skill: 0, dodge: 0 },
          1.1
        );
        if (!result.accepted) {
          world.notice = "A esquiva ainda está em recarga.";
          return;
        }
        player.cooldowns = result.cooldowns;
        player.invulnerable = 0.45;
        const next = moveWithCollision(
          player,
          { x: (player.facing || 1) * 1.2, y: 0 },
          1,
          {
            minX: 1,
            maxX: WORLD_W - 2,
            minY: 1,
            maxY: WORLD_H - 2,
            radius: 0.2,
            isBlocked,
          }
        );
        player.x = next.x;
        player.y = next.y;
        world.notice = "Esquiva executada.";
        return;
      }
      if (event.code === "KeyF") {
        const essence = world.essences.find(
          item => distance(player, item) < 1.1
        );
        const node = gatherNodes.find(
          item => !world.gathered.has(item.id) && distance(player, item) < 1.1
        );
        if (essence) {
          world.essences = world.essences.filter(
            item => item.id !== essence.id
          );
          player.essence += 1;
          syncInventory(
            world,
            addItem(
              world.inventory ??
                createInventory(undefined, { includeDefaults: false }),
              "fragmento-eter",
              1
            ).state
          );
          dispatchGameplayQuestEvent(world, {
            type: "resource",
            targetId: "essence",
            amount: 1,
            regionId: world.region,
            eventId: `essence:${essence.id}`,
          });
          if (player.essence >= 3 && !player.evolved) {
            player.evolved = true;
            world.notice = `Evolução iniciada: ${race.evolution[0]} desperta dentro de você.`;
          } else world.notice = "A essência se mistura à sua forma.";
          audioBus.play("collect");
        } else if (node) {
          world.gathered.add(node.id);
          const itemId =
            node.kind === "wood" ? "madeira-viva" : "minerio-runico";
          syncInventory(
            world,
            addItem(
              world.inventory ??
                createInventory(undefined, { includeDefaults: false }),
              itemId,
              4
            ).state
          );
          dispatchGameplayQuestEvent(world, {
            type: "resource",
            targetId: node.kind,
            amount: 4,
            regionId: world.region,
            eventId: `resource:${world.region}:${node.id}:${Date.now()}`,
          });
          world.notice =
            node.kind === "wood"
              ? "Madeira viva coletada para a Vila de Musgo."
              : "Minério de raiz coletado. A forja pode usar isso.";
          audioBus.play("collect");
        } else world.notice = "Nenhuma essência ou recurso está ao alcance.";
        return;
      }
      if (event.code === "KeyH") {
        if (player.health >= player.maxHealth) {
          world.notice = "Sua vitalidade já está plena.";
          return;
        }
        const result = use(
          world.inventory ??
            createInventory(undefined, { includeDefaults: false }),
          "pocao-musgo"
        );
        if (result.changed && result.effect?.heal) {
          syncInventory(world, result.state);
          player.health = heal(
            player,
            result.effect.heal + stats.resolve * 2
          ).health;
          world.notice = "A poção de musgo recompõe sua forma.";
          audioBus.play("heal");
        } else
          world.notice =
            (world.inventory?.items["pocao-musgo"] ?? 0) > 0
              ? "Sua vitalidade já está plena."
              : "A bolsa não guarda mais poções.";
        return;
      }
      if (event.code === control.interact) {
        const region = worldRegions[world.region];
        const npc = Npcs(world.region).find(
          item => distance(player, item) < 1.45
        );
        const poi = region.services.find(item => distance(player, item) < 1.5);
        if (poi?.kind === "gate" && poi.destination) {
          dispatchGameplayQuestEvent(world, {
            type: "region",
            targetId: poi.destination,
            regionId: poi.destination,
            eventId: `region:${poi.destination}`,
          });
          travelTo(world, poi.destination);
        } else if (poi) {
          serviceRef.current = poi;
          setService(poi);
        } else if (npc) {
          dispatchGameplayQuestEvent(world, {
            type: "npc",
            targetId: npc.id,
            regionId: world.region,
            eventId: `npc:${npc.id}:${Math.floor(performance.now())}`,
          });
          dialogueRef.current = npc;
          setDialogue(npc);
          audioBus.play("npc");
        } else if (distance(player, { x: 20.2, y: 4.8 }) < 1.45) {
          dispatchGameplayQuestEvent(world, {
            type: "find",
            targetId:
              world.region === "biome-o-vazio-de-erebos"
                ? "void-whisper"
                : "primordial-tree-root",
            regionId: world.region,
            eventId: `find:root:${world.region}`,
          });
          menuRef.current = "dungeon";
          setMenu("dungeon");
        } else world.notice = "Nada aqui responde ao seu chamado.";
        return;
      }
      const menuByKey: Record<string, Menu> = {
        KeyC: "character",
        [control.inventory]: "inventory",
        [control.map]:
          worldRegions[world.region].mapKind === "biome" ? "map" : "local-map",
        KeyQ: "quests",
        KeyB: "village",
        KeyJ: "codex",
        [control.menu]: "settings",
      };
      const nextMenu = menuByKey[event.code];
      if (nextMenu) {
        const next = menuRef.current === nextMenu ? "none" : nextMenu;
        menuRef.current = next;
        setMenu(next);
        audioBus.play("menu");
      }
    };
    const keyup = (event: KeyboardEvent) => keys.delete(event.code);
    const releaseInputs = () => keys.clear();
    const hidePage = () => {
      if (document.visibilityState === "hidden") {
        keys.clear();
        persistWorld(profile, stateRef.current, saveKey, slotId);
      }
    };
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", releaseInputs);
    document.addEventListener("visibilitychange", hidePage);
    const qaEnabled = isQaMapEnabled();
    const qaApi: AetherionQaApi | null = qaEnabled
      ? {
          getSnapshot: getQaSnapshot,
          sendAction: action => {
            const snapshot = qaAction(action);
            window.dispatchEvent(
              new CustomEvent<QaSnapshot>("aetherion:qa-action", {
                detail: snapshot,
              })
            );
            return snapshot;
          },
        }
      : null;
    if (qaApi) window.__AETHERION_QA__ = qaApi;
    resize();
    const emit = () => {
      const world = stateRef.current;
      const defeated = world.enemies.filter(
        enemy => enemy.kind === "wolf" && !enemy.alive
      ).length;
      setHud(old => ({
        ...old,
        health: Math.ceil(world.player.health),
        maxHealth: world.player.maxHealth,
        focus: world.player.focus,
        maxFocus: world.player.maxFocus,
        level: world.player.level,
        xp: world.player.xp,
        essence: world.player.essence,
        potions: world.player.potions,
        wolves: defeated,
        notice: world.notice,
        quest: world.quest,
        buildings: [...world.buildings],
        wood: world.resources.wood,
        ore: world.resources.ore,
        food: world.resources.food,
        gold: world.resources.gold,
        playerX: world.player.x,
        playerY: world.player.y,
      }));
    };
    const loop = (now: number) => {
      const delta = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      frame += delta;
      const world = stateRef.current;
      const p = world.player;
      const control = controlsRef.current;
      const simulationPaused =
        menuRef.current !== "none" ||
        dialogueRef.current !== null ||
        serviceRef.current !== null;
      let mx = 0;
      let my = 0;
      if (!simulationPaused) {
        if (keys.has(control.moveUp)) my -= 1;
        if (keys.has(control.moveDown)) my += 1;
        if (keys.has(control.moveLeft)) mx -= 1;
        if (keys.has(control.moveRight)) mx += 1;
        if (mx || my) {
          const length = Math.hypot(mx, my);
          mx /= length;
          my /= length;
          movePlayer(world, mx, my, delta);
        }
        const cooldowns = p.cooldowns ?? { attack: 0, skill: 0, dodge: 0 };
        p.cooldowns = tickCooldowns(cooldowns, delta);
        p.attack = p.cooldowns.attack;
        p.special = Math.max(0, p.special - delta);
        p.invulnerable = Math.max(0, p.invulnerable - delta);
        p.focus = Math.min(
          p.maxFocus,
          p.focus + delta * (4 + stats.ether * 0.12)
        );
        statusFeedbackTimer -= delta;
        const playerStatus = tickStatuses(p, delta);
        p.health = playerStatus.health;
        p.statuses = playerStatus.statuses;
        if (playerStatus.damage > 0 && statusFeedbackTimer <= 0) {
          statusFeedbackTimer = 1;
          spawnCombatText(
            p.x,
            p.y - 0.8,
            `-${playerStatus.damage}`,
            "#c77e9b",
            0.85
          );
          world.notice =
            playerStatus.messages[0] ?? "Um efeito corrói sua forma.";
        }
        for (let index = combatTexts.length - 1; index >= 0; index -= 1) {
          combatTexts[index].life -= delta;
          combatTexts[index].y -= delta * 0.82;
          if (combatTexts[index].life <= 0) combatTexts.splice(index, 1);
        }
        for (const enemy of world.enemies) {
          enemy.phase += delta;
          enemy.cooldowns = tickCooldowns(
            enemy.cooldowns ?? { attack: 0, skill: 0, dodge: 0 },
            delta
          );
          enemy.hurt = Math.max(0, enemy.hurt - delta);
          enemy.guard = Math.max(0, (enemy.guard ?? 0) - delta);
          const definition = getEnemyDefinition(
            enemy.definitionId ?? enemy.kind,
            worldRegions[world.region]?.tier ?? 1,
            enemy.name
          );
          if (enemy.death && enemy.death > 0) {
            enemy.death = Math.max(0, enemy.death - delta);
            if (!enemy.death) {
              enemy.alive = false;
              enemy.respawnRemaining = enemy.boss
                ? undefined
                : Math.max(30, definition.respawnSeconds);
              if (
                !world.essences.some(
                  essence =>
                    essence.id === `essence-${enemy.id}-${enemy.killCount}`
                )
              ) {
                world.essences.push({
                  id: `essence-${enemy.id}-${enemy.killCount}`,
                  x: enemy.x,
                  y: enemy.y,
                  phase: 0,
                });
              }
            }
            continue;
          }
          if (!enemy.alive) {
            if (!enemy.boss && enemy.respawnRemaining !== undefined) {
              enemy.respawnRemaining = Math.max(
                0,
                enemy.respawnRemaining - delta
              );
              if (
                enemy.respawnRemaining <= 0 &&
                world.enemies.filter(item => item.alive && !item.death).length <
                  MAX_ACTIVE_ENEMIES
              ) {
                resetEnemyForRespawn(enemy, definition);
              }
            }
            continue;
          }
          const status = tickStatuses(enemy, delta);
          enemy.health = status.health;
          enemy.statuses = status.statuses;
          if (status.damage > 0 && statusFeedbackTimer <= 0) {
            statusFeedbackTimer = 1;
            spawnCombatText(
              enemy.x,
              enemy.y - 0.7,
              `-${status.damage}`,
              "#d88c86",
              0.82
            );
          }
          if (enemy.health <= 0) {
            beginDeath(world, enemy);
            continue;
          }
          const action = updateEnemyAi(enemy, definition, {
            delta,
            player: {
              x: p.x,
              y: p.y,
              health: p.health,
              maxHealth: p.maxHealth,
            },
            isBlocked,
            minX: 1,
            maxX: WORLD_W - 2,
            minY: 1,
            maxY: WORLD_H - 2,
          });
          if (action.type === "telegraph") {
            enemy.telegraphLabel = action.message;
            enemy.telegraphTime = action.duration;
            world.notice = action.message;
          } else if (action.type === "attack") {
            enemy.attack = 0.35;
            enemy.telegraph = "";
            if (p.invulnerable <= 0) dealEnemyAttack(world, enemy, definition);
          } else if (action.type === "heal") {
            enemy.hurt = 0;
            world.notice = action.message;
            spawnCombatText(
              enemy.x,
              enemy.y - 0.8,
              `+${action.amount}`,
              "#8ff3d0",
              0.82
            );
            audioBus.play("heal");
          } else if (action.type === "call-allies") {
            world.notice = action.message;
            if (
              world.enemies.filter(item => item.alive && !item.death).length <
                MAX_ACTIVE_ENEMIES &&
              (enemy.alliesCalled ?? 0) <= 2
            ) {
              const reinforcement = createEnemy(
                `${world.region}-reinforcement-${Math.floor(frame * 1000)}`,
                enemy.kind === "boss" ? "goblin" : enemy.kind,
                clamp(enemy.x + 1.1, 1, WORLD_W - 2),
                clamp(enemy.y + 0.7, 1, WORLD_H - 2),
                worldRegions[world.region]?.tier ?? 1,
                {
                  definitionId:
                    enemy.kind === "boss" ? "goblin" : enemy.definitionId,
                }
              );
              world.enemies.push(reinforcement);
            }
          }
        }
        world.essences.forEach(item => (item.phase += delta * 3));
        if (p.health <= 0) {
          p.death = p.death === undefined ? 0.6 : Math.max(0, p.death - delta);
          keys.clear();
          if (p.death === 0) {
            p.death = undefined;
            p.health = p.maxHealth;
            p.focus = p.maxFocus;
            p.statuses = [];
            p.x = 25;
            p.y = 21;
            p.invulnerable = 1;
            world.notice =
              "O santuário recompõe seu Eco. Sua história e seus itens foram preservados.";
          }
        }
        if (
          world.questState?.quests["village-oath"]?.status === "active" &&
          world.region === firstRegion &&
          world.player.x > 24 &&
          world.player.x < 35 &&
          world.player.y > 18 &&
          world.player.y < 27
        ) {
          dispatchGameplayQuestEvent(world, {
            type: "escort",
            targetId: "moss-village-route",
            regionId: firstRegion,
            eventId: "escort:moss-village-arrival",
          });
        }
      }
      saveTimer += delta;
      if (saveTimer > 1.5) {
        saveTimer = 0;
        persistWorld(profile, world, saveKey, slotId);
      }
      uiTimer += delta;
      if (uiTimer > 0.12) {
        uiTimer = 0;
        emit();
      }
      const width = logicalWidth;
      const height = logicalHeight;
      const regionDefinition = worldRegions[world.region];
      const palette = regionDefinition.colors;
      ctx.clearRect(0, 0, width, height);
      const tile = 32;
      const camX = p.x;
      const camY = p.y;
      const sx = (x: number) => Math.round((x - camX) * tile + width / 2);
      const sy = (y: number) => Math.round((y - camY) * tile + height / 2);
      ctx.fillStyle = palette.shade;
      ctx.fillRect(0, 0, width, height);
      const terrainLayer = terrainCache.getOrCreate({
        regionId: world.region,
        width: WORLD_W,
        height: WORLD_H,
        tile,
        terrain,
        isTree,
      });
      const visibleTiles = visibleTerrainTiles(terrainLayer, {
        x: camX,
        y: camY,
        width,
        height,
        tile,
      });
      for (const { x, y, kind: t } of visibleTiles) {
        const px = sx(x),
          py = sy(y);
        ctx.fillStyle =
          t === "water"
            ? palette.water
            : t === "path"
              ? palette.path
              : t === "village"
                ? palette.village
                : palette.ground;
        ctx.fillRect(px, py, tile, tile);
        if (t === "grass") {
          ctx.fillStyle = hash(x, y) > 0.54 ? palette.foliage : palette.shade;
          ctx.fillRect(px + 3, py + 5, 3, 7);
          ctx.fillRect(px + 18, py + 15, 2, 6);
          ctx.fillStyle = hash(y, x) > 0.58 ? palette.foliage : palette.ground;
          ctx.fillRect(
            px + 8 + Math.floor(hash(x + 2, y) * 10),
            py + 10 + Math.floor(hash(y + 5, x) * 8),
            3,
            5
          );
          if (hash(x, y) > 0.73) {
            ctx.fillStyle = "rgba(235,233,174,.7)";
            ctx.fillRect(px + 22, py + 7, 2, 2);
          }
        }
        if (t === "water") {
          ctx.fillStyle = "rgba(205,244,222,.28)";
          ctx.fillRect(
            px + 5,
            py + 7 + Math.floor(Math.sin(frame + x) * 2),
            11,
            2
          );
          ctx.fillRect(px + 20, py + 19, 7, 2);
        }
        if (t === "path") {
          ctx.fillStyle = "rgba(255,234,179,.38)";
          ctx.fillRect(px + 2, py + 3, tile - 4, 3);
          ctx.fillStyle = "rgba(48,37,28,.32)";
          ctx.fillRect(px + 5, py + 19, tile - 10, 2);
        }
      }
      for (const tileData of visibleTiles)
        if (tileData.tree)
          drawTree(ctx, sx(tileData.x + 0.5), sy(tileData.y + 0.44), 64);
      renderRegionDecorations({
        ctx,
        regionId: world.region,
        mapKind: regionDefinition.mapKind,
        frame,
        camera: { x: camX, y: camY, width, height, tile },
      });
      const animatedNpcs = resolveNpcPositions(
        Npcs(world.region),
        regionDefinition,
        frame,
        p
      );
      drawBuilding(ctx, sx(27.1), sy(21.4), 32, "hut");
      drawBuilding(ctx, sx(30.2), sy(22.5), 32, "stall");
      drawBuilding(ctx, sx(24.8), sy(19.7), 32, "hut");
      drawBuilding(ctx, sx(32.2), sy(24.8), 32, "stall");
      drawBuilding(ctx, sx(25.8), sy(25.6), 32, "forge");
      ctx.fillStyle = "#4c3125";
      ctx.fillRect(sx(33.2), sy(20.3), 96, 10);
      ctx.fillStyle = "#a76b42";
      for (let plank = 0; plank < 6; plank += 1)
        ctx.fillRect(sx(33.2) + plank * 16, sy(20.3) + 2, 3, 7);
      if (world.buildings.includes("Horta de musgo")) {
        ctx.fillStyle = "#244e3e";
        ctx.fillRect(sx(28.8), sy(24.1), 64, 32);
        for (let seed = 0; seed < 7; seed += 1) {
          ctx.fillStyle = seed % 2 ? "#9cca69" : "#5b9e5b";
          ctx.fillRect(sx(29) + seed * 8, sy(24.28), 3, 9);
        }
      }
      if (world.buildings.includes("Santuário do Éter")) {
        ctx.fillStyle = "rgba(90,216,171,.22)";
        ctx.fillRect(sx(24.6) - 40, sy(22.9) - 40, 80, 80);
        ctx.fillStyle = "#e7bd58";
        ctx.fillRect(sx(24.6) - 2, sy(22.9) - 24, 4, 48);
        ctx.fillRect(sx(24.6) - 24, sy(22.9) - 2, 48, 4);
        ctx.fillStyle = "#77dbb5";
        ctx.fillRect(sx(24.6) - 7, sy(22.9) - 7, 14, 14);
      }
      ctx.fillStyle = "rgba(116,223,183,.12)";
      ctx.fillRect(sx(20.2) - 32, sy(4.8) - 48, 64, 96);
      ctx.fillStyle = "#e7bd58";
      ctx.fillRect(sx(20.2) - 15, sy(4.8) - 32, 4, 64);
      ctx.fillRect(sx(20.2) + 11, sy(4.8) - 32, 4, 64);
      ctx.fillStyle = "#6ad8ae";
      ctx.fillRect(sx(20.2) - 8, sy(4.8) - 20, 16, 40);
      ctx.fillStyle = "#b5f1c8";
      ctx.fillRect(sx(20.2) - 3, sy(4.8) - 11, 6, 22);
      worldRegions[world.region].services.forEach(point =>
        drawServicePoint(
          ctx,
          sx(point.x),
          sy(point.y),
          point,
          frame,
          world.openedChests.has(point.id)
        )
      );
      const ySorted = [
        ...animatedNpcs.map(
          ({ npc, x, y, direction, directionY, moving, phase }) => ({
            y,
            render: () =>
              drawNpc(ctx, sx(x), sy(y), npc, phase, {
                moving,
                attack: 0,
                hurt: 0,
                direction,
                directionY,
              }),
          })
        ),
        ...world.enemies
          .filter(enemy => enemy.alive)
          .map(enemy => ({
            y: enemy.y,
            render: () => {
              const boss =
                enemy.id === "root-guardian" || enemy.id.endsWith("-boss");
              if (enemy.death)
                drawDeath(
                  ctx,
                  sx(enemy.x),
                  sy(enemy.y),
                  enemy.death,
                  boss ? "#e7bd58" : "#79cfa6"
                );
              else if (boss)
                drawBoss(
                  ctx,
                  sx(enemy.x),
                  sy(enemy.y),
                  enemy.phase,
                  enemy.hurt,
                  {
                    state: enemy.aiState,
                    moving:
                      enemy.aiState === "chase" || enemy.aiState === "return",
                    attack: enemy.attack,
                    hurt: enemy.hurt,
                    direction: enemy.x >= p.x ? -1 : 1,
                    telegraph: enemy.telegraphTime
                      ? enemy.telegraphLabel
                      : undefined,
                    telegraphTime: enemy.telegraphTime,
                    elite: true,
                    tint: "#e7bd58",
                    name: enemy.name,
                    level: enemy.level,
                  }
                );
              else
                drawCreature(
                  ctx,
                  sx(enemy.x),
                  sy(enemy.y),
                  48,
                  enemy.kind,
                  enemy.phase,
                  enemy.hurt,
                  enemy.attack,
                  enemy.guard,
                  {
                    state: enemy.aiState,
                    moving:
                      enemy.aiState === "chase" ||
                      enemy.aiState === "flee" ||
                      enemy.aiState === "return",
                    attack: enemy.attack,
                    hurt: enemy.hurt,
                    direction: enemy.x >= p.x ? -1 : 1,
                    telegraph: enemy.telegraph,
                    telegraphTime: enemy.telegraphTime,
                    name: enemy.name,
                    level: enemy.level,
                    elite: Boolean(enemy.rarity && enemy.rarity !== "comum"),
                    tint: enemy.rarity === "lendário" ? "#e7bd58" : undefined,
                  }
                );
              if (!enemy.death) {
                const hp =
                  enemy.maxHealth > 0
                    ? Math.max(0, Math.min(1, enemy.health / enemy.maxHealth))
                    : 0;
                const barWidth = boss ? 56 : 32;
                const barY = -56;
                ctx.fillStyle = "rgba(7,18,19,.88)";
                ctx.fillRect(
                  sx(enemy.x) - barWidth / 2,
                  sy(enemy.y) + barY,
                  barWidth,
                  5
                );
                ctx.fillStyle = "#d85f59";
                ctx.fillRect(
                  sx(enemy.x) - barWidth / 2 + 1,
                  sy(enemy.y) + barY + 1,
                  (barWidth - 2) * hp,
                  3
                );
                if (boss && enemy.name) {
                  ctx.fillStyle = "#e7bd58";
                  ctx.font = "10px Cinzel";
                  ctx.textAlign = "center";
                  ctx.fillText(enemy.name, sx(enemy.x), sy(enemy.y) + barY - 7);
                }
              }
            },
          })),
        {
          y: p.y,
          render: () => {
            if (p.health <= 0) {
              drawDeath(
                ctx,
                sx(p.x),
                sy(p.y),
                p.death ?? 0.6,
                race.palette.accent
              );
              return;
            }
            drawPerson(
              ctx,
              sx(p.x),
              sy(p.y),
              48,
              profile.raceId,
              race.palette.accent,
              frame * 9 * (mx || my ? 1 : 0.2),
              p.facing,
              {
                moving: Boolean(mx || my),
                attack: p.attack,
                hurt: p.invulnerable > 0 ? 0.12 : 0,
                direction: p.facing,
              }
            );
            if (p.attack > 0) {
              ctx.globalAlpha = p.attack / 0.33;
              ctx.fillStyle = race.palette.accent;
              ctx.fillRect(sx(p.x) + p.facing * 24, sy(p.y) - 18, 32, 5);
              ctx.fillRect(sx(p.x) + p.facing * 34, sy(p.y) - 8, 22, 5);
              ctx.fillRect(sx(p.x) + p.facing * 25, sy(p.y) + 4, 28, 5);
              ctx.globalAlpha = 1;
            }
          },
        },
      ];
      gatherNodes
        .filter(node => !world.gathered.has(node.id))
        .forEach(node => {
          const nx = sx(node.x),
            ny = sy(node.y);
          ctx.fillStyle = node.kind === "wood" ? "#4f7d4d" : "#627a91";
          ctx.fillRect(nx - 10, ny - 10, 20, 20);
          ctx.fillStyle = node.kind === "wood" ? "#a8cf70" : "#b6d0d9";
          ctx.fillRect(nx - 4, ny - 13, 5, 18);
          ctx.fillRect(nx - 11, ny - 3, 18, 5);
        });
      world.essences.forEach(essence => {
        const ex = sx(essence.x),
          ey = sy(essence.y) - 13 - Math.sin(essence.phase) * 5;
        ctx.fillStyle = "rgba(231,189,88,.16)";
        ctx.fillRect(ex - 16, ey - 16, 32, 32);
        ctx.fillStyle = "#e7bd58";
        ctx.fillRect(ex - 5, ey - 9, 10, 18);
        ctx.fillRect(ex - 9, ey - 5, 18, 10);
        ctx.fillStyle = "#fff2b8";
        ctx.fillRect(ex - 3, ey - 3, 6, 6);
      });
      ySorted.sort((a, b) => a.y - b.y).forEach(item => item.render());
      combatTexts.forEach(item => {
        const alpha = Math.min(1, item.life / 0.16);
        const tx = sx(item.x);
        const ty = sy(item.y);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `bold ${Math.round(13 * item.scale)}px monospace`;
        ctx.fillStyle = "#071719";
        ctx.fillText(item.text, tx + 2, ty + 2);
        ctx.fillStyle = item.color;
        ctx.fillText(item.text, tx, ty);
        ctx.restore();
      });
      if (p.special > 0)
        drawEtherBurst(ctx, sx(p.x), sy(p.y), p.special, race.palette.accent);
      const nearby = Npcs(world.region).find(npc => distance(p, npc) < 1.5);
      const nearGate = distance(p, { x: 20.2, y: 4.8 }) < 1.45;
      if (nearby || nearGate) {
        const tx = nearby ? sx(nearby.x) : sx(20.2);
        const ty = nearby ? sy(nearby.y) : sy(4.8);
        ctx.fillStyle = "rgba(6,21,21,.78)";
        ctx.fillRect(tx - 38, ty - 68, 76, 17);
        ctx.fillStyle = "#e7bd58";
        ctx.font = "10px Manrope";
        ctx.textAlign = "center";
        ctx.fillText(nearGate ? "[E] ENTRAR" : "[E] FALAR", tx, ty - 56);
      }
      const light = ctx.createRadialGradient(
        sx(p.x),
        sy(p.y),
        6,
        sx(p.x),
        sy(p.y),
        tile * 3.4
      );
      light.addColorStop(0, "rgba(220,255,182,.18)");
      light.addColorStop(0.55, "rgba(73,172,128,.06)");
      light.addColorStop(1, "rgba(3,13,15,.42)");
      ctx.fillStyle = light;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(177,225,206,.18)";
      ctx.lineWidth = 1;
      for (let particle = 0; particle < 48; particle += 1) {
        const px = (particle * 71 + frame * 26) % width;
        const py = (particle * 113 + frame * 44) % height;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - 2, py + 7);
        ctx.stroke();
      }
      const vignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.26,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.8
      );
      vignette.addColorStop(0, "transparent");
      vignette.addColorStop(1, "rgba(3,13,15,.68)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      persistWorld(profile, stateRef.current, saveKey, slotId);
      cancelAnimationFrame(raf);
      musicOscillators.forEach(oscillator => oscillator.stop());
      musicGainRef.current = null;
      audioBus.dispose();
      audioBusRef.current = null;
      void audio?.close();
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", releaseInputs);
      document.removeEventListener("visibilitychange", hidePage);
      if (qaApi && window.__AETHERION_QA__ === qaApi)
        delete window.__AETHERION_QA__;
    };
  }, [
    profile,
    race.palette.accent,
    race.evolution,
    race.talent,
    stats.agility,
    stats.power,
    stats.ether,
    stats.resolve,
  ]);
  const build = (name: string) => {
    const world = stateRef.current;
    const plans: Record<
      string,
      { wood: number; ore: number; food: number; effect: string }
    > = {
      Cabana: {
        wood: 12,
        ore: 0,
        food: 0,
        effect: "Novos viajantes encontram abrigo.",
      },
      "Horta de musgo": {
        wood: 10,
        ore: 0,
        food: 0,
        effect: "A horta passa a produzir alimento para a vila.",
      },
      Forja: {
        wood: 12,
        ore: 8,
        food: 0,
        effect: "A forja melhora o equipamento das expedições.",
      },
      "Torre de vigia": {
        wood: 15,
        ore: 2,
        food: 0,
        effect: "A torre revela ameaças próximas no mapa.",
      },
      "Santuário do Éter": {
        wood: 8,
        ore: 4,
        food: 0,
        effect: "O santuário estabiliza a evolução e o foco.",
      },
    };
    const plan = plans[name];
    if (!plan || world.buildings.includes(name)) return;
    if (
      world.resources.wood < plan.wood ||
      world.resources.ore < plan.ore ||
      world.resources.food < plan.food
    ) {
      world.notice =
        "Recursos insuficientes. Colete madeira, minério ou alimento antes de construir.";
      return;
    }
    world.inventory = removeItem(
      world.inventory!,
      "madeira-viva",
      plan.wood
    ).state;
    world.inventory = removeItem(
      world.inventory!,
      "minerio-runico",
      plan.ore
    ).state;
    world.inventory = removeItem(
      world.inventory!,
      "racao-de-viagem",
      plan.food
    ).state;
    projectInventoryToLegacy(world);
    if (name === "Horta de musgo")
      world.inventory = addItem(world.inventory!, "racao-de-viagem", 8).state;
    if (name === "Santuário do Éter") {
      world.player.focus = world.player.maxFocus;
      world.player.essence += 1;
    }
    if (name === "Forja")
      world.inventory = addItem(world.inventory!, "pocao-musgo", 1).state;
    projectInventoryToLegacy(world);
    world.buildings.push(name);
    world.notice = `${name} erguido. ${plan.effect}`;
  };
  const beginDungeon = () => {
    const world = stateRef.current;
    if (world.defeatedBosses?.has("root-guardian")) {
      world.notice = "O Guardião da Raiz já foi derrotado por este Eco.";
      setMenu("none");
      return;
    }
    if (
      !world.enemies.some(enemy => enemy.id === "root-guardian" && enemy.alive)
    ) {
      world.enemies.push(
        createEnemy("root-guardian", "boss", 21.4, 6.2, 2, {
          definitionId: "root-guardian",
          boss: true,
        })
      );
    }
    world.notice = "O Guardião da Raiz desperta na clareira.";
    menuRef.current = "none";
    setMenu("none");
  };

  const world = stateRef.current;
  const currentLocalArea = localMapAreaFor(
    world.region,
    hud.playerX,
    hud.playerY
  );
  const leaveCharacter = () => {
    persistWorld(profile, stateRef.current, saveKey, slotId);
    void onReturnToCreation();
  };
  const logoutCharacter = () => {
    persistWorld(profile, stateRef.current, saveKey, slotId);
    void onLogout();
  };
  const syncUi = () => {
    projectInventoryToLegacy(world);
    projectQuestToLegacy(world);
    setHud(old => ({
      ...old,
      health: Math.ceil(world.player.health),
      maxHealth: world.player.maxHealth,
      focus: world.player.focus,
      maxFocus: world.player.maxFocus,
      level: world.player.level,
      xp: world.player.xp,
      potions: world.player.potions,
      gold: world.resources.gold,
      wood: world.resources.wood,
      ore: world.resources.ore,
      food: world.resources.food,
      notice: world.notice,
      quest: world.quest,
    }));
    persistWorld(profile, world, saveKey, slotId);
  };
  const closeMenus = () => {
    menuRef.current = "none";
    setMenu("none");
  };
  const closeDialogue = () => {
    dialogueRef.current = null;
    setDialogue(null);
  };
  const closeService = () => {
    serviceRef.current = null;
    setService(null);
  };
  const applyQuestMutation = (result: QuestMutationResult) => {
    world.questState = result.state;
    for (const effect of result.effects) {
      if (effect.type === "recompensa_recebida") {
        applyQuestReward(world, effect.reward, stats);
        world.notice = `Recompensa recebida: ${getQuestDefinition(effect.questId)?.title}.`;
        audioBusRef.current?.play("quest");
      } else if (effect.type === "escolha_registrada") {
        world.reputation[effect.faction] =
          (world.reputation[effect.faction] ?? 0) + effect.amount;
        world.notice = "Sua escolha foi registrada na história deste Eco.";
      } else if (effect.type === "operação_ignorada")
        world.notice = effect.reason;
      else if (effect.type === "recompensa_ja_recebida")
        world.notice = "Essa recompensa já foi recebida.";
      else if (effect.type === "missao_aceita")
        world.notice = `Missão aceita: ${getQuestDefinition(effect.questId)?.title}.`;
      else if (effect.type === "missao_abandonada")
        world.notice = "Missão abandonada.";
    }
    syncUi();
  };
  const acceptQuest = (questId: string) => {
    applyQuestMutation(accept(world.questState!, questId));
    const definition = getQuestDefinition(questId);
    if (world.questState?.quests[questId]?.status === "active") {
      dispatchWorldQuestEvent(
        world,
        {
          type: "region",
          targetId: world.region,
          regionId: world.region,
          eventId: `accept-region:${questId}:${Date.now()}`,
        },
        stats
      );
      for (const objective of definition?.objectives ?? []) {
        const prior = world.questState.quests[objective.targetId];
        if (
          objective.type === "sequence" &&
          (prior?.status === "completed" || prior?.status === "claimed")
        ) {
          dispatchWorldQuestEvent(
            world,
            {
              type: "sequence",
              targetId: objective.targetId,
              eventId: `sequence:${questId}:${objective.targetId}`,
            },
            stats
          );
        }
      }
    }
    syncUi();
  };
  const chooseDialogue = (choice: {
    label: string;
    effect: string;
    faction: string;
    amount: number;
  }) => {
    const choiceId = choice.label.startsWith("Defender")
      ? "defend-village"
      : choice.label.startsWith("Perguntar")
        ? "ask-order"
        : "follow-root";
    applyQuestMutation(
      selectQuestChoice(world.questState!, "wolf-root", choiceId)
    );
    closeDialogue();
  };
  const claimSideQuest = () => {
    if (world.sideQuest)
      applyQuestMutation(
        claimQuestReward(world.questState!, world.sideQuest.id)
      );
    closeDialogue();
  };
  const acceptSideQuest = (npc: Npc) => {
    acceptQuest(npc.quest.id);
    closeDialogue();
  };
  const useInventoryItem = (itemId: string) => {
    if (
      itemId === "pocao-musgo" &&
      world.player.health >= world.player.maxHealth
    ) {
      world.notice = "Sua vitalidade já está plena.";
      syncUi();
      return;
    }
    const result = use(world.inventory!, itemId);
    world.inventory = result.state;
    if (result.changed && result.effect) {
      if (result.effect.heal)
        world.player.health = heal(world.player, result.effect.heal).health;
      if (result.effect.focusRestore)
        world.player.focus = Math.min(
          world.player.maxFocus,
          world.player.focus + result.effect.focusRestore
        );
      audioBusRef.current?.play("heal");
    }
    world.notice = result.message ?? "Item utilizado.";
    syncUi();
  };
  const equipInventoryItem = (itemId: string) => {
    const result = equip(world.inventory!, itemId);
    world.inventory = result.state;
    refreshPlayerCombatStats(world, stats);
    world.notice = result.message ?? "Equipamento atualizado.";
    syncUi();
  };
  const unequipInventoryItem = (slot: EquipmentSlot) => {
    const result = unequip(world.inventory!, slot);
    world.inventory = result.state;
    refreshPlayerCombatStats(world, stats);
    world.notice = result.message ?? "Equipamento atualizado.";
    syncUi();
  };
  const buyPotion = () => {
    if (world.resources.gold < 7) {
      world.notice = "Ouro insuficiente para comprar uma poção.";
      syncUi();
      return;
    }
    world.resources.gold -= 7;
    world.inventory = addItem(world.inventory!, "pocao-musgo", 1).state;
    world.notice = "Poção comprada no comércio local.";
    syncUi();
    closeService();
  };
  const sellWood = () => {
    const result = removeItem(world.inventory!, "madeira-viva", 4);
    if (result.changed) {
      world.inventory = result.state;
      world.resources.gold += 3;
      world.notice = "Madeira vendida: +3 ouro.";
    } else world.notice = "Você precisa de 4 madeiras vivas para esta venda.";
    syncUi();
  };
  const sellOre = () => {
    const result = removeItem(world.inventory!, "minerio-runico", 2);
    if (result.changed) {
      world.inventory = result.state;
      world.resources.gold += 5;
      world.notice = "Minério vendido: +5 ouro.";
    } else world.notice = "Você precisa de 2 minérios para esta venda.";
    syncUi();
  };
  const receiveBlessing = () => {
    if (world.resources.gold < 5) {
      world.notice = "A oferta para a capela custa 5 ouro.";
      syncUi();
      return;
    }
    world.resources.gold -= 5;
    world.player.health = world.player.maxHealth;
    world.player.focus = world.player.maxFocus;
    world.player.statuses = [];
    world.notice = "A bênção restaura sua vida e seu foco.";
    audioBusRef.current?.play("heal");
    syncUi();
    closeService();
  };
  const openChest = () => {
    if (!service || service.kind !== "chest" || !service.reward) return;
    if (world.openedChests.has(service.id)) {
      world.notice = "Este baú já foi aberto por este personagem.";
      syncUi();
      closeService();
      return;
    }
    world.openedChests.add(service.id);
    const reward = service.reward;
    applyQuestReward(
      world,
      {
        gold: reward.gold,
        items: [
          { itemId: "madeira-viva", quantity: reward.wood ?? 0 },
          { itemId: "minerio-runico", quantity: reward.ore ?? 0 },
          { itemId: "pocao-musgo", quantity: reward.potions ?? 0 },
        ],
      },
      stats
    );
    dispatchWorldQuestEvent(
      world,
      {
        type: "chest",
        targetId: service.id,
        regionId: world.region,
        eventId: `chest:${service.id}`,
      },
      stats
    );
    world.notice = `Baú aberto: ${reward.gold} ouro e recursos guardados.`;
    audioBusRef.current?.play("collect");
    syncUi();
    closeService();
  };
  const trackedId = world.questState?.trackedQuestId;
  const trackedQuest = trackedId ? getQuestDefinition(trackedId) : undefined;
  const trackedProgress = trackedId
    ? getQuestProgress(world.questState!, trackedId)
    : undefined;
  const trackedStatus = trackedId
    ? world.questState?.quests[trackedId]?.status
    : undefined;
  const changeAudio = (key: keyof AudioSettings, value: number) => {
    const next = { ...audioSettingsRef.current, [key]: clamp(value, 0, 1) };
    audioSettingsRef.current = next;
    world.audio = next;
    audioBusRef.current?.setSettings(next);
    setAudioSettings(next);
    if (key === "music" && musicGainRef.current)
      musicGainRef.current.gain.setTargetAtTime(
        next.music * 0.028,
        musicGainRef.current.context.currentTime,
        0.03
      );
  };
  const touchKey = (action: ControlAction | "collect", down: boolean) => {
    const code = action === "collect" ? "KeyF" : controlsRef.current[action];
    window.dispatchEvent(
      new KeyboardEvent(down ? "keydown" : "keyup", { code })
    );
  };
  return (
    <main
      className="rpg-shell"
      onContextMenu={event => event.preventDefault()}
      onDragStart={event => event.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        className="rpg-canvas"
        aria-label="Mapa 2D explorável de Aetherion"
      />
      <header className="rpg-topbar">
        <div className="world-brand">
          <span>✦</span>
          <div>
            <small>
              ECOS DE AETHERION ·{" "}
              {worldRegions[world.region].village.toUpperCase()}
            </small>
            <b>{worldRegions[world.region].name.toUpperCase()}</b>
          </div>
        </div>
        <div className="world-resources">
          <span>⌁ {hud.wood}</span>
          <span>◆ {hud.ore}</span>
          <span>◒ {hud.food}</span>
          <span>¤ {hud.gold}</span>
        </div>
        <div className="topbar-actions">
          <button
            onClick={leaveCharacter}
            title="Voltar à seleção de personagens"
          >
            TROCAR ECO
          </button>
          <button className="logout-button" onClick={logoutCharacter}>
            SAIR
          </button>
        </div>
      </header>
      <PlayerHud
        name={profile.name}
        vocation={`${race.name} · ${classes.find(item => item.id === profile.classId)?.name ?? "Eco"}`}
        level={hud.level}
        health={hud.health}
        maxHealth={hud.maxHealth}
        focus={hud.focus}
        maxFocus={hud.maxFocus}
        xp={hud.xp}
        xpNext={experienceRequired(hud.level)}
        gold={hud.gold}
        essence={hud.essence}
        status={
          world.player.statuses?.length
            ? {
                label: world.player.statuses
                  .map(
                    status =>
                      ({
                        poison: "Veneno",
                        burn: "Queimadura",
                        slow: "Lentidão",
                        stun: "Atordoado",
                        curse: "Maldição",
                      })[status.kind]
                  )
                  .join(" · "),
                tone: "danger",
              }
            : undefined
        }
        cooldown={{
          label: "Técnica de Éter",
          remaining: world.player.cooldowns?.skill ?? 0,
          total: 2.5,
        }}
      />
      <QuestHud
        title={trackedQuest?.title ?? "Explore Aetherion"}
        summary={
          trackedQuest?.objectives.find(
            objective =>
              (world.questState!.quests[trackedQuest.id]?.progress[
                objective.id
              ] ?? 0) < objective.required
          )?.label ?? "Abra as Crônicas para escolher uma missão."
        }
        progress={
          trackedProgress
            ? `${trackedProgress.current}/${trackedProgress.required} objetivos`
            : undefined
        }
        status={
          trackedStatus === "completed"
            ? "RECOMPENSA DISPONÍVEL"
            : trackedStatus === "claimed"
              ? "MISSÃO CONCLUÍDA"
              : "MISSÃO RASTREADA"
        }
        recommendedLevel={trackedQuest?.recommendedLevel}
        notice={hud.notice}
      />
      <aside
        className="minimap is-clickable"
        aria-label="Abrir mapa detalhado de Aetherion"
        role="button"
        tabIndex={0}
        onClick={() =>
          setMenu(
            worldRegions[world.region].mapKind === "biome" ? "map" : "local-map"
          )
        }
        onKeyDown={event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setMenu(
              worldRegions[world.region].mapKind === "biome"
                ? "map"
                : "local-map"
            );
          }
        }}
      >
        <header>
          <small>MAPA LOCAL</small>
          <b>{worldRegions[world.region].name.toUpperCase()}</b>
        </header>
        <div className="minimap-land">
          {minimapTerrain.map(tile => (
            <i
              key={tile.id}
              className={`map-tile ${tile.type} ${tile.tree ? "tree" : ""}`}
            />
          ))}
          <i className="map-road map-road-north" />
          <i className="map-road map-road-east" />
          <i className="map-water water-a" />
          <i className="map-water water-b" />
          <section className="map-village">
            <i />
            <i />
            <i />
            <i />
          </section>
          <i className="map-dungeon" />
          {Npcs(world.region).map(npc => (
            <i
              key={npc.id}
              className={`map-npc ${npc.visual}`}
              style={{
                left: `${(npc.x / WORLD_W) * 100}%`,
                top: `${(npc.y / WORLD_H) * 100}%`,
              }}
            />
          ))}
          {world.enemies
            .filter(enemy => enemy.alive)
            .map(enemy => (
              <i
                key={enemy.id}
                className={`map-enemy ${enemy.kind}`}
                style={{
                  left: `${(enemy.x / WORLD_W) * 100}%`,
                  top: `${(enemy.y / WORLD_H) * 100}%`,
                }}
              />
            ))}
          <i
            className="map-player"
            style={{
              left: `${(hud.playerX / WORLD_W) * 100}%`,
              top: `${(hud.playerY / WORLD_H) * 100}%`,
            }}
          />
        </div>
        <footer>
          <span className="legend-you">VOCÊ</span>
          <span className="legend-npc">ECO</span>
          <span className="legend-enemy">AMEAÇA</span>
        </footer>
        <em className="minimap-open">TOQUE PARA AMPLIAR</em>
      </aside>
      <nav className="rpg-actions" aria-label="Menus do RPG">
        <button onClick={() => setMenu("character")}>
          <kbd>C</kbd>
          <span>Eco</span>
        </button>
        <button onClick={() => setMenu("inventory")}>
          <kbd>{formatControl(controls.inventory)}</kbd>
          <span>Bolsa</span>
        </button>
        <button
          onClick={() =>
            setMenu(
              worldRegions[world.region].mapKind === "biome"
                ? "map"
                : "local-map"
            )
          }
        >
          <kbd>{formatControl(controls.map)}</kbd>
          <span>Mapa</span>
        </button>
        <button onClick={() => setMenu("quests")}>
          <kbd>Q</kbd>
          <span>Crônicas</span>
        </button>
        <button onClick={() => setMenu("village")}>
          <kbd>B</kbd>
          <span>Vila</span>
        </button>
        <button onClick={() => setMenu("codex")}>
          <kbd>J</kbd>
          <span>Codex</span>
        </button>
        <button onClick={() => setMenu("settings")}>
          <kbd>⚙</kbd>
          <span>Áudio</span>
        </button>
        <button onClick={() => setMenu("controls")}>
          <kbd>⌨</kbd>
          <span>Teclas</span>
        </button>
      </nav>
      <TouchControls onAction={touchKey} />
      <footer className="world-controls">
        <span>
          <kbd>
            {formatControl(controls.moveUp)}/{formatControl(controls.moveLeft)}
          </kbd>{" "}
          mover
        </span>
        <span>
          <kbd>{formatControl(controls.attack)}</kbd> atacar
        </span>
        <span>
          <kbd>{formatControl(controls.skill)}</kbd> técnica
        </span>
        <span>
          <kbd>F</kbd> absorver/coletar
        </span>
        <span>
          <kbd>H</kbd> curar
        </span>
        <span>
          <kbd>{formatControl(controls.interact)}</kbd> conversar
        </span>
      </footer>
      {menu === "local-map" && (
        <AreaMapOverlay
          open
          view="local"
          onViewChange={view => {
            if (view === "world") {
              menuRef.current = "map";
              setMenu("map");
            }
          }}
          onClose={() => setMenu("none")}
          currentRegionName={worldRegions[world.region].name}
          worldRegions={[]}
          localArea={currentLocalArea}
          playerX={(hud.playerX / WORLD_W) * 100}
          playerY={(hud.playerY / WORLD_H) * 100}
        />
      )}
      <MenuWindow
        menu={menu === "local-map" ? "none" : menu}
        close={closeMenus}
        profile={profile}
        stats={stats}
        buildings={hud.buildings}
        potions={hud.potions}
        build={build}
        beginDungeon={beginDungeon}
        audio={audioSettings}
        changeAudio={changeAudio}
        region={world.region}
        unlockedRegions={world.unlockedRegions}
        focus={hud.focus}
        gold={hud.gold}
        questContent={
          <>
            <QuestJournal
              state={world.questState!}
              playerLevel={hud.level}
              onAccept={acceptQuest}
              onAbandon={id =>
                applyQuestMutation(abandon(world.questState!, id))
              }
              onClaimReward={id =>
                applyQuestMutation(claimQuestReward(world.questState!, id))
              }
              onTrack={id =>
                applyQuestMutation(selectTrackedQuest(world.questState!, id))
              }
              onSelectChoice={(id, choiceId) =>
                applyQuestMutation(
                  selectQuestChoice(world.questState!, id, choiceId)
                )
              }
              onClose={closeMenus}
            />
            <section className="quest-endings">
              <b>Destinos revelados</b>
              <p>
                {getAvailableEndings({
                  ...world.questState!,
                  campaign: {
                    ...world.questState!.campaign,
                    reputation: world.reputation,
                  },
                })
                  .map(id => endingRequirements[id].label)
                  .join(" · ") ||
                  "Suas missões, alianças e escolhas revelarão novos caminhos para o fim da história."}
              </p>
            </section>
          </>
        }
        inventoryContent={
          <InventoryPanel
            state={world.inventory!}
            onUse={useInventoryItem}
            onEquip={equipInventoryItem}
            onUnequip={unequipInventoryItem}
            onClose={closeMenus}
          />
        }
      />
      {menu === "controls" && (
        <ControlsWindow
          controls={controls}
          close={() => setMenu("none")}
          bind={bindControl}
          restore={restoreControls}
        />
      )}
      {dialogue && (
        <div className="dialogue-box">
          <button onClick={closeDialogue}>×</button>
          <small>{dialogue.role.toUpperCase()}</small>
          <h2>{dialogue.name}</h2>
          <p>“{dialogue.line}”</p>
          <div>
            <b>MISSÃO PARALELA · {dialogue.quest.title}</b>
            <span>{dialogue.quest.summary}</span>
          </div>
          <section className="dialogue-choices">
            {world.sideQuest?.id === dialogue.quest.id &&
            !world.sideQuest.claimed ? (
              <button onClick={claimSideQuest}>
                <b>
                  {world.sideQuest.progress >= world.sideQuest.target
                    ? "RECEBER RECOMPENSA"
                    : "MISSÃO EM ANDAMENTO"}
                </b>
                <span>
                  {world.sideQuest.progress}/{world.sideQuest.target} avanços ·
                  recompensa de {world.sideQuest.reward.gold} ouro
                </span>
              </button>
            ) : (
              <button onClick={() => acceptSideQuest(dialogue)}>
                <b>ACEITAR MISSÃO PARALELA</b>
                <span>
                  Meta: {dialogue.quest.target} · recompensa de{" "}
                  {dialogue.quest.reward.gold} ouro
                </span>
              </button>
            )}
            {(
              dialogueChoices[dialogue.id] ??
              (dialogue.id.endsWith("-warden") ? dialogueChoices.mira : [])
            ).map(choice => (
              <button key={choice.label} onClick={() => chooseDialogue(choice)}>
                <b>{choice.label}</b>
                <span>{choice.effect}</span>
              </button>
            ))}
          </section>
          <em>Escolhas, missões e recompensas ficam vinculadas a este Eco.</em>
        </div>
      )}
      <ServiceWindow
        service={service}
        close={closeService}
        gold={world.resources.gold}
        wood={world.resources.wood}
        ore={world.resources.ore}
        opened={Boolean(service && world.openedChests.has(service.id))}
        buyPotion={buyPotion}
        sellWood={sellWood}
        sellOre={sellOre}
        receiveBlessing={receiveBlessing}
        openChest={openChest}
      />
    </main>
  );
}
