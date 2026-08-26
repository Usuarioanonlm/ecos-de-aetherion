/**
 * Expansão de Aetherion — conteúdo de exploração baseado em dados.
 * Cada região conserva a grade de 42×30 tiles e oferece vila, comércio, santuário, baú, NPCs e rotas.
 */
export type RegionId = "primordial-forest" | "stonehaven" | "sunfall" | "mistport";
export type BiomeKind = "forest" | "mountain" | "desert" | "coast";
export type ServiceKind = "shop" | "church" | "chest" | "gate";

export type TownNpc = {
  id: string;
  name: string;
  role: string;
  visual: "guardian" | "emissary" | "merchant";
  race: "human" | "elf" | "goblin";
  x: number;
  y: number;
  line: string;
  quest: { id: string; title: string; summary: string; target: number; reward: { gold: number; potions?: number; wood?: number; ore?: number } };
};

export type ServicePoint = {
  id: string;
  kind: ServiceKind;
  label: string;
  x: number;
  y: number;
  destination?: RegionId;
  destinationLabel?: string;
  reward?: { gold: number; wood?: number; ore?: number; potions?: number };
};

export type RegionDefinition = {
  id: RegionId;
  name: string;
  village: string;
  biome: BiomeKind;
  subtitle: string;
  colors: { ground: string; shade: string; path: string; water: string; village: string; foliage: string };
  enemyKinds: Array<"wolf" | "boar" | "goblin">;
  npcs: TownNpc[];
  services: ServicePoint[];
};

const reward = (gold: number, extra: Omit<NonNullable<ServicePoint["reward"]>, "gold"> = {}) => ({ gold, ...extra });

