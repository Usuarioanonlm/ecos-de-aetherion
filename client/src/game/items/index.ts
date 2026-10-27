import {
  getItemDefinition,
  itemById,
  itemCatalog,
  lootTables,
  normalizeItemId,
  type EquipmentSlot,
  type ItemDefinition,
  type ItemModifiers,
} from "./catalog";

export * from "./catalog";

export type EquippedItems = Partial<Record<EquipmentSlot, string>>;
export type InventoryState = {
  version: 1;
  items: Record<string, number>;
  equipped: EquippedItems;
  lastLootRoll?: number;
};

export type LegacyInventoryInput = {
  potions?: number;
  resources?: { wood?: number; ore?: number; food?: number };
  profile?: {
    classId?: string;
    originId?: string;
  };
};

export type InventoryResult = {
  state: InventoryState;
  changed: boolean;
  message?: string;
};

const EMPTY_INVENTORY: InventoryState = {
  version: 1,
  items: {},
  equipped: {},
};

const cloneState = (state: InventoryState): InventoryState => ({
  ...state,
  items: { ...state.items },
  equipped: { ...state.equipped },
});

const normalizeQuantity = (quantity: number) =>
  Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;

const addToItems = (
  state: InventoryState,
  itemId: string,
  quantity: number
): InventoryState => {
  const normalizedId = normalizeItemId(itemId);
  const definition = getItemDefinition(normalizedId);
  if (!definition || quantity <= 0) return state;
  const next = cloneState(state);
  const previous = next.items[normalizedId] ?? 0;
  next.items[normalizedId] = definition.stackable
    ? Math.min(definition.maxStack, previous + quantity)
    : Math.min(1, previous + quantity);
  return next;
};

export const createInventory = (
  legacy?: LegacyInventoryInput,
  options: { includeDefaults?: boolean } = {}
): InventoryState => {
  const state: InventoryState = {
    ...EMPTY_INVENTORY,
    items: {},
    equipped: {},
  };
  if (options.includeDefaults !== false) {
    state.items["pocao-musgo"] = 2;
    state.items["madeira-viva"] = 20;
    state.items["minerio-runico"] = 8;
    state.items["racao-de-viagem"] = 12;
  }
  if (legacy) {
    const migrated = migrateInventory(legacy, { includeDefaults: false });
    state.items = {
      ...state.items,
      ...migrated.items,
    };
    state.equipped = { ...migrated.equipped };
  }
  return state;
};

export const migrateInventory = (
  legacy: LegacyInventoryInput,
  options: { includeDefaults?: boolean } = {}
): InventoryState => {
  const state: InventoryState = {
    ...EMPTY_INVENTORY,
    items: {},
    equipped: {},
  };
  if (options.includeDefaults !== false) {
    state.items = createInventory(undefined, { includeDefaults: true }).items;
  }
  const potions = normalizeQuantity(legacy.potions ?? 0);
  const wood = normalizeQuantity(legacy.resources?.wood ?? 0);
  const ore = normalizeQuantity(legacy.resources?.ore ?? 0);
  const food = normalizeQuantity(legacy.resources?.food ?? 0);
  if (legacy.potions !== undefined) state.items["pocao-musgo"] = potions;
  if (legacy.resources?.wood !== undefined) state.items["madeira-viva"] = wood;
  if (legacy.resources?.ore !== undefined) state.items["minerio-runico"] = ore;
  if (legacy.resources?.food !== undefined)
    state.items["racao-de-viagem"] = food;

  const classToItem: Record<string, string> = {
    hunter: "arco-de-rota",
    arcanist: "cajado-de-eco",
    artificer: "martelo-runico",
  };
  const originToItem: Record<string, string> = {
    "vigil-order": "broche-da-vigilia",
    merchant: "bolsa-de-troca",
    farmer: "sementes-de-musgo",
  };
  const weaponId =
    classToItem[legacy.profile?.classId ?? ""] ?? "lamina-do-viajante";
  const originId = originToItem[legacy.profile?.originId ?? ""];
  state.items[weaponId] = Math.max(1, state.items[weaponId] ?? 0);
  state.equipped.weapon = weaponId;
  if (originId) {
    state.items[originId] = Math.max(1, state.items[originId] ?? 0);
    state.equipped.accessory = originId;
  }
  return state;
};

