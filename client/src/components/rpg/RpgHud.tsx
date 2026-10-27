import type { ReactNode } from "react";

export type HudStatus = {
  label: string;
  tone?: "normal" | "positive" | "warning" | "danger";
};

export type HudCooldown = {
  label: string;
  remaining: number;
  total?: number;
};

export type PlayerHudProps = {
  name: string;
  vocation?: string;
  level: number;
  health: number;
  maxHealth: number;
  mana?: number;
  maxMana?: number;
  focus?: number;
  maxFocus?: number;
  xp?: number;
  xpNext?: number;
  gold?: number;
  essence?: number;
  status?: HudStatus | string;
  cooldown?: HudCooldown;
  trailing?: ReactNode;
};

export type QuestHudProps = {
  title: string;
  summary?: string;
  progress?: string;
  status?: string;
  reward?: string;
  recommendedLevel?: number;
  notice?: string;
};

const clampPercent = (value: number, max: number) =>
  max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;

function StatusBadge({ status }: { status?: HudStatus | string }) {
  if (!status) return null;
  const value = typeof status === "string" ? { label: status } : status;
  return (
    <span className={`hud-status ${value.tone ?? "normal"}`}>
      {value.label}
    </span>
  );
}

function ResourceBar({
  className,
  label,
  value,
  max,
}: {
  className: string;
  label: string;
  value: number;
  max: number;
}) {
  return (
    <div className={`hud-resource ${className}`}>
      <div className="hud-resource-track">
        <i style={{ width: `${clampPercent(value, max)}%` }} />
      </div>
      <span>
        {label} {Math.ceil(value)}/{Math.ceil(max)}
      </span>
    </div>
  );
}

export function PlayerHud({
  name,
  vocation,
  level,
  health,
  maxHealth,
  mana,
  maxMana,
  focus,
  maxFocus,
  xp,
  xpNext,
  gold,
  essence,
  status,
  cooldown,
  trailing,
}: PlayerHudProps) {
  const resourceValue = mana ?? focus;
  const resourceMax = maxMana ?? maxFocus;
  const resourceLabel = mana !== undefined ? "MP" : "FOCO";
  const hasXp = xp !== undefined && xpNext !== undefined;
  const cooldownPercent = cooldown?.total
    ? clampPercent(cooldown.remaining, cooldown.total)
    : undefined;
  return (
    <section
      className="player-hud rpg-player-hud"
      aria-label={`Status de ${name}`}
    >
      <div className="hud-name">
        <small>NÍVEL {level}</small>
        <b>{name}</b>
        <span>{vocation ?? "Eco de Aetherion"}</span>
      </div>
      <ResourceBar
        className="health-resource"
        label="VIDA"
        value={health}
        max={maxHealth}
      />
      {resourceValue !== undefined && resourceMax !== undefined && (
        <ResourceBar
          className="focus-resource"
          label={resourceLabel}
          value={resourceValue}
          max={resourceMax}
        />
      )}
      {hasXp && (
        <div className="xp-resource">
          <div className="hud-resource-track">
            <i style={{ width: `${clampPercent(xp, xpNext)}%` }} />
          </div>
          <span>
            XP {Math.max(0, Math.floor(xp))}/{Math.max(1, Math.floor(xpNext))}
          </span>
        </div>
      )}
      <div className="hud-numbers">
        {gold !== undefined && <span>¤ {gold}</span>}
        {essence !== undefined && <span>✦ {essence}</span>}
        <StatusBadge status={status} />
      </div>
      {cooldown && (
        <div className="hud-cooldown" aria-label={`Recarga: ${cooldown.label}`}>
          <span>{cooldown.label}</span>
          <b>
            {cooldown.remaining > 0
              ? `${cooldown.remaining.toFixed(1)}s`
              : "PRONTO"}
          </b>
          {cooldownPercent !== undefined && (
            <i style={{ width: `${cooldownPercent}%` }} />
          )}
        </div>
      )}
      {trailing}
    </section>
  );
}

export function QuestHud({
  title,
  summary,
  progress,
  status = "MISSÃO ATIVA",
  reward,
  recommendedLevel,
  notice,
}: QuestHudProps) {
  return (
    <section className="quest-hud rpg-quest-hud" aria-label="Missão rastreada">
      <small>{status}</small>
      <b>{title}</b>
      {recommendedLevel !== undefined && (
        <span className="quest-recommended">
          NÍVEL RECOMENDADO {recommendedLevel}
        </span>
      )}
      {progress && <strong className="quest-progress">{progress}</strong>}
      {summary && <p>{summary}</p>}
      {reward && <span className="quest-reward">RECOMPENSA · {reward}</span>}
      {notice && <em className="quest-notice">{notice}</em>}
    </section>
  );
}
