import { races } from "../content";
import type { RegionDecoration, DecorationCamera } from "./regionDecorations";
import {
  cullRegionDecorations,
  drawRegionDecorations,
  getRegionDecorationLayout,
} from "./regionDecorations";
import {
  getEntitySprite,
  getPropsAtlas,
  getRaceSprite,
  type EntitySpriteId,
} from "./assetRegistry";
import { npcPosition, type NpcPosition } from "./npcMotion";

/** Mantém os três arquétipos antigos e cobre os tipos já usados pelo catálogo. */
export type EnemyKind = "wolf" | "boar" | "goblin" | "slime" | "boss";
export type ServiceKind = "shop" | "church" | "chest" | "gate";
export type ServicePoint = {
  id: string;
  kind: ServiceKind;
  label?: string;
  x: number;
  y: number;
};
export type Npc = {
  id: string;
  name: string;
  role: string;
  visual: "guardian" | "emissary" | "merchant";
  race: "human" | "elf" | "goblin";
  x: number;
  y: number;
};
export type AnimationState = {
  moving: boolean;
  attack: number;
  hurt: number;
  direction?: number;
  directionY?: number;
};
export type MobAnimationState = Partial<AnimationState> & {
  state?:
    | "idle"
    | "chase"
    | "windup"
    | "attack"
    | "hurt"
    | "dead"
    | "flee"
    | "return";
  direction?: number;
  elite?: boolean;
  tint?: string;
  label?: string;
  name?: string;
  level?: number;
  telegraph?: string;
  telegraphTime?: number;
};
export type RenderPalette = {
  ground?: string;
  shade?: string;
  path?: string;
  water?: string;
  village?: string;
  foliage?: string;
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const safeDirection = (value: number): 1 | -1 => (value < 0 ? -1 : 1);

export type AnimationOffsets = {
  step: number;
  verticalShift: number;
  footShift: number;
  attackShift: number;
  hurtShift: number;
  attackAmount: number;
  hurtAmount: number;
};

/** Cálculo puro usado pelo renderer e pelos testes de caminhada sem pernas soltas. */
export function animationOffsets(
  moving: number,
  facing: number,
  animation?: AnimationState
): AnimationOffsets {
  const isMoving = animation?.moving ?? Math.abs(moving) > 0.001;
  const attackAmount = clamp01((animation?.attack ?? 0) / 0.33);
  const hurtAmount = clamp01((animation?.hurt ?? 0) / 0.24);
  const direction = safeDirection(facing);
  const step = isMoving ? Math.sin(moving * 1.8) : 0;
  return {
    step,
    verticalShift: isMoving ? Math.abs(step) * 0.9 : 0,
    footShift: isMoving ? step * 1.2 : 0,
    attackShift: attackAmount * direction * 3,
    hurtShift: hurtAmount * -direction * 2,
    attackAmount,
    hurtAmount,
  };
}

function drawRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string
): void {
  ctx.fillStyle = color;
  ctx.fillRect(
    Math.round(x),
    Math.round(y),
    Math.ceil(width),
    Math.ceil(height)
  );
}

function drawSlicedSprite(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLImageElement,
  x: number,
  groundY: number,
  size: number,
  direction: 1 | -1,
  verticalShift: number,
  footShift: number,
  alpha = 1
): void {
  const sourceWidth = sprite.naturalWidth || sprite.width;
  const sourceHeight = sprite.naturalHeight || sprite.height;
  if (!sourceWidth || !sourceHeight) return;
  const torsoHeight = Math.floor(sourceHeight * 0.76);
  const feetSourceY = torsoHeight;
  const feetHeight = Math.max(1, sourceHeight - feetSourceY);
  const torsoDestinationY = groundY - size + Math.min(1, verticalShift);
  const feetDestinationY = groundY - size * 0.24;
  const halfWidth = Math.floor(sourceWidth / 2);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x), 0);
  ctx.scale(direction, 1);
  ctx.drawImage(
    sprite,
    0,
    0,
    sourceWidth,
    torsoHeight,
    Math.round(-size / 2),
    Math.round(torsoDestinationY),
    Math.round(size),
    Math.round(size * 0.76)
  );
  for (let side = 0; side < 2; side += 1) {
    const sourceX = side === 0 ? 0 : halfWidth;
    const sourceSliceWidth = side === 0 ? halfWidth : sourceWidth - halfWidth;
    const liftedFoot = Math.max(0, footShift * (side === 0 ? 1 : -1));
    ctx.drawImage(
      sprite,
      sourceX,
      feetSourceY,
      sourceSliceWidth,
      feetHeight,
      Math.round(-size / 2 + (side * size) / 2),
      Math.round(feetDestinationY - liftedFoot),
      Math.round(size / 2),
      Math.round(size * 0.24)
    );
  }
  ctx.restore();
}

