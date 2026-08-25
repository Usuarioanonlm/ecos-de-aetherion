/**
 * Ecos de Aetherion — Cartografia Viva em 2D.
 * Dados do PDF organizados como conteúdo de jogo: escolhas do personagem precisam alterar regras e narrativa.
 */

export type RaceId = "human" | "slime" | "goblin" | "wolfkin" | "kobold" | "lizard" | "elf" | "dwarf" | "beastfolk";
export type ClassId = "vigil" | "wanderer" | "arcanist" | "hunter" | "warden" | "artificer";
export type OriginId = "vigil-order" | "merchant" | "farmer" | "noble" | "exile" | "rupture-born" | "clanless" | "grove-kin";

export type Stats = { vitality: number; power: number; ether: number; agility: number; resolve: number };

export type RaceDefinition = {
  id: RaceId;
  name: string;
  epithet: string;
  kind: "Humano" | "Monstro" | "Povo Antigo";
  description: string;
  talent: string;
  starterSkill: string;
  stats: Stats;
  evolution: string[];
  palette: { skin: string; cloak: string; accent: string };
};

export type ClassDefinition = {
  id: ClassId;
  name: string;
  icon: string;
  description: string;
  weapon: string;
  skills: string[];
  bonus: Partial<Stats>;
};

export type OriginDefinition = {
  id: OriginId;
  name: string;
  description: string;
  startingItem: string;
  quest: string;
  faction: string;
  compatible: RaceId[];
};

export const races: RaceDefinition[] = [
  { id: "human", name: "Humano", epithet: "Alma do Éter", kind: "Humano", description: "Sobreviveu ao medo que a Ruptura despertou. Aprende traços de criaturas vencidas.", talent: "Alma do Éter", starterSkill: "Corte Rúnico", stats: { vitality: 7, power: 6, ether: 5, agility: 5, resolve: 7 }, evolution: ["Portador", "Eco Desperto", "Herdeiro Primordial"], palette: { skin: "#d6a477", cloak: "#315078", accent: "#e7bd58" } },
  { id: "slime", name: "Slime", epithet: "Forma Sem Nome", kind: "Monstro", description: "Acordou entre raízes antigas com fome de essência e memória fragmentada.", talent: "Absorção", starterSkill: "Jato de Éter", stats: { vitality: 6, power: 4, ether: 8, agility: 6, resolve: 6 }, evolution: ["Slime Lupino", "Slime Espiritual", "Senhor do Éter"], palette: { skin: "#59c781", cloak: "#214c4b", accent: "#e7bd58" } },
  { id: "goblin", name: "Goblin", epithet: "Filho de Nargul", kind: "Monstro", description: "Pequeno, engenhoso e acostumado a ser caçado antes de ser ouvido.", talent: "Engenharia de Sucata", starterSkill: "Bomba de Pó", stats: { vitality: 5, power: 5, ether: 5, agility: 8, resolve: 6 }, evolution: ["Goblin Elite", "General Goblin", "Rei Goblin"], palette: { skin: "#8ab34e", cloak: "#563b2a", accent: "#d7bd58" } },
  { id: "wolfkin", name: "Lobo", epithet: "Caçador da Mata", kind: "Monstro", description: "Uma fera tocada pela inteligência do Éter, dividida entre instinto e escolha.", talent: "Faro Primal", starterSkill: "Investida", stats: { vitality: 7, power: 7, ether: 3, agility: 8, resolve: 5 }, evolution: ["Lobo Rúnico", "Fera Mágica", "Lobo Primordial"], palette: { skin: "#6e7781", cloak: "#26313b", accent: "#b6d0dc" } },
  { id: "kobold", name: "Kobold", epithet: "Guardião de Toca", kind: "Monstro", description: "Um pequeno dracônico que faz da lealdade sua armadura.", talent: "Escama Rúnica", starterSkill: "Garra de Brasa", stats: { vitality: 6, power: 6, ether: 4, agility: 6, resolve: 7 }, evolution: ["Kobold Guerreiro", "Dracônico Menor", "Guardião Dracônico"], palette: { skin: "#bd7654", cloak: "#46312d", accent: "#e7bd58" } },
  { id: "lizard", name: "Lagarto", epithet: "Sangue das Marés", kind: "Monstro", description: "Carrega a paciência de pântanos antigos e o golpe de uma cauda pesada.", talent: "Pele Regenerativa", starterSkill: "Cauda Cintilante", stats: { vitality: 8, power: 6, ether: 4, agility: 4, resolve: 7 }, evolution: ["Escamado de Guerra", "Naga de Éter", "Serpente Ancestral"], palette: { skin: "#4a9a87", cloak: "#1f514d", accent: "#d8ca8b" } },
  { id: "elf", name: "Elfo", epithet: "Voz do Bosque", kind: "Povo Antigo", description: "Escuta espíritos e sente a Floresta Primordial antes que ela fale.", talent: "Canto dos Espíritos", starterSkill: "Seta Lunar", stats: { vitality: 5, power: 5, ether: 8, agility: 7, resolve: 6 }, evolution: ["Guardião Verde", "Arauto Espiritual", "Ancião da Raiz"], palette: { skin: "#d5b48a", cloak: "#2d7a5d", accent: "#d8d6a4" } },
  { id: "dwarf", name: "Anão", epithet: "Forjado em Khar'Dum", kind: "Povo Antigo", description: "Traz nas mãos a memória de minas profundas e armas que cantam.", talent: "Forja de Campo", starterSkill: "Martelo de Eco", stats: { vitality: 8, power: 7, ether: 3, agility: 3, resolve: 9 }, evolution: ["Ferreiro Rúnico", "Mestre de Khar'Dum", "Guardião da Montanha"], palette: { skin: "#b8754f", cloak: "#485263", accent: "#d59a4b" } },
  { id: "beastfolk", name: "Meio-Fera", epithet: "Passo da Fronteira", kind: "Povo Antigo", description: "Nascido entre povos, aprendeu a percorrer fronteiras sem pertencer a uma só.", talent: "Passo Selvagem", starterSkill: "Garra Crescente", stats: { vitality: 6, power: 6, ether: 5, agility: 8, resolve: 6 }, evolution: ["Batedor Lunar", "Guardião da Matilha", "Fera Sagrada"], palette: { skin: "#b88662", cloak: "#735544", accent: "#d8bb65" } },
];

