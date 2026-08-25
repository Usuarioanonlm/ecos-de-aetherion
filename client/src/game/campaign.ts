/** Pixel Art 16px e campanha encadeada de Ecos de Aetherion. */
export const TILE_PX = 16;
export const spriteSizes = { player: [32, 48], npc: [32, 48], smallEnemy: [32, 32], mediumEnemy: [48, 48], boss: [96, 96], dragon: [256, 256] } as const;
export const maps = { city: { width: 100, height: 100, sector: 25 }, forest: { width: 200, height: 200, sector: 25 }, desert: { width: 300, height: 200, sector: 25 }, mountains: { width: 250, height: 250, sector: 25 }, dungeon: { width: 80, height: 80, sector: 20 } } as const;
export type QuestState = "locked" | "active" | "completed" | "failed" | "alternate";
export type EndingId = "hero" | "monster" | "emperor" | "void" | "god" | "tree";
export type Quest = { id: string; title: string; next: string[]; route: EndingId[]; prerequisites?: string[]; choices?: string[] };
export const quests: Quest[] = [
  { id: "wolf-root", title: "O Lobo e a Raiz", next: ["village-oath", "silent-root"], route: ["hero", "monster", "emperor", "void", "god", "tree"], choices: ["defend-village", "ask-order", "follow-root"] },
  { id: "village-oath", title: "Juramento de Musgo", next: ["allied-banners"], route: ["hero", "emperor", "tree"], prerequisites: ["wolf-root"] },
  { id: "silent-root", title: "A Raiz Silenciosa", next: ["first-dragon", "void-whisper"], route: ["monster", "void", "god", "tree"], prerequisites: ["wolf-root"] },
  { id: "allied-banners", title: "Bandeiras Unidas", next: ["hero-ending"], route: ["hero", "tree"], prerequisites: ["village-oath"] },
  { id: "first-dragon", title: "O Primeiro Dragão", next: ["god-ending", "monster-ending"], route: ["monster", "god", "tree"], prerequisites: ["silent-root"] },
  { id: "void-whisper", title: "Sussurro do Abismo", next: ["void-ending"], route: ["void"], prerequisites: ["silent-root"] },
];
export const endingRequirements: Record<EndingId, { label: string; requires: string[] }> = {
  hero: { label: "Final do Herói", requires: ["allied-banners", "Vila de Musgo: 3"] },
  monster: { label: "Rei dos Monstros", requires: ["first-dragon", "Clãs Monstruosos: 3"] },
  emperor: { label: "Imperador", requires: ["village-oath", "Ordem da Vigília: 3"] },
  void: { label: "Senhor do Vazio", requires: ["void-whisper", "corrupção: 3"] },
  god: { label: "Novo Deus", requires: ["first-dragon", "dragões: 7"] },
  tree: { label: "Fragmento da Árvore", requires: ["allied-banners", "first-dragon", "alianças: 3"] },
};