function drawCombatFeedback(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  size: number,
  animation?: MobAnimationState
): void {
  if (!animation) return;
  const tint = animation.tint ?? "#e7bd58";
  const isElite = Boolean(animation.elite || animation.tint);
  const label =
    animation.label ??
    animation.name ??
    (animation.elite
      ? animation.level
        ? `ELITE · Nv ${animation.level}`
        : "ELITE"
      : "");
  const telegraphTime = Math.max(0, animation.telegraphTime ?? 0);
  const telegraph = animation.telegraph?.trim();

  if (isElite) {
    ctx.save();
    ctx.globalAlpha = 0.76;
    drawRect(ctx, x - size * 0.45, groundY - size * 0.99, size * 0.9, 2, tint);
    drawRect(ctx, x - size * 0.45, groundY + size * 0.26, size * 0.9, 2, tint);
    drawRect(ctx, x - size * 0.45, groundY - size * 0.99, 2, size * 1.27, tint);
    drawRect(ctx, x + size * 0.43, groundY - size * 0.99, 2, size * 1.27, tint);
    ctx.restore();
  }

  if (label && typeof ctx.fillText === "function") {
    ctx.save();
    ctx.globalAlpha = 0.94;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.font = `bold ${Math.max(9, Math.round(size * 0.2))}px monospace`;
    ctx.fillStyle = "#071719";
    ctx.fillText(
      label,
      Math.round(x + 1),
      Math.round(groundY - size * 1.1 + 1)
    );
    ctx.fillStyle = tint;
    ctx.fillText(label, Math.round(x), Math.round(groundY - size * 1.1));
    ctx.restore();
  }

  if (!telegraph && telegraphTime <= 0) return;
  ctx.save();
  ctx.globalAlpha = 0.38 + Math.min(0.58, telegraphTime * 1.8);
  ctx.strokeStyle = tint;
  ctx.lineWidth = 2;
  if (
    typeof ctx.beginPath === "function" &&
    typeof ctx.arc === "function" &&
    typeof ctx.stroke === "function"
  ) {
    ctx.beginPath();
    ctx.arc(
      Math.round(x),
      Math.round(groundY + size * 0.22),
      Math.round(size * (0.55 + Math.min(0.18, telegraphTime))),
      0,
      Math.PI * 2
    );
    ctx.stroke();
  } else {
    drawRect(ctx, x - size * 0.56, groundY + size * 0.27, size * 1.12, 3, tint);
  }
  if (telegraph && typeof ctx.fillText === "function") {
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.font = `bold ${Math.max(9, Math.round(size * 0.18))}px monospace`;
    ctx.fillStyle = tint;
    ctx.fillText(telegraph, Math.round(x), Math.round(groundY - size * 1.3));
  }
  ctx.restore();
}

