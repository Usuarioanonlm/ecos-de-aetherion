export type TerrainTileKind = "grass" | "water" | "path" | "village" | "void";

export type TerrainTile = {
  x: number;
  y: number;
  kind: TerrainTileKind;
  tree: boolean;
};

export type TerrainCamera = {
  x: number;
  y: number;
  width: number;
  height: number;
  tile: number;
};

export type TerrainLayerDefinition = {
  regionId: string;
  width: number;
  height: number;
  tile: number;
  tiles: readonly TerrainTile[];
};

export type TerrainLayerOptions = {
  regionId: string;
  width: number;
  height: number;
  tile: number;
  terrain: (x: number, y: number) => TerrainTileKind;
  isTree?: (x: number, y: number) => boolean;
};

/** Pré-calcula o metadata estático uma vez por região; o RAF só faz culling. */
export function createTerrainLayer(
  options: TerrainLayerOptions
): TerrainLayerDefinition {
  const tiles: TerrainTile[] = [];
  const isTree = options.isTree ?? (() => false);
  for (let y = 0; y < options.height; y += 1) {
    for (let x = 0; x < options.width; x += 1) {
      tiles.push({
        x,
        y,
        kind: options.terrain(x, y),
        tree: isTree(x, y),
      });
    }
  }
  return {
    regionId: options.regionId,
    width: options.width,
    height: options.height,
    tile: options.tile,
    tiles,
  };
}

export function visibleTerrainTiles(
  layer: TerrainLayerDefinition,
  camera: TerrainCamera,
  margin = 1
): TerrainTile[] {
  const halfWidth = camera.width / camera.tile / 2 + margin;
  const halfHeight = camera.height / camera.tile / 2 + margin;
  const minX = Math.floor(camera.x - halfWidth);
  const maxX = Math.ceil(camera.x + halfWidth);
  const minY = Math.floor(camera.y - halfHeight);
  const maxY = Math.ceil(camera.y + halfHeight);
  return layer.tiles.filter(
    tile => tile.x >= minX && tile.x <= maxX && tile.y >= minY && tile.y <= maxY
  );
}

export class TerrainLayerCache {
  private readonly layers = new Map<string, TerrainLayerDefinition>();

  getOrCreate(options: TerrainLayerOptions): TerrainLayerDefinition {
    const cached = this.layers.get(options.regionId);
    if (
      cached &&
      cached.width === options.width &&
      cached.height === options.height &&
      cached.tile === options.tile
    )
      return cached;
    const layer = createTerrainLayer(options);
    this.layers.set(options.regionId, layer);
    return layer;
  }

  clear(regionId?: string): void {
    if (regionId) this.layers.delete(regionId);
    else this.layers.clear();
  }
}
