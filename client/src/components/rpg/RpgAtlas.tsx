import { useRef, useState, type PointerEvent } from "react";
import { atlasBiomes, dungeons, settlements } from "../../game/aetherionAtlas";
import {
  regions as worldRegions,
  type RegionId,
} from "../../game/worldContent";

type TravelPayment = "focus" | "gold";
export type AtlasTravel = {
  destination: RegionId;
  payment: TravelPayment;
};

export const atlasPositions: Record<string, { x: number; y: number }> = {
  "Floresta de Elaris": { x: 19, y: 34 },
  "Planícies de Arvend": { x: 38, y: 55 },
  "Deserto de Zahram": { x: 58, y: 72 },
  "Montanhas de Kharok": { x: 42, y: 20 },
  "Pântanos de Nymbra": { x: 65, y: 42 },
  "Costa de Velaris": { x: 84, y: 58 },
  "Terras Vulcânicas de Ignara": { x: 75, y: 24 },
  "Campos Gélidos de Norvak": { x: 58, y: 8 },
  "Arquipélago Celeste": { x: 88, y: 14 },
  "Vale das Almas": { x: 27, y: 78 },
  "O Vazio de Erebos": { x: 48, y: 89 },
};

export const atlasPoints = [
  { name: "Árvore dos Sussurros", biome: "Floresta de Elaris" },
  { name: "Ponte dos Antigos", biome: "Planícies de Arvend" },
  { name: "Templo Solar", biome: "Deserto de Zahram" },
  { name: "Pedra do Dragão", biome: "Montanhas de Kharok" },
  { name: "Cemitério Esquecido", biome: "Vale das Almas" },
  { name: "Farol de Meridia", biome: "Costa de Velaris" },
  { name: "Observatório Celeste", biome: "Arquipélago Celeste" },
  { name: "Portal de Éter", biome: "O Vazio de Erebos" },
] as const;

export const regionalProspects: Record<
  string,
  { resources: string; rewards: string }
> = {
  forest: {
    resources: "Madeira viva, ervas de musgo e essência verde",
    rewards: "poções de musgo, núcleos naturais e relíquias de raiz",
  },
  plains: {
    resources: "Grãos, couro, madeira de caravana e essência",
    rewards: "ouro de rota, armas antigas e suprimentos",
  },
  desert: {
    resources: "Cristais solares, minério de vidro e essência seca",
    rewards: "máscaras arcanas, runas e tesouros soterrados",
  },
  mountain: {
    resources: "Minério rúnico, pedra e cristais de gelo",
    rewards: "armas de forja, armaduras e selos dracônicos",
  },
  swamp: {
    resources: "Ervas de névoa, glândulas de Éter e madeira úmida",
    rewards: "elixires, amuletos espirituais e presas ancestrais",
  },
  coast: {
    resources: "Pérolas, relíquias de maré e madeira flutuante",
    rewards: "núcleos de maré, mapas náuticos e bênçãos do farol",
  },
  volcanic: {
    resources: "Obsidiana, cinza viva e minério negro",
    rewards: "armaduras de guerra, brasas de Éter e estandartes",
  },
  frozen: {
    resources: "Cristais lunares, gelo rúnico e peles",
    rewards: "relíquias glaciais, talismãs e fragmentos de dragão",
  },
  sky: {
    resources: "Poeira estelar, plumas de harpia e essência aérea",
    rewards: "lentes celestes, mapas astrais e chaves de portal",
  },
  spirit: {
    resources: "Fragmentos espectrais, flores funerárias e ecos",
    rewards: "coroas perdidas, juramentos e relíquias necromânticas",
  },
  void: {
    resources: "Fragmentos do Vazio, matéria caótica e essência negra",
    rewards: "selos finais, artefatos do Arauto e chaves de ruptura",
  },
};

const travelCost = (region: { tier: number }) => ({
  focus: 12 + region.tier * 4,
  gold: 5 + region.tier * 3,
});

type AtlasDetailsProps = {
  currentRegion: RegionId;
  unlockedRegions: RegionId[];
  focus: number;
  gold: number;
};

