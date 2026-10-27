import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WorldSaveAdapter,
  isSaveNewer,
  readWorldSave,
  readWorldSaveValue,
  safePersistWorld,
  type StorageLike,
} from "./saveCodec";

type TestWorld = {
  player: {
    x: number;
    y: number;
    health: number;
    maxHealth: number;
    focus: number;
    maxFocus: number;
    level: number;
    xp: number;
    essence: number;
    potions: number;
    attack: number;
    invulnerable: number;
  };
  region: string;
  unlockedRegions: string[];
  gathered: Set<string>;
  openedChests: Set<string>;
  enemies: Array<{
    id: string;
    x: number;
    y: number;
    health: number;
    maxHealth: number;
    alive: boolean;
    phase: number;
    hurt: number;
    customQuestFlag?: string;
  }>;
  resources: { wood: number; ore: number; food: number; gold: number };
  quests: Record<string, unknown>;
  inventory: { items: Record<string, number>; newField: string };
  customUnknown: { nested: boolean };
};

const freshWorld = (): TestWorld => ({
  player: {
    x: 20,
    y: 20,
    health: 100,
    maxHealth: 100,
    focus: 50,
    maxFocus: 50,
    level: 1,
    xp: 0,
    essence: 0,
    potions: 2,
    attack: 0,
    invulnerable: 0,
  },
  region: "vila",
  unlockedRegions: ["vila"],
  gathered: new Set(),
  openedChests: new Set(),
  enemies: [],
  resources: { wood: 20, ore: 8, food: 12, gold: 15 },
  quests: { "queste-novas": { progresso: 2 } },
  inventory: { items: { poção: 2 }, newField: "preservar" },
  customUnknown: { nested: true },
});

class FakeStorage implements StorageLike {
  readonly values = new Map<string, string>();
  failWrites = false;
  failReads = false;

  getItem(key: string) {
    if (this.failReads) throw new Error("security error");
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error("QuotaExceededError");
    this.values.set(key, value);
  }
}