export const addItem = (
  source: InventoryState,
  itemId: string,
  quantity = 1
): InventoryResult => {
  const normalizedId = normalizeItemId(itemId);
  const definition = getItemDefinition(normalizedId);
  const amount = normalizeQuantity(quantity);
  if (!definition || amount <= 0)
    return {
      state: source,
      changed: false,
      message: "Item inexistente ou quantidade inválida.",
    };
  const state = addToItems(source, normalizedId, amount);
  return {
    state,
    changed: state.items[normalizedId] !== (source.items[normalizedId] ?? 0),
    message: `+${amount} ${definition.name}`,
  };
};

export const removeItem = (
  source: InventoryState,
  itemId: string,
  quantity = 1
): InventoryResult => {
  const normalizedId = normalizeItemId(itemId);
  const amount = normalizeQuantity(quantity);
  const current = source.items[normalizedId] ?? 0;
  if (amount <= 0 || current < amount) {
    return {
      state: source,
      changed: false,
      message: "Quantidade insuficiente.",
    };
  }
  const state = cloneState(source);
  const remaining = current - amount;
  if (remaining) state.items[normalizedId] = remaining;
  else delete state.items[normalizedId];
  if (Object.values(state.equipped).includes(normalizedId) && remaining === 0) {
    for (const slot of Object.keys(state.equipped) as EquipmentSlot[]) {
      if (state.equipped[slot] === normalizedId) delete state.equipped[slot];
    }
  }
  return {
    state,
    changed: true,
    message: `-${amount} ${getItemDefinition(normalizedId)?.name ?? normalizedId}`,
  };
};

export const equipItem = (
  source: InventoryState,
  itemId: string
): InventoryResult => {
  const normalizedId = normalizeItemId(itemId);
  const definition = getItemDefinition(normalizedId);
  if (!definition?.equipmentSlot)
    return {
      state: source,
      changed: false,
      message: "Este item não pode ser equipado.",
    };
  if ((source.items[normalizedId] ?? 0) < 1)
    return {
      state: source,
      changed: false,
      message: "Item não encontrado na bolsa.",
    };
  const state = cloneState(source);
  state.equipped[definition.equipmentSlot] = normalizedId;
  return {
    state,
    changed:
      state.equipped[definition.equipmentSlot] !==
      source.equipped[definition.equipmentSlot],
    message: `${definition.name} equipado.`,
  };
};

export const unequipItem = (
  source: InventoryState,
  slotOrItem: EquipmentSlot | string
): InventoryResult => {
  const state = cloneState(source);
  const slot = (Object.keys(state.equipped) as EquipmentSlot[]).find(
    key =>
      key === slotOrItem || state.equipped[key] === normalizeItemId(slotOrItem)
  );
  if (!slot || !state.equipped[slot])
    return {
      state: source,
      changed: false,
      message: "Nenhum item equipado nesse espaço.",
    };
  const name = getItemDefinition(state.equipped[slot])?.name;
  delete state.equipped[slot];
  return { state, changed: true, message: `${name ?? "Item"} desequipado.` };
};

export const useItem = (
  source: InventoryState,
  itemId: string
): InventoryResult & { effect?: { heal?: number; focusRestore?: number } } => {
  const normalizedId = normalizeItemId(itemId);
  const definition = getItemDefinition(normalizedId);
  if (!definition || definition.kind !== "consumivel")
    return {
      state: source,
      changed: false,
      message: "Este item não é consumível.",
    };
  const removed = removeItem(source, normalizedId, 1);
  if (!removed.changed) return { ...removed };
  return {
    ...removed,
    effect: { heal: definition.heal, focusRestore: definition.focusRestore },
    message: `${definition.name} usado.`,
  };
};

export const getBonuses = (state: InventoryState): ItemModifiers => {
  const totals: ItemModifiers = {};
  for (const itemId of Object.values(state.equipped)) {
    const modifiers = getItemDefinition(itemId)?.modifiers;
    if (!modifiers) continue;
    for (const [key, value] of Object.entries(modifiers) as Array<
      [keyof ItemModifiers, number | undefined]
    >) {
      totals[key] = (totals[key] ?? 0) + (value ?? 0);
    }
  }
  return totals;
};

