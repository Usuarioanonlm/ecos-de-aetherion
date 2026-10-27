import {
  quests as campaignQuests,
  type Quest as LegacyCampaignQuest,
} from "../campaign";
import { firstRegion, regions } from "../worldContent";
import type {
  QuestDefinition,
  QuestObjective,
  QuestReward,
  LegacySideQuest,
} from "./types";

const itemReward = (itemId: string, quantity: number) => ({
  items: [{ itemId, quantity }],
});

const principalRewards: Record<string, QuestReward> = {
  "wolf-root": {
    xp: 80,
    gold: 25,
    reputation: { "Vila de Musgo": 1 },
    ...itemReward("pocao-musgo", 1),
  },
  "village-oath": {
    xp: 110,
    gold: 35,
    reputation: { "Ordem da Vigília": 4 },
    ...itemReward("madeira-viva", 4),
  },
  "silent-root": {
    xp: 125,
    gold: 40,
    reputation: { "Círculo Élfico": 1 },
    ...itemReward("fragmento-eter", 2),
  },
  "allied-banners": { xp: 180, gold: 60, ...itemReward("selo-de-alianca", 1) },
  "first-dragon": { xp: 260, gold: 100, ...itemReward("escama-primordial", 1) },
  "void-whisper": { xp: 220, gold: 90, ...itemReward("fragmento-vazio", 1) },
};

const principalObjectives: Record<string, QuestObjective[]> = {
  "wolf-root": [
    {
      id: "lobos",
      type: "kill",
      targetId: "wolf",
      label: "Dissipe Lobos Primordiais",
      required: 3,
      regionId: firstRegion,
    },
    {
      id: "falar-guardia-inicial",
      type: "npc",
      targetId: "field-floresta-de-elaris-warden",
      label: "Converse com a guardiã da floresta",
      required: 1,
      regionId: firstRegion,
    },
  ],
  "village-oath": [
    {
      id: "falar-guardia",
      type: "npc",
      targetId: "field-floresta-de-elaris-warden",
      label: "Converse com a guardiã da floresta",
      required: 1,
      regionId: firstRegion,
    },
    {
      id: "proteger-rota",
      type: "escort",
      targetId: "moss-village-route",
      label: "Proteja a rota da Vila de Musgo",
      required: 1,
      regionId: firstRegion,
    },
  ],
  "silent-root": [
    {
      id: "ouvir-raiz",
      type: "find",
      targetId: "primordial-tree-root",
      label: "Encontre a raiz silenciosa",
      required: 1,
      regionId: firstRegion,
    },
    {
      id: "registrar-ecos",
      type: "resource",
      targetId: "essence",
      label: "Registre três ecos de Éter",
      required: 3,
      regionId: firstRegion,
    },
  ],
  "allied-banners": [
    {
      id: "bandeiras",
      type: "sequence",
      targetId: "village-oath",
      label: "Complete o Juramento de Musgo",
      required: 1,
    },
    {
      id: "rota-arvend",
      type: "region",
      targetId: "biome-planicies-de-arvend",
      label: "Alcance as Planícies de Arvend",
      required: 1,
    },
  ],
  "first-dragon": [
    {
      id: "dragao",
      type: "boss",
      targetId: "kaelgor",
      label: "Derrote Kaelgor, o Dragão Caído",
      required: 1,
      regionId: "biome-campos-gelidos-de-norvak",
    },
  ],
  "void-whisper": [
    {
      id: "vazio",
      type: "region",
      targetId: "biome-o-vazio-de-erebos",
      label: "Entre no Vazio de Erebos",
      required: 1,
      regionId: "biome-o-vazio-de-erebos",
    },
    {
      id: "sussurro",
      type: "find",
      targetId: "void-whisper",
      label: "Encontre a origem do sussurro",
      required: 1,
      regionId: "biome-o-vazio-de-erebos",
    },
  ],
};

const legacyDescription: Record<string, string> = {
  "wolf-root":
    "A trilha norte foi tomada por criaturas primordiais. A primeira raiz ainda observa suas escolhas.",
  "village-oath":
    "A Vila de Musgo precisa de uma promessa que atravesse a Ruptura e alcance suas rotas.",
  "silent-root":
    "Há uma consciência sob a floresta. Siga os ecos sem deixar que o Vazio escolha por você.",
  "allied-banners":
    "Reúna aliados nas rotas antigas antes que os reinos sejam obrigados a lutar sozinhos.",
  "first-dragon":
    "Um dragão caído guarda uma memória capaz de decidir o rumo da campanha.",
  "void-whisper":
    "O Vazio chamou pelo seu nome. Descubra se é um aviso, uma armadilha ou uma promessa.",
};

const getLegacyQuest = (id: string): LegacyCampaignQuest | undefined =>
  campaignQuests.find(quest => quest.id === id);