function drawPersonFallback(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  size: number,
  raceId: string,
  classAccent: string,
  direction: 1 | -1,
  step: number,
  directionY: number,
  hurt: number
): void {
  const race = races.find(item => item.id === raceId) ?? races[0];
  const unit = size / 48;
  const bodyShift = directionY !== 0 ? directionY * 0.7 : 0;
  const legShift = step * 2.2;
  const p = (
    px: number,
    py: number,
    width: number,
    height: number,
    color: string
  ) => {
    const left = x + px * unit * direction;
    drawRect(
      ctx,
      left,
      groundY + (py + bodyShift - 22) * unit,
      width * unit * direction,
      height * unit,
      color
    );
  };
  p(-17, 20, 34, 5, "rgba(3,15,17,.48)");
  if (raceId === "slime") {
    p(-15, -5, 30, 22, "#153d3a");
    p(-12, -10, 24, 27, race.palette.skin);
    p(-8, -14, 16, 6, "#71ba94");
    p(-6, -2, 4, 4, "#102727");
    p(5, -2, 4, 4, "#102727");
    p(-2, -7, 4, 15, classAccent);
    return;
  }
  p(-10 + legShift, 7, 8, 15, "#172126");
  p(3 - legShift, 7, 8, 15, "#172126");
  p(-14, 0, 28, 16, "#15232b");
  p(-12, -2, 24, 18, race.palette.cloak);
  p(-15, 2, 5, 12, "#29443d");
  p(10, 3, 5, 12, "#1d332f");
  p(-10, -18, 20, 18, hurt > 0 ? "#f2d3ac" : race.palette.skin);
  p(-12, -20, 24, 7, "#1a2a34");
  p(-7, -13, 4, 3, "#192222");
  p(4, -13, 4, 3, "#192222");
  if (["elf", "wolfkin", "beastfolk", "kobold", "lizard"].includes(raceId)) {
    p(-13, -20, 5, 9, race.palette.cloak);
    p(9, -20, 5, 9, race.palette.cloak);
  }
  p(13, 1, 5, 15, race.palette.skin);
  p(17, -12, 3, 30, "#172326");
  p(19, -14, 4, 20, "#d6c9a4");
  p(20, -12, 3, 18, classAccent);
  p(16, 11, 9, 3, "#b89448");
}

/**
 * Compatível com a assinatura antiga: moving continua sendo a fase numérica e
 * animation é opcional. O ponto x/y permanece a âncora no chão.
 */
export function drawPerson(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  raceId: string,
  classAccent: string,
  moving: number,
  facing: number,
  animation?: AnimationState
): void {
  const direction = safeDirection(facing);
  const offsets = animationOffsets(moving, facing, animation);
  const { attackAmount: attack, hurtAmount: hurt } = offsets;
  const directionY = Math.max(-1, Math.min(1, animation?.directionY ?? 0));
  const step = offsets.step;
  const attackShift = offsets.attackShift;
  const hurtShift = offsets.hurtShift;
  const sprite = getRaceSprite(raceId);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  drawRect(
    ctx,
    x - s * 0.35,
    y - s * 0.04,
    s * 0.7,
    s * 0.1,
    "rgba(3,15,17,.48)"
  );
  if (sprite?.complete && sprite.naturalWidth > 0) {
    drawSlicedSprite(
      ctx,
      sprite,
      x + attackShift + hurtShift,
      y,
      Math.round(s),
      direction,
      offsets.verticalShift,
      offsets.footShift,
      hurt > 0 ? 0.78 : 1
    );
  } else {
    drawPersonFallback(
      ctx,
      x + attackShift + hurtShift,
      y,
      s,
      raceId,
      classAccent,
      direction,
      step,
      directionY,
      hurt
    );
  }
  if (hurt > 0) {
    ctx.globalAlpha = hurt * 0.35;
    drawRect(ctx, x - s * 0.34, y - s * 1.05, s * 0.68, s * 1.2, "#fff0d0");
  }
  if (attack > 0) {
    ctx.globalAlpha = attack;
    drawRect(
      ctx,
      x + direction * s * 0.45,
      y - s * 0.34,
      s * 0.45,
      4,
      classAccent
    );
    drawRect(
      ctx,
      x + direction * s * 0.6,
      y - s * 0.13,
      s * 0.3,
      4,
      classAccent
    );
  }
  ctx.restore();
}

export function drawTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number
): void {
  const unit = s / 64;
  const p = (
    px: number,
    py: number,
    width: number,
    height: number,
    color: string
  ) =>
    drawRect(
      ctx,
      x + px * unit,
      y + py * unit,
      width * unit,
      height * unit,
      color
    );
  p(-25, 22, 50, 8, "rgba(3,16,18,.42)");
  p(-6, 1, 12, 29, "#38271e");
  p(-10, 10, 8, 16, "#523625");
  p(2, 6, 7, 19, "#251b17");
  p(-23, -25, 46, 29, "#143c36");
  p(-29, -15, 58, 22, "#143c36");
  p(-19, -38, 39, 15, "#143c36");
  p(-23, -20, 17, 17, "#1e5c47");
  p(-4, -30, 22, 20, "#1f694d");
  p(5, -10, 20, 16, "#1d6147");
  p(-16, -5, 19, 14, "#276f50");
  p(-14, -25, 8, 5, "#5e995f");
  p(3, -31, 9, 6, "#70ad69");
  p(12, -16, 7, 5, "#579458");
  p(-21, -10, 6, 5, "#4f874f");
}