export const regions: Record<RegionId, RegionDefinition> = {
  "primordial-forest": {
    id: "primordial-forest", name: "Floresta Primordial", village: "Vila de Musgo", biome: "forest", subtitle: "Raízes antigas, aldeia viva e o primeiro eco da Ruptura.",
    colors: { ground: "#285447", shade: "#20463e", path: "#8b7753", water: "#1b5357", village: "#6b6650", foliage: "#5e995f" }, enemyKinds: ["wolf", "boar", "goblin"],
    npcs: [
      { id: "mira", name: "Mira de Musgo", role: "Guardião da vila", visual: "guardian", race: "human", x: 28.5, y: 20.1, line: "A mata só respeita quem aprende a proteger os outros antes de buscar glória.", quest: { id: "moss-hunt", title: "Trilha dos Lobos", summary: "Dissipe 3 Lobos Primordiais na trilha norte.", target: 3, reward: reward(18, { potions: 1 }) } },
      { id: "thalion", name: "Thalion", role: "Emissário élfico", visual: "emissary", race: "elf", x: 19.7, y: 8.4, line: "A Árvore Primordial ainda sonha. Não confunda silêncio com paz.", quest: { id: "root-whisper", title: "Sussurro da Raiz", summary: "Colete 2 essências de Éter e retorne ao emissário.", target: 2, reward: reward(14, { wood: 6 }) } },
      { id: "nix", name: "Nix", role: "Mercador goblin", visual: "merchant", race: "goblin", x: 31.4, y: 23.2, line: "Eu vendo coisas honestas. As desonestas custam mais, mas são muito mais interessantes.", quest: { id: "nix-trade", title: "Rota de Musgo", summary: "Reúna 8 unidades de madeira viva para a caravana.", target: 8, reward: reward(22, { ore: 2 }) } },
    ],
    services: [
      { id: "moss-shop", kind: "shop", label: "Barraca de Nix", x: 30.4, y: 22.4 }, { id: "moss-church", kind: "church", label: "Santuário da Raiz", x: 25.3, y: 24.8 }, { id: "moss-chest", kind: "chest", label: "Baú entre raízes", x: 27.4, y: 18.7, reward: reward(12, { potions: 1 }) }, { id: "gate-stonehaven", kind: "gate", label: "Passagem de Pedra", x: 40.1, y: 15.2, destination: "stonehaven", destinationLabel: "Vila Pedra Clara" },
    ],
  },
  stonehaven: {
    id: "stonehaven", name: "Cordilheira de Ardos", village: "Vila Pedra Clara", biome: "mountain", subtitle: "Torres de vigia, neve mineral e os ferreiros das encostas.",
    colors: { ground: "#42545b", shade: "#33444a", path: "#9e8c70", water: "#315d70", village: "#6f6355", foliage: "#6f937f" }, enemyKinds: ["boar", "goblin", "wolf"],
    npcs: [
      { id: "brun", name: "Brun Marteloalto", role: "Mestre ferreiro", visual: "guardian", race: "human", x: 27.4, y: 20.5, line: "Aço, pedra e promessa: é assim que uma vila permanece de pé.", quest: { id: "ardos-ore", title: "Veio Cintilante", summary: "Colete 6 minérios da encosta para a forja.", target: 6, reward: reward(28, { potions: 1 }) } },
      { id: "aelis", name: "Aelis da Bruma", role: "Cartógrafa", visual: "emissary", race: "elf", x: 20.8, y: 8.6, line: "Mapas não mostram apenas caminhos; mostram quem conseguiu voltar deles.", quest: { id: "ardos-scout", title: "Olhos da Montanha", summary: "Derrote 2 saqueadores goblins na rota de minério.", target: 2, reward: reward(24, { ore: 3 }) } },
      { id: "tikka", name: "Tikka", role: "Taverneiro goblin", visual: "merchant", race: "goblin", x: 31.1, y: 23.1, line: "Chá quente, preço justo. Pelo menos hoje.", quest: { id: "ardos-herbs", title: "Chá de Tempestade", summary: "Traga 3 essências para a infusão de viagem.", target: 3, reward: reward(16, { wood: 4 }) } },
    ],
    services: [
      { id: "ardos-shop", kind: "shop", label: "Forja Marteloalto", x: 30.2, y: 22.4 }, { id: "ardos-church", kind: "church", label: "Capela do Cume", x: 25.4, y: 24.6 }, { id: "ardos-chest", kind: "chest", label: "Baú do mirante", x: 28.2, y: 18.8, reward: reward(20, { ore: 3 }) }, { id: "gate-sunfall", kind: "gate", label: "Estrada do Sol", x: 40.1, y: 15.2, destination: "sunfall", destinationLabel: "Vila Sol Dourado" }, { id: "gate-forest", kind: "gate", label: "Passagem de Musgo", x: 1.2, y: 15.2, destination: "primordial-forest", destinationLabel: "Vila de Musgo" },
    ],
  },
  sunfall: {
    id: "sunfall", name: "Deserto de Sural", village: "Vila Sol Dourado", biome: "desert", subtitle: "Dunas de vidro, caravana de especiarias e um templo sob o sol partido.",
    colors: { ground: "#8a6e48", shade: "#755b3d", path: "#d1a96b", water: "#3e7180", village: "#9b7750", foliage: "#9a9d60" }, enemyKinds: ["goblin", "boar", "wolf"],
    npcs: [
      { id: "suri", name: "Suri das Dunas", role: "Guia de caravana", visual: "guardian", race: "human", x: 27.8, y: 20.1, line: "O deserto não é vazio. Ele só não conversa com quem chega gritando.", quest: { id: "sural-water", title: "Cântaros Perdidos", summary: "Derrote 3 feras que cercam a rota dos poços.", target: 3, reward: reward(32, { potions: 2 }) } },
      { id: "iriel", name: "Iriel", role: "Sacerdotisa do espelho", visual: "emissary", race: "elf", x: 20.1, y: 8.5, line: "Até o sol rachado revela uma rota para quem escuta a luz.", quest: { id: "sural-prayer", title: "Vidro Cantante", summary: "Entregue 3 essências ao templo do espelho.", target: 3, reward: reward(26, { ore: 2 }) } },
      { id: "baku", name: "Baku", role: "Comerciante de relíquias", visual: "merchant", race: "goblin", x: 31.2, y: 23.1, line: "Relíquias verdadeiras, mapas quase verdadeiros e segredos garantidamente caros.", quest: { id: "sural-cache", title: "Poeira de Ouro", summary: "Abra um baú antigo nas dunas e volte inteiro.", target: 1, reward: reward(30, { wood: 4 }) } },
    ],
    services: [
      { id: "sural-shop", kind: "shop", label: "Mercado da Caravana", x: 30.4, y: 22.3 }, { id: "sural-church", kind: "church", label: "Templo do Espelho", x: 25.3, y: 24.6 }, { id: "sural-chest", kind: "chest", label: "Baú soterrado", x: 28.0, y: 18.7, reward: reward(25, { potions: 1 }) }, { id: "gate-mistport", kind: "gate", label: "Rota da Maré", x: 40.1, y: 15.2, destination: "mistport", destinationLabel: "Porto Brumamar" }, { id: "gate-stonehaven", kind: "gate", label: "Estrada do Cume", x: 1.2, y: 15.2, destination: "stonehaven", destinationLabel: "Vila Pedra Clara" },
    ],
  },
  mistport: {
    id: "mistport", name: "Costa de Veyra", village: "Porto Brumamar", biome: "coast", subtitle: "Píeres de sal, neblina azul e embarcações que perseguem ecos marítimos.",
    colors: { ground: "#41666a", shade: "#36575e", path: "#84755d", water: "#256878", village: "#65736d", foliage: "#6b9b85" }, enemyKinds: ["wolf", "goblin", "boar"],
    npcs: [
      { id: "vega", name: "Vega Maré-Rasa", role: "Capitã do porto", visual: "guardian", race: "human", x: 27.8, y: 20.1, line: "Nenhuma maré pede licença, mas toda tripulação pode escolher como navegar.", quest: { id: "veyra-shore", title: "Maré Hostil", summary: "Dissipe 3 ameaças ao redor dos píeres.", target: 3, reward: reward(35, { potions: 1 }) } },
      { id: "sylen", name: "Sylen da Bruma", role: "Oráculo da capela", visual: "emissary", race: "elf", x: 20.0, y: 8.5, line: "A neblina não esconde a verdade; ela dá tempo para os olhos aprenderem.", quest: { id: "veyra-tide", title: "Salmo das Marés", summary: "Ofereça 2 essências ao farol de Veyra.", target: 2, reward: reward(24, { wood: 5 }) } },
      { id: "mott", name: "Mott", role: "Mercador de maré", visual: "merchant", race: "goblin", x: 31.1, y: 23.1, line: "Se afundou e voltou boiando, provavelmente eu consigo vender.", quest: { id: "veyra-salvage", title: "Carga Perdida", summary: "Abra o baú trazido pela maré.", target: 1, reward: reward(28, { ore: 2 }) } },
    ],
    services: [
      { id: "veyra-shop", kind: "shop", label: "Armazém da Maré", x: 30.4, y: 22.3 }, { id: "veyra-church", kind: "church", label: "Capela do Farol", x: 25.3, y: 24.6 }, { id: "veyra-chest", kind: "chest", label: "Baú da maré", x: 28.0, y: 18.7, reward: reward(26, { potions: 1 }) }, { id: "gate-sunfall", kind: "gate", label: "Rota das Dunas", x: 1.2, y: 15.2, destination: "sunfall", destinationLabel: "Vila Sol Dourado" },
    ],
  },
};

export const firstRegion: RegionId = "primordial-forest";
