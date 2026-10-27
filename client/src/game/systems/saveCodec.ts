/**
 * Persistência compatível do mundo de Aetherion.
 *
 * O codec é agnóstico ao runtime: lê o envelope atual e o formato legado
 * `{ profile, state }`, mantém campos desconhecidos e nunca usa a assinatura
 * do perfil como identidade do slot. Todas as escritas são protegidas contra
 * quota, SecurityError, JSON inválido e ciclos, para que o RAF nunca receba
 * uma exceção de storage.
 */

export const WORLD_SAVE_SCHEMA_VERSION = 2;
export const SAVE_UPDATED_EVENT = "aetherion:save-updated";

type JsonRecord = Record<string, unknown>;

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export type SaveEnvelope<TState = unknown> = JsonRecord & {
  profile?: string;
  state: TState;
  schemaVersion: number;
  revision: number;
  updatedAt: string;
  slotId?: string;
};

export type SaveReport = {
  ok: boolean;
  found: boolean;
  hasData: boolean;
  source: "fresh" | "legacy" | "versioned" | "invalid" | "storage-error";
  migrated: boolean;
  corrected: number;
  revision: number;
  updatedAt: string | null;
  slotId: string | null;
  profileMismatch: boolean;
  warning: string | null;
  backupKey: string | null;
  error: string | null;
};

export type WorldSaveReadResult<TState> = {
  world: TState;
  state: TState;
  report: SaveReport;
  envelope: SaveEnvelope<TState> | null;
};

export type PersistWorldResult<TState> = {
  ok: boolean;
  changed: boolean;
  pending: boolean;
  revision: number;
  updatedAt: string | null;
  envelope: SaveEnvelope<TState> | null;
  warning: string | null;
  backupKey: string | null;
  error: string | null;
};

export type PersistWorldOptions = {
  revision?: number;
  updatedAt?: string;
};