export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  kind: "hut" | "forge" | "stall"
): void {
  const unit = s / 32;
  const widthFactor = kind === "forge" ? 3 : 2;
  const p = (
    px: number,
    py: number,
    width: number,
    height: number,
    color: string
  ) =>
    drawRect(
      ctx,
      x + px * unit,
      y + py * unit,
      width * unit,
      height * unit,
      color
    );
  p(-16 * widthFactor, 15, 32 * widthFactor, 8, "rgba(3,16,18,.48)");
  p(
    -12 * widthFactor,
    -8,
    24 * widthFactor,
    25,
    kind === "forge" ? "#445157" : "#7d5434"
  );
  for (let plank = -10 * widthFactor; plank < 10 * widthFactor; plank += 8)
    p(plank, -4, 3, 18, "rgba(43,28,20,.42)");
  p(
    -16 * widthFactor,
    -16,
    32 * widthFactor,
    9,
    kind === "stall" ? "#a85739" : "#a86d44"
  );
  p(
    -11 * widthFactor,
    -23,
    22 * widthFactor,
    7,
    kind === "forge" ? "#56636a" : "#c18150"
  );
  p(-6, 5, 12, 12, "#1b2524");
  p(-4, 7, 8, 10, "#0d1819");
  if (kind === "forge") {
    p(8 * widthFactor, 4, 7, 8, "#d66e3d");
    p(9 * widthFactor, 5, 5, 5, "#f0be58");
    p(-14 * widthFactor, -27, 4, 15, "#2a2c30");
  }
  if (kind === "stall") {
    p(-13 * widthFactor, -5, 26 * widthFactor, 4, "#d6b15a");
    p(-8 * widthFactor, -1, 2, 15, "#4d3223");
    p(6 * widthFactor, -1, 2, 15, "#4d3223");
  }
}

export function drawServicePoint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  service: ServicePoint,
  frame: number,
  opened: boolean
): void {
  const bob = Math.round(Math.sin(frame * 2 + x) * 2);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (service.kind === "shop") {
    drawRect(ctx, x - 25, y + 14, 50, 7, "rgba(4,17,18,.52)");
    drawRect(ctx, x - 22, y - 5, 44, 20, "#6f422e");
    drawRect(ctx, x - 26, y - 16, 52, 10, "#d6b15a");
    drawRect(ctx, x - 20, y - 23, 40, 7, "#a84635");
    drawRect(ctx, x - 4, y - 10, 8, 8, "#f0c85a");
  } else if (service.kind === "church") {
    drawRect(ctx, x - 24, y + 15, 48, 7, "rgba(4,17,18,.52)");
    drawRect(ctx, x - 18, y - 5, 36, 20, "#606d6f");
    drawRect(ctx, x - 9, y - 26, 18, 24, "#d7d0af");
    drawRect(ctx, x - 2, y - 35, 4, 25, "#e7bd58");
    drawRect(ctx, x - 9, y - 27, 18, 4, "#e7bd58");
    drawRect(ctx, x - 4, y - 5, 8, 8, "#79d4ad");
  } else if (service.kind === "chest") {
    drawRect(ctx, x - 18, y + 12, 36, 6, "rgba(4,17,18,.52)");
    drawRect(ctx, x - 14, y - 7, 28, 18, opened ? "#4c4835" : "#8e5d36");
    drawRect(ctx, x - 15, y - 10, 30, 7, opened ? "#68705b" : "#cf9f4e");
    drawRect(ctx, x - 2, y - 3, 4, 8, "#281c19");
  } else {
    drawRect(ctx, x - 26, y - 35, 52, 60, "rgba(95,220,172,.13)");
    drawRect(ctx, x - 20, y - 30, 5, 55, "#d9ba62");
    drawRect(ctx, x + 15, y - 30, 5, 55, "#d9ba62");
    drawRect(ctx, x - 15, y - 22 + bob, 30, 42, "#71d5ad");
    drawRect(ctx, x - 3, y - 16 + bob, 6, 29, "#d9f1c5");
  }
  ctx.restore();
}

