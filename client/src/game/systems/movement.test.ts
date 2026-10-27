import { describe, expect, it } from "vitest";
import { canOccupy, moveWithCollision } from "./movement";

const bounds = {
  minX: 0,
  maxX: 10,
  minY: 0,
  maxY: 10,
  radius: 0.2,
  isBlocked: (x: number) => x === 3,
};

describe("movimento e colisão", () => {
  it("respeita os limites e o raio do personagem", () => {
    expect(canOccupy({ x: 0.1, y: 1 }, bounds)).toBe(false);
    expect(canOccupy({ x: 1, y: 1 }, bounds)).toBe(true);
    expect(canOccupy({ x: 3, y: 1 }, bounds)).toBe(false);
  });
  it("permite deslizar no eixo livre junto a uma parede", () => {
    const next = moveWithCollision({ x: 2, y: 1 }, { x: 1, y: 1 }, 1, bounds);
    expect(next.x).toBeLessThan(2.5);
    expect(next.y).toBe(2);
  });
  it("não atravessa a parede mesmo quando o destino final está livre", () => {
    const next = moveWithCollision({ x: 1, y: 1 }, { x: 4, y: 0 }, 1, bounds);
    expect(next.x).toBeLessThan(3);
    expect(next.y).toBe(1);
  });
});