export type SaveUpdatedDetail<TState = unknown> = {
  key: string;
  slotId: string | null;
  profile: string | null;
  revision: number;
  updatedAt: string;
  state: TState;
  envelope: SaveEnvelope<TState>;
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOwn = (value: JsonRecord, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const cloneValue = <T>(value: T, seen = new WeakMap<object, unknown>()): T => {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value) as T;
  if (value instanceof Set) {
    const copy = new Set<unknown>();
    seen.set(value, copy);
    value.forEach(item => copy.add(cloneValue(item, seen)));
    return copy as T;
  }
  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (Array.isArray(value)) {
    const copy: unknown[] = [];
    seen.set(value, copy);
    value.forEach(item => copy.push(cloneValue(item, seen)));
    return copy as T;
  }
  const copy: JsonRecord = {};
  seen.set(value, copy);
  Object.entries(value).forEach(([key, child]) => {
    if (child !== undefined) copy[key] = cloneValue(child, seen);
  });
  return copy as T;
};

/** Mescla defaults sem descartar chaves novas de saves antigos/futuros. */
const mergeValues = (defaults: unknown, loaded: unknown): unknown => {
  if (loaded === undefined) return cloneValue(defaults);
  if (loaded instanceof Set)
    return new Set(Array.from(loaded, item => cloneValue(item)));
  if (Array.isArray(loaded)) return loaded.map(item => cloneValue(item));
  if (isRecord(defaults) && isRecord(loaded)) {
    const merged: JsonRecord = {};
    Object.keys(defaults).forEach(key => {
      merged[key] = mergeValues(defaults[key], loaded[key]);
    });
    Object.keys(loaded).forEach(key => {
      if (!hasOwn(merged, key)) merged[key] = cloneValue(loaded[key]);
    });
    return merged;
  }
  return cloneValue(loaded);
};

const numberOr = (
  value: unknown,
  fallback: number,
  min: number,
  max: number,
  integer = false,
  onCorrection?: () => void
) => {
  if (!finite(value)) {
    onCorrection?.();
    return fallback;
  }
  const bounded = Math.max(min, Math.min(max, value));
  const normalized = integer ? Math.round(bounded) : bounded;
  if (normalized !== value) onCorrection?.();
  return normalized;
};

const stringArrayOr = (
  value: unknown,
  fallback: string[],
  onCorrection?: () => void
) => {
  if (!Array.isArray(value)) {
    onCorrection?.();
    return [...fallback];
  }
  const filtered = value.filter(
    (item): item is string => typeof item === "string"
  );
  if (filtered.length !== value.length) onCorrection?.();
  return filtered;
};

const setOr = (
  value: unknown,
  fallback: Set<unknown>,
  onCorrection?: () => void
) => {
  if (value instanceof Set) return new Set(value);
  if (Array.isArray(value)) {
    const filtered = value.filter(item => typeof item === "string");
    if (filtered.length !== value.length) onCorrection?.();
    return new Set(filtered);
  }
  onCorrection?.();
  return new Set(fallback);
};

const normalizeState = <TState>(
  defaults: TState,
  loaded: unknown
): { state: TState; corrected: number } => {
  let corrected = 0;
  const correct = () => {
    corrected += 1;
  };
  const merged = mergeValues(defaults, loaded) as TState;
  if (!isRecord(merged)) return { state: cloneValue(defaults), corrected: 1 };

  const state = merged as JsonRecord;
  if (hasOwn(state, "region") && typeof state.region !== "string") {
    state.region =
      isRecord(defaults) && typeof defaults.region === "string"
        ? defaults.region
        : "unknown";
    correct();
  }
  if (hasOwn(state, "unlockedRegions")) {
    const fallback =
      isRecord(defaults) && Array.isArray(defaults.unlockedRegions)
        ? defaults.unlockedRegions.filter(
            (item): item is string => typeof item === "string"
          )
        : [];
    const unlockedRegions = stringArrayOr(
      state.unlockedRegions,
      fallback,
      correct
    );
    state.unlockedRegions = unlockedRegions;
    if (
      typeof state.region === "string" &&
      !unlockedRegions.includes(state.region)
    ) {
      unlockedRegions.push(state.region);
      correct();
    }
  }
  if (hasOwn(state, "gathered")) {
    const fallback =
      isRecord(defaults) && defaults.gathered instanceof Set
        ? defaults.gathered
        : new Set<unknown>();
    state.gathered = setOr(state.gathered, fallback, correct);
  }
  if (hasOwn(state, "openedChests")) {
    const fallback =
      isRecord(defaults) && defaults.openedChests instanceof Set
        ? defaults.openedChests
        : new Set<unknown>();
    state.openedChests = setOr(state.openedChests, fallback, correct);
  }

  const player = isRecord(state.player) ? state.player : null;
  const defaultPlayer =
    isRecord(defaults) && isRecord(defaults.player) ? defaults.player : {};
  if (!player) {
    state.player = cloneValue(defaultPlayer);
    correct();
  } else {
    const maxHealth = numberOr(
      player.maxHealth,
      numberOr(defaultPlayer.maxHealth, 1, 1, 1_000_000, false, correct),
      1,
      1_000_000,
      false,
      correct
    );
    player.maxHealth = maxHealth;
    player.health = numberOr(
      player.health,
      maxHealth,
      0,
      maxHealth,
      false,
      correct
    );
    const maxFocus = numberOr(
      player.maxFocus,
      numberOr(defaultPlayer.maxFocus, 0, 0, 1_000_000, false, correct),
      0,
      1_000_000,
      false,
      correct
    );
    player.maxFocus = maxFocus;
    player.focus = numberOr(
      player.focus,
      maxFocus,
      0,
      maxFocus,
      false,
      correct
    );
    player.level = numberOr(
      player.level,
      numberOr(defaultPlayer.level, 1, 1, 999, true, correct),
      1,
      999,
      true,
      correct
    );
    player.xp = numberOr(
      player.xp,
      numberOr(defaultPlayer.xp, 0, 0, 1_000_000_000, false, correct),
      0,
      1_000_000_000,
      false,
      correct
    );
    ["essence", "potions"].forEach(key => {
      if (hasOwn(player, key)) {
        player[key] = numberOr(
          player[key],
          finite(defaultPlayer[key]) ? defaultPlayer[key] : 0,
          0,
          1_000_000_000,
          true,
          correct
        );
      }
    });
    ["x", "y"].forEach(key => {
      if (hasOwn(player, key)) {
        player[key] = numberOr(
          player[key],
          finite(defaultPlayer[key]) ? defaultPlayer[key] : 0,
          -10_000,
          10_000,
          false,
          correct
        );
      }
    });
    if (hasOwn(player, "facing"))
      player.facing = numberOr(player.facing, 1, -1, 1, false, correct);
    if (hasOwn(player, "evolved") && typeof player.evolved !== "boolean") {
      player.evolved = Boolean(defaultPlayer.evolved);
      correct();
    }
  }

  ["resources", "reputation", "audio", "controls"].forEach(section => {
    if (!hasOwn(state, section)) return;
    const value = state[section];
    if (!isRecord(value)) {
      const fallback = isRecord(defaults) ? defaults[section] : undefined;
      state[section] = cloneValue(fallback ?? {});
      correct();
      return;
    }
    const fallback =
      isRecord(defaults) && isRecord(defaults[section])
        ? defaults[section]
        : {};
    Object.keys(value).forEach(key => {
      if (section === "controls") {
        if (typeof value[key] !== "string") {
          value[key] = typeof fallback[key] === "string" ? fallback[key] : "";
          correct();
        }
      } else if (section === "audio") {
        value[key] = numberOr(
          value[key],
          finite(fallback[key]) ? fallback[key] : 0,
          0,
          1,
          false,
          correct
        );
      } else if (section === "reputation" || section === "resources") {
        value[key] = numberOr(
          value[key],
          finite(fallback[key]) ? fallback[key] : 0,
          -1_000_000_000,
          1_000_000_000,
          false,
          correct
        );
      }
    });
  });
  if (hasOwn(state, "buildings")) {
    const fallback =
      isRecord(defaults) && Array.isArray(defaults.buildings)
        ? defaults.buildings
        : [];
    state.buildings = stringArrayOr(
      state.buildings,
      fallback as string[],
      correct
    );
  }
  if (hasOwn(state, "enemies") && !Array.isArray(state.enemies)) {
    state.enemies =
      isRecord(defaults) && Array.isArray(defaults.enemies)
        ? cloneValue(defaults.enemies)
        : [];
    correct();
  }
  if (Array.isArray(state.enemies)) {
    state.enemies = state.enemies.map(enemy => {
      if (!isRecord(enemy)) {
        correct();
        return {};
      }
      const normalizedEnemy = enemy;
      ["x", "y"].forEach(key => {
        if (hasOwn(normalizedEnemy, key))
          normalizedEnemy[key] = numberOr(
            normalizedEnemy[key],
            0,
            -10_000,
            10_000,
            false,
            correct
          );
      });
      ["health", "maxHealth"].forEach(key => {
        if (hasOwn(normalizedEnemy, key))
          normalizedEnemy[key] = numberOr(
            normalizedEnemy[key],
            0,
            0,
            1_000_000,
            false,
            correct
          );
      });
      if (
        hasOwn(normalizedEnemy, "alive") &&
        typeof normalizedEnemy.alive !== "boolean"
      ) {
        normalizedEnemy.alive = Boolean(normalizedEnemy.alive);
        correct();
      }
      return normalizedEnemy;
    });
  }
  if (hasOwn(state, "essences") && !Array.isArray(state.essences)) {
    state.essences =
      isRecord(defaults) && Array.isArray(defaults.essences)
        ? cloneValue(defaults.essences)
        : [];
    correct();
  }
  if (Array.isArray(state.essences)) {
    state.essences = state.essences.map(essence => {
      if (!isRecord(essence)) {
        correct();
        return {};
      }
      ["x", "y"].forEach(key => {
        if (hasOwn(essence, key))
          essence[key] = numberOr(
            essence[key],
            0,
            -10_000,
            10_000,
            false,
            correct
          );
      });
      return essence;
    });
  }
  if (
    hasOwn(state, "sideQuest") &&
    state.sideQuest !== null &&
    !isRecord(state.sideQuest)
  ) {
    state.sideQuest = isRecord(defaults)
      ? cloneValue(defaults.sideQuest ?? null)
      : null;
    correct();
  }
  if (isRecord(state.sideQuest)) {
    const sideQuest = state.sideQuest;
    const defaultQuest =
      isRecord(defaults) && isRecord(defaults.sideQuest)
        ? defaults.sideQuest
        : {};
    const target = numberOr(
      sideQuest.target,
      finite(defaultQuest.target) ? defaultQuest.target : 0,
      0,
      1_000_000,
      true,
      correct
    );
    sideQuest.target = target;
    sideQuest.progress = numberOr(
      sideQuest.progress,
      0,
      0,
      target,
      true,
      correct
    );
    if (typeof sideQuest.claimed !== "boolean") {
      sideQuest.claimed = Boolean(defaultQuest.claimed);
      correct();
    }
  }
  return { state: state as TState, corrected };
};

const entityTransientKeys = new Set([
  "attack",
  "special",
  "hurt",
  "death",
  "phase",
  "guard",
  "invulnerable",
  "cooldown",
  "cooldowns",
  "statusTimer",
  "statusTimers",
  "statusEffects",
  "timer",
  "timers",
  "attackTimer",
  "hurtTimer",
  "deathTimer",
  "phaseTimer",
  "transientRuntime",
]);

const nestedTimerKeys = new Set([
  "timer",
  "timers",
  "cooldown",
  "cooldowns",
  "statusTimer",
  "statusTimers",
  "attackTimer",
  "hurtTimer",
  "deathTimer",
  "phaseTimer",
  "transientRuntime",
]);

const stripEntity = (entity: unknown): unknown => {
  if (!isRecord(entity)) return entity;
  const clean: JsonRecord = {};
  Object.entries(entity).forEach(([key, value]) => {
    if (!entityTransientKeys.has(key)) clean[key] = cloneValue(value);
  });
  return clean;
};

/** Remove somente timers conhecidos dentro de submodelos desconhecidos. */
const stripNestedTimers = (
  value: unknown,
  seen = new WeakMap<object, unknown>()
): unknown => {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);
  if (value instanceof Set) {
    const result = new Set<unknown>();
    seen.set(value, result);
    value.forEach(item => result.add(stripNestedTimers(item, seen)));
    return result;
  }
  if (Array.isArray(value)) {
    const result: unknown[] = [];
    seen.set(value, result);
    value.forEach(item => result.push(stripNestedTimers(item, seen)));
    return result;
  }
  const result: JsonRecord = {};
  seen.set(value, result);
  Object.entries(value).forEach(([key, child]) => {
    if (!nestedTimerKeys.has(key)) result[key] = stripNestedTimers(child, seen);
  });
  return result;
};

