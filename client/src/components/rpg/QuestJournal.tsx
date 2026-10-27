import { useMemo, useState } from "react";
import {
  getQuestDefinition,
  getQuestProgress,
  questCatalog,
  type QuestDefinition,
  type QuestReward,
  type QuestState,
  type QuestStatus,
} from "../../game/quests";
import { getItemDefinition } from "../../game/items";
import { recommendLevel } from "../../game/systems/progression";
import "./progression.css";

type QuestFilter =
  | "todas"
  | "principais"
  | "secundarias"
  | "diarias"
  | "concluidas";

export type QuestJournalProps = {
  state: QuestState;
  playerLevel: number;
  onAccept?: (questId: string) => void;
  onAbandon?: (questId: string) => void;
  onClaimReward?: (questId: string) => void;
  onTrack?: (questId: string | null) => void;
  onSelectChoice?: (questId: string, choiceId: string) => void;
  onClose?: () => void;
};

const filterLabels: Record<QuestFilter, string> = {
  todas: "Todas",
  principais: "Principais",
  secundarias: "Secundárias",
  diarias: "Diárias",
  concluidas: "Concluídas",
};

const statusLabels: Record<QuestStatus, string> = {
  locked: "Bloqueada",
  available: "Disponível",
  active: "Ativa",
  completed: "Pronta para recompensa",
  claimed: "Concluída",
  abandoned: "Abandonada",
};

const statusClass: Record<QuestStatus, string> = {
  locked: "is-muted",
  available: "is-available",
  active: "is-active",
  completed: "is-complete",
  claimed: "is-complete",
  abandoned: "is-muted",
};

const matchesFilter = (
  quest: QuestDefinition,
  runtime: QuestState["quests"][string],
  filter: QuestFilter
) => {
  if (filter === "todas") return true;
  if (filter === "principais") return quest.kind === "principal";
  if (filter === "secundarias") return quest.kind === "secundaria";
  if (filter === "diarias") return quest.kind === "diaria";
  return runtime.status === "completed" || runtime.status === "claimed";
};

const rewardLabel = (quest: QuestDefinition, override?: QuestReward) => {
  const reward = override ?? quest.rewards;
  const rewards: string[] = [];
  if (reward.xp) rewards.push(`${reward.xp} XP`);
  if (reward.gold) rewards.push(`${reward.gold} ouro`);
  for (const item of reward.items ?? []) {
    rewards.push(
      `${item.quantity}× ${getItemDefinition(item.itemId)?.name ?? item.itemId}`
    );
  }
  return rewards.join(" · ") || "Recompensa narrativa";
};

