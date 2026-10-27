import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { firstRegion, regions } from "../../game/worldContent";
import { AtlasDetails, travelCost } from "./RpgAtlas";
import { PlayerHud, QuestHud } from "./RpgHud";

describe("componentes RPG extraídos", () => {
  it("renderiza PlayerHud e QuestHud em SSR", () => {
    const markup = renderToStaticMarkup(
      <>
        <PlayerHud
          name="Eco"
          vocation="Arcanista"
          level={3}
          health={48}
          maxHealth={70}
          focus={24}
          maxFocus={40}
          xp={18}
          xpNext={120}
          gold={15}
          essence={2}
          status={{ label: "Protegido", tone: "positive" }}
          cooldown={{ label: "Éter", remaining: 0 }}
        />
        <QuestHud
          title="O Lobo e a Raiz"
          summary="Leve a essência à vila."
          progress="2/3"
          reward="40 ouro"
        />
      </>
    );

    expect(markup).toContain("Status de Eco");
    expect(markup).toContain("O Lobo e a Raiz");
    expect(markup).toContain("XP 18/120");
  });

  it("renderiza o atlas e preserva os custos regionais", () => {
    const markup = renderToStaticMarkup(
      <AtlasDetails
        currentRegion={firstRegion}
        unlockedRegions={[firstRegion]}
        focus={100}
        gold={20}
      />
    );

    expect(markup).toContain("Mapa ampliado de Aetherion");
    expect(markup).toContain(regions[firstRegion].name);
    expect(travelCost({ tier: 2 })).toEqual({ focus: 20, gold: 11 });
  });
});
