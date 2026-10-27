export type NpcMotionInput = {
  id: string;
  x: number;
  y: number;
  role?: string;
};

export type NpcMotionRegion = {
  id?: string;
  mapKind?: string;
  biome?: string;
};

export type NpcPose = "idle" | "patrol" | "work" | "look";

export type NpcPosition = {
  x: number;
  y: number;
  direction: 1 | -1;
  directionY: -1 | 0 | 1;
  moving: boolean;
  phase: number;
  pose: NpcPose;
};

const stableHash = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
};

/**
 * Retorna a posição animada sem alterar a coordenada declarada do NPC.
 * O raio é pequeno e determinístico para que interação, mapa e render usem o mesmo ponto.
 */
export function npcPosition(
  npc: NpcMotionInput,
  region: NpcMotionRegion,
  frame: number,
  player?: { x: number; y: number }
): NpcPosition {
  const seed = stableHash(`${region.id ?? "regiao"}:${npc.id}`);
  const role = (npc.role ?? "").toLocaleLowerCase("pt-BR");
  const isSettlement = region.mapKind === "settlement";
  const isGuardian = role.includes("guard") || role.includes("vigia");
  const isWorker =
    role.includes("comerc") ||
    role.includes("cronist") ||
    role.includes("ferreir") ||
    role.includes("curand") ||
    role.includes("artesa");
  const radius = isGuardian ? 0.32 : isWorker ? 0.2 : 0.16;
  const period = isGuardian ? 7.5 : isWorker ? 5.25 : 8.5;
  const cycle = (frame + seed * period) % period;
  const movingWindow = isGuardian
    ? cycle < 4.7
    : isWorker
      ? cycle < 2.3
      : cycle < 3.3;
  let moving = isSettlement && movingWindow;
  const angle = seed * Math.PI * 2 + frame * (isGuardian ? 0.72 : 0.48);
  let distance = moving
    ? radius * (0.55 + 0.45 * Math.sin(frame * 1.1 + seed))
    : 0;
  let x = npc.x + Math.cos(angle) * distance;
  let y = npc.y + Math.sin(angle) * distance * 0.62;

  let direction: 1 | -1 = Math.cos(angle) >= 0 ? 1 : -1;
  let directionY: -1 | 0 | 1 = moving ? (Math.sin(angle) >= 0 ? 1 : -1) : 0;
  let pose: NpcPose = moving ? (isGuardian ? "patrol" : "work") : "idle";

  if (player) {
    const dx = player.x - x;
    const dy = player.y - y;
    if (Math.hypot(dx, dy) < 3.2) {
      moving = false;
      distance = 0;
      x = npc.x;
      y = npc.y;
      direction = dx >= 0 ? 1 : -1;
      directionY = Math.abs(dy) > 0.32 ? (dy >= 0 ? 1 : -1) : 0;
      pose = "look";
    }
  }

  return {
    x,
    y,
    direction,
    directionY,
    moving,
    phase: frame + seed * Math.PI * 2,
    pose,
  };
}

export function npcMotionRadius(
  npc: NpcMotionInput,
  region: NpcMotionRegion
): number {
  const role = (npc.role ?? "").toLocaleLowerCase("pt-BR");
  if (region.mapKind !== "settlement") return 0;
  if (role.includes("guard") || role.includes("vigia")) return 0.32;
  if (
    role.includes("comerc") ||
    role.includes("cronist") ||
    role.includes("ferreir") ||
    role.includes("curand")
  )
    return 0.2;
  return 0.16;
}
