/**
 * Mundo físico de Aetherion — cada entrada representa um mapa alcançável por portais e rotas.
 * O canvas reutiliza a mesma malha de tiles, mas muda bioma, habitantes, serviços, ameaças e saídas por mapa.
 */
import { atlasBiomes, dungeons, mobs, settlements, type AtlasBiome } from "./aetherionAtlas";

export type RegionId = string;
export type BiomeKind = "forest" | "plains" | "desert" | "mountain" | "swamp" | "coast" | "volcanic" | "frozen" | "sky" | "spirit" | "void";
export type MapKind = "biome" | "settlement" | "dungeon" | "special" | "final";
export type ServiceKind = "shop" | "church" | "chest" | "gate";
export type EnemyArchetype = "wolf" | "boar" | "goblin";

export type TownNpc = { id: string; name: string; role: string; visual: "guardian" | "emissary" | "merchant"; race: "human" | "elf" | "goblin"; x: number; y: number; line: string; quest: { id: string; title: string; summary: string; target: number; reward: { gold: number; potions?: number; wood?: number; ore?: number } } };
export type ServicePoint = { id: string; kind: ServiceKind; label: string; x: number; y: number; destination?: RegionId; destinationLabel?: string; reward?: { gold: number; wood?: number; ore?: number; potions?: number } };
export type RegionDefinition = { id: RegionId; name: string; village: string; biome: BiomeKind; biomeName: AtlasBiome; mapKind: MapKind; subtitle: string; tier: number; bossName?: string; colors: { ground: string; shade: string; path: string; water: string; village: string; foliage: string }; enemyKinds: EnemyArchetype[]; enemyNames: string[]; npcs: TownNpc[]; services: ServicePoint[] };

const slug = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const reward = (gold: number, extra: Omit<NonNullable<ServicePoint["reward"]>, "gold"> = {}) => ({ gold, ...extra });
const palette: Record<BiomeKind, RegionDefinition["colors"]> = {
  forest: { ground: "#285447", shade: "#20463e", path: "#8b7753", water: "#1b5357", village: "#6b6650", foliage: "#5e995f" },
  plains: { ground: "#657447", shade: "#4c5c38", path: "#a78c5e", water: "#3f7180", village: "#85684b", foliage: "#91a75d" },
  desert: { ground: "#8a6e48", shade: "#755b3d", path: "#d1a96b", water: "#3e7180", village: "#9b7750", foliage: "#9a9d60" },
  mountain: { ground: "#42545b", shade: "#33444a", path: "#9e8c70", water: "#315d70", village: "#6f6355", foliage: "#6f937f" },
  swamp: { ground: "#385b4a", shade: "#2a4439", path: "#756d4b", water: "#244f53", village: "#625b4d", foliage: "#6d9560" },
  coast: { ground: "#41666a", shade: "#36575e", path: "#84755d", water: "#256878", village: "#65736d", foliage: "#6b9b85" },
  volcanic: { ground: "#604541", shade: "#3b3032", path: "#a55b3f", water: "#803c32", village: "#634845", foliage: "#a66747" },
  frozen: { ground: "#6d8991", shade: "#526c78", path: "#c1d4d2", water: "#397386", village: "#7c8b92", foliage: "#afc7c1" },
  sky: { ground: "#577a93", shade: "#3c617e", path: "#c2b77f", water: "#6ea7bc", village: "#758da2", foliage: "#d7e6cf" },
  spirit: { ground: "#4c4460", shade: "#342f46", path: "#84759c", water: "#3c5470", village: "#63566d", foliage: "#9a8ac0" },
  void: { ground: "#2b2440", shade: "#181424", path: "#6c4d87", water: "#372459", village: "#463658", foliage: "#9e61b5" },
};
const biomeKind = (biome: AtlasBiome): BiomeKind => ({ "Floresta de Elaris": "forest", "Planícies de Arvend": "plains", "Deserto de Zahram": "desert", "Montanhas de Kharok": "mountain", "Pântanos de Nymbra": "swamp", "Costa de Velaris": "coast", "Terras Vulcânicas de Ignara": "volcanic", "Campos Gélidos de Norvak": "frozen", "Arquipélago Celeste": "sky", "Vale das Almas": "spirit", "O Vazio de Erebos": "void" })[biome] as BiomeKind;
const archetypesFor = (biome: AtlasBiome): EnemyArchetype[] => biome === "Montanhas de Kharok" || biome === "Terras Vulcânicas de Ignara" ? ["boar", "goblin", "wolf"] : biome === "Deserto de Zahram" || biome === "Pântanos de Nymbra" ? ["goblin", "boar", "wolf"] : ["wolf", "boar", "goblin"];
const localMobs = (biome: AtlasBiome) => mobs.filter((mob) => mob.habitats.includes(biome)).map((mob) => mob.name).slice(0, 4);
const npcSet = (prefix: string, settlement: string, tier: number): TownNpc[] => [
  { id: `${prefix}-warden`, name: `Guardiã de ${settlement}`, role: "Guardiã local", visual: "guardian", race: "human", x: 27.8, y: 20.1, line: "Toda rota tem seu preço. A escolha é sua: proteger esta gente ou procurar a próxima fissura.", quest: { id: `${prefix}-hunt`, title: `Defesa de ${settlement}`, summary: "Dissipe 3 ameaças nas estradas ao redor do assentamento.", target: 3, reward: reward(15 + tier * 5, { potions: 1 }) } },
  { id: `${prefix}-scribe`, name: `Oráculo de ${settlement}`, role: "Cronista do Éter", visual: "emissary", race: "elf", x: 20.2, y: 8.5, line: "O mapa muda porque o mundo lembra de tudo o que os Ecos escolhem esquecer.", quest: { id: `${prefix}-ether`, title: "Eco da rota", summary: "Colete 3 essências de Éter para registrar uma nova passagem.", target: 3, reward: reward(12 + tier * 4, { wood: 3 }) } },
  { id: `${prefix}-trader`, name: `Mercador de ${settlement}`, role: "Comerciante local", visual: "merchant", race: "goblin", x: 31.2, y: 23.1, line: "Compra, venda, histórias e segredos. Tudo circula numa boa praça.", quest: { id: `${prefix}-supply`, title: "Mercadoria de rota", summary: "Abra um baú de suprimentos e retorne ao comércio.", target: 1, reward: reward(18 + tier * 4, { ore: 2 }) } },
];

