import {
  availableEndings,
  initialCampaign,
  resolveNextQuests,
} from "../campaignState";
import {
  questCatalog,
  questById,
  principalQuests,
  dailyQuest,
  legacyQuestIdForText,
} from "./catalog";
import type {
  LegacyQuestInput,
  QuestDefinition,
  QuestEffect,
  QuestEvent,
  QuestMutationResult,
  QuestRuntime,
  QuestState,
} from "./types";

export * from "./catalog";
export * from "./types";

const nowUtcDay = (timestamp = Date.now()) =>
  new Date(timestamp).toISOString().slice(0, 10);

export const QUEST_EVENT_MEMORY_LIMITS = {
  processedEventIds: 512,
  history: 256,
} as const;

const cloneProgress = (progress: Record<string, number>) => ({ ...progress });
const emptyProgress = (quest: QuestDefinition) =>
  Object.fromEntries(quest.objectives.map(objective => [objective.id, 0]));
const isCompleted = (runtime: QuestRuntime) =>
  runtime.status === "completed" || runtime.status === "claimed";

const runtimeFor = (
  quest: QuestDefinition,
  status: QuestRuntime["status"],
  dailyKey?: string
): QuestRuntime => ({
  id: quest.id,
  status,
  progress: emptyProgress(quest),
  ...(dailyKey ? { dailyKey } : {}),
});

const baseQuestStatus = (quest: QuestDefinition) => {
  if (quest.kind === "diaria" || quest.kind === "secundaria")
    return "available" as const;
  return quest.id === "wolf-root" ? ("active" as const) : ("locked" as const);
};

const cloneCampaign = (
  state: QuestState["campaign"]
): QuestState["campaign"] => ({
  ...state,
  quests: { ...state.quests },
  choices: [...state.choices],
  reputation: { ...state.reputation },
  buildings: [...state.buildings],
});

const cloneRuntime = (runtime: QuestRuntime): QuestRuntime => ({
  ...runtime,
  progress: cloneProgress(runtime.progress),
});

const cloneState = (state: QuestState): QuestState => ({
  ...state,
  quests: Object.fromEntries(
    Object.entries(state.quests).map(([id, runtime]) => [
      id,
      cloneRuntime(runtime),
    ])
  ),
  campaign: cloneCampaign(state.campaign),
  dailyClaimedKeys: [...state.dailyClaimedKeys],
  processedEventIds: [...state.processedEventIds],
  history: state.history.map(entry => ({ ...entry })),
});

const freshState = (timestamp = Date.now()): QuestState => {
  const dailyKey = nowUtcDay(timestamp);
  const quests: Record<string, QuestRuntime> = {};
  for (const quest of questCatalog) {
    quests[quest.id] = runtimeFor(
      quest,
      baseQuestStatus(quest),
      quest.kind === "diaria" ? dailyKey : undefined
    );
  }
  return {
    version: 1,
    quests,
    trackedQuestId: "wolf-root",
    campaign: initialCampaign(),
    dailyKey,
    dailyClaimedKeys: [],
    processedEventIds: [],
    history: [],
  };
};

const normalizeDaily = (
  state: QuestState,
  timestamp = Date.now()
): QuestState => {
  const currentKey = nowUtcDay(timestamp);
  if (state.dailyKey === currentKey) return state;
  const next = cloneState(state);
  next.dailyKey = currentKey;
  const dailyRuntime =
    next.quests[dailyQuest.id] ??
    runtimeFor(dailyQuest, "available", currentKey);
  next.quests[dailyQuest.id] = runtimeFor(dailyQuest, "available", currentKey);
  if (
    dailyRuntime.status === "claimed" &&
    dailyRuntime.dailyKey === currentKey
  ) {
    next.quests[dailyQuest.id] = dailyRuntime;
  }
  return next;
};

const definitions = (state: QuestState) =>
  Object.keys(state.quests)
    .map(id => questById[id])
    .filter((quest): quest is QuestDefinition => Boolean(quest));

const prerequisitesMet = (state: QuestState, quest: QuestDefinition) =>
  (quest.prerequisites ?? []).every(id => {
    const runtime = state.quests[id];
    return (
      (runtime ? isCompleted(runtime) : false) ||
      state.campaign.quests[id] === "completed"
    );
  });

const targetMatches = (objectiveTarget: string, eventTarget: string) =>
  objectiveTarget === "*" || objectiveTarget === eventTarget;

