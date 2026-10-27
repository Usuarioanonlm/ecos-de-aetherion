import { describe, expect, it } from "vitest";
import { audioEventSpecs, normalizeAudioSettings } from "./audioBus";
import { animationOffsets, drawCreature } from "./renderer";
import {
  MAX_REGION_DECORATIONS,
  cullRegionDecorations,
  getRegionDecorationLayout,
} from "./regionDecorations";
import { npcMotionRadius, npcPosition } from "./npcMotion";
import { TerrainLayerCache, visibleTerrainTiles } from "./terrainCache";

const npc = {
  id: "pedraviva-trader",
  x: 31.2,
  y: 23.1,
  role: "Comerciante local",
};

const region = { id: "settlement-pedraviva", mapKind: "settlement" };

describe("renderização modular de Aetherion", () => {
  it("mantém NPC determinístico e dentro do raio pequeno de trabalho", () => {
    const first = npcPosition(npc, region, 2.25);
    const second = npcPosition(npc, region, 2.25);
    expect(first).toEqual(second);
    expect(Math.hypot(first.x - npc.x, first.y - npc.y)).toBeLessThanOrEqual(
      npcMotionRadius(npc, region) + 0.001
    );
    expect(first.pose === "work" || first.pose === "idle").toBe(true);
  });

  it("faz NPC olhar para o jogador sem alterar o ponto declarativo", () => {
    const position = npcPosition(npc, region, 0, { x: npc.x - 2, y: npc.y });
    expect(position.direction).toBe(-1);
    expect(position.x).toBeCloseTo(npc.x, 0);
    expect(position.y).toBeCloseTo(npc.y, 0);
    expect(position.pose).toBe("look");
  });

  it("gera layouts distintos por mapKind com no máximo oito props", () => {
    const kinds = [
      "biome",
      "settlement",
      "dungeon",
      "special",
      "final",
    ] as const;
    const layouts = kinds.map(kind =>
      getRegionDecorationLayout(`reg-${kind}`, kind, 7)
    );
    layouts.forEach(layout => {
      expect(layout.length).toBeLessThanOrEqual(8);
      expect(new Set(layout.map(item => item.id)).size).toBe(layout.length);
    });
    expect(layouts[0].map(item => item.kind)).not.toEqual(
      layouts[2].map(item => item.kind)
    );
  });

  it("culla props fora da câmera e mantém ordenação de profundidade", () => {
    const layout = getRegionDecorationLayout("regiao", "biome");
    const visible = cullRegionDecorations(layout, {
      x: 8,
      y: 15,
      width: 320,
      height: 180,
      tile: 32,
    });
    expect(visible.every(item => item.x >= 0 && item.x <= 20)).toBe(true);
    expect(
      visible.every(
        (item, index) => index === 0 || item.depth >= visible[index - 1].depth
      )
    ).toBe(true);
  });

  it("mantém o cap defensivo de props quando recebe layout externo maior", () => {
    const layout = Array.from({ length: 12 }, (_, index) => ({
      id: `extra-${index}`,
      kind: "stump" as const,
      x: 8 + index * 0.02,
      y: 15 + index * 0.02,
      scale: 0.5,
      depth: 15 + index * 0.02,
    }));
    const visible = cullRegionDecorations(layout, {
      x: 8,
      y: 15,
      width: 320,
      height: 180,
      tile: 32,
    });
    expect(visible).toHaveLength(MAX_REGION_DECORATIONS);
  });

  it("mantém o chão ancorado e separa passos, ataque e dano", () => {
    const idle = animationOffsets(0, 1, { moving: false, attack: 0, hurt: 0 });
    const walk = animationOffsets(Math.PI / 4, 1, {
      moving: true,
      attack: 0,
      hurt: 0,
    });
    const attack = animationOffsets(0.2, -1, {
      moving: false,
      attack: 0.33,
      hurt: 0,
    });
    const hurt = animationOffsets(0.2, -1, {
      moving: false,
      attack: 0,
      hurt: 0.24,
    });
    expect(idle.footShift).toBe(0);
    expect(walk.footShift).not.toBe(0);
    expect(walk.verticalShift).toBeGreaterThanOrEqual(0);
    expect(attack.attackShift).toBeLessThan(0);
    expect(hurt.hurtShift).toBeGreaterThan(0);
  });

  it("aceita slime e estados de combate sem depender de Image/DOM", () => {
    const calls: string[] = [];
    const ctx = {
      fillStyle: "",
      globalAlpha: 1,
      strokeStyle: "",
      lineWidth: 1,
      textAlign: "center",
      textBaseline: "bottom",
      font: "",
      save: () => calls.push("save"),
      restore: () => calls.push("restore"),
      fillRect: () => calls.push("fillRect"),
      fillText: () => calls.push("fillText"),
      beginPath: () => calls.push("beginPath"),
      arc: () => calls.push("arc"),
      stroke: () => calls.push("stroke"),
    } as unknown as CanvasRenderingContext2D;
    expect(() =>
      drawCreature(ctx, 160, 120, 48, "slime", 0.4, 0, 0, 0, {
        state: "windup",
        telegraph: "Canaliza",
        telegraphTime: 0.4,
        elite: true,
        label: "Slime Ácido",
        tint: "#9ee3b1",
      })
    ).not.toThrow();
    expect(calls).toContain("fillText");
    expect(calls).toContain("stroke");
  });

  it("reutiliza a camada de terreno e culla apenas tiles próximos", () => {
    const cache = new TerrainLayerCache();
    const options = {
      regionId: "biome-floresta",
      width: 42,
      height: 30,
      tile: 32,
      terrain: (x: number, y: number) =>
        x === 0 || y === 0 ? ("water" as const) : ("grass" as const),
      isTree: (x: number, y: number) => x === 4 && y === 4,
    };
    const first = cache.getOrCreate(options);
    const second = cache.getOrCreate(options);
    expect(second).toBe(first);
    const visible = visibleTerrainTiles(first, {
      x: 4,
      y: 4,
      width: 160,
      height: 160,
      tile: 32,
    });
    expect(visible.length).toBeLessThan(first.tiles.length);
    expect(visible.some(tile => tile.tree)).toBe(true);
  });

  it("mantém o audioBus compatível com eventos previstos e volumes seguros", () => {
    const settings = normalizeAudioSettings({ sfx: 4, music: -1 });
    expect(settings).toEqual({ sfx: 1, music: 0 });
    expect(Object.keys(audioEventSpecs).sort()).toEqual(
      [
        "block",
        "collect",
        "crit",
        "defeat",
        "ether",
        "heal",
        "hit",
        "hurt",
        "menu",
        "npc",
        "quest",
      ].sort()
    );
  });
});