function npcAccent(visual: Npc["visual"]): string {
  return visual === "guardian"
    ? "#e7bd58"
    : visual === "emissary"
      ? "#98d7c0"
      : "#df9351";
}

export function drawNpc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  npc: Npc,
  phase: number,
  animation?: AnimationState
): void {
  const accent = npcAccent(npc.visual);
  const sprite = getEntitySprite(`npc-${npc.visual}` as EntitySpriteId);
  const direction = safeDirection(animation?.direction ?? 1);
  const moving = animation?.moving ?? false;
  const spriteAnimation: AnimationState = {
    moving,
    attack: animation?.attack ?? 0,
    hurt: animation?.hurt ?? 0,
    direction,
    directionY: animation?.directionY,
  };
  ctx.save();
  drawRect(ctx, x - 16, y - 2, 32, 5, "rgba(3,15,17,.48)");
  if (sprite?.complete && sprite.naturalWidth > 0) {
    drawSlicedSprite(
      ctx,
      sprite,
      x,
      y,
      48,
      direction,
      moving ? Math.abs(Math.sin(phase * 1.8)) : Math.sin(phase) * 0.6,
      moving ? Math.sin(phase * 1.8) : 0,
      animation?.hurt ? 0.78 : 1
    );
  } else {
    drawPerson(
      ctx,
      x,
      y,
      48,
      npc.race,
      accent,
      phase,
      direction,
      spriteAnimation
    );
  }
  if (!(sprite?.complete && sprite.naturalWidth > 0)) {
    if (npc.visual === "guardian") {
      drawRect(ctx, x + direction * 16, y - 23, 4, 34, "#223944");
      drawRect(ctx, x + direction * 12, y - 25, 12, 4, "#d7bd66");
    } else if (npc.visual === "emissary") {
      drawRect(ctx, x - 21, y - 24, 3, 32, "#91d7c0");
      drawRect(ctx, x - 25, y - 27, 11, 5, "#d9f2d1");
    } else {
      drawRect(ctx, x + direction * 14, y - 4, 13, 16, "#8e5438");
      drawRect(ctx, x + direction * 16, y - 6, 9, 4, "#e0ad58");
    }
  }
  drawRect(ctx, x - 3, y - 56, 6, 6, accent);
  drawRect(ctx, x - 1, y - 54, 2, 2, "#102321");
  ctx.restore();
}