const stripTransientState = <T>(state: T): T => {
  if (!isRecord(state)) return cloneValue(state);
  const root = cloneValue(state) as JsonRecord;
  if (hasOwn(root, "player")) root.player = stripEntity(root.player);
  if (Array.isArray(root.enemies)) root.enemies = root.enemies.map(stripEntity);
  if (Array.isArray(root.essences))
    root.essences = root.essences.map(stripEntity);
  [
    "cooldowns",
    "statusTimers",
    "statusEffects",
    "transientRuntime",
    "timer",
    "timers",
  ].forEach(key => {
    if (hasOwn(root, key)) delete root[key];
  });
  ["questState", "inventory", "campaign"].forEach(key => {
    if (hasOwn(root, key)) root[key] = stripNestedTimers(root[key]);
  });
  return root as T;
};

const encodeSets = (value: unknown, seen = new WeakSet<object>()): unknown => {
  if (value instanceof Set) {
    if (seen.has(value)) throw new TypeError("estado de save circular");
    seen.add(value);
    const encoded = {
      __aetherionSet: Array.from(value, item => encodeSets(item, seen)),
    };
    seen.delete(value);
    return encoded;
  }
  if (value instanceof Date) return value.toISOString();
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) throw new TypeError("estado de save circular");
  seen.add(value);
  if (Array.isArray(value)) {
    const result = value.map(item => encodeSets(item, seen));
    seen.delete(value);
    return result;
  }
  const result: JsonRecord = {};
  Object.entries(value).forEach(([key, child]) => {
    if (child !== undefined) result[key] = encodeSets(child, seen);
  });
  seen.delete(value);
  return result;
};