export const principalQuests: QuestDefinition[] = campaignQuests.map(quest => ({
  id: quest.id,
  kind: "principal",
  title: quest.title,
  description: legacyDescription[quest.id] ?? quest.title,
  summary: `Cadeia principal · ${quest.route.join(" / ")}`,
  recommendedLevel: Math.max(
    1,
    quest.id === "wolf-root"
      ? 1
      : quest.id === "village-oath"
        ? 2
        : quest.id === "silent-root"
          ? 3
          : quest.id === "allied-banners"
            ? 4
            : 6
  ),
  prerequisites: quest.prerequisites,
  next: quest.next,
  route: quest.route,
  objectives: principalObjectives[quest.id] ?? [],
  rewards: principalRewards[quest.id] ?? { xp: 50 },
  choices: quest.choices?.map(choiceId => ({
    id: choiceId,
    label:
      choiceId === "defend-village"
        ? "Defender a Vila de Musgo"
        : choiceId === "ask-order"
          ? "Perguntar pela Ordem da Vigília"
          : "Seguir a raiz silenciosa",
    effect: "Sua escolha altera a reputação e os finais disponíveis.",
    faction:
      choiceId === "defend-village"
        ? "Vila de Musgo"
        : choiceId === "ask-order"
          ? "Ordem da Vigília"
          : "Círculo Élfico",
    amount: choiceId === "ask-order" ? -1 : 2,
  })),
  mutuallyExclusiveChoiceIds: quest.choices,
}));

const biomeRegionFor = (regionId: string) => {
  const source = regions[regionId];
  if (!source || source.mapKind === "biome") return regionId;
  return (
    Object.values(regions).find(
      region =>
        region.mapKind === "biome" && region.biomeName === source.biomeName
    )?.id ?? regionId
  );
};

const objectiveForNpcQuest = (
  regionId: string,
  quest: LegacySideQuest
): QuestObjective => {
  if (quest.id.endsWith("-hunt")) {
    return {
      id: `${quest.id}-objetivo`,
      type: "kill",
      targetId: "*",
      label: "Dissipe ameaças da região",
      required: quest.target,
      regionId: biomeRegionFor(regionId),
    };
  }
  if (quest.id.endsWith("-ether")) {
    return {
      id: `${quest.id}-objetivo`,
      type: "resource",
      targetId: "essence",
      label: "Colete essências de Éter",
      required: quest.target,
      regionId: biomeRegionFor(regionId),
    };
  }
  const chestTarget = regions[regionId]?.services.find(
    service => service.kind === "chest"
  )?.id;
  return {
    id: `${quest.id}-objetivo`,
    type: "chest",
    targetId: chestTarget ?? `${regionId}-chest`,
    label: "Abra o baú de suprimentos correto",
    required: quest.target,
    regionId,
  };
};

const convertReward = (
  questId: string,
  reward: LegacySideQuest["reward"]
): QuestReward => ({
  gold: reward.gold,
  items: [
    ...(reward.potions
      ? [{ itemId: "pocao-musgo", quantity: reward.potions }]
      : []),
    ...(reward.wood ? [{ itemId: "madeira-viva", quantity: reward.wood }] : []),
    ...(reward.ore ? [{ itemId: "minerio-runico", quantity: reward.ore }] : []),
  ],
  xp: 20,
  reputation: questId.endsWith("-hunt")
    ? { "Vila de Musgo": 1 }
    : questId.endsWith("-ether")
      ? { "Círculo Élfico": 1 }
      : { "Clãs Monstruosos": 1, "Liga Mercante de Velkar": 1 },
});

export const createRegionSideQuest = (
  regionId: string,
  npcQuest: LegacySideQuest
): QuestDefinition => {
  const region = regions[regionId];
  const objective = objectiveForNpcQuest(regionId, npcQuest);
  return {
    id: npcQuest.id,
    kind: "secundaria",
    title: npcQuest.title,
    description: npcQuest.summary,
    summary: `${region?.name ?? "Região"} · missão de NPC`,
    recommendedLevel: region?.tier ?? 1,
    regionId,
    objectives: [objective],
    rewards: convertReward(npcQuest.id, npcQuest.reward),
  };
};

export const sideQuests: QuestDefinition[] = Object.values(regions).flatMap(
  region =>
    region.npcs.map(npc =>
      createRegionSideQuest(region.id, {
        id: npc.quest.id,
        title: npc.quest.title,
        summary: npc.quest.summary,
        target: npc.quest.target,
        reward: npc.quest.reward,
      })
    )
);

export const dailyQuest: QuestDefinition = {
  id: "daily-rotas-do-eter",
  kind: "diaria",
  title: "Rotas do Éter",
  description: "Mantenha as rotas vivas antes que a névoa cubra os marcos.",
  summary: "Dissipe ameaças e mantenha o fluxo regional.",
  recommendedLevel: 2,
  objectives: [
    {
      id: "daily-ameacas",
      type: "kill",
      targetId: "*",
      label: "Dissipe ameaças",
      required: 3,
    },
    {
      id: "daily-regiao",
      type: "region",
      targetId: firstRegion,
      label: "Retorne à Floresta de Elaris",
      required: 1,
    },
  ],
  rewards: { xp: 55, gold: 20, ...itemReward("pocao-musgo", 1) },
};

export const questCatalog: QuestDefinition[] = [
  ...principalQuests,
  ...sideQuests,
  dailyQuest,
];

export const questById = Object.fromEntries(
  questCatalog.map(quest => [quest.id, quest])
) as Record<string, QuestDefinition>;

export const legacyQuestIdForText = (value?: string): string | undefined => {
  if (!value) return undefined;
  if (questById[value]) return value;
  return (
    principalQuests.find(quest =>
      value.toLocaleLowerCase().includes(quest.title.toLocaleLowerCase())
    )?.id ??
    (value.toLocaleLowerCase().includes("lobo") ? "wolf-root" : undefined)
  );
};

export const legacyCampaignQuestForId = (id: string) => getLegacyQuest(id);
