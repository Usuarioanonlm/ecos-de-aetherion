export type ItemKind =
  | "consumivel"
  | "material"
  | "arma"
  | "armadura"
  | "acessorio"
  | "missao";
export type ItemRarity = "comum" | "incomum" | "raro" | "epico" | "lendario";
export type EquipmentSlot = "weapon" | "armor" | "accessory";
export type ItemModifiers = {
  vitality?: number;
  power?: number;
  ether?: number;
  agility?: number;
  resolve?: number;
  attack?: number;
  defense?: number;
  magicAttack?: number;
  speed?: number;
  criticalChance?: number;
  evasion?: number;
  maxHealth?: number;
  maxFocus?: number;
};

export type ItemDefinition = {
  id: string;
  name: string;
  kind: ItemKind;
  rarity: ItemRarity;
  description: string;
  stackable: boolean;
  maxStack: number;
  equipmentSlot?: EquipmentSlot;
  modifiers?: ItemModifiers;
  heal?: number;
  focusRestore?: number;
  spriteRef?: string;
  atlasRef?: string;
};

export type LootEntry = {
  itemId: string;
  chance: number;
  min?: number;
  max?: number;
};

const item = (definition: ItemDefinition): ItemDefinition => definition;

export const itemCatalog: ItemDefinition[] = [
  item({
    id: "pocao-musgo",
    name: "Poção de musgo",
    kind: "consumivel",
    rarity: "comum",
    description:
      "Recupera 28 pontos de vitalidade e mantém o atalho legado de poções.",
    stackable: true,
    maxStack: 99,
    heal: 28,
    spriteRef: "item:pocao-musgo",
  }),
  item({
    id: "madeira-viva",
    name: "Madeira viva",
    kind: "material",
    rarity: "comum",
    description: "Recurso regional usado em construções e rotas.",
    stackable: true,
    maxStack: 999,
    spriteRef: "resource:wood",
  }),
  item({
    id: "minerio-runico",
    name: "Minério rúnico",
    kind: "material",
    rarity: "incomum",
    description: "Minério que conserva uma pequena carga de Éter.",
    stackable: true,
    maxStack: 999,
    spriteRef: "resource:ore",
  }),
  item({
    id: "racao-de-viagem",
    name: "Ração de viagem",
    kind: "consumivel",
    rarity: "comum",
    description: "Mantimentos preservados para longas rotas.",
    stackable: true,
    maxStack: 99,
    heal: 8,
    spriteRef: "resource:food",
  }),
  item({
    id: "fragmento-eter",
    name: "Fragmento de Éter",
    kind: "material",
    rarity: "incomum",
    description: "Essência condensada deixada por uma criatura dissipada.",
    stackable: true,
    maxStack: 999,
    spriteRef: "essence:green",
  }),
  item({
    id: "gelatina-de-slime",
    name: "Gelatina de Slime",
    kind: "material",
    rarity: "comum",
    description: "Gel translúcido útil para alquimia simples.",
    stackable: true,
    maxStack: 999,
    spriteRef: "mob:slime",
    atlasRef: "Slime",
  }),
  item({
    id: "cristal-magico",
    name: "Cristal mágico",
    kind: "material",
    rarity: "raro",
    description: "Cristal que vibra com a frequência das ruínas antigas.",
    stackable: true,
    maxStack: 99,
    spriteRef: "resource:crystal",
  }),
  item({
    id: "lamina-do-viajante",
    name: "Lâmina do viajante",
    kind: "arma",
    rarity: "comum",
    description: "Arma inicial confiável para atravessar a primeira rota.",
    stackable: false,
    maxStack: 1,
    equipmentSlot: "weapon",
    modifiers: { power: 1, attack: 2 },
    spriteRef: "weapon:traveler-blade",
  }),
  item({
    id: "arco-de-rota",
    name: "Arco de rota",
    kind: "arma",
    rarity: "comum",
    description: "Arco curto usado por batedores das estradas.",
    stackable: false,
    maxStack: 1,
    equipmentSlot: "weapon",
    modifiers: { agility: 1, attack: 2, criticalChance: 0.02 },
    spriteRef: "weapon:route-bow",
  }),
  item({
    id: "cajado-de-eco",
    name: "Cajado de eco",
    kind: "arma",
    rarity: "comum",
    description: "Canaliza Éter sem alterar o ritmo do combate atual.",
    stackable: false,
    maxStack: 1,
    equipmentSlot: "weapon",
    modifiers: { ether: 1, magicAttack: 2, maxFocus: 5 },
    spriteRef: "weapon:echo-staff",
  }),
  item({
    id: "martelo-runico",
    name: "Martelo rúnico",
    kind: "arma",
    rarity: "incomum",
    description: "Ferramenta e arma de artífice marcada por runas de oficina.",
    stackable: false,
    maxStack: 1,
    equipmentSlot: "weapon",
    modifiers: { power: 2, attack: 3, defense: 1 },
    spriteRef: "weapon:runic-hammer",
  }),
  item({
    id: "broche-da-vigilia",
    name: "Broche da Vigília",
    kind: "acessorio",
    rarity: "comum",
    description: "Insígnia de quem escolheu vigiar depois da Ruptura.",
    stackable: false,
    maxStack: 1,
    equipmentSlot: "accessory",
    modifiers: { resolve: 1, defense: 1 },
    spriteRef: "quest:brooch-vigil",
  }),
  item({
    id: "bolsa-de-troca",
    name: "Bolsa de troca",
    kind: "acessorio",
    rarity: "comum",
    description: "Pequena bolsa de moedas e selos de comércio.",
    stackable: false,
    maxStack: 1,
    equipmentSlot: "accessory",
    modifiers: { agility: 1, speed: 1 },
    spriteRef: "quest:trade-pouch",
  }),
  item({
    id: "sementes-de-musgo",
    name: "Sementes de musgo",
    kind: "missao",
    rarity: "comum",
    description: "Sementes que ainda guardam a cor da Vila de Musgo.",
    stackable: true,
    maxStack: 99,
    spriteRef: "quest:moss-seeds",
  }),
  item({
    id: "selo-de-alianca",
    name: "Selo de aliança",
    kind: "missao",
    rarity: "raro",
    description: "Prova de que uma rota escolheu permanecer aberta.",
    stackable: false,
    maxStack: 1,
    spriteRef: "quest:alliance-seal",
  }),
  item({
    id: "escama-primordial",
    name: "Escama primordial",
    kind: "missao",
    rarity: "epico",
    description: "Escama fria de uma memória dracônica caída.",
    stackable: true,
    maxStack: 7,
    spriteRef: "boss:dragon-scale",
    atlasRef: "Kaelgor",
  }),
  item({
    id: "fragmento-vazio",
    name: "Fragmento do Vazio",
    kind: "missao",
    rarity: "lendario",
    description: "Um pedaço instável da região final de Aetherion.",
    stackable: true,
    maxStack: 3,
    spriteRef: "boss:void-fragment",
    atlasRef: "Nexarion",
  }),
];

