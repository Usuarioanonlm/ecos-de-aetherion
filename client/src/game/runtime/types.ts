import type { RaceId, Stats } from "../content";
import type {
  EnemyArchetype,
  RegionId,
  ServicePoint,
  TownNpc,
} from "../worldContent";
import type { Cooldowns, CombatStats, StatusEffect } from "../combat/types";

export type EnemyKind = EnemyArchetype | "slime" | "boss";
export type { RegionId } from "../worldContent";

export type EnemyAiState =
  | "idle"
  | "chase"
  | "windup"
  | "attack"
  | "hurt"
  | "flee"
  | "return"
  | "dead";

export type Enemy = {
  id: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  kind: EnemyKind;
  alive: boolean;
  hurt: number;
  phase: number;
  name?: string;
  attack?: number;
  guard?: number;
  death?: number;
  spawnX?: number;
  spawnY?: number;
  aiState?: EnemyAiState;
  behavior?: string;
  telegraph?: string;
  telegraphLabel?: string;
  telegraphTime?: number;
  healCooldown?: number;
  callCooldown?: number;
  enrageTriggered?: boolean;
  alliesCalled?: number;
  respawnRemaining?: number;
  boss?: boolean;
  defeated?: boolean;
  definitionId?: string;
  rarity?: "comum" | "incomum" | "raro" | "épico" | "lendário";
  lootClaimed?: boolean;
  killCount?: number;
  statuses?: StatusEffect[];
  cooldowns?: Cooldowns;
  stats?: CombatStats;
  level?: number;
  gold?: number;
  xp?: number;
};

export type Essence = { id: string; x: number; y: number; phase: number };

export type CombatText = {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
};

export type Player = {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  focus: number;
  maxFocus: number;
  level: number;
  xp: number;
  essence: number;
  facing: number;
  attack: number;
  special: number;
  death?: number;
  invulnerable: number;
  evolved: boolean;
  potions: number;
  cooldowns?: Cooldowns;
  statuses?: StatusEffect[];
  stats?: CombatStats;
};

export type Npc = TownNpc;

export type Menu =
  | "none"
  | "character"
  | "inventory"
  | "map"
  | "local-map"
  | "quests"
  | "village"
  | "codex"
  | "dungeon"
  | "settings"
  | "controls";

export type Hud = {
  health: number;
  maxHealth: number;
  focus: number;
  maxFocus: number;
  level: number;
  xp: number;
  essence: number;
  potions: number;
  wolves: number;
  notice: string;
  quest: string;
  menu: Menu;
  buildings: string[];
  wood: number;
  ore: number;
  food: number;
  gold: number;
  playerX: number;
  playerY: number;
};

export type SideQuest = {
  id: string;
  title: string;
  summary: string;
  target: number;
  progress: number;
  reward: { gold: number; potions?: number; wood?: number; ore?: number };
  claimed: boolean;
};

export type AudioSettings = { sfx: number; music: number };
export type TravelPayment = "focus" | "gold";
export type AtlasTravel = { destination: RegionId; payment: TravelPayment };

export type ControlAction =
  | "moveUp"
  | "moveDown"
  | "moveLeft"
  | "moveRight"
  | "attack"
  | "skill"
  | "inventory"
  | "map"
  | "interact"
  | "dodge"
  | "menu";
export type ControlSettings = Record<ControlAction, string>;

export type QuestEventType =
  | "enemy_defeated"
  | "essence_absorbed"
  | "resource_gathered"
  | "npc_talked"
  | "region_reached"
  | "chest_opened";

export type QuestEventDetail = {
  type: QuestEventType;
  targetId?: string;
  kind?: string;
  regionId?: RegionId;
  id?: string;
  amount?: number;
};

export type WorldState = {
  player: Player;
  region: RegionId;
  unlockedRegions: RegionId[];
  enemies: Enemy[];
  essences: Essence[];
  gathered: Set<string>;
  openedChests: Set<string>;
  notice: string;
  quest: string;
  sideQuest: SideQuest | null;
  audio: AudioSettings;
  controls: ControlSettings;
  buildings: string[];
  resources: { wood: number; ore: number; food: number; gold: number };
  reputation: Record<string, number>;
  questState?: import("../quests").QuestState;
  inventory?: import("../items").InventoryState;
  defeatedBosses?: Set<string>;
  stats?: Stats;
  schemaVersion?: number;
};

export type RegionService = ServicePoint;
export type CharacterStats = Stats;
export type RaceKey = RaceId;
