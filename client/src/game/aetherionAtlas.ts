/**
 * Atlas oficial de Aetherion — conteúdo fornecido para a campanha ampliada.
 * Os dados mantêm a ordem de progressão e permitem renderizar codex, mapa, missões e portas futuras.
 */
export type SettlementKind = "vila" | "cidade" | "capital";
export type AtlasBiome = "Floresta de Elaris" | "Planícies de Arvend" | "Deserto de Zahram" | "Montanhas de Kharok" | "Pântanos de Nymbra" | "Costa de Velaris" | "Terras Vulcânicas de Ignara" | "Campos Gélidos de Norvak" | "Arquipélago Celeste" | "Vale das Almas" | "O Vazio de Erebos";

export type AtlasSettlement = { id: string; name: string; kind: SettlementKind; biome: AtlasBiome; kingdom?: string; tier: number; specialty: string };
export type DungeonEntry = { id: string; name: string; biome: AtlasBiome; tier: number; reward: string; boss?: string };
export type MobEntry = { id: string; name: string; tier: number; habitats: AtlasBiome[] };
export type BossEntry = { id: string; name: string; title: string; tier: number; dungeon: string };

const id = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const atlasBiomes: Array<{ name: AtlasBiome; tier: number; theme: string }> = [
  { name: "Floresta de Elaris", tier: 1, theme: "Raízes primordiais, ruínas verdes e ecos da primeira Ruptura." },
  { name: "Planícies de Arvend", tier: 2, theme: "Rotas de caravana, muralhas antigas e campos de batalha esquecidos." },
  { name: "Deserto de Zahram", tier: 3, theme: "Dunas de vidro, obeliscos solares e reinos sob a areia." },
  { name: "Montanhas de Kharok", tier: 4, theme: "Minas ancestrais, forjas de guerra e neve mineral." },
  { name: "Pântanos de Nymbra", tier: 5, theme: "Névoa, espíritos errantes e água que guarda memórias." },
  { name: "Costa de Velaris", tier: 6, theme: "Portos, faróis, ruínas afundadas e tempestades de Éter." },
  { name: "Terras Vulcânicas de Ignara", tier: 7, theme: "Cinzas, magma vivo e fortalezas consumidas pelo fogo." },
  { name: "Campos Gélidos de Norvak", tier: 8, theme: "Geleiras rúnicas, ventos cortantes e ecos de dragões antigos." },
  { name: "Arquipélago Celeste", tier: 9, theme: "Ilhas suspensas, portais de ar e observatórios acima das nuvens." },
  { name: "Vale das Almas", tier: 10, theme: "Sussurros funerários, necromancia e a fronteira dos esquecidos." },
  { name: "O Vazio de Erebos", tier: 11, theme: "A região final onde a realidade cede ao Arauto do Vazio." },
];