export const compareItems = (
  state: InventoryState,
  itemId: string,
  slot?: EquipmentSlot
) => {
  const selected = getItemDefinition(itemId);
  const resolvedSlot = slot ?? selected?.equipmentSlot;
  const equippedId = resolvedSlot ? state.equipped[resolvedSlot] : undefined;
  const equipped = equippedId ? getItemDefinition(equippedId) : undefined;
  if (!selected || !resolvedSlot)
    return { selected, equipped, deltas: {} as ItemModifiers };
  const deltas: ItemModifiers = {};
  const selectedModifiers = selected.modifiers ?? {};
  const equippedModifiers = equipped?.modifiers ?? {};
  const keys = [
    ...Object.keys(selectedModifiers),
    ...Object.keys(equippedModifiers).filter(
      key => !Object.prototype.hasOwnProperty.call(selectedModifiers, key)
    ),
  ] as Array<keyof ItemModifiers>;
  for (const key of keys) {
    deltas[key] = (selectedModifiers[key] ?? 0) - (equippedModifiers[key] ?? 0);
  }
  return { selected, equipped, deltas };
};

const seededRandom = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

export const rollLoot = (
  source: InventoryState,
  lootKey: string,
  seed = Date.now()
): InventoryResult & { drops: Array<{ itemId: string; quantity: number }> } => {
  const table = lootTables[lootKey] ?? [];
  let state = cloneState(source);
  const drops: Array<{ itemId: string; quantity: number }> = [];
  table.forEach((entry, index) => {
    if (!itemById[entry.itemId]) return;
    const chance = seededRandom(seed + index * 17 + lootKey.length);
    if (chance > entry.chance) return;
    const min = entry.min ?? 1;
    const max = entry.max ?? min;
    const quantity =
      min + Math.floor(seededRandom(seed + index * 31 + 7) * (max - min + 1));
    state = addToItems(state, entry.itemId, quantity);
    drops.push({ itemId: entry.itemId, quantity });
  });
  state.lastLootRoll = seed;
  return {
    state,
    changed: drops.length > 0,
    drops,
    message: drops.length ? "Loot recebido." : "Nenhum item caiu.",
  };
};

export const getInventoryEntries = (state: InventoryState) =>
  Object.entries(state.items)
    .map(([itemId, quantity]) => ({
      definition: getItemDefinition(itemId),
      itemId,
      quantity,
    }))
    .filter(
      (
        entry
      ): entry is {
        definition: ItemDefinition;
        itemId: string;
        quantity: number;
      } => Boolean(entry.definition)
    )
    .sort((a, b) =>
      a.definition.name.localeCompare(b.definition.name, "pt-BR")
    );

export const serializeInventory = (state: InventoryState) => ({
  schemaVersion: 1 as const,
  ...cloneState(state),
});

export const deserializeInventory = (
  input: unknown,
  legacy?: LegacyInventoryInput
) => {
  if (!input || typeof input !== "object") return createInventory(legacy);
  const raw = input as Partial<InventoryState> & { schemaVersion?: number };
  if (raw.schemaVersion !== 1 || !raw.items || typeof raw.items !== "object")
    return createInventory(legacy);
  const state = createInventory(undefined, { includeDefaults: false });
  for (const [itemId, quantity] of Object.entries(raw.items)) {
    const definition = getItemDefinition(itemId);
    const amount = normalizeQuantity(Number(quantity));
    if (definition && amount > 0)
      state.items[definition.id] = Math.min(definition.maxStack, amount);
  }
  if (raw.equipped && typeof raw.equipped === "object") {
    for (const slot of ["weapon", "armor", "accessory"] as EquipmentSlot[]) {
      const itemId = raw.equipped[slot];
      if (
        typeof itemId === "string" &&
        state.items[normalizeItemId(itemId)] > 0
      ) {
        state.equipped[slot] = normalizeItemId(itemId);
      }
    }
  }
  state.lastLootRoll =
    typeof raw.lastLootRoll === "number" ? raw.lastLootRoll : undefined;
  return state;
};

export const equip = equipItem;
export const unequip = unequipItem;
export const use = useItem;
export const compare = compareItems;

export { itemCatalog, itemById };