export default function QuestJournal({
  state,
  playerLevel,
  onAccept,
  onAbandon,
  onClaimReward,
  onTrack,
  onSelectChoice,
  onClose,
}: QuestJournalProps) {
  const [filter, setFilter] = useState<QuestFilter>("todas");
  const [selectedId, setSelectedId] = useState(
    state.trackedQuestId ?? questCatalog[0]?.id ?? null
  );

  const visibleQuests = useMemo(
    () =>
      questCatalog.filter(quest => {
        const runtime = state.quests[quest.id];
        return runtime && matchesFilter(quest, runtime, filter);
      }),
    [filter, state.quests]
  );
  const selectedQuest = selectedId ? getQuestDefinition(selectedId) : undefined;
  const selectedRuntime = selectedQuest
    ? state.quests[selectedQuest.id]
    : undefined;
  const selectedProgress = selectedQuest
    ? getQuestProgress(state, selectedQuest.id)
    : undefined;
  const selectedRecommendation = selectedQuest
    ? recommendLevel(playerLevel, selectedQuest.recommendedLevel)
    : "equilibrado";

  return (
    <section
      className="progression-panel quest-journal"
      aria-label="Diário de missões"
    >
      <header className="progression-panel__header">
        <div>
          <span className="progression-eyebrow">CRÔNICAS DE AETHERION</span>
          <h2>Diário de missões</h2>
          <p>Acompanhe escolhas, rotas e promessas sem sair da jornada.</p>
        </div>
        {onClose && (
          <button
            className="progression-icon-button"
            type="button"
            onClick={onClose}
            aria-label="Fechar diário"
          >
            ×
          </button>
        )}
      </header>

      <nav className="quest-filters" aria-label="Filtros de missões">
        {(Object.keys(filterLabels) as QuestFilter[]).map(key => (
          <button
            className={filter === key ? "is-selected" : ""}
            type="button"
            key={key}
            onClick={() => setFilter(key)}
          >
            {filterLabels[key]}
          </button>
        ))}
      </nav>

      <div className="quest-journal__layout">
        <div className="quest-list" aria-label="Lista de missões">
          {visibleQuests.map(quest => {
            const runtime = state.quests[quest.id];
            const progress = getQuestProgress(state, quest.id);
            return (
              <button
                type="button"
                key={quest.id}
                className={`quest-card ${selectedId === quest.id ? "is-selected" : ""}`}
                onClick={() => setSelectedId(quest.id)}
              >
                <span
                  className={`quest-card__kind quest-card__kind--${quest.kind}`}
                >
                  {quest.kind}
                </span>
                <strong>{quest.title}</strong>
                <span className="quest-card__meta">
                  Nível {quest.recommendedLevel} ·{" "}
                  {statusLabels[runtime.status]}
                </span>
                <span
                  className="quest-progress__bar"
                  aria-label={`${progress.current} de ${progress.required}`}
                >
                  <i style={{ width: `${progress.percent}%` }} />
                </span>
                <span className="quest-card__meta">
                  {progress.current}/{progress.required || "—"} objetivos
                </span>
              </button>
            );
          })}
          {!visibleQuests.length && (
            <p className="progression-empty">Nenhuma missão nessa categoria.</p>
          )}
        </div>

        {selectedQuest && selectedRuntime && selectedProgress && (
          <article className="quest-detail">
            <div className="quest-detail__heading">
              <div>
                <span
                  className={`quest-card__kind quest-card__kind--${selectedQuest.kind}`}
                >
                  {selectedQuest.kind}
                </span>
                <h3>{selectedQuest.title}</h3>
              </div>
              <span
                className={`quest-status ${statusClass[selectedRuntime.status]}`}
              >
                {statusLabels[selectedRuntime.status]}
              </span>
            </div>
            <p className="quest-detail__description">
              {selectedQuest.description}
            </p>
            <div className="quest-detail__level">
              <span>
                Nível recomendado <b>{selectedQuest.recommendedLevel}</b>
              </span>
              <span
                className={`recommendation recommendation--${selectedRecommendation}`}
              >
                {selectedRecommendation === "acima"
                  ? "Desafio alto"
                  : selectedRecommendation === "abaixo"
                    ? "Abaixo do seu nível"
                    : "Equilibrada"}
              </span>
            </div>
            <div className="quest-detail__progress">
              <div className="quest-detail__row">
                <b>Objetivos</b>
                <strong>
                  {selectedProgress.current}/{selectedProgress.required}
                </strong>
              </div>
              <span className="quest-progress__bar">
                <i style={{ width: `${selectedProgress.percent}%` }} />
              </span>
              <ul>
                {selectedQuest.objectives.map(objective => {
                  const value = selectedRuntime.progress[objective.id] ?? 0;
                  return (
                    <li
                      key={objective.id}
                      className={value >= objective.required ? "is-done" : ""}
                    >
                      <span>{value >= objective.required ? "✓" : "○"}</span>
                      {objective.label}
                      <b>
                        {value}/{objective.required}
                      </b>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="quest-detail__reward">
              <span>Recompensas</span>
              <strong>
                {rewardLabel(selectedQuest, selectedRuntime?.rewardOverride)}
              </strong>
            </div>
            {selectedQuest.choices?.length ? (
              <div className="quest-choices">
                <span>Escolhas da campanha</span>
                {selectedQuest.choices.map(choice => (
                  <button
                    type="button"
                    key={choice.id}
                    disabled={state.campaign.choices.includes(choice.id)}
                    onClick={() =>
                      onSelectChoice?.(selectedQuest.id, choice.id)
                    }
                  >
                    {state.campaign.choices.includes(choice.id)
                      ? "Escolha registrada"
                      : choice.label}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="quest-detail__actions">
              {selectedRuntime.status === "available" ||
              selectedRuntime.status === "abandoned" ? (
                <button
                  type="button"
                  className="progression-button progression-button--primary"
                  onClick={() => onAccept?.(selectedQuest.id)}
                >
                  Aceitar missão
                </button>
              ) : null}
              {selectedRuntime.status === "active" ? (
                <>
                  <button
                    type="button"
                    className="progression-button progression-button--quiet"
                    onClick={() => onTrack?.(selectedQuest.id)}
                  >
                    {state.trackedQuestId === selectedQuest.id
                      ? "Rastreando"
                      : "Rastrear"}
                  </button>
                  {(selectedQuest.kind === "secundaria" ||
                    selectedQuest.kind === "diaria") && (
                    <button
                      type="button"
                      className="progression-button progression-button--danger"
                      onClick={() => onAbandon?.(selectedQuest.id)}
                    >
                      Abandonar
                    </button>
                  )}
                </>
              ) : null}
              {selectedRuntime.status === "completed" ? (
                <button
                  type="button"
                  className="progression-button progression-button--primary"
                  onClick={() => onClaimReward?.(selectedQuest.id)}
                >
                  Receber recompensa
                </button>
              ) : null}
              {selectedRuntime.status === "claimed" ? (
                <button
                  type="button"
                  className="progression-button progression-button--quiet"
                  onClick={() => onTrack?.(selectedQuest.id)}
                >
                  Rastrear novamente
                </button>
              ) : null}
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
