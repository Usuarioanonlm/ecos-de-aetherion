import type { Scene } from "@babylonjs/core/scene";

export type HudSnapshot = {
  health: number;
  maxHealth: number;
  essence: number;
  wolvesDefeated: number;
  wolvesTotal: number;
  quest: string;
  notice: string;
  traitUnlocked: boolean;
  completed: boolean;
};

export type GameHandle = {
  scene: Scene;
  dispose: () => void;
};

export type SemanticInput = {
  moveX: number;
  moveY: number;
  attack: boolean;
  absorb: boolean;
};