const completePrincipalAndUnlock = (
  state: QuestState,
  quest: QuestDefinition,
  effects: QuestEffect[],
  timestamp = Date.now()
) => {
  if (quest.kind !== "principal") return;
  state.campaign = resolveNextQuests(state.campaign, quest.id);
  for (const nextId of quest.next ?? []) {
    const nextQuest = questById[nextId];
    const nextRuntime = state.quests[nextId];
    if (!nextQuest || !nextRuntime || nextRuntime.status === "claimed")
      continue;
    if (prerequisitesMet(state, nextQuest)) {
      nextRuntime.status = "active";
      effects.push({ type: "missao_liberada", questId: nextId });
      backfillSequenceObjectives(state, nextId, timestamp, effects);
    }
  }
};

const questEventMatches = (
  _quest: QuestDefinition,
  objective: QuestDefinition["objectives"][number],
  event: QuestEvent
) => {
  if (objective.type !== event.type) return false;
  if (!targetMatches(objective.targetId, event.targetId)) return false;
  if (objective.regionId && objective.regionId !== event.regionId) return false;
  return true;
};

const completeQuestRuntime = (
  state: QuestState,
  quest: QuestDefinition,
  runtime: QuestRuntime,
  timestamp: number,
  effects: QuestEffect[]
) => {
  if (runtime.status !== "active") return;
  runtime.status = "completed";
  runtime.completedAt = timestamp;
  effects.push({ type: "missao_concluida", questId: quest.id });
  effects.push({
    type: "recompensa_disponivel",
    questId: quest.id,
    reward: quest.rewards,
  });
  completePrincipalAndUnlock(state, quest, effects, timestamp);
};

const backfillSequenceObjectives = (
  state: QuestState,
  questId: string,
  timestamp: number,
  effects: QuestEffect[]
) => {
  const quest = questById[questId];
  const runtime = state.quests[questId];
  if (!quest || !runtime || runtime.status !== "active") return;

  for (const objective of quest.objectives) {
    if (objective.type !== "sequence") continue;
    const prerequisiteRuntime = state.quests[objective.targetId];
    const prerequisiteCompleted =
      (prerequisiteRuntime ? isCompleted(prerequisiteRuntime) : false) ||
      state.campaign.quests[objective.targetId] === "completed";
    if (!prerequisiteCompleted) continue;
    const previous = runtime.progress[objective.id] ?? 0;
    if (previous >= objective.required) continue;
    runtime.progress[objective.id] = objective.required;
    effects.push({
      type: "objetivo_concluido",
      questId: quest.id,
      objectiveId: objective.id,
    });
  }

  if (
    quest.objectives.every(
      objective => (runtime.progress[objective.id] ?? 0) >= objective.required
    )
  ) {
    completeQuestRuntime(state, quest, runtime, timestamp, effects);
  }
};

export const createQuestState = (
  legacy?: LegacyQuestInput,
  timestamp = Date.now()
): QuestState => {
  const state = freshState(timestamp);
  const legacyPrincipalId = legacyQuestIdForText(legacy?.quest);
  if (legacyPrincipalId && state.quests[legacyPrincipalId]) {
    state.quests[legacyPrincipalId].status = "active";
    state.trackedQuestId = legacyPrincipalId;
    state.campaign.quests[legacyPrincipalId] = "active";
  }
  const legacySideQuest = legacy?.sideQuest ?? null;
  const legacySideId = legacySideQuest?.id;
  if (legacySideQuest && legacySideId && state.quests[legacySideId]) {
    const side = state.quests[legacySideId];
    const objectiveId = Object.keys(side.progress)[0];
    const legacyProgress =
      legacySideQuest.progress ??
      legacySideQuest.count ??
      legacySideQuest.counts ??
      0;
    if (objectiveId) {
      side.progress[objectiveId] = Math.min(
        legacySideQuest.target,
        Math.max(0, legacyProgress)
      );
    }
    side.status = legacySideQuest.claimed
      ? "claimed"
      : legacyProgress >= legacySideQuest.target
        ? "completed"
        : "active";
    const legacyXp = legacySideQuest.xp ?? legacySideQuest.reward.xp;
    const reward = legacySideQuest.reward;
    side.rewardOverride = {
      ...questById[legacySideId].rewards,
      gold: Math.max(0, reward.gold),
      xp: Math.max(0, legacyXp ?? questById[legacySideId].rewards.xp ?? 0),
      items: [
        { itemId: "pocao-musgo", quantity: reward.potions ?? 0 },
        { itemId: "madeira-viva", quantity: reward.wood ?? 0 },
        { itemId: "minerio-runico", quantity: reward.ore ?? 0 },
      ].filter(item => item.quantity > 0),
    };
    if (legacySideQuest.claimed) side.claimedAt = timestamp;
    if (!legacyPrincipalId) state.trackedQuestId = legacySideId;
  }
  return state;
};

