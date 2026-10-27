import type { CampaignState } from "../campaignState";

export type QuestKind = "principal" | "secundaria" | "diaria";
export type QuestObjectiveType =
  | "kill"
  | "resource"
  | "item"
  | "npc"
  | "region"
  | "chest"
  | "boss"
  | "escort"
  | "find"
  | "deliver"
  | "sequence";
export type QuestStatus =
  | "locked"
  | "available"
  | "active"
  | "completed"
  | "claimed"
  | "abandoned";

export type QuestReward = {
  xp?: number;
  gold?: number;
  items?: Array<{ itemId: string; quantity: number }>;
  reputation?: Record<string, number>;
};

export type QuestObjective = {
  id: string;
  type: QuestObjectiveType;
  targetId: string;
  label: string;
  required: number;
  regionId?: string;
};

export type QuestChoice = {
  id: string;
  label: string;
  effect: string;
  faction: string;
  amount: number;
};

export type QuestDefinition = {
  id: string;
  kind: QuestKind;
  title: string;
  description: string;
  summary: string;
  recommendedLevel: number;
  regionId?: string;
  prerequisites?: string[];
  next?: string[];
  route?: string[];
  objectives: QuestObjective[];
  rewards: QuestReward;
  choices?: QuestChoice[];
  mutuallyExclusiveChoiceIds?: string[];
};

export type QuestRuntime = {
  id: string;
  status: QuestStatus;
  progress: Record<string, number>;
  acceptedAt?: number;
  completedAt?: number;
  claimedAt?: number;
  abandonedAt?: number;
  dailyKey?: string;
  rewardOverride?: QuestReward;
};

export type QuestState = {
  version: 1;
  quests: Record<string, QuestRuntime>;
  trackedQuestId: string | null;
  campaign: CampaignState;
  dailyKey: string;
  dailyClaimedKeys: string[];
  processedEventIds: string[];
  history: Array<{ eventId?: string; type: QuestEvent["type"]; at: number }>;
};

type QuestEventBase = {
  targetId: string;
  regionId?: string;
  amount?: number;
  eventId?: string;
  occurredAt?: number;
};

export type QuestEvent =
  | ({ type: "kill" } & QuestEventBase)
  | ({ type: "resource" } & QuestEventBase)
  | ({ type: "item" } & QuestEventBase)
  | ({ type: "npc" } & QuestEventBase)
  | ({ type: "region" } & QuestEventBase)
  | ({ type: "chest" } & QuestEventBase)
  | ({ type: "boss" } & QuestEventBase)
  | ({ type: "escort" } & QuestEventBase)
  | ({ type: "find" } & QuestEventBase)
  | ({ type: "deliver" } & QuestEventBase)
  | ({ type: "sequence" } & QuestEventBase);

export type QuestEffect =
  | {
      type: "evento_ignorado";
      eventId?: string;
      reason: "duplicado" | "sem_avanço";
    }
  | { type: "objetivo_concluido"; questId: string; objectiveId: string }
  | { type: "missao_concluida"; questId: string }
  | { type: "recompensa_disponivel"; questId: string; reward: QuestReward }
  | { type: "missao_liberada"; questId: string }
  | {
      type: "recompensa_recebida";
      questId: string;
      reward: QuestReward;
      transactionId: string;
    }
  | { type: "recompensa_ja_recebida"; questId: string }
  | { type: "missao_aceita"; questId: string }
  | { type: "missao_abandonada"; questId: string }
  | {
      type: "escolha_registrada";
      questId: string;
      choiceId: string;
      faction: string;
      amount: number;
    }
  | { type: "operação_ignorada"; questId?: string; reason: string };

export type QuestMutationResult = {
  state: QuestState;
  effects: QuestEffect[];
};

export type LegacySideQuest = {
  id: string;
  title: string;
  summary: string;
  target: number;
  progress?: number;
  count?: number;
  counts?: number;
  xp?: number;
  claimed?: boolean;
  reward: {
    gold: number;
    xp?: number;
    potions?: number;
    wood?: number;
    ore?: number;
  };
};

export type LegacyQuestInput = {
  quest?: string;
  sideQuest?: LegacySideQuest | null;
};