export const settlements: AtlasSettlement[] = [
  { id: "pedraviva", name: "Vila Pedraviva", kind: "vila", biome: "Montanhas de Kharok", tier: 4, specialty: "forjas, minério e guilda de anões" },
  { id: "florentia", name: "Vila Florentia", kind: "vila", biome: "Floresta de Elaris", tier: 1, specialty: "ervas, espíritos e jardim de cura" },
  { id: "riacho-dourado", name: "Vila Riacho Dourado", kind: "vila", biome: "Planícies de Arvend", tier: 2, specialty: "comércio rural e pescaria" },
  { id: "brumavale", name: "Vila Brumavale", kind: "vila", biome: "Pântanos de Nymbra", tier: 5, specialty: "alquimia, névoa e caçadores de espíritos" },
  { id: "lunaris", name: "Vila Lunaris", kind: "vila", biome: "Campos Gélidos de Norvak", tier: 8, specialty: "cristais lunares e vigias do gelo" },
  { id: "raizforte", name: "Vila Raizforte", kind: "vila", biome: "Floresta de Elaris", tier: 1, specialty: "defesa da floresta e árvore ancestral" },
  { id: "valdora", name: "Valdora", kind: "cidade", biome: "Planícies de Arvend", kingdom: "Reino de Auren", tier: 3, specialty: "mercado central, arena e conselho real" },
  { id: "eryndell", name: "Eryndell", kind: "cidade", biome: "Floresta de Elaris", kingdom: "Reino de Sylvaran", tier: 4, specialty: "biblioteca arcana, embaixada élfica e portais verdes" },
  { id: "kharvorn", name: "Kharvorn", kind: "cidade", biome: "Terras Vulcânicas de Ignara", kingdom: "Reino de Varkhûn", tier: 7, specialty: "fundição de guerra, arena e muralha de cinzas" },
  { id: "aurelia", name: "Aurelia", kind: "capital", biome: "Planícies de Arvend", kingdom: "Reino de Auren", tier: 6, specialty: "trono de Auren, catedral solar e corte diplomática" },
  { id: "drakhar", name: "Drakhar", kind: "capital", biome: "Terras Vulcânicas de Ignara", kingdom: "Reino de Varkhûn", tier: 8, specialty: "palácio de basalto, dragões de guerra e ordem das cinzas" },
];

const dungeonSource: Array<[string, AtlasBiome, number, string, string?]> = [
  ["Catacumbas de Veyra", "Costa de Velaris", 2, "Relíquias de maré e runas antigas"],
  ["Mina Abandonada de Grom", "Montanhas de Kharok", 3, "Minério rúnico e forja quebrada"],
  ["Templo das Mil Faces", "Deserto de Zahram", 4, "Máscaras arcanas e memória de reis"],
  ["Cripta do Rei Sem Nome", "Vale das Almas", 5, "Coroa espectral e juramento perdido", "Veylora, Bruxa da Lua Negra"],
  ["Cavernas de Cristal", "Campos Gélidos de Norvak", 4, "Cristais de éter e gelo vivo"],
  ["Torre do Astrólogo", "Arquipélago Celeste", 6, "Mapa astral e lentes celestes"],
  ["Ruínas de Asterion", "Planícies de Arvend", 3, "Chaves de império e lâmina de legado"],
  ["Santuário Submerso", "Costa de Velaris", 6, "Núcleo de maré e bênção do farol"],
  ["Fortaleza de Ferro", "Terras Vulcânicas de Ignara", 7, "Armadura negra e estandarte de guerra", "Mordrak, Senhor da Guerra"],
  ["Abismo de Khar", "Montanhas de Kharok", 8, "Martelo do abismo e selo dracônico", "Azhrael, Guardião do Abismo"],
  ["Ninho dos Devoradores", "Pântanos de Nymbra", 7, "Glândulas de Éter e presa ancestral", "Tharok, o Rei Devorador"],
  ["Labirinto de Érebo", "O Vazio de Erebos", 10, "Fragmento do Vazio e rota final", "Nexarion, Arauto do Vazio"],
];
export const dungeons: DungeonEntry[] = dungeonSource.map(([name, biome, tier, reward, boss]) => ({ id: id(name), name, biome, tier, reward, boss }));

const bossSource: Array<[string, string, number, string]> = [
  ["Gorvath", "o Colosso", 3, "Ruínas de Asterion"], ["Seraphyne", "a Rainha das Cinzas", 7, "Fortaleza de Ferro"], ["Mordrak", "Senhor da Guerra", 7, "Fortaleza de Ferro"], ["Veylora", "Bruxa da Lua Negra", 5, "Cripta do Rei Sem Nome"], ["Tharok", "o Rei Devorador", 7, "Ninho dos Devoradores"], ["Azhrael", "Guardião do Abismo", 8, "Abismo de Khar"], ["Kaelgor", "o Dragão Caído", 9, "Campos Gélidos de Norvak"], ["Nexarion", "Arauto do Vazio", 11, "Labirinto de Érebo"],
];
export const bosses: BossEntry[] = bossSource.map(([name, title, tier, dungeon]) => ({ id: id(name), name, title, tier, dungeon }));