const biomeMapId = (biome: AtlasBiome) => `biome-${slug(biome)}`;
const settlementMapId = (name: string) => `settlement-${slug(name)}`;
const dungeonMapId = (name: string) => `dungeon-${slug(name)}`;
const settlementForBiome = (biome: AtlasBiome) => settlements.find((entry) => entry.biome === biome);

const biomeMaps: RegionDefinition[] = atlasBiomes.map((entry, index) => {
  const settlement = settlementForBiome(entry.name); const localDungeon = dungeons.find((dungeon) => dungeon.biome === entry.name); const next = atlasBiomes[index + 1]; const services: ServicePoint[] = [];
  if (settlement) services.push({ id: `gate-${entry.name}-settlement`, kind: "gate", label: `Entrada: ${settlement.name}`, x: 30.5, y: 21.4, destination: settlementMapId(settlement.name), destinationLabel: settlement.name });
  if (localDungeon) services.push({ id: `gate-${entry.name}-dungeon`, kind: "gate", label: localDungeon.name, x: 20.2, y: 4.8, destination: dungeonMapId(localDungeon.name), destinationLabel: localDungeon.name });
  if (next) services.push({ id: `gate-${entry.name}-next`, kind: "gate", label: `Rota para ${next.name}`, x: 40.1, y: 15.2, destination: biomeMapId(next.name), destinationLabel: next.name });
  if (index) services.push({ id: `gate-${entry.name}-previous`, kind: "gate", label: `Retorno a ${atlasBiomes[index - 1].name}`, x: 1.2, y: 15.2, destination: biomeMapId(atlasBiomes[index - 1].name), destinationLabel: atlasBiomes[index - 1].name });
  return { id: biomeMapId(entry.name), name: entry.name, village: settlement?.name ?? entry.name, biome: biomeKind(entry.name), biomeName: entry.name, mapKind: entry.name === "O Vazio de Erebos" ? "final" : entry.name === "Arquipélago Celeste" || entry.name === "Vale das Almas" ? "special" : "biome", subtitle: entry.theme, tier: entry.tier, colors: palette[biomeKind(entry.name)], enemyKinds: archetypesFor(entry.name), enemyNames: localMobs(entry.name), npcs: settlement ? npcSet(`field-${slug(entry.name)}`, settlement.name, entry.tier).slice(0, 1) : [], services };
});

const settlementMaps: RegionDefinition[] = settlements.map((settlement) => ({ id: settlementMapId(settlement.name), name: settlement.name, village: settlement.name, biome: biomeKind(settlement.biome), biomeName: settlement.biome, mapKind: "settlement", subtitle: `${settlement.kind.toUpperCase()} · ${settlement.specialty}`, tier: settlement.tier, colors: palette[biomeKind(settlement.biome)], enemyKinds: [], enemyNames: [], npcs: npcSet(slug(settlement.name), settlement.name, settlement.tier), services: [{ id: `${slug(settlement.name)}-shop`, kind: "shop", label: `Comércio de ${settlement.name}`, x: 30.4, y: 22.3 }, { id: `${slug(settlement.name)}-church`, kind: "church", label: `Capela de ${settlement.name}`, x: 25.3, y: 24.6 }, { id: `${slug(settlement.name)}-chest`, kind: "chest", label: `Baú de ${settlement.name}`, x: 28.0, y: 18.7, reward: reward(12 + settlement.tier * 4, { potions: 1 }) }, { id: `${slug(settlement.name)}-exit`, kind: "gate", label: `Estrada de ${settlement.biome}`, x: 1.2, y: 15.2, destination: biomeMapId(settlement.biome), destinationLabel: settlement.biome }] }));

const dungeonMaps: RegionDefinition[] = dungeons.map((dungeon) => ({ id: dungeonMapId(dungeon.name), name: dungeon.name, village: dungeon.name, biome: biomeKind(dungeon.biome), biomeName: dungeon.biome, mapKind: "dungeon", subtitle: `${dungeon.reward}${dungeon.boss ? ` · Boss: ${dungeon.boss}` : ""}`, tier: dungeon.tier, bossName: dungeon.boss, colors: palette[biomeKind(dungeon.biome)], enemyKinds: archetypesFor(dungeon.biome), enemyNames: localMobs(dungeon.biome), npcs: [], services: [{ id: `${slug(dungeon.name)}-chest`, kind: "chest", label: "Baú da masmorra", x: 28, y: 18.7, reward: reward(18 + dungeon.tier * 7, { ore: 2, potions: 1 }) }, { id: `${slug(dungeon.name)}-exit`, kind: "gate", label: `Retorno a ${dungeon.biome}`, x: 1.2, y: 15.2, destination: biomeMapId(dungeon.biome), destinationLabel: dungeon.biome }] }));

export const regions: Record<RegionId, RegionDefinition> = Object.fromEntries([...biomeMaps, ...settlementMaps, ...dungeonMaps].map((entry) => [entry.id, entry]));
export const firstRegion: RegionId = biomeMapId("Floresta de Elaris");