export const itemById = Object.fromEntries(
  itemCatalog.map(definition => [definition.id, definition])
) as Record<string, ItemDefinition>;

export const lootTables: Record<string, LootEntry[]> = {
  "Chefe Antigo": [
    { itemId: "cristal-magico", chance: 1, min: 1, max: 3 },
    { itemId: "pocao-musgo", chance: 1, min: 1, max: 2 },
    { itemId: "martelo-runico", chance: 0.2 },
  ],
  Slime: [
    { itemId: "gelatina-de-slime", chance: 1, min: 1, max: 2 },
    { itemId: "pocao-musgo", chance: 0.25 },
    { itemId: "cristal-magico", chance: 0.05 },
  ],
  "Lobo Cinzento": [
    { itemId: "fragmento-eter", chance: 0.7 },
    { itemId: "pocao-musgo", chance: 0.18 },
  ],
  Goblin: [
    { itemId: "minerio-runico", chance: 0.45, min: 1, max: 2 },
    { itemId: "pocao-musgo", chance: 0.2 },
  ],
  "Orc Berserker": [
    { itemId: "minerio-runico", chance: 0.8, min: 1, max: 3 },
    { itemId: "martelo-runico", chance: 0.08 },
  ],
  Kaelgor: [
    { itemId: "escama-primordial", chance: 1, min: 1, max: 1 },
    { itemId: "cristal-magico", chance: 0.75, min: 1, max: 2 },
  ],
  Nexarion: [
    { itemId: "fragmento-vazio", chance: 1, min: 1, max: 1 },
    { itemId: "cristal-magico", chance: 1, min: 2, max: 4 },
  ],
};

export const itemAliases: Record<string, string> = {
  pocao: "pocao-musgo",
  poção: "pocao-musgo",
  "poção de musgo": "pocao-musgo",
  madeira: "madeira-viva",
  "madeira viva": "madeira-viva",
  minerio: "minerio-runico",
  minério: "minerio-runico",
  "minério rúnico": "minerio-runico",
  comida: "racao-de-viagem",
  ração: "racao-de-viagem",
  "broche da vigília": "broche-da-vigilia",
  "bolsa de troca": "bolsa-de-troca",
  "sementes de musgo": "sementes-de-musgo",
};

export const normalizeItemId = (itemId: string) => {
  const normalized = itemId.trim().toLocaleLowerCase();
  return itemById[normalized]
    ? normalized
    : (itemAliases[normalized] ?? normalized);
};

export const getItemDefinition = (itemId: string) =>
  itemById[normalizeItemId(itemId)];