const reviveSets = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(reviveSets);
  if (!isRecord(value)) return value;
  if (Array.isArray(value.__aetherionSet))
    return new Set(value.__aetherionSet.map(reviveSets));
  const result: JsonRecord = {};
  Object.entries(value).forEach(([key, child]) => {
    result[key] = reviveSets(child);
  });
  return result;
};

const stableValue = (value: unknown, seen = new WeakSet<object>()): unknown => {
  if (value instanceof Set) {
    if (seen.has(value)) throw new TypeError("estado de save circular");
    seen.add(value);
    const result = Array.from(value, item => stableValue(item, seen));
    seen.delete(value);
    return result;
  }
  if (value instanceof Date) return value.toISOString();
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) throw new TypeError("estado de save circular");
  seen.add(value);
  if (Array.isArray(value)) {
    const array = value.map(item => stableValue(item, seen));
    seen.delete(value);
    return array;
  }
  const result: JsonRecord = {};
  const record = value as JsonRecord;
  Object.keys(record)
    .sort()
    .forEach(key => {
      if (record[key] !== undefined)
        result[key] = stableValue(record[key], seen);
    });
  seen.delete(value);
  return result;
};

const stableStringify = (value: unknown) => JSON.stringify(stableValue(value));

/** Fingerprint estável apenas do progresso persistível, sem timers de runtime. */
export const worldStateFingerprint = <TState>(state: TState) => {
  try {
    return stableStringify(stripTransientState(state)) ?? "undefined";
  } catch {
    return null;
  }
};

const nowIso = () => new Date().toISOString();