export const dispatchQuestEvent = (
  source: QuestState,
  event: QuestEvent
): QuestMutationResult => {
  const timestamp = event.occurredAt ?? Date.now();
  const state = normalizeDaily(source, timestamp);
  const eventId = event.eventId;
  if (eventId && state.processedEventIds.includes(eventId)) {
    return {
      state,
      effects: [{ type: "evento_ignorado", eventId, reason: "duplicado" }],
    };
  }
  const next = cloneState(state);
  if (eventId) {
    next.processedEventIds.push(eventId);
    if (
      next.processedEventIds.length >
      QUEST_EVENT_MEMORY_LIMITS.processedEventIds
    ) {
      next.processedEventIds.splice(
        0,
        next.processedEventIds.length -
          QUEST_EVENT_MEMORY_LIMITS.processedEventIds
      );
    }
  }
  next.history.push({
    ...(eventId ? { eventId } : {}),
    type: event.type,
    at: timestamp,
  });
  if (next.history.length > QUEST_EVENT_MEMORY_LIMITS.history) {
    next.history.splice(
      0,
      next.history.length - QUEST_EVENT_MEMORY_LIMITS.history
    );
  }

  const effects: QuestEffect[] = [];
  let advanced = false;
  for (const quest of definitions(next)) {
    const runtime = next.quests[quest.id];
    if (!runtime || runtime.status !== "active") continue;
    let questAdvanced = false;
    for (const objective of quest.objectives) {
      if (!questEventMatches(quest, objective, event)) continue;
      const previous = runtime.progress[objective.id] ?? 0;
      const amount = Math.max(1, Math.floor(event.amount ?? 1));
      const current = Math.min(objective.required, previous + amount);
      if (current === previous) continue;
      runtime.progress[objective.id] = current;
      questAdvanced = true;
      advanced = true;
      if (current >= objective.required && previous < objective.required) {
        effects.push({
          type: "objetivo_concluido",
          questId: quest.id,
          objectiveId: objective.id,
        });
      }
    }
    if (!questAdvanced) continue;
    const completed = quest.objectives.every(
      objective => (runtime.progress[objective.id] ?? 0) >= objective.required
    );
    if (completed)
      completeQuestRuntime(next, quest, runtime, timestamp, effects);
  }
  if (!advanced && eventId) {
    effects.push({ type: "evento_ignorado", eventId, reason: "sem_avanço" });
  }
  return { state: next, effects };
};

export const acceptQuest = (
  source: QuestState,
  questId: string,
  timestamp = Date.now()
): QuestMutationResult => {
  const state = normalizeDaily(source, timestamp);
  const quest = questById[questId];
  const runtime = state.quests[questId];
  if (!quest || !runtime) {
    return {
      state,
      effects: [
        { type: "operação_ignorada", questId, reason: "missão inexistente" },
      ],
    };
  }
  if (quest.kind === "principal" && !prerequisitesMet(state, quest)) {
    return {
      state,
      effects: [
        {
          type: "operação_ignorada",
          questId,
          reason: "pré-requisitos pendentes",
        },
      ],
    };
  }
  if (runtime.status === "active") {
    return {
      state,
      effects: [
        { type: "operação_ignorada", questId, reason: "missão já ativa" },
      ],
    };
  }
  if (runtime.status === "completed") {
    return {
      state,
      effects: [
        {
          type: "operação_ignorada",
          questId,
          reason: "reivindique a recompensa antes de reaceitar",
        },
      ],
    };
  }
  if (runtime.status === "claimed") {
    return {
      state,
      effects: [
        {
          type: "operação_ignorada",
          questId,
          reason: "recompensa já reivindicada; não é possível farmar novamente",
        },
      ],
    };
  }
  if (
    quest.kind === "diaria" &&
    state.dailyClaimedKeys.includes(state.dailyKey)
  ) {
    return {
      state,
      effects: [
        {
          type: "operação_ignorada",
          questId,
          reason: "diária já recebida hoje",
        },
      ],
    };
  }
  const next = cloneState(state);
  const nextRuntime = next.quests[questId];
  nextRuntime.status = "active";
  nextRuntime.acceptedAt = timestamp;
  nextRuntime.dailyKey =
    quest.kind === "diaria" ? next.dailyKey : nextRuntime.dailyKey;
  if (
    nextRuntime.status === "active" &&
    quest.kind !== "secundaria" &&
    quest.kind !== "diaria"
  ) {
    nextRuntime.progress = cloneProgress(nextRuntime.progress);
  }
  next.trackedQuestId = questId;
  const effects: QuestEffect[] = [{ type: "missao_aceita", questId }];
  backfillSequenceObjectives(next, questId, timestamp, effects);
  return { state: next, effects };
};

