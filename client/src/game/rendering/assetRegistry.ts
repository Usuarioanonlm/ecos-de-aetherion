import type { RaceId } from "../content";

export type EntitySpriteId =
  | "npc-guardian"
  | "npc-emissary"
  | "npc-merchant"
  | "slime"
  | "wolf"
  | "boar"
  | "goblin";

/** URLs dos sprites atuais, mantidas para que a troca seja apenas de fronteira. */
export const raceSpriteArt: Record<RaceId, string> = {
  human:
    "https://files.manuscdn.com/user_upload_by_module/session_file/310419663030079711/pUIOwFVDYCISIXHc.png",
  slime:
    "https://files.manuscdn.com/user_upload_by_module/session_file/310419663030079711/FGgSMFusvgCEbOJM.png",
  goblin:
    "https://files.manuscdn.com/user_upload_by_module/session_file/310419663030079711/AWHFQdlrtnrqyctS.png",
  wolfkin:
    "https://files.manuscdn.com/user_upload_by_module/session_file/310419663030079711/XvCkBikyqfcnmBrh.png",
  kobold:
    "https://files.manuscdn.com/user_upload_by_module/session_file/310419663030079711/eaTrXTxGxxABNItF.png",
  lizard:
    "https://files.manuscdn.com/user_upload_by_module/session_file/310419663030079711/gUMrtVOkNRRWpjqA.png",
  elf: "https://files.manuscdn.com/user_upload_by_module/session_file/310419663030079711/ycEsordGyXlOUmjR.png",
  dwarf:
    "https://files.manuscdn.com/user_upload_by_module/session_file/310419663030079711/yqEkdVNMujDITaSB.png",
  beastfolk:
    "https://files.manuscdn.com/user_upload_by_module/session_file/310419663030079711/rOoPrLmSoYuxjfue.png",
};

export const entitySpriteArt: Record<EntitySpriteId, string> = {
  "npc-guardian":
    "https://files.manuscdn.com/user_upload_by_module/session_file/310419663030079711/hjFSvXIqRkKAHXZN.png",
  "npc-emissary":
    "https://files.manuscdn.com/user_upload_by_module/session_file/310419663030079711/UoUFlEbyUJdkXftX.png",
  "npc-merchant":
    "https://files.manuscdn.com/user_upload_by_module/session_file/310419663030079711/HEGDqVHaAyARpqKu.png",
  slime: raceSpriteArt.slime,
  wolf: "https://files.manuscdn.com/user_upload_by_module/session_file/310419663030079711/wmaqDPgQIbcwrAqV.png",
  boar: "https://files.manuscdn.com/user_upload_by_module/session_file/310419663030079711/bXyKDHvcUTPosTWt.png",
  goblin:
    "https://files.manuscdn.com/user_upload_by_module/session_file/310419663030079711/aXhcbdEonljcQrHw.png",
};

export const worldAssetRegistry = {
  propsAtlas: {
    id: "world-props-512",
    url: "https://files.manuscdn.com/user_upload_by_module/session_file/310419663030079711/aqNSfxcvaAOgdqlw.png",
    width: 512,
    height: 512,
    quadrants: {
      ruin: { x: 0, y: 0, width: 256, height: 256 },
      cart: { x: 256, y: 0, width: 256, height: 256 },
      stump: { x: 0, y: 256, width: 256, height: 256 },
      crystals: { x: 256, y: 256, width: 256, height: 256 },
    },
  },
  player: raceSpriteArt,
  entities: entitySpriteArt,
} as const;

const imageCache = new Map<string, HTMLImageElement>();

/** Carrega sob demanda e devolve null em SSR/testes sem DOM. */
export function getRenderImage(url: string): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  const cached = imageCache.get(url);
  if (cached) return cached;
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  imageCache.set(url, image);
  return image;
}

export function getRaceSprite(raceId: string): HTMLImageElement | null {
  const url = raceSpriteArt[raceId as RaceId];
  return url ? getRenderImage(url) : null;
}

export function getEntitySprite(
  spriteId: EntitySpriteId
): HTMLImageElement | null {
  return getRenderImage(entitySpriteArt[spriteId]);
}

export function getPropsAtlas(): HTMLImageElement | null {
  return getRenderImage(worldAssetRegistry.propsAtlas.url);
}

export function clearRenderImageCache(): void {
  imageCache.clear();
}