describe("saveCodec", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("faz round-trip versionado, mantém Sets e campos novos/desconhecidos", () => {
    const storage = new FakeStorage();
    const state = freshWorld();
    state.gathered.add("root-1");
    state.openedChests.add("chest-1");
    state.enemies.push({
      id: "lobo-1",
      x: 3,
      y: 4,
      health: 8,
      maxHealth: 10,
      alive: true,
      phase: 12,
      hurt: 0.4,
      customQuestFlag: "novo",
    });

    const saved = safePersistWorld(
      storage,
      "aetherion-world-v2:slot-a",
      state,
      "humano:vigil:origem:Eco",
      "slot-a"
    );

    expect(saved.ok).toBe(true);
    expect(saved.revision).toBe(1);
    expect(saved.envelope?.schemaVersion).toBe(2);
    const stored = JSON.parse(storage.values.get("aetherion-world-v2:slot-a")!);
    expect(stored.state.player.attack).toBeUndefined();
    expect(stored.state.player.invulnerable).toBeUndefined();
    expect(stored.state.enemies[0].phase).toBeUndefined();
    expect(stored.state.enemies[0].customQuestFlag).toBe("novo");

    const loaded = readWorldSave(
      storage,
      "aetherion-world-v2:slot-a",
      freshWorld(),
      "outra-assinatura",
      "slot-a"
    );
    expect(loaded.report.source).toBe("versioned");
    expect(loaded.report.profileMismatch).toBe(true);
    expect(loaded.state.gathered).toBeInstanceOf(Set);
    expect(loaded.state.gathered.has("root-1")).toBe(true);
    expect(loaded.state.openedChests.has("chest-1")).toBe(true);
    expect(loaded.state.quests["queste-novas"]).toEqual({ progresso: 2 });
    expect(loaded.state.inventory.newField).toBe("preservar");
    expect(loaded.state.customUnknown.nested).toBe(true);
  });

  it("migra envelope legado sem invalidar slot por mudança de perfil", () => {
    const storage = new FakeStorage();
    const legacyState = freshWorld();
    legacyState.gathered = new Set(["legacy-root"]);
    storage.values.set(
      "aetherion-world-v2:slot-a",
      JSON.stringify({
        profile: "assinatura-antiga",
        state: {
          ...legacyState,
          gathered: ["legacy-root"],
          inventory: { items: { relíquia: 1 }, conteúdoNovo: true },
        },
      })
    );

    const loaded = readWorldSave(
      storage,
      "aetherion-world-v2:slot-a",
      freshWorld(),
      "assinatura-atual",
      "slot-a"
    );
    expect(loaded.report.source).toBe("legacy");
    expect(loaded.report.migrated).toBe(true);
    expect(loaded.report.profileMismatch).toBe(true);
    expect(loaded.state.gathered).toBeInstanceOf(Set);
    expect(loaded.state.inventory.conteúdoNovo).toBe(true);

    const migrated = safePersistWorld(
      storage,
      "aetherion-world-v2:slot-a",
      loaded.state,
      "assinatura-atual",
      "slot-a",
      { revision: loaded.report.revision }
    );
    expect(migrated.ok).toBe(true);
    expect(migrated.envelope?.schemaVersion).toBe(2);
    expect(migrated.envelope?.slotId).toBe("slot-a");
    expect(migrated.envelope?.profile).toBe("assinatura-atual");
  });

  it("isola dois slots mesmo compartilhando a mesma conta", () => {
    const storage = new FakeStorage();
    const first = freshWorld();
    first.region = "floresta";
    const second = freshWorld();
    second.region = "montanha";

    expect(
      safePersistWorld(
        storage,
        "aetherion-world-v2:slot-a",
        first,
        "p-a",
        "slot-a"
      ).ok
    ).toBe(true);
    expect(
      safePersistWorld(
        storage,
        "aetherion-world-v2:slot-b",
        second,
        "p-b",
        "slot-b"
      ).ok
    ).toBe(true);

    const loadedA = readWorldSave(
      storage,
      "aetherion-world-v2:slot-a",
      freshWorld(),
      "p-a",
      "slot-a"
    );
    const loadedB = readWorldSave(
      storage,
      "aetherion-world-v2:slot-b",
      freshWorld(),
      "p-b",
      "slot-b"
    );
    expect(loadedA.state.region).toBe("floresta");
    expect(loadedB.state.region).toBe("montanha");
    expect(loadedA.report.slotId).toBe("slot-a");
    expect(loadedB.report.slotId).toBe("slot-b");
  });

  it("preserva backup e avisa quando o JSON está corrompido", () => {
    const storage = new FakeStorage();
    const key = "aetherion-world-v2:slot-a";
    storage.values.set(key, "{ json quebrado");

    const result = readWorldSave(storage, key, freshWorld(), "p", "slot-a");
    expect(result.report.ok).toBe(false);
    expect(result.report.source).toBe("invalid");
    expect(result.report.backupKey).toContain(`${key}:backup:`);
    expect(storage.values.get(key)).toBe("{ json quebrado");
    expect(storage.values.get(result.report.backupKey!)).toBe(
      "{ json quebrado"
    );
    expect(result.report.warning).toContain("JSON inválido");
  });

  it("preserva payload válido inválido e não reseta silenciosamente", () => {
    const storage = new FakeStorage();
    const key = "aetherion-world-v2:slot-a";
    storage.values.set(
      key,
      JSON.stringify({ state: null, desconhecido: "sim" })
    );

    const result = readWorldSave(storage, key, freshWorld(), "p", "slot-a");
    expect(result.report.ok).toBe(false);
    expect(result.report.backupKey).not.toBeNull();
    expect(result.report.warning).toContain("preservado");
    expect(storage.values.get(key)).toContain('"state":null');
  });

  it("captura quota/security sem substituir o save anterior", () => {
    const storage = new FakeStorage();
    const key = "aetherion-world-v2:slot-a";
    const old = JSON.stringify({ profile: "p", state: freshWorld() });
    storage.values.set(key, old);
    storage.failWrites = true;

    const result = safePersistWorld(storage, key, freshWorld(), "p", "slot-a");
    expect(result.ok).toBe(false);
    expect(result.pending).toBe(true);
    expect(result.warning).toContain("quota");
    expect(storage.values.get(key)).toBe(old);

    storage.failWrites = false;
    storage.failReads = true;
    const read = readWorldSave(storage, key, freshWorld(), "p", "slot-a");
    expect(read.report.source).toBe("storage-error");
    expect(read.report.warning).toContain("ler o save");
  });

  it("escolhe a revisão mais nova e evita conflito regressivo", () => {
    const storage = new FakeStorage();
    const key = "aetherion-world-v2:slot-a";
    const first = safePersistWorld(storage, key, freshWorld(), "p", "slot-a");
    expect(first.revision).toBe(1);
    const newerState = freshWorld();
    newerState.region = "floresta";
    const second = safePersistWorld(storage, key, newerState, "p", "slot-a");
    expect(second.revision).toBe(2);

    const local = readWorldSave(storage, key, freshWorld(), "p", "slot-a");
    const remoteOld = readWorldSaveValue(
      { ...first.envelope!, state: first.envelope!.state },
      freshWorld(),
      "p",
      "slot-a"
    );
    expect(isSaveNewer(local.report, remoteOld.report)).toBe(true);
    expect(isSaveNewer(remoteOld.report, local.report)).toBe(false);
  });

  it("debounceia dirty e só serializa no flush", () => {
    vi.useFakeTimers();
    const storage = new FakeStorage();
    const adapter = new WorldSaveAdapter({
      storage,
      key: "aetherion-world-v2:slot-a",
      profileKey: "p",
      slotId: "slot-a",
      delayMs: 800,
    });
    const state = freshWorld();
    expect(adapter.markDirty(state)).toBe(true);
    expect(storage.values.size).toBe(0);
    vi.advanceTimersByTime(799);
    expect(storage.values.size).toBe(0);
    vi.advanceTimersByTime(1);
    expect(storage.values.size).toBe(1);
    adapter.dispose(false);
  });

  it("preserva Sets em campos desconhecidos, mas remove timers efêmeros", () => {
    const storage = new FakeStorage();
    const key = "aetherion-world-v2:slot-a";
    const state = {
      ...freshWorld(),
      questState: {
        completed: new Set(["queste-novas"]),
        transient: { timer: 2, value: "durável" },
      },
      inventory: {
        relics: new Set(["reliquia-raiz"]),
        cooldown: 8,
        items: { poção: 2 },
      },
      campaign: {
        choices: new Set(["proteger-vila"]),
        quests: { raiz: { state: "done", statusTimer: 12 } },
      },
    };

    expect(safePersistWorld(storage, key, state, "p", "slot-a").ok).toBe(true);
    const stored = JSON.parse(storage.values.get(key)!);
    expect(stored.state.questState.completed.__aetherionSet).toEqual([
      "queste-novas",
    ]);
    expect(stored.state.questState.transient.timer).toBeUndefined();
    expect(stored.state.inventory.cooldown).toBeUndefined();
    expect(stored.state.campaign.quests.raiz.statusTimer).toBeUndefined();

    const loaded = readWorldSave(storage, key, state, "p", "slot-a");
    expect(loaded.state.questState.completed).toBeInstanceOf(Set);
    expect(loaded.state.questState.completed.has("queste-novas")).toBe(true);
    expect(loaded.state.inventory.relics).toBeInstanceOf(Set);
    expect(loaded.state.campaign.choices).toBeInstanceOf(Set);
  });

  it("mantém revisão monotônica e só avança quando há dirty real", () => {
    const storage = new FakeStorage();
    const key = "aetherion-world-v2:slot-a";
    const first = safePersistWorld(storage, key, freshWorld(), "p", "slot-a");
    expect(first.revision).toBe(1);

    const unchanged = safePersistWorld(
      storage,
      key,
      freshWorld(),
      "p",
      "slot-a",
      {
        revision: 0,
        updatedAt: "2000-01-01T00:00:00.000Z",
      }
    );
    expect(unchanged.ok).toBe(true);
    expect(unchanged.changed).toBe(false);
    expect(unchanged.revision).toBe(1);

    const changedWorld = freshWorld();
    changedWorld.region = "floresta";
    const second = safePersistWorld(storage, key, changedWorld, "p", "slot-a", {
      revision: 1,
      updatedAt: "2000-01-01T00:00:00.000Z",
    });
    expect(second.revision).toBe(2);
    expect(second.envelope?.updatedAt).toBe(first.envelope?.updatedAt);
    expect(second.envelope?.updatedAt).not.toBe("2000-01-01T00:00:00.000Z");
  });

  it("reencaminha quota com backoff limitado, sem loop infinito", () => {
    vi.useFakeTimers();
    const storage = new FakeStorage();
    storage.failWrites = true;
    const results: boolean[] = [];
    const adapter = new WorldSaveAdapter({
      storage,
      key: "aetherion-world-v2:slot-a",
      profileKey: "p",
      slotId: "slot-a",
      delayMs: 10,
      maxRetryAttempts: 2,
      onPersist: result => results.push(result.ok),
    });

    adapter.markDirty(freshWorld());
    vi.advanceTimersByTime(10);
    vi.advanceTimersByTime(1_000);
    vi.advanceTimersByTime(2_000);
    vi.runOnlyPendingTimers();
    expect(results).toEqual([false, false, false]);
    expect(storage.values.size).toBe(0);

    storage.failWrites = false;
    adapter.markDirty(freshWorld());
    vi.advanceTimersByTime(10);
    expect(results.at(-1)).toBe(true);
    expect(storage.values.size).toBe(1);
    adapter.dispose(false);
  });
});