export function drawCreature(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  kind: EnemyKind,
  phase: number,
  hurt: number,
  attack = 0,
  guard = 0,
  animation?: MobAnimationState
): void {
  const direction = safeDirection(animation?.direction ?? 1);
  const state = animation?.state;
  const moving =
    animation?.moving ??
    (state === "chase" || state === "flee" || state === "return" || attack > 0);
  const hurtValue = animation?.hurt ?? (state === "hurt" ? 0.24 : hurt);
  const attackValue = animation?.attack ?? (state === "attack" ? 0.35 : attack);
  const offsets = animationOffsets(phase, direction, {
    moving,
    attack: attackValue,
    hurt: hurtValue,
    direction: animation?.direction,
    directionY: animation?.directionY,
  });
  const hurtAmount = clamp01(hurtValue / 0.24);
  const attackAmount = clamp01(attackValue / 0.35);
  const bob = moving ? Math.sin(phase * 4) * 1.5 : 0;
  const lunge = attackAmount * direction * 7;
  const unit = s / 48;
  const p = (
    px: number,
    py: number,
    width: number,
    height: number,
    color: string
  ) =>
    drawRect(
      ctx,
      x + px * unit * direction + lunge,
      y +
        (py - 20) * unit +
        Math.min(0, bob) +
        (animation?.directionY ?? 0) * unit * 0.7,
      width * unit * direction,
      height * unit,
      color
    );
  const spriteId: EntitySpriteId | null = kind === "boss" ? null : kind;
  const sprite = spriteId ? getEntitySprite(spriteId) : null;
  const drawSize = s;
  const tint = animation?.tint ?? (animation?.elite ? "#e7bd58" : undefined);
  drawRect(
    ctx,
    x - s * 0.4,
    y - s * 0.04,
    s * 0.8,
    s * 0.1,
    "rgba(3,15,17,.48)"
  );
  if (sprite?.complete && sprite.naturalWidth > 0) {
    drawSlicedSprite(
      ctx,
      sprite,
      x + lunge,
      y,
      Math.round(drawSize),
      direction,
      bob + offsets.verticalShift * 0.35,
      offsets.footShift * 0.7,
      hurtAmount > 0 ? 0.78 : 1
    );
  } else {
    const base =
      hurtAmount > 0
        ? "#f2d3ac"
        : kind === "wolf"
          ? "#596b70"
          : kind === "boar"
            ? "#774b38"
            : kind === "slime"
              ? "#5ba77d"
              : kind === "boss"
                ? "#62513b"
                : "#4d754d";
    if (kind === "wolf") {
      p(-18, -2, 35, 17, "#27393d");
      p(-16, -7, 29, 19, base);
      p(-13, -17, 7, 12, "#3c5051");
      p(5, -17, 7, 12, "#3c5051");
      p(10, -4, 10, 9, "#40575a");
      p(14, -3, 3, 3, "#e4c65b");
      p(-12, 10, 5, 10, "#223137");
      p(8, 10, 5, 10, "#223137");
    } else if (kind === "boar") {
      p(-18, -5, 37, 20, "#402a29");
      p(-16, -8, 34, 22, base);
      p(13, -3, 9, 9, "#a26f54");
      p(19, 1, 7, 3, "#e8d6ae");
      p(-11, 10, 5, 10, "#302226");
      p(7, 10, 5, 10, "#302226");
    } else if (kind === "slime") {
      p(-17, 1, 34, 17, "#153d3a");
      p(-15, -7, 30, 24, base);
      p(-10, -14, 20, 7, "#71ba94");
      p(-8, -2, 4, 4, "#102727");
      p(5, -2, 4, 4, "#102727");
      p(-2, -8, 4, 15, tint ?? "#9ee3b1");
      p(-8, 8, 15, 4, "rgba(209,246,196,.24)");
    } else if (kind === "boss") {
      p(-27, -22, 54, 47, "#263c32");
      p(-22, -27, 44, 51, base);
      p(-31, -11, 12, 38, "#4a3c2e");
      p(19, -11, 12, 38, "#4a3c2e");
      p(-17, -39, 10, 23, "#506844");
      p(7, -39, 10, 23, "#506844");
      p(-10, -14, 5, 5, "#e7bd58");
      p(6, -14, 5, 5, "#e7bd58");
      p(-4, -3, 8, 20, "#70b77d");
    } else {
      p(-13, -11, 26, 18, "#25452e");
      p(-11, -13, 22, 17, base);
      p(-17, -10, 8, 7, "#5b9253");
      p(9, -10, 8, 7, "#5b9253");
      p(-14, 5, 28, 15, "#65412f");
      p(3, -8, 3, 3, "#f0d15a");
    }
  }
  if (attackAmount > 0) {
    p(18, -13, 12, 4, "#d7c78e");
    p(24, -9, 8, 4, "#d7c78e");
  }
  if (guard > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, guard * 3);
    drawRect(ctx, x - 24, y - 21, 6, 38, "#8bcfb2");
    drawRect(ctx, x - 20, y - 25, 20, 4, "#8bcfb2");
    drawRect(ctx, x - 20, y + 17, 20, 4, "#8bcfb2");
    ctx.restore();
  }
  if (hurtAmount > 0) {
    ctx.save();
    ctx.globalAlpha = hurtAmount * 0.28;
    drawRect(ctx, x - s * 0.45, y - s * 0.9, s * 0.9, s * 1.05, "#fff0d0");
    ctx.restore();
  }
  drawCombatFeedback(ctx, x, y, drawSize, {
    ...animation,
    attack: attackValue,
    hurt: hurtValue,
    tint,
  });
}