export const classes: ClassDefinition[] = [
  { id: "vigil", name: "Vigia", icon: "✦", description: "Um protetor que segura a linha e inspira aliados.", weapon: "Lança da Vigília", skills: ["Golpe Guardião", "Postura Firme", "Chamado de Defesa"], bonus: { vitality: 3, resolve: 2 } },
  { id: "wanderer", name: "Errante", icon: "◈", description: "Uma lâmina flexível para quem deseja sobreviver a qualquer estrada.", weapon: "Espada Curta", skills: ["Corte Rúnico", "Passo de Névoa", "Contra-ataque"], bonus: { power: 2, agility: 2 } },
  { id: "arcanist", name: "Arcanista", icon: "✧", description: "Canaliza a energia desperta da Ruptura em formas precisas.", weapon: "Foco de Éter", skills: ["Jato de Éter", "Prisma Protetor", "Ruptura Menor"], bonus: { ether: 4 } },
  { id: "hunter", name: "Caçador", icon: "⌁", description: "Lê rastros, abre distância e conhece o ponto fraco das feras.", weapon: "Arco de Teixo", skills: ["Seta Lunar", "Armadilha de Raiz", "Mira Predadora"], bonus: { agility: 3, power: 1 } },
  { id: "warden", name: "Guardião", icon: "◉", description: "Une corpo, instinto e proteção de território.", weapon: "Garras ou Martelo", skills: ["Investida", "Pele de Casca", "Uivo de Guerra"], bonus: { vitality: 2, power: 2 } },
  { id: "artificer", name: "Artífice", icon: "▣", description: "Transforma minério, sucata e Éter em ferramentas improváveis.", weapon: "Martelo Rúnico", skills: ["Bomba de Pó", "Torreta Breve", "Reparo de Campo"], bonus: { ether: 1, resolve: 2, power: 1 } },
];