export const abandonQuest = (
  source: QuestState,
  questId: string,
  timestamp = Date.now()
): QuestMutationResult => {
  const state = normalizeDaily(source, timestamp);
  const quest = questById[questId];
  const runtime = state.quests[questId];
  if (
    !quest ||
    !runtime ||
    (quest.kind !== "secundaria" && quest.kind !== "diaria")
  ) {
    return {
      state,
      effects: [
        {
          type: "operação_ignorada",
          questId,
          reason: "só missões secundárias ou diárias podem ser abandonadas",
        },
      ],
    };
  }
  if (runtime.status !== "active") {
    return {
      state,
      effects: [
        { type: "operação_ignorada", questId, reason: "missão não está ativa" },
      ],
    };
  }
  const next = cloneState(state);
  const nextRuntime = next.quests[questId];
  nextRuntime.status = "abandoned";
  nextRuntime.abandonedAt = timestamp;
  nextRuntime.progress = emptyProgress(quest);
  if (next.trackedQuestId === questId) next.trackedQuestId = "wolf-root";
  return { state: next, effects: [{ type: "missao_abandonada", questId }] };
};

export const claimQuestReward = (
  source: QuestState,
  questId: string,
  timestamp = Date.now()
): QuestMutationResult => {
  const state = normalizeDaily(source, timestamp);
  const quest = questById[questId];
  const runtime = state.quests[questId];
  if (!quest || !runtime || runtime.status !== "completed") {
    if (runtime?.status === "claimed") {
      return { state, effects: [{ type: "recompensa_ja_recebida", questId }] };
    }
    return {
      state,
      effects: [
        {
          type: "operação_ignorada",
          questId,
          reason: "missão ainda não concluída",
        },
      ],
    };
  }
  const transactionId = `${questId}:${quest.kind === "diaria" ? state.dailyKey : "permanente"}`;
  if (
    runtime.claimedAt ||
    (state.dailyClaimedKeys.includes(state.dailyKey) && quest.kind === "diaria")
  ) {
    return { state, effects: [{ type: "recompensa_ja_recebida", questId }] };
  }
  const next = cloneState(state);
  const nextRuntime = next.quests[questId];
  nextRuntime.status = "claimed";
  nextRuntime.claimedAt = timestamp;
  if (quest.kind === "diaria") next.dailyClaimedKeys.push(next.dailyKey);
  const reward = nextRuntime.rewardOverride ?? quest.rewards;
  for (const [faction, amount] of Object.entries(reward.reputation ?? {})) {
    next.campaign.reputation[faction] =
      (next.campaign.reputation[faction] ?? 0) + amount;
  }
  return {
    state: next,
    effects: [
      {
        type: "recompensa_recebida",
        questId,
        reward,
        transactionId,
      },
    ],
  };
};

export const selectTrackedQuest = (
  source: QuestState,
  questId: string | null
): QuestMutationResult => {
  if (questId !== null && !source.quests[questId]) {
    return {
      state: source,
      effects: [
        { type: "operação_ignorada", questId, reason: "missão inexistente" },
      ],
    };
  }
  const next = cloneState(source);
  next.trackedQuestId = questId;
  return { state: next, effects: [] };
};

export const selectQuestChoice = (
  source: QuestState,
  questId: string,
  choiceId: string
): QuestMutationResult => {
  const quest = questById[questId];
  const choice = quest?.choices?.find(item => item.id === choiceId);
  if (!quest || !choice) {
    return {
      state: source,
      effects: [
        { type: "operação_ignorada", questId, reason: "escolha inexistente" },
      ],
    };
  }
  const runtime = source.quests[questId];
  if (
    !runtime ||
    !["active", "completed", "claimed"].includes(runtime.status)
  ) {
    return {
      state: source,
      effects: [
        {
          type: "operação_ignorada",
          questId,
          reason: "missão inacessível para esta escolha",
        },
      ],
    };
  }
  if (source.campaign.choices.includes(choiceId)) {
    return {
      state: source,
      effects: [
        { type: "operação_ignorada", questId, reason: "escolha já registrada" },
      ],
    };
  }
  const exclusiveChoiceIds = quest.mutuallyExclusiveChoiceIds ?? [];
  if (
    exclusiveChoiceIds.some(
      id => id !== choiceId && source.campaign.choices.includes(id)
    )
  ) {
    return {
      state: source,
      effects: [
        {
          type: "operação_ignorada",
          questId,
          reason: "outra escolha desta missão já foi registrada",
        },
      ],
    };
  }
  const next = cloneState(source);
  next.campaign.choices.push(choiceId);
  next.campaign.reputation[choice.faction] =
    (next.campaign.reputation[choice.faction] ?? 0) + choice.amount;
  return {
    state: next,
    effects: [
      {
        type: "escolha_registrada",
        questId,
        choiceId,
        faction: choice.faction,
        amount: choice.amount,
      },
    ],
  };
};