const makeReport = (partial: Partial<SaveReport>): SaveReport => ({
  ok: true,
  found: false,
  hasData: false,
  source: "fresh",
  migrated: false,
  corrected: 0,
  revision: 0,
  updatedAt: null,
  slotId: null,
  profileMismatch: false,
  warning: null,
  backupKey: null,
  error: null,
  ...partial,
});

const backupCorrupt = (storage: StorageLike, key: string, raw: string) => {
  const backupKey = `${key}:backup:${Date.now()}`;
  try {
    storage.setItem(backupKey, raw);
    return { backupKey, warning: `Save inválido preservado em ${backupKey}.` };
  } catch {
    return {
      backupKey: null,
      warning:
        "Save inválido detectado; não foi possível criar a cópia de segurança.",
    };
  }
};

const parsePayload = <TState>(
  rawValue: unknown,
  fresh: TState,
  profileKey?: string,
  slotId?: string
): WorldSaveReadResult<TState> => {
  const raw = reviveSets(rawValue);
  if (!isRecord(raw)) {
    return {
      world: cloneValue(fresh),
      state: cloneValue(fresh),
      envelope: null,
      report: makeReport({
        ok: false,
        source: "invalid",
        warning: "O save não contém um objeto de mundo válido.",
        error: "payload-not-object",
      }),
    };
  }
  const hasEnvelopeState = hasOwn(raw, "state");
  const loadedState = hasEnvelopeState ? raw.state : raw;
  if (!isRecord(loadedState)) {
    return {
      world: cloneValue(fresh),
      state: cloneValue(fresh),
      envelope: null,
      report: makeReport({
        ok: false,
        source: "invalid",
        warning: "O save não contém um estado de mundo válido.",
        error: "state-not-object",
      }),
    };
  }
  const storedSlot = typeof raw.slotId === "string" ? raw.slotId : null;
  if (slotId && storedSlot && storedSlot !== slotId) {
    return {
      world: cloneValue(fresh),
      state: cloneValue(fresh),
      envelope: null,
      report: makeReport({
        ok: false,
        found: true,
        source: "invalid",
        slotId: storedSlot,
        warning: "O save pertence a outro slot; o conteúdo foi preservado.",
        error: "slot-mismatch",
      }),
    };
  }
  const normalized = normalizeState(fresh, loadedState);
  const storedRevision = finite(raw.revision)
    ? Math.max(0, Math.floor(raw.revision))
    : 0;
  const updatedAt =
    typeof raw.updatedAt === "string" && raw.updatedAt ? raw.updatedAt : null;
  const profileMismatch =
    typeof profileKey === "string" &&
    typeof raw.profile === "string" &&
    raw.profile !== profileKey;
  const envelope = {
    ...cloneValue(raw),
    state: normalized.state,
    schemaVersion: finite(raw.schemaVersion)
      ? Math.max(1, Math.floor(raw.schemaVersion))
      : 1,
    revision: storedRevision,
    updatedAt: updatedAt ?? "",
    ...(storedSlot ? { slotId: storedSlot } : {}),
  } as SaveEnvelope<TState>;
  return {
    world: normalized.state,
    state: normalized.state,
    envelope,
    report: makeReport({
      found: true,
      hasData: true,
      source:
        hasEnvelopeState && finite(raw.schemaVersion) ? "versioned" : "legacy",
      migrated:
        !finite(raw.schemaVersion) ||
        raw.schemaVersion < WORLD_SAVE_SCHEMA_VERSION,
      corrected: normalized.corrected,
      revision: storedRevision,
      updatedAt,
      slotId: storedSlot,
      profileMismatch,
      warning: profileMismatch
        ? "A assinatura do perfil mudou, mas o slot estável foi mantido."
        : normalized.corrected > 0
          ? "Alguns valores inválidos foram substituídos por defaults seguros."
          : null,
    }),
  };
};

/** Lê uma string/objeto já obtido de localStorage, Supabase ou teste. */
export function readWorldSaveValue<TState>(
  value: unknown,
  fresh: TState,
  profileKey?: string,
  slotId?: string
): WorldSaveReadResult<TState> {
  return parsePayload(value, fresh, profileKey, slotId);
}

/**
 * API de hidratação. `profileKey` é diagnóstico; `slotId` é a identidade
 * estável. Um nome/assinatura diferente nunca invalida um slot compatível.
 */