const mobSource: Array<[string, number, AtlasBiome[]]> = [
  ["Goblin", 1, ["Floresta de Elaris", "Planícies de Arvend"]], ["Goblin Saqueador", 2, ["Planícies de Arvend", "Montanhas de Kharok"]], ["Goblin Arqueiro", 2, ["Floresta de Elaris", "Costa de Velaris"]], ["Goblin Xamã", 4, ["Pântanos de Nymbra", "Terras Vulcânicas de Ignara"]], ["Lobo Cinzento", 1, ["Floresta de Elaris", "Campos Gélidos de Norvak"]], ["Lobo Sombrio", 4, ["Vale das Almas", "Pântanos de Nymbra"]], ["Javali Selvagem", 1, ["Floresta de Elaris", "Planícies de Arvend"]], ["Aranha Gigante", 3, ["Pântanos de Nymbra", "Floresta de Elaris"]], ["Morcego Abissal", 5, ["Vale das Almas", "O Vazio de Erebos"]], ["Slime", 1, ["Floresta de Elaris", "Costa de Velaris"]], ["Slime Ácido", 3, ["Pântanos de Nymbra", "Deserto de Zahram"]], ["Slime Flamejante", 6, ["Terras Vulcânicas de Ignara"]], ["Kobold", 2, ["Montanhas de Kharok", "Deserto de Zahram"]], ["Orc", 4, ["Planícies de Arvend", "Terras Vulcânicas de Ignara"]], ["Orc Berserker", 6, ["Terras Vulcânicas de Ignara", "Montanhas de Kharok"]], ["Troll", 5, ["Montanhas de Kharok", "Pântanos de Nymbra"]], ["Ogro", 6, ["Planícies de Arvend", "Terras Vulcânicas de Ignara"]], ["Harpia", 5, ["Arquipélago Celeste", "Montanhas de Kharok"]], ["Homem-Lagarto", 4, ["Pântanos de Nymbra", "Costa de Velaris"]], ["Escorpião Gigante", 4, ["Deserto de Zahram"]], ["Golem de Pedra", 6, ["Montanhas de Kharok", "Terras Vulcânicas de Ignara"]], ["Espírito Errante", 5, ["Vale das Almas", "Pântanos de Nymbra"]], ["Esqueleto", 4, ["Vale das Almas", "Deserto de Zahram"]], ["Zumbi", 5, ["Vale das Almas", "Pântanos de Nymbra"]], ["Elemental", 8, ["Terras Vulcânicas de Ignara", "Campos Gélidos de Norvak", "Arquipélago Celeste"]],
];
export const mobs: MobEntry[] = mobSource.map(([name, tier, habitats]) => ({ id: id(name), name, tier, habitats }));

export const factions = ["Ordem da Aurora", "Conclave Arcano", "Liga Mercante de Velkar", "Clã Presa de Ferro", "Círculo das Sombras"] as const;
export const kingdoms = ["Reino de Auren", "Reino de Varkhûn", "Reino de Sylvaran"] as const;
export const primordialDragonsAtlas = [
  { name: "Ignivar", element: "Fogo" }, { name: "Glaceryn", element: "Gelo" }, { name: "Tempestron", element: "Tempestade" }, { name: "Sylvarok", element: "Natureza" }, { name: "Nocthar", element: "Trevas" }, { name: "Aureon", element: "Luz" }, { name: "Zerakos", element: "Caos" },
] as const;
export const pointsOfInterest = ["Torre do Vigia", "Árvore dos Sussurros", "Ponte dos Antigos", "Santuário de Elara", "Ruínas de Vaelor", "Cemitério Esquecido", "Farol de Meridia", "Acampamento dos Exilados", "Pedra do Dragão", "Templo Solar", "Caverna do Eco", "Estátua do Primeiro Rei", "Observatório Celeste", "Portal de Éter", "Ruínas da Árvore Primordial"] as const;
