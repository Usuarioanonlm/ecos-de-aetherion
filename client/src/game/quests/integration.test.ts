import { describe, expect, it } from "vitest";
import {
  acceptQuest,
  claimQuestReward,
  createQuestState,
  dispatchQuestEvent,
  getQuestDefinition,
  selectQuestChoice,
  serializeQuestState,
  deserializeQuestState,
} from "./index";

const completeOpening = () => {
  let state = createQuestState();
  state = dispatchQuestEvent(state, {
    type: "kill",
    targetId: "wolf",
    amount: 3,
    regionId: "biome-floresta-de-elaris",
    eventId: "wolves",
  }).state;
  return dispatchQuestEvent(state, {
    type: "npc",
    targetId: "field-floresta-de-elaris-warden",
    regionId: "biome-floresta-de-elaris",
    eventId: "guardian",
  }).state;
};

describe("integração de missões com o mundo físico", () => {
  it("não aceita nem permite escolhas de uma missão principal bloqueada", () => {
    const state = createQuestState();
    expect(
      acceptQuest(state, "first-dragon").state.quests["first-dragon"].status
    ).toBe("locked");
    expect(
      selectQuestChoice(state, "silent-root", "follow-root").effects[0]?.type
    ).toBe("operação_ignorada");
  });

  it("não registra duas decisões incompatíveis no mesmo diálogo", () => {
    const first = selectQuestChoice(
      createQuestState(),
      "wolf-root",
      "defend-village"
    );
    const second = selectQuestChoice(first.state, "wolf-root", "ask-order");
    expect(second.state.campaign.choices).toEqual(["defend-village"]);
    expect(second.effects[0]?.type).toBe("operação_ignorada");
  });

  it("aplica reputação uma vez e preserva campanha no round-trip", () => {
    const claimed = claimQuestReward(completeOpening(), "wolf-root");
    expect(claimed.state.campaign.reputation["Vila de Musgo"]).toBeGreaterThan(
      0
    );
    const again = claimQuestReward(claimed.state, "wolf-root");
    expect(again.state.campaign.reputation).toEqual(
      claimed.state.campaign.reputation
    );
    const restored = deserializeQuestState(serializeQuestState(claimed.state));
    expect(restored.quests["wolf-root"].status).toBe("claimed");
    expect(restored.campaign.reputation).toEqual(
      claimed.state.campaign.reputation
    );
  });

  it("objetivos da vila apontam para caça física no bioma de saída", () => {
    const hunt = getQuestDefinition("vila-florentia-hunt")!;
    expect(hunt.regionId).toBe("settlement-vila-florentia");
    expect(hunt.objectives[0].regionId).toBe("biome-floresta-de-elaris");
    const chest = getQuestDefinition("vila-florentia-supply")!;
    expect(chest.objectives[0].type).toBe("chest");
    expect(chest.objectives[0].targetId).toBe("vila-florentia-chest");
  });

  it("backfill da sequência considera uma missão já concluída", () => {
    let state = completeOpening();
    state = dispatchQuestEvent(state, {
      type: "npc",
      targetId: "field-floresta-de-elaris-warden",
      regionId: "biome-floresta-de-elaris",
      eventId: "guardian-oath",
    }).state;
    state = dispatchQuestEvent(state, {
      type: "escort",
      targetId: "moss-village-route",
      regionId: "biome-floresta-de-elaris",
      eventId: "protected-route",
    }).state;
    expect(state.quests["village-oath"].status).toBe("completed");
    expect(state.quests["allied-banners"].status).toBe("active");
    expect(state.quests["allied-banners"].progress.bandeiras).toBe(1);
  });

  it("limita os históricos e continua deduplicando eventos recentes", () => {
    let state = createQuestState();
    for (let index = 0; index < 700; index += 1) {
      state = dispatchQuestEvent(state, {
        type: "kill",
        targetId: "wolf",
        amount: 1,
        regionId: "biome-floresta-de-elaris",
        eventId: `bounded-${index}`,
      }).state;
    }
    expect(state.processedEventIds.length).toBeLessThanOrEqual(512);
    expect(state.history.length).toBeLessThanOrEqual(256);
    const duplicate = dispatchQuestEvent(state, {
      type: "kill",
      targetId: "wolf",
      regionId: "biome-floresta-de-elaris",
      eventId: "bounded-699",
    });
    expect(duplicate.effects[0]).toMatchObject({
      type: "evento_ignorado",
      reason: "duplicado",
    });
  });

  it("preserva a recompensa e o progresso de uma missão legada", () => {
    const state = createQuestState({
      sideQuest: {
        id: "field-floresta-de-elaris-hunt",
        title: "Defesa antiga",
        summary: "Dissipe ameaças",
        target: 3,
        progress: 3,
        claimed: false,
        reward: { gold: 17, potions: 2, wood: 4, xp: 37 },
      },
    });
    const claim = claimQuestReward(state, "field-floresta-de-elaris-hunt");
    expect(claim.effects[0]).toMatchObject({
      type: "recompensa_recebida",
      reward: { gold: 17, xp: 37 },
    });
    const reward = claim.effects[0];
    if (reward.type === "recompensa_recebida") {
      expect(reward.reward.items).toContainEqual({
        itemId: "pocao-musgo",
        quantity: 2,
      });
      expect(reward.reward.items).toContainEqual({
        itemId: "madeira-viva",
        quantity: 4,
      });
    }
  });
});
