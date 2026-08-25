// Cartografia Viva: os recursos artísticos são a âncora visual; formas simples só complementam a leitura.

const asset = (manusUrl: string, githubFile: string) => {
  if (typeof window !== "undefined" && /manus\.computer$|manus\.space$/.test(window.location.hostname)) {
    return manusUrl;
  }
  return `${import.meta.env.BASE_URL}assets/${githubFile}`;
};

export const visualTargetUrl = asset("/manus-storage/aetherion-visual-target_29ae52fa.png", "aetherion-visual-target.png");
export const emblemUrl = asset("/manus-storage/aetherion-emblem_f82da37c.png", "aetherion-emblem.png");
export const slimeUrl = asset("/manus-storage/aetherion-slime-hero_f7f4065c.png", "aetherion-slime-hero.png");
export const wolfUrl = asset("/manus-storage/aetherion-primal-wolf_cd0ba09b.png", "aetherion-primal-wolf.png");
export const clearingUrl = visualTargetUrl;
