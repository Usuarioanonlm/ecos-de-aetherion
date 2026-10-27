import type { EnemyKind, Menu, RegionId, TravelPayment } from "./types";
import type { InventoryState } from "../items";
import type { QuestState } from "../quests";

export type QaAction =
  | { type: "snapshot" }
  | {
      type: "setPlayer";
      x?: number;
      y?: number;
      health?: number;
      focus?: number;
      facing?: number;
    }
  | { type: "menu"; menu: Menu }
  | { type: "travel"; destination: RegionId; payment?: TravelPayment }
  | {
      type: "move";
      direction?: "up" | "down" | "left" | "right";
      dx?: number;
      dy?: number;
      distance?: number;
    }
  | { type: "attack"; targetId?: string }
  | { type: "skill"; targetId?: string }
  | { type: "talk"; npcId?: string }
  | { type: "collect" };

export type QaSnapshot = {
  enabled: true;
  region: RegionId;
  menu: Menu;
  dialogueNpcId: string | null;
  serviceId: string | null;
  simulationPaused: boolean;
  notice: string;
  quest: string;
  sideQuest: {
    id: string;
    progress: number;
    target: number;
    claimed: boolean;
  } | null;
  player: {
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
    potions: number;
  };
  resources: {
    wood: number;
    ore: number;
    food: number;
    gold: number;
  };
  inventory: InventoryState;
  quests: QuestState;
  cooldowns: { attack: number; skill: number; dodge: number };
  stats: {
    vitality: number;
    power: number;
    ether: number;
    agility: number;
    resolve: number;
  };
  enemies: Array<{
    id: string;
    kind: EnemyKind;
    name: string | null;
    x: number;
    y: number;
    health: number;
    maxHealth: number;
    alive: boolean;
    death: number;
    boss: boolean;
    behavior: string | null;
    telegraph: string | null;
  }>;
  essences: Array<{ id: string; x: number; y: number }>;
};

export type AetherionQaApi = {
  getSnapshot: () => QaSnapshot;
  sendAction: (action: QaAction) => QaSnapshot;
};

declare global {
  interface Window {
    __AETHERION_QA__?: AetherionQaApi;
  }
}

export const isQaMapEnabled = (): boolean =>
  import.meta.env.DEV &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("qa-map") === "1";

export const isQaResetEnabled = (): boolean =>
  isQaMapEnabled() &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("qa-reset") === "1";

export const qaMenuFromQuery = (): Menu | null => {
  if (!isQaMapEnabled()) return null;
  const value = new URLSearchParams(window.location.search).get("qa-menu");
  const allowed: Menu[] = [
    "character",
    "inventory",
    "map",
    "local-map",
    "quests",
    "village",
    "codex",
    "dungeon",
    "settings",
    "controls",
  ];
  return value && allowed.includes(value as Menu) ? (value as Menu) : null;
};
