import { describe, expect, it } from "vitest";
import {
  normalizeMapCoordinate,
  normalizeMapMarker,
  normalizeWorldRegion,
} from "./AreaMapOverlay";

describe("AreaMapOverlay", () => {
  it("mantém marcadores dentro do mapa mesmo com coordenadas inválidas", () => {
    expect(normalizeMapCoordinate(-12)).toBe(0);
    expect(normalizeMapCoordinate(42)).toBe(42);
    expect(normalizeMapCoordinate(140)).toBe(100);
    expect(normalizeMapCoordinate(Number.NaN)).toBe(0);
  });

  it("normaliza todos os eixos dos marcadores locais", () => {
    expect(
      normalizeMapMarker({
        id: "portal",
        name: "Portal",
        type: "exit",
        x: Number.POSITIVE_INFINITY,
        y: -18,
      })
    ).toMatchObject({ id: "portal", x: 0, y: 0 });
  });

  it("normaliza regiões mundiais sem alterar sua identidade", () => {
    expect(
      normalizeWorldRegion({
        id: "floresta",
        name: "Floresta de Elaris",
        x: 140,
        y: Number.NaN,
        current: true,
      })
    ).toEqual({
      id: "floresta",
      name: "Floresta de Elaris",
      x: 100,
      y: 0,
      current: true,
    });
  });
});