function AtlasDetails({
  currentRegion,
  unlockedRegions,
  focus,
  gold,
}: AtlasDetailsProps) {
  const current =
    worldRegions[currentRegion] ?? worldRegions[unlockedRegions[0]];
  const discovered = new Set(
    unlockedRegions.map(id => worldRegions[id]?.biomeName).filter(Boolean)
  );
  const [zoom, setZoom] = useState(1);
  const [focusBiome, setFocusBiome] = useState(
    current?.biomeName ?? atlasBiomes[0].name
  );
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [pendingTravel, setPendingTravel] = useState<RegionId | null>(null);
  const [payment, setPayment] = useState<TravelPayment>("focus");
  const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const ignoreNodeClick = useRef(false);
  const focused =
    atlasBiomes.find(biome => biome.name === focusBiome) ?? atlasBiomes[0];
  const focusedPosition = atlasPositions[focused.name] ?? { x: 50, y: 50 };
  const destination = unlockedRegions.find(
    id =>
      worldRegions[id]?.mapKind === "biome" &&
      worldRegions[id]?.biomeName === focusBiome
  );
  const selectedRegion = destination ? worldRegions[destination] : undefined;
  const pendingRegion = pendingTravel ? worldRegions[pendingTravel] : undefined;
  const pendingCost = pendingRegion ? travelCost(pendingRegion) : null;
  const canPay = pendingCost
    ? payment === "focus"
      ? focus >= pendingCost.focus
      : gold >= pendingCost.gold
    : false;
  const prospects = pendingRegion
    ? regionalProspects[pendingRegion.biome]
    : null;

  const setAtlasZoom = (next: number) => {
    setZoom(next);
    setPan({ x: 0, y: 0 });
  };

  const beginDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    };
  };

  const dragMap = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const limitX = 150 * (zoom - 1);
    const limitY = 110 * (zoom - 1);
    const nextX = Math.max(
      -limitX,
      Math.min(
        limitX,
        dragRef.current.originX + event.clientX - dragRef.current.startX
      )
    );
    const nextY = Math.max(
      -limitY,
      Math.min(
        limitY,
        dragRef.current.originY + event.clientY - dragRef.current.startY
      )
    );
    if (
      Math.abs(nextX - dragRef.current.originX) +
        Math.abs(nextY - dragRef.current.originY) >
      4
    )
      dragRef.current.moved = true;
    setPan({ x: nextX, y: nextY });
  };

  const endDrag = () => {
    if (!dragRef.current.active) return;
    const moved = dragRef.current.moved;
    dragRef.current.active = false;
    if (moved) {
      ignoreNodeClick.current = true;
      window.setTimeout(() => {
        ignoreNodeClick.current = false;
      }, 0);
    }
  };

  const confirmTravel = () => {
    if (pendingTravel && pendingTravel !== currentRegion && canPay)
      window.dispatchEvent(
        new CustomEvent<AtlasTravel>("aetherion:atlas-travel", {
          detail: { destination: pendingTravel, payment },
        })
      );
    setPendingTravel(null);
  };

  if (!current) return null;

  return (
    <section className="atlas-details">
      <div className="atlas-toolbar">
        <div>
          <b>AMPLIAÇÃO</b>
          <span>{Math.round(zoom * 100)}%</span>
        </div>
        <button
          type="button"
          aria-label="Diminuir zoom"
          disabled={zoom <= 1}
          onClick={() =>
            setAtlasZoom(Math.max(1, Number((zoom - 0.25).toFixed(2))))
          }
        >
          −
        </button>
        <button
          type="button"
          aria-label="Aumentar zoom"
          disabled={zoom >= 2}
          onClick={() =>
            setAtlasZoom(Math.min(2, Number((zoom + 0.25).toFixed(2))))
          }
        >
          +
        </button>
      </div>
      <div
        className={`atlas-map-viewport ${zoom > 1 ? "can-drag" : ""}`}
        onPointerDown={beginDrag}
        onPointerMove={dragMap}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        <div
          className="atlas-map-large"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: `${focusedPosition.x}% ${focusedPosition.y}%`,
          }}
          aria-label="Mapa ampliado de Aetherion"
        >
          <i className="atlas-route route-a" />
          <i className="atlas-route route-b" />
          <i className="atlas-route route-c" />
          <i className="atlas-route route-d" />
          <i className="atlas-route route-e" />
          {atlasBiomes.map(biome => {
            const position = atlasPositions[biome.name] ?? { x: 50, y: 50 };
            const known = discovered.has(biome.name);
            const here = current.biomeName === biome.name;
            const isFocused = focusBiome === biome.name;
            const biomeSettlements = settlements.filter(
              settlement => settlement.biome === biome.name
            );
            const biomeDungeons = dungeons.filter(
              dungeon => dungeon.biome === biome.name
            );
            const pois = atlasPoints.filter(
              point => point.biome === biome.name
            );
            return (
              <button
                type="button"
                key={biome.name}
                className={`atlas-node ${known ? "known" : "unknown"} ${here ? "current" : ""} ${isFocused ? "focused" : ""}`}
                aria-pressed={isFocused}
                onClick={() => {
                  if (!ignoreNodeClick.current) setFocusBiome(biome.name);
                }}
                style={{ left: `${position.x}%`, top: `${position.y}%` }}
              >
                <i className="atlas-node-core">
                  {here ? "◆" : known ? "●" : "○"}
                </i>
                <b>{biome.name}</b>
                <small>
                  R{biome.tier} · {known ? "explorado" : "rota selada"}
                </small>
                {here && <span className="atlas-mission">✦ MISSÃO ATIVA</span>}
                {biomeSettlements.map(settlement => (
                  <span
                    key={settlement.id}
                    className={`atlas-settlement ${settlement.kind}`}
                  >
                    ⌂ {settlement.name}
                  </span>
                ))}
                {biomeDungeons.slice(0, 2).map(dungeon => (
                  <span key={dungeon.id} className="atlas-dungeon">
                    ◇ {dungeon.name}
                  </span>
                ))}
                {pois.map(point => (
                  <span key={point.name} className="atlas-poi">
                    ✧ {point.name}
                  </span>
                ))}
              </button>
            );
          })}
          <span className="atlas-compass">
            ✦<small>N</small>
          </span>
          <span className="atlas-you">VOCÊ · {current.name}</span>
        </div>
      </div>
      <div className="atlas-key">
        <span>
          <i className="key-you" /> posição atual
        </span>
        <span>
          <i className="key-known" /> região explorada
        </span>
        <span>
          <i className="key-unknown" /> rota selada
        </span>
        <span>
          <i className="key-settlement" /> vila / cidade
        </span>
        <span>
          <i className="key-dungeon" /> dungeon
        </span>
        <span>
          <i className="key-mission" /> missão
        </span>
        <span>
          <i className="key-poi" /> ponto de interesse
        </span>
      </div>
      <article className="atlas-region-card">
        <small>
          {selectedRegion
            ? `DESTINO DESBLOQUEADO · R${selectedRegion.tier}`
            : `ROTA SELADA · R${focused.tier}`}
        </small>
        <b>{focused.name}</b>
        <p>{selectedRegion?.subtitle ?? focused.theme}</p>
        <span>
          {destination
            ? "Destino já explorado: você pode viajar diretamente."
            : "Atravesse as rotas físicas para revelar este destino."}
        </span>
        {destination && (
          <button
            type="button"
            className="atlas-travel-button"
            disabled={destination === currentRegion}
            onClick={() => setPendingTravel(destination)}
          >
            {destination === currentRegion
              ? "VOCÊ ESTÁ AQUI"
              : `VIAJAR PARA ${selectedRegion?.name.toUpperCase()} ↗`}
          </button>
        )}
      </article>
      {pendingRegion && pendingCost && prospects && (
        <section
          className="atlas-travel-confirm"
          role="dialog"
          aria-modal="true"
          aria-label={`Confirmar viagem para ${pendingRegion.name}`}
        >
          <p>CONFIRMAÇÃO DE VIAGEM RÁPIDA</p>
          <h3>{pendingRegion.name}</h3>
          <span>
            AMEAÇA · R{pendingRegion.tier} ·{" "}
            {pendingRegion.mapKind === "special"
              ? "região especial"
              : pendingRegion.mapKind === "final"
                ? "rota final"
                : "bioma"}
          </span>
          <div>
            <b>INIMIGOS POSSÍVEIS</b>
            <small>
              {pendingRegion.enemyNames.join(" · ") || "Sem ameaças conhecidas"}
              {pendingRegion.bossName
                ? ` · Boss: ${pendingRegion.bossName}`
                : ""}
            </small>
          </div>
          <div className="travel-prospects">
            <b>RECURSOS ENCONTRADOS</b>
            <small>{prospects.resources}</small>
            <b>RECOMPENSAS POSSÍVEIS</b>
            <small>{prospects.rewards}</small>
          </div>
          <div className="travel-payment">
            <b>CUSTO DE VIAGEM</b>
            <span>
              FOCO {Math.ceil(focus)}/{pendingCost.focus} · OURO {gold}/
              {pendingCost.gold}
            </span>
            <section>
              <button
                type="button"
                className={payment === "focus" ? "selected" : ""}
                onClick={() => setPayment("focus")}
              >
                USAR {pendingCost.focus} FOCO
              </button>
              <button
                type="button"
                className={payment === "gold" ? "selected" : ""}
                onClick={() => setPayment("gold")}
              >
                PAGAR {pendingCost.gold} OURO
              </button>
            </section>
            <em className={canPay ? "" : "insufficient"}>
              {canPay
                ? `Pagamento selecionado: ${payment === "focus" ? `${pendingCost.focus} de foco` : `${pendingCost.gold} de ouro`}.`
                : `Saldo insuficiente de ${payment === "focus" ? "foco" : "ouro"}.`}
            </em>
          </div>
          <footer>
            <button type="button" onClick={() => setPendingTravel(null)}>
              CANCELAR
            </button>
            <button type="button" disabled={!canPay} onClick={confirmTravel}>
              CONFIRMAR VIAGEM ↗
            </button>
          </footer>
        </section>
      )}
    </section>
  );
}

export type { TravelPayment };

export { AtlasDetails, travelCost };