export const getAvailableEndings = (state: QuestState) =>
  availableEndings(state.campaign);

export const getQuestDefinition = (questId: string) => questById[questId];

export const getQuestProgress = (state: QuestState, questId: string) => {
  const quest = questById[questId];
  const runtime = state.quests[questId];
  if (!quest || !runtime) return { current: 0, required: 0, percent: 0 };
  const required = quest.objectives.reduce(
    (sum, objective) => sum + objective.required,
    0
  );
  const current = quest.objectives.reduce(
    (sum, objective) =>
      sum + Math.min(objective.required, runtime.progress[objective.id] ?? 0),
    0
  );
  return {
    current,
    required,
    percent: required ? Math.round((current / required) * 100) : 0,
  };
};

export const serializeQuestState = (source: QuestState) => {
  const state = cloneState(source);
  return {
    schemaVersion: 1 as const,
    ...state,
  };
};

export const deserializeQuestState = (
  input: unknown,
  legacy?: LegacyQuestInput,
  timestamp = Date.now()
): QuestState => {
  const fallback = createQuestState(legacy, timestamp);
  if (!input || typeof input !== "object") return fallback;
  const raw = input as Partial<QuestState> & { schemaVersion?: number };
  if (raw.schemaVersion !== 1 || !raw.quests || typeof raw.quests !== "object")
    return fallback;
  const next = createQuestState(legacy, timestamp);
  for (const quest of questCatalog) {
    const saved = raw.quests[quest.id];
    if (!saved || typeof saved !== "object") continue;
    const candidate = saved as QuestRuntime;
    const progress = Object.fromEntries(
      quest.objectives.map(objective => [
        objective.id,
        Math.max(
          0,
          Math.min(
            objective.required,
            Number(candidate.progress?.[objective.id] ?? 0)
          )
        ),
      ])
    );
    next.quests[quest.id] = {
      ...next.quests[quest.id],
      ...candidate,
      id: quest.id,
      progress,
    };
  }
  if (
    typeof raw.trackedQuestId === "string" &&
    next.quests[raw.trackedQuestId]
  ) {
    next.trackedQuestId = raw.trackedQuestId;
  } else if (raw.trackedQuestId === null) {
    next.trackedQuestId = null;
  }
  if (raw.campaign && typeof raw.campaign === "object") {
    const campaign = raw.campaign as Partial<QuestState["campaign"]>;
    next.campaign = {
      ...next.campaign,
      ...campaign,
      quests: { ...next.campaign.quests, ...(campaign.quests ?? {}) },
      choices: [...(campaign.choices ?? next.campaign.choices)],
      reputation: {
        ...next.campaign.reputation,
        ...(campaign.reputation ?? {}),
      },
      buildings: [...(campaign.buildings ?? next.campaign.buildings)],
    };
  }
  next.dailyKey =
    typeof raw.dailyKey === "string" ? raw.dailyKey : next.dailyKey;
  next.dailyClaimedKeys = Array.isArray(raw.dailyClaimedKeys)
    ? raw.dailyClaimedKeys.filter(
        (value): value is string => typeof value === "string"
      )
    : [];
  next.processedEventIds = Array.isArray(raw.processedEventIds)
    ? raw.processedEventIds.filter(
        (value): value is string => typeof value === "string"
      )
    : [];
  next.history = Array.isArray(raw.history)
    ? (raw.history.filter(
        entry => entry && typeof entry === "object"
      ) as QuestState["history"])
    : [];
  return normalizeDaily(next, timestamp);
};

export const questCatalogByKind = {
  todas: questCatalog,
  principais: principalQuests,
  secundarias: questCatalog.filter(quest => quest.kind === "secundaria"),
  diarias: questCatalog.filter(quest => quest.kind === "diaria"),
  concluidas: questCatalog.filter(quest => quest.kind !== "diaria"),
} as const;

export const accept = acceptQuest;
export const abandon = abandonQuest;
export const serialize = serializeQuestState;
export const deserialize = deserializeQuestState;