export function readWorldSave<TState>(
  storage: StorageLike | null | undefined,
  key: string,
  fresh: TState,
  profileKey?: string,
  slotId?: string
): WorldSaveReadResult<TState> {
  if (!storage || !key) {
    return {
      world: cloneValue(fresh),
      state: cloneValue(fresh),
      envelope: null,
      report: makeReport({
        ok: false,
        source: "storage-error",
        warning: "Armazenamento indisponível; o mundo novo não foi salvo.",
        error: "storage-unavailable",
      }),
    };
  }
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch (error) {
    return {
      world: cloneValue(fresh),
      state: cloneValue(fresh),
      envelope: null,
      report: makeReport({
        ok: false,
        source: "storage-error",
        warning:
          "Não foi possível ler o save; o mundo atual foi preservado em memória.",
        error: String(error),
      }),
    };
  }
  if (raw === null) {
    return {
      world: cloneValue(fresh),
      state: cloneValue(fresh),
      envelope: null,
      report: makeReport({}),
    };
  }
  try {
    const result = parsePayload(JSON.parse(raw), fresh, profileKey, slotId);
    if (!result.report.ok && result.report.source === "invalid") {
      const backup = backupCorrupt(storage, key, raw);
      result.report.backupKey = backup.backupKey;
      result.report.warning = `${result.report.warning ?? "Save inválido detectado."} ${backup.warning}`;
    }
    return result;
  } catch (error) {
    const backup = backupCorrupt(storage, key, raw);
    return {
      world: cloneValue(fresh),
      state: cloneValue(fresh),
      envelope: null,
      report: makeReport({
        ok: false,
        found: true,
        source: "invalid",
        warning: `JSON inválido. ${backup.warning}`,
        backupKey: backup.backupKey,
        error: String(error),
      }),
    };
  }
}

const emitSaveUpdated = <TState>(
  key: string,
  envelope: SaveEnvelope<TState>
) => {
  if (
    typeof window === "undefined" ||
    typeof window.dispatchEvent !== "function"
  )
    return;
  if (typeof CustomEvent === "undefined") return;
  const detail: SaveUpdatedDetail<TState> = {
    key,
    slotId: typeof envelope.slotId === "string" ? envelope.slotId : null,
    profile: typeof envelope.profile === "string" ? envelope.profile : null,
    revision: envelope.revision,
    updatedAt: envelope.updatedAt,
    state: envelope.state,
    envelope,
  };
  window.dispatchEvent(
    new CustomEvent<SaveUpdatedDetail<TState>>(SAVE_UPDATED_EVENT, { detail })
  );
};

/**
 * Serializa e grava sem deixar exceções escaparem para o RAF. A gravação é
 * aditiva e preserva os campos desconhecidos do envelope anterior.
 */
