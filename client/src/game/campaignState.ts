import { endingRequirements, quests, type EndingId, type QuestState } from "./campaign";

export type CampaignState = { quests: Record<string, QuestState>; choices: string[]; reputation: Record<string, number>; buildings: string[]; dragons: number; corruption: number };
export const initialCampaign = (): CampaignState => ({ quests: { "wolf-root": "active" }, choices: [], reputation: {}, buildings: [], dragons: 0, corruption: 0 });
export const resolveNextQuests = (state: CampaignState, questId: string) => { const quest = quests.find((item) => item.id === questId); if (!quest) return state; const next = { ...state.quests, [questId]: "completed" as QuestState }; quest.next.forEach((id) => { next[id] = "active"; }); return { ...state, quests: next }; };
export const availableEndings = (state: CampaignState): EndingId[] => (Object.keys(endingRequirements) as EndingId[]).filter((id) => {
  const requirement = endingRequirements[id].requires;
  return requirement.every((item) => item in state.quests ? state.quests[item] === "completed" : item === "dragões: 7" ? state.dragons >= 7 : item === "corrupção: 3" ? state.corruption >= 3 : item === "alianças: 3" ? Object.values(state.reputation).filter((value) => value >= 1).length >= 3 : item.includes(":") ? (state.reputation[item.split(":")[0]] ?? 0) >= Number(item.split(":")[1].trim()) : state.buildings.length >= 3);
});
