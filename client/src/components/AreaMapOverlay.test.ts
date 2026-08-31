import { describe, expect, it } from "vitest";
import { normalizeMapCoordinate } from "./AreaMapOverlay";

describe("AreaMapOverlay", () => {
  it("mantém marcadores dentro do mapa mesmo com coordenadas inválidas", () => {
    expect(normalizeMapCoordinate(-12)).toBe(0);
    expect(normalizeMapCoordinate(42)).toBe(42);
    expect(normalizeMapCoordinate(140)).toBe(100);
    expect(normalizeMapCoordinate(Number.NaN)).toBe(0);
  });
});