export function safePersistWorld<TState>(
  storage: StorageLike | null | undefined,
  key: string,
  state: TState,
  profileKey?: string,
  slotId?: string,
  options: PersistWorldOptions = {}
): PersistWorldResult<TState> {
  if (!storage || !key) {
    return {
      ok: false,
      changed: false,
      pending: true,
      revision: 0,
      updatedAt: null,
      envelope: null,
      warning: "Armazenamento indisponível; o save permanece pendente.",
      backupKey: null,
      error: "storage-unavailable",
    };
  }

  let previous: SaveEnvelope<unknown> | null = null;
  let previousRaw: string | null = null;
  try {
    previousRaw = storage.getItem(key);
    if (previousRaw !== null) {
      const parsed = JSON.parse(previousRaw);
      if (!isRecord(parsed)) throw new TypeError("envelope inválido");
      previous = parsed as SaveEnvelope<unknown>;
    }
  } catch (error) {
    const backup =
      previousRaw === null
        ? { backupKey: null, warning: null }
        : backupCorrupt(storage, key, previousRaw);
    return {
      ok: false,
      changed: false,
      pending: true,
      revision: 0,
      updatedAt: null,
      envelope: null,
      warning:
        backup.warning ??
        "Não foi possível ler o save anterior; a gravação foi cancelada para preservar os dados.",
      backupKey: backup.backupKey,
      error: String(error),
    };
  }

  if (previous && hasOwn(previous, "state") && !isRecord(previous.state)) {
    const backup =
      previousRaw === null
        ? { backupKey: null, warning: null }
        : backupCorrupt(storage, key, previousRaw);
    return {
      ok: false,
      changed: false,
      pending: true,
      revision: finite(previous.revision)
        ? Math.max(0, Math.floor(previous.revision))
        : 0,
      updatedAt:
        typeof previous.updatedAt === "string" ? previous.updatedAt : null,
      envelope: previous as SaveEnvelope<TState>,
      warning:
        `O save anterior é inválido; a gravação foi cancelada para preservar os dados. ${backup.warning ?? ""}`.trim(),
      backupKey: backup.backupKey,
      error: "previous-state-invalid",
    };
  }
  if (
    previous &&
    slotId &&
    typeof previous.slotId === "string" &&
    previous.slotId !== slotId
  ) {
    return {
      ok: false,
      changed: false,
      pending: true,
      revision: finite(previous.revision)
        ? Math.max(0, Math.floor(previous.revision))
        : 0,
      updatedAt:
        typeof previous.updatedAt === "string" ? previous.updatedAt : null,
      envelope: previous as SaveEnvelope<TState>,
      warning:
        "O save anterior pertence a outro slot; a gravação foi cancelada.",
      backupKey: null,
      error: "previous-slot-mismatch",
    };
  }

  let encodedState: unknown;
  try {
    const previousState =
      previous && hasOwn(previous, "state")
        ? stripTransientState(reviveSets(previous.state))
        : undefined;
    const incomingState = stripTransientState(state);
    const mergedState =
      previousState === undefined
        ? incomingState
        : mergeValues(previousState, incomingState);
    encodedState = encodeSets(mergedState);
    // Testa ciclos e valores não serializáveis antes de tocar no storage.
    JSON.stringify(encodedState);
  } catch (error) {
    return {
      ok: false,
      changed: false,
      pending: true,
      revision: previous && finite(previous.revision) ? previous.revision : 0,
      updatedAt: previous?.updatedAt ?? null,
      envelope: previous as SaveEnvelope<TState> | null,
      warning: "Estado não serializável; o save anterior foi preservado.",
      backupKey: null,
      error: String(error),
    };
  }

  const previousState =
    previous && hasOwn(previous, "state") ? previous.state : null;
  let changed = true;
  try {
    changed =
      stableStringify(reviveSets(previousState)) !==
      stableStringify(reviveSets(encodedState));
  } catch {
    changed = true;
  }
  const currentRevision =
    previous && finite(previous.revision)
      ? Math.max(0, Math.floor(previous.revision))
      : 0;
  const needsMigration =
    previous !== null &&
    (!finite(previous.schemaVersion) ||
      previous.schemaVersion < WORLD_SAVE_SCHEMA_VERSION ||
      typeof previous.updatedAt !== "string" ||
      typeof previous.slotId !== "string");
  const requestedRevision =
    options.revision === undefined
      ? undefined
      : Math.max(0, Math.floor(options.revision));
  const previousUpdatedAt =
    typeof previous?.updatedAt === "string" ? previous.updatedAt : null;
  const requestedUpdatedAt = options.updatedAt;
  const previousTime = previousUpdatedAt ? Date.parse(previousUpdatedAt) : 0;
  const requestedTime = requestedUpdatedAt ? Date.parse(requestedUpdatedAt) : 0;
  const metadataChange =
    (requestedRevision !== undefined && requestedRevision > currentRevision) ||
    (requestedUpdatedAt !== undefined &&
      requestedUpdatedAt !== previousUpdatedAt &&
      (requestedTime === 0 ||
        previousTime === 0 ||
        requestedTime > previousTime));
  if (!changed && !needsMigration && !metadataChange) {
    return {
      ok: true,
      changed: false,
      pending: false,
      revision: currentRevision,
      updatedAt: previous?.updatedAt ?? null,
      envelope: previous as SaveEnvelope<TState> | null,
      warning: null,
      backupKey: null,
      error: null,
    };
  }

  // Uma mutação persistível sempre avança; uma revisão remota explícita nunca
  // consegue rebaixar a revisão que já está no cache local.
  const revision = Math.max(
    currentRevision,
    requestedRevision ?? 0,
    changed || needsMigration ? currentRevision + 1 : currentRevision
  );
  const updatedAt =
    requestedUpdatedAt !== undefined &&
    (requestedTime === 0 || previousTime === 0 || requestedTime >= previousTime)
      ? requestedUpdatedAt
      : (previousUpdatedAt ?? nowIso());
  const envelope = {
    ...(previous ?? {}),
    ...(profileKey !== undefined ? { profile: profileKey } : {}),
    ...(slotId !== undefined ? { slotId } : {}),
    schemaVersion: WORLD_SAVE_SCHEMA_VERSION,
    revision,
    updatedAt,
    state: encodedState,
  } as SaveEnvelope<TState>;

  let serialized: string;
  try {
    serialized = JSON.stringify(envelope);
  } catch (error) {
    return {
      ok: false,
      changed,
      pending: true,
      revision: currentRevision,
      updatedAt: previous?.updatedAt ?? null,
      envelope: previous as SaveEnvelope<TState> | null,
      warning: "Estado não serializável; o save anterior foi preservado.",
      backupKey: null,
      error: String(error),
    };
  }
  try {
    storage.setItem(key, serialized);
  } catch (error) {
    return {
      ok: false,
      changed,
      pending: true,
      revision: currentRevision,
      updatedAt: previous?.updatedAt ?? null,
      envelope: previous as SaveEnvelope<TState> | null,
      warning:
        "Não foi possível gravar o save (quota ou permissão); o progresso permanece pendente.",
      backupKey: null,
      error: String(error),
    };
  }
  emitSaveUpdated(key, envelope);
  return {
    ok: true,
    changed,
    pending: false,
    revision,
    updatedAt,
    envelope,
    warning: null,
    backupKey: null,
    error: null,
  };
}