export const origins: OriginDefinition[] = [
  { id: "vigil-order", name: "Ordem da Vigília", description: "Foi treinado para desconfiar do Éter, até ele responder dentro de você.", startingItem: "Broche da Vigília", quest: "Prove que seu juramento não morreu na Ruptura.", faction: "Ordem da Vigília", compatible: ["human", "elf", "dwarf", "beastfolk"] },
  { id: "merchant", name: "Mercador", description: "Você conhecia as rotas de Aetherion antes que elas fossem engolidas por masmorras.", startingItem: "Bolsa de Troca", quest: "Reabra a primeira rota entre a floresta e o reino humano.", faction: "Liga dos Mercadores", compatible: ["human", "goblin", "dwarf", "beastfolk"] },
  { id: "farmer", name: "Camponês", description: "A terra cresceu rápido demais, mas você não abandonou as sementes.", startingItem: "Sementes de Musgo", quest: "Faça a Vila de Musgo florescer outra vez.", faction: "Vila de Musgo", compatible: ["human", "goblin", "lizard", "beastfolk"] },
  { id: "noble", name: "Nobre", description: "Seu nome abre portões humanos — e fecha corações monstruosos.", startingItem: "Selo de Família", quest: "Descubra quem lucrou com a Grande Ruptura.", faction: "Corte Humana", compatible: ["human", "elf"] },
  { id: "exile", name: "Exilado", description: "Foi expulso por carregar uma pergunta que o reino não queria ouvir.", startingItem: "Mapa Rasgado", quest: "Encontre a verdade escondida nas ruínas do juramento.", faction: "Independente", compatible: ["human", "elf", "dwarf", "beastfolk"] },
  { id: "rupture-born", name: "Nascido na Ruptura", description: "Você despertou depois do cataclismo, quando monstro e pessoa passaram a significar coisas incertas.", startingItem: "Núcleo de Essência", quest: "Descubra a criatura que você poderia se tornar.", faction: "Clãs Monstruosos", compatible: ["slime", "goblin", "wolfkin", "kobold", "lizard"] },
  { id: "clanless", name: "Sem Clã", description: "Seu clã foi desfeito e agora você decide o que protegerá primeiro.", startingItem: "Pingente Partido", quest: "Reúna quem sobrou de sua antiga matilha.", faction: "Clãs Monstruosos", compatible: ["goblin", "wolfkin", "kobold", "lizard", "beastfolk"] },
  { id: "grove-kin", name: "Criado pelo Bosque", description: "Os espíritos ensinaram seu primeiro nome e escondem seu último segredo.", startingItem: "Folha da Árvore Primordial", quest: "Escute a raiz que ainda respira sob a floresta.", faction: "Círculo Élfico", compatible: ["slime", "elf", "beastfolk", "lizard"] },
];

export const regions = [
  { name: "Reino Humano", state: "known", theme: "Castelos, cavaleiros e política", threat: "Imperador Magnus" },
  { name: "Floresta Primordial", state: "active", theme: "Espíritos, fadas e monstros", threat: "Fissuras de Éter" },
  { name: "Deserto de Zharak", state: "locked", theme: "Areia, ruínas e cidades subterrâneas", threat: "Dragão de areia" },
  { name: "Montanhas de Khar'Dum", state: "locked", theme: "Minas, gigantes e forjas", threat: "Dragão antigo" },
  { name: "Terras de Nargul", state: "locked", theme: "Clãs de orcs e goblins", threat: "Rei Orc Grom" },
  { name: "Ilhas Celestiais", state: "locked", theme: "Ruínas acima das nuvens", threat: "Tempestades eternas" },
  { name: "Abismo de Vhar", state: "locked", theme: "Masmorras e corrupção", threat: "Fome do Vazio" },
  { name: "Reino do Vazio", state: "locked", theme: "Realidade instável", threat: "O Vazio" },
] as const;

export const primordialDragons = ["Fogo", "Gelo", "Tempestade", "Trevas", "Luz", "Natureza", "Caos"] as const;
export const endings = ["Final do Herói", "Rei dos Monstros", "Imperador", "Senhor do Vazio", "Novo Deus", "Fragmento da Árvore"] as const;
