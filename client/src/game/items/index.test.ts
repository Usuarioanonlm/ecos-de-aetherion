import { describe, expect, it } from "vitest";
import {
  addItem,
  compareItems,
  createInventory,
  equipItem,
  getBonuses,
  migrateInventory,
  removeItem,
  rollLoot,
  unequipItem,
  useItem,
} from "./index";

describe("inventário canônico", () => {
  it("migra poções e recursos legados sem duplicar os consumíveis", () => {
    const migrated = migrateInventory({
      potions: 4,
      resources: { wood: 7, ore: 3, food: 2 },
      profile: { classId: "hunter", originId: "vigil-order" },
    });
    expect(migrated.items["pocao-musgo"]).toBe(4);
    expect(migrated.items["madeira-viva"]).toBe(7);
    expect(migrated.items["minerio-runico"]).toBe(3);
    expect(migrated.items["racao-de-viagem"]).toBe(2);
    expect(migrated.items["arco-de-rota"]).toBe(1);
    expect(migrated.items["broche-da-vigilia"]).toBe(1);
    expect(
      Object.values(migrated.items).filter(quantity => quantity === 4)
    ).toHaveLength(1);
  });

  it("adiciona e remove stacks mantendo itens equipados coerentes", () => {
    let state = createInventory(undefined, { includeDefaults: false });
    state = addItem(state, "pocao-musgo", 3).state;
    expect(state.items["pocao-musgo"]).toBe(3);
    state = removeItem(state, "pocao-musgo", 2).state;
    expect(state.items["pocao-musgo"]).toBe(1);
    expect(removeItem(state, "pocao-musgo", 2).changed).toBe(false);

    state = addItem(state, "lamina-do-viajante").state;
    state = equipItem(state, "lamina-do-viajante").state;
    expect(state.equipped.weapon).toBe("lamina-do-viajante");
    state = unequipItem(state, "weapon").state;
    expect(state.equipped.weapon).toBeUndefined();
  });

  it("usa poção uma única vez e expõe bônus derivados do equipamento", () => {
    let state = createInventory(undefined, { includeDefaults: false });
    state = addItem(state, "pocao-musgo", 1).state;
    const used = useItem(state, "pocao-musgo");
    expect(used.changed).toBe(true);
    expect(used.effect?.heal).toBe(28);
    expect(used.state.items["pocao-musgo"]).toBeUndefined();
    expect(useItem(used.state, "pocao-musgo").changed).toBe(false);

    state = addItem(used.state, "martelo-runico").state;
    state = equipItem(state, "martelo-runico").state;
    expect(getBonuses(state)).toMatchObject({
      power: 2,
      attack: 3,
      defense: 1,
    });
  });

  it("compara equipamento e faz roll de loot referenciado por mob/boss", () => {
    let state = createInventory(undefined, { includeDefaults: false });
    state = addItem(state, "lamina-do-viajante").state;
    state = equipItem(state, "lamina-do-viajante").state;
    state = addItem(state, "martelo-runico").state;
    const comparison = compareItems(state, "martelo-runico");
    expect(comparison.deltas.attack).toBe(1);
    expect(comparison.deltas.power).toBe(1);

    const loot = rollLoot(state, "Kaelgor", 12345);
    expect(loot.drops.some(drop => drop.itemId === "escama-primordial")).toBe(
      true
    );
    expect(loot.state.items["escama-primordial"]).toBe(
      loot.drops.find(drop => drop.itemId === "escama-primordial")?.quantity
    );
    expect(rollLoot(state, "Kaelgor", 12345).drops).toEqual(loot.drops);
  });
});