const reportTime = (report: SaveReport) => {
  if (!report.updatedAt) return 0;
  const time = Date.parse(report.updatedAt);
  return Number.isFinite(time) ? time : 0;
};

/** Retorna verdadeiro quando `candidate` é o snapshot mais recente. */
export const isSaveNewer = (candidate: SaveReport, other: SaveReport) => {
  if (!candidate.hasData) return false;
  if (!other.hasData) return true;
  if (candidate.revision !== other.revision)
    return candidate.revision > other.revision;
  return reportTime(candidate) > reportTime(other);
};

export type WorldSaveAdapterOptions<TState> = {
  storage: StorageLike | null | undefined;
  key: string;
  profileKey?: string;
  slotId?: string;
  delayMs?: number;
  maxRetryAttempts?: number;
  onPersist?: (result: PersistWorldResult<TState>) => void;
};

/**
 * Adaptador explícito: `markDirty` só agenda o debounce; não serializa no
 * frame. Falhas ficam pendentes e usam retries limitados com backoff, nunca
 * um loop recursivo sem limite.
 */
export class WorldSaveAdapter<TState> {
  private readonly options: WorldSaveAdapterOptions<TState>;
  private pendingState: TState | null = null;
  private dirty = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private retryAttempt = 0;
  private disposed = false;

  constructor(options: WorldSaveAdapterOptions<TState>) {
    this.options = { delayMs: 1500, maxRetryAttempts: 5, ...options };
  }

  private clearTimer() {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private schedule(delayMs: number) {
    if (this.disposed || this.timer !== null) return;
    this.timer = setTimeout(
      () => {
        this.timer = null;
        this.flush();
      },
      Math.max(0, delayMs)
    );
  }

  private scheduleRetry() {
    const maxRetries = Math.max(0, this.options.maxRetryAttempts ?? 5);
    if (this.retryAttempt >= maxRetries) return;
    const delay = Math.min(30_000, 1_000 * 2 ** this.retryAttempt);
    this.retryAttempt += 1;
    this.schedule(delay);
  }

  markDirty(state: TState, changed = true) {
    if (this.disposed || !changed) return false;
    this.pendingState = state;
    this.dirty = true;
    this.retryAttempt = 0;
    this.clearTimer();
    this.schedule(this.options.delayMs ?? 1500);
    return true;
  }

  private flushInternal(
    allowRetry: boolean
  ): PersistWorldResult<TState> | null {
    if (!this.dirty || this.pendingState === null) return null;
    this.clearTimer();
    const result = safePersistWorld(
      this.options.storage,
      this.options.key,
      this.pendingState,
      this.options.profileKey,
      this.options.slotId
    );
    try {
      this.options.onPersist?.(result);
    } catch {
      // Observabilidade não pode quebrar o caminho de persistência.
    }
    if (result.ok) {
      this.dirty = false;
      this.pendingState = null;
      this.retryAttempt = 0;
    } else if (allowRetry) {
      this.scheduleRetry();
    }
    return result;
  }

  flush(): PersistWorldResult<TState> | null {
    return this.flushInternal(true);
  }

  installGuards() {
    return installSaveGuards(this);
  }

  dispose(flush = true) {
    this.clearTimer();
    if (flush) this.flushInternal(false);
    else {
      this.pendingState = null;
      this.dirty = false;
    }
    this.disposed = true;
  }
}

export function installSaveGuards<TState>(
  adapter: Pick<WorldSaveAdapter<TState>, "flush">
) {
  if (typeof window === "undefined") return () => undefined;
  const flush = () => {
    try {
      adapter.flush();
    } catch {
      // O guard nunca pode interromper pagehide/visibilitychange.
    }
  };
  const onVisibility = () => {
    if (document.visibilityState === "hidden") flush();
  };
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    window.removeEventListener("pagehide", flush);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
