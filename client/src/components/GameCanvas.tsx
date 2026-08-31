/** Linha dos Ecos — o componente antigo agora entrega a experiência RPG 2D completa. */
import RpgGame, { type CharacterProfile } from "./RpgGame";
import RpgWorldCanvas from "./RpgWorldCanvas";

const qaProfile: CharacterProfile = {
  raceId: "human",
  classId: "warden",
  originId: "exile",
  name: "Eco de QA",
};

export default function GameCanvas() {
  const qaMap = import.meta.env.DEV && new URLSearchParams(window.location.search).get("qa-map") === "1";
  if (qaMap) {
    return <RpgWorldCanvas profile={qaProfile} slotId="qa-map-preview" onReturnToCreation={() => undefined} onLogout={() => undefined} />;
  }
  return <RpgGame />;
}
