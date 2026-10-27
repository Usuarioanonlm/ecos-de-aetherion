import { describe, expect, it } from "vitest";
import {
  acceptQuest,
  claimQuestReward,
  createQuestState,
  deserializeQuestState,
  dispatchQuestEvent,
  selectQuestChoice,
  serializeQuestState,
} from "./index";

const event = (
  type: "kill" | "resource" | "region" | "find" | "npc",
  targetId: string,
  eventId: string,
  amount?: number,
  regionId?: string
) => ({ type, targetId, eventId, amount, regionId }) as const;

describe("reducer de quests", () => {
  it("separa kill de collect/resource e limita o progresso ao alvo", () => {
    const initial = createQuestState();
    const afterKill = dispatchQuestEvent(
      initial,
      event("kill", "wolf", "kill-1", 1, "biome-floresta-de-elaris")
    );
    const runtime = afterKill.state.quests["wolf-root"];

    expect(runtime.progress.lobos).toBe(1);
    expect(runtime.progress["falar-guardia-inicial"]).toBe(0);
    const wrongEvent = dispatchQuestEvent(
      afterKill.state,
      event("resource", "ore", "resource-ore-1", 10, "biome-floresta-de-elaris")
    );
    expect(wrongEvent.state.quests["wolf-root"].progress.lobos).toBe(1);
    expect(
      wrongEvent.state.quests["wolf-root"].progress["falar-guardia-inicial"]
    ).toBe(0);

    const completeKill = dispatchQuestEvent(
      wrongEvent.state,
      event("kill", "wolf", "kill-2", 10, "biome-floresta-de-elaris")
    );
    expect(completeKill.state.quests["wolf-root"].progress.lobos).toBe(3);
  });

  it("ignora o mesmo evento duas vezes e não paga recompensa em duplicidade", () => {
    const first = dispatchQuestEvent(
      createQuestState(),
      event("kill", "wolf", "same-kill", 1, "biome-floresta-de-elaris")
    );
    const second = dispatchQuestEvent(
      first.state,
      event("kill", "wolf", "same-kill", 1, "biome-floresta-de-elaris")
    );
    expect(second.effects).toEqual([
      { type: "evento_ignorado", eventId: "same-kill", reason: "duplicado" },
    ]);
    expect(second.state.quests["wolf-root"].progress.lobos).toBe(1);

    let state = first.state;
    for (const [id, payload] of [
      [
        "kill-2",
        event("kill", "wolf", "kill-2", 1, "biome-floresta-de-elaris"),
      ],
      [
        "kill-3",
        event("kill", "wolf", "kill-3", 1, "biome-floresta-de-elaris"),
      ],
      [
        "npc-1",
        event(
          "npc",
          "field-floresta-de-elaris-warden",
          "npc-1",
          1,
          "biome-floresta-de-elaris"
        ),
      ],
    ] as const) {
      void id;
      state = dispatchQuestEvent(state, payload).state;
    }
    expect(state.quests["wolf-root"].status).toBe("completed");
    const claimed = claimQuestReward(state, "wolf-root");
    expect(claimed.effects[0]?.type).toBe("recompensa_recebida");
    const claimedAgain = claimQuestReward(claimed.state, "wolf-root");
    expect(claimedAgain.effects).toEqual([
      { type: "recompensa_ja_recebida", questId: "wolf-root" },
    ]);
  });

  it("renova a diária pela chave UTC e bloqueia farm no mesmo dia", () => {
    const dayOne = Date.UTC(2026, 0, 10, 23, 59, 0);
    let state = createQuestState(undefined, dayOne);
    state = acceptQuest(state, "daily-rotas-do-eter", dayOne).state;
    state = dispatchQuestEvent(state, {
      ...event("kill", "wolf", "daily-kills", 3),
      occurredAt: dayOne,
    }).state;
    state = dispatchQuestEvent(state, {
      ...event(
        "region",
        "biome-floresta-de-elaris",
        "daily-region",
        1,
        "biome-floresta-de-elaris"
      ),
      occurredAt: dayOne,
    }).state;
    expect(state.quests["daily-rotas-do-eter"].status).toBe("completed");
    const claimed = claimQuestReward(state, "daily-rotas-do-eter", dayOne);
    expect(claimed.state.dailyClaimedKeys).toContain("2026-01-10");
    expect(
      acceptQuest(claimed.state, "daily-rotas-do-eter", dayOne).effects[0]
    ).toMatchObject({ type: "operação_ignorada" });

    const dayTwo = Date.UTC(2026, 0, 11, 0, 1, 0);
    const renewed = acceptQuest(claimed.state, "daily-rotas-do-eter", dayTwo);
    expect(renewed.state.dailyKey).toBe("2026-01-11");
    expect(renewed.state.quests["daily-rotas-do-eter"].status).toBe("active");
  });

  it("adapta quest/sideQuest legadas e preserva o round-trip serializado", () => {
    const legacy = createQuestState({
      quest: "Expulse os Lobos Primordiais da trilha norte",
      sideQuest: {
        id: "field-floresta-de-elaris-hunt",
        title: "Defesa de Floresta de Elaris",
        summary: "Dissipe ameaças",
        target: 3,
        progress: 2,
        claimed: false,
        reward: { gold: 20, potions: 1 },
      },
    });
    expect(legacy.trackedQuestId).toBe("wolf-root");
    expect(legacy.quests["wolf-root"].status).toBe("active");
    expect(legacy.quests["field-floresta-de-elaris-hunt"].status).toBe(
      "active"
    );
    expect(
      legacy.quests["field-floresta-de-elaris-hunt"].progress[
        "field-floresta-de-elaris-hunt-objetivo"
      ]
    ).toBe(2);

    const restored = deserializeQuestState(serializeQuestState(legacy));
    expect(restored.quests["wolf-root"].status).toBe("active");
    expect(
      restored.quests["field-floresta-de-elaris-hunt"].progress[
        "field-floresta-de-elaris-hunt-objetivo"
      ]
    ).toBe(2);
  });

  it("registra escolhas e libera a próxima missão principal quando a cadeia termina", () => {
    let state = createQuestState();
    state = dispatchQuestEvent(
      state,
      event("kill", "wolf", "chain-kill-1", 3, "biome-floresta-de-elaris")
    ).state;
    state = dispatchQuestEvent(
      state,
      event(
        "npc",
        "field-floresta-de-elaris-warden",
        "chain-npc",
        1,
        "biome-floresta-de-elaris"
      )
    ).state;
    state = claimQuestReward(state, "wolf-root").state;
    expect(state.quests["village-oath"].status).toBe("active");
    const choice = selectQuestChoice(state, "wolf-root", "defend-village");
    expect(choice.state.campaign.choices).toContain("defend-village");
    expect(choice.effects[0]).toMatchObject({ type: "escolha_registrada" });
  });
});