export function drawDeath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  phase: number,
  accent: string
): void {
  const progress = clamp01(phase / 0.6);
  const spread = Math.round((1 - progress) * 20);
  ctx.save();
  ctx.globalAlpha = Math.max(0.08, progress);
  for (let index = 0; index < 8; index += 1) {
    const dx = ((index * 13) % 30) - 15;
    const dy = ((index * 7) % 20) - 10;
    drawRect(
      ctx,
      x + dx + Math.sign(dx) * spread,
      y + dy + spread,
      5,
      5,
      index % 2 ? "#263a38" : accent
    );
  }
  ctx.restore();
}

export function drawBoss(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  phase: number,
  hurt: number,
  animation?: MobAnimationState
): void {
  const hurtValue = animation?.hurt ?? hurt;
  const attackValue =
    animation?.attack ?? (animation?.state === "attack" ? 0.35 : 0);
  const direction = safeDirection(animation?.direction ?? 1);
  const offsets = animationOffsets(phase, direction, {
    moving: animation?.moving ?? animation?.state === "chase",
    attack: attackValue,
    hurt: hurtValue,
    directionY: animation?.directionY,
  });
  const bark = hurtValue > 0 ? "#d9c69d" : "#62513b";
  const unit = 1;
  const bob = Math.sin(phase * 3) + offsets.verticalShift * 0.35;
  const p = (
    px: number,
    py: number,
    width: number,
    height: number,
    color: string
  ) =>
    drawRect(
      ctx,
      x + px * unit,
      y + py * unit + bob + (animation?.directionY ?? 0) * 0.7,
      width * unit * direction,
      height * unit,
      color
    );
  drawRect(ctx, x - 47, y + 41, 94, 9, "rgba(2,13,15,.54)");
  p(-38, -26, 76, 66, "#263c32");
  p(-32, -34, 64, 73, bark);
  p(-47, -15, 18, 51, "#4a3c2e");
  p(29, -15, 18, 51, "#4a3c2e");
  p(-25, -47, 14, 27, "#506844");
  p(11, -47, 14, 27, "#506844");
  p(-18, -54, 36, 14, "#263c32");
  p(-12, -19, 24, 17, "#142829");
  p(-8, -16, 5, 5, "#e7bd58");
  p(5, -16, 5, 5, "#e7bd58");
  p(-4, -4, 8, 27, "#70b77d");
  p(-30, 16, 17, 17, "#3b2e26");
  p(14, 16, 17, 17, "#3b2e26");
  if (attackValue > 0) {
    ctx.globalAlpha = clamp01(attackValue / 0.35);
    drawRect(ctx, x + direction * 48, y - 12, 24 * direction, 5, "#e7bd58");
    ctx.globalAlpha = 1;
  }
  if (hurtValue > 0) {
    ctx.globalAlpha = clamp01(hurtValue / 0.24) * 0.28;
    drawRect(ctx, x - 47, y - 54, 94, 96, "#fff0d0");
    ctx.globalAlpha = 1;
  }
  drawCombatFeedback(ctx, x, y, 96, {
    ...animation,
    attack: attackValue,
    hurt: hurtValue,
    elite: animation?.elite ?? true,
    tint: animation?.tint ?? "#e7bd58",
  });
}

export type RenderNpcResult = NpcPosition & { npc: Npc };
export function resolveNpcPositions(
  npcs: Npc[],
  region: { id?: string; mapKind?: string; biome?: string },
  frame: number,
  player?: { x: number; y: number }
): RenderNpcResult[] {
  return npcs.map(npc => ({ npc, ...npcPosition(npc, region, frame, player) }));
}

export type DecorationRenderInput = {
  regionId: string;
  mapKind: "biome" | "settlement" | "dungeon" | "special" | "final";
  camera: DecorationCamera;
  ctx: CanvasRenderingContext2D;
  frame?: number;
  layout?: RegionDecoration[];
};

export function renderRegionDecorations(
  input: DecorationRenderInput
): RegionDecoration[] {
  const layout =
    input.layout ?? getRegionDecorationLayout(input.regionId, input.mapKind);
  const visible = cullRegionDecorations(layout, input.camera);
  drawRegionDecorations({
    ctx: input.ctx,
    layout: visible,
    camera: input.camera,
    frame: input.frame,
    atlas: getPropsAtlas(),
  });
  return visible;
}
