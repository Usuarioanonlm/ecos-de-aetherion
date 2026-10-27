import { getPropsAtlas, worldAssetRegistry } from "./assetRegistry";

export type RegionMapKind =
  | "biome"
  | "settlement"
  | "dungeon"
  | "special"
  | "final";
export type PropKind = "ruin" | "cart" | "stump" | "crystals";

export type RegionDecoration = {
  id: string;
  kind: PropKind;
  x: number;
  y: number;
  scale: number;
  depth: number;
};

export type DecorationCamera = {
  x: number;
  y: number;
  width: number;
  height: number;
  tile: number;
};

export type DecorationDrawOptions = {
  ctx: CanvasRenderingContext2D;
  layout: RegionDecoration[];
  camera: DecorationCamera;
  frame?: number;
  atlas?: HTMLImageElement | null;
};

const QUADRANTS = worldAssetRegistry.propsAtlas.quadrants;
const PROP_KINDS: PropKind[] = ["ruin", "cart", "stump", "crystals"];
export const MAX_REGION_DECORATIONS = 8;

const stableHash = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
};

const prop = (
  regionId: string,
  kind: PropKind,
  index: number,
  x: number,
  y: number,
  scale: number
): RegionDecoration => ({
  id: `${regionId}-prop-${kind}-${index}`,
  kind,
  x,
  y,
  scale,
  depth: y,
});

/**
 * Layout compacto: no máximo oito props por região. Coordenadas são mundo, não pixels,
 * e nunca substituem serviços, portais ou pontos de interação declarados pelo conteúdo.
 */
export function getRegionDecorationLayout(
  regionId: string,
  mapKind: RegionMapKind,
  seed = 0
): RegionDecoration[] {
  const jitter = (index: number, amplitude: number) =>
    (stableHash(`${regionId}:${seed}:${index}`) - 0.5) * amplitude;
  const layouts: Record<
    RegionMapKind,
    Array<[PropKind, number, number, number]>
  > = {
    biome: [
      ["stump", 8.2, 15.4, 0.78],
      ["stump", 36.5, 24.2, 0.66],
      ["crystals", 11.8, 5.1, 0.52],
      ["ruin", 37.1, 7.4, 0.62],
    ],
    settlement: [
      ["cart", 34.8, 17.6, 0.62],
      ["stump", 7.5, 24.1, 0.56],
      ["crystals", 14.2, 7.4, 0.42],
    ],
    dungeon: [
      ["ruin", 13.1, 7.2, 0.7],
      ["crystals", 34.4, 8.4, 0.58],
      ["crystals", 9.4, 23.4, 0.46],
      ["ruin", 36.8, 24.5, 0.52],
    ],
    special: [
      ["ruin", 12.4, 7.5, 0.78],
      ["crystals", 34.7, 8.2, 0.62],
      ["stump", 9.2, 24.1, 0.58],
    ],
    final: [
      ["ruin", 11.4, 7.1, 0.82],
      ["crystals", 34.8, 7.8, 0.72],
      ["crystals", 10.6, 24.2, 0.64],
      ["ruin", 36.7, 24.4, 0.62],
    ],
  };
  return layouts[mapKind].map(([kind, x, y, scale], index) =>
    prop(
      regionId,
      kind,
      index,
      x + jitter(index, 0.24),
      y + jitter(index + 20, 0.18),
      scale
    )
  );
}

export function isDecorationVisible(
  decoration: RegionDecoration,
  camera: DecorationCamera,
  margin = 3
): boolean {
  const halfWidth = camera.width / camera.tile / 2 + margin;
  const halfHeight = camera.height / camera.tile / 2 + margin;
  return (
    decoration.x >= camera.x - halfWidth &&
    decoration.x <= camera.x + halfWidth &&
    decoration.y >= camera.y - halfHeight &&
    decoration.y <= camera.y + halfHeight
  );
}

export function cullRegionDecorations(
  layout: RegionDecoration[],
  camera: DecorationCamera,
  margin = 3
): RegionDecoration[] {
  return layout
    .filter(decoration => isDecorationVisible(decoration, camera, margin))
    .sort((left, right) => left.depth - right.depth)
    .slice(0, MAX_REGION_DECORATIONS);
}

const fallbackColors: Record<PropKind, [string, string]> = {
  ruin: ["#687053", "#a9ac78"],
  cart: ["#6f482e", "#c18d4f"],
  stump: ["#67452e", "#8f673d"],
  crystals: ["#3c8e9b", "#a987ee"],
};

function drawFallbackProp(
  ctx: CanvasRenderingContext2D,
  propData: RegionDecoration,
  x: number,
  y: number,
  frame: number
): void {
  const [dark, light] = fallbackColors[propData.kind];
  const size = 22 * propData.scale;
  const bob = propData.kind === "crystals" ? Math.sin(frame * 2 + x) * 1.5 : 0;
  ctx.fillStyle = "rgba(4, 17, 18, .34)";
  ctx.fillRect(
    Math.round(x - size * 0.72),
    Math.round(y + size * 0.2),
    Math.ceil(size * 1.44),
    4
  );
  ctx.fillStyle = dark;
  ctx.fillRect(
    Math.round(x - size / 2),
    Math.round(y - size + bob),
    Math.ceil(size),
    Math.ceil(size * 1.18)
  );
  ctx.fillStyle = light;
  ctx.fillRect(
    Math.round(x - size * 0.28),
    Math.round(y - size * 0.82 + bob),
    Math.ceil(size * 0.34),
    Math.ceil(size * 0.42)
  );
  if (propData.kind === "crystals") {
    ctx.fillStyle = "#dcf8e1";
    ctx.fillRect(
      Math.round(x + size * 0.14),
      Math.round(y - size * 0.66 + bob),
      3,
      8
    );
  }
}

/** Desenha somente props visíveis, usando o atlas quando pronto e fallback geométrico quando não. */
export function drawRegionDecorations({
  ctx,
  layout,
  camera,
  frame = 0,
  atlas = getPropsAtlas(),
}: DecorationDrawOptions): void {
  const visible = cullRegionDecorations(layout, camera);
  const atlasReady = Boolean(atlas?.complete && atlas.naturalWidth > 0);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (const decoration of visible) {
    const screenX = Math.round(
      (decoration.x - camera.x) * camera.tile + camera.width / 2
    );
    const screenY = Math.round(
      (decoration.y - camera.y) * camera.tile + camera.height / 2
    );
    if (!atlasReady || !atlas) {
      drawFallbackProp(ctx, decoration, screenX, screenY, frame);
      continue;
    }
    const source = QUADRANTS[decoration.kind];
    const destinationSize = Math.round(96 * decoration.scale);
    const destinationX = Math.round(screenX - destinationSize / 2);
    const destinationY = Math.round(screenY - destinationSize * 0.86);
    ctx.drawImage(
      atlas,
      source.x,
      source.y,
      source.width,
      source.height,
      destinationX,
      destinationY,
      destinationSize,
      destinationSize
    );
  }
  ctx.restore();
}

export const decorationPropKinds = PROP_KINDS;
