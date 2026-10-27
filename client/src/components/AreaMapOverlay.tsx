import { useEffect, useRef } from "react";

export type LocalMapMarkerType =
  | "player"
  | "npc"
  | "merchant"
  | "quest"
  | "blacksmith"
  | "shop"
  | "dungeon"
  | "poi"
  | "exit";

export type LocalMapMarker = {
  id: string;
  name: string;
  type: LocalMapMarkerType;
  /** Coordenadas normalizadas: 0..100 */
  x: number;
  y: number;
};

export type LocalMapArea = {
  id: string;
  name: string;
  kind: "village" | "biome" | "dungeon" | "poi" | "other";
  description?: string;
  markers: LocalMapMarker[];
};

export type WorldMapRegion = {
  id: string;
  name: string;
  x: number;
  y: number;
  unlocked?: boolean;
  current?: boolean;
};

export function normalizeMapCoordinate(value: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

export function normalizeMapMarker(marker: LocalMapMarker): LocalMapMarker {
  return {
    ...marker,
    x: normalizeMapCoordinate(marker.x),
    y: normalizeMapCoordinate(marker.y),
  };
}

export function normalizeWorldRegion(region: WorldMapRegion): WorldMapRegion {
  return {
    ...region,
    x: normalizeMapCoordinate(region.x),
    y: normalizeMapCoordinate(region.y),
  };
}

type Props = {
  open: boolean;
  view: "world" | "local";
  onViewChange: (view: "world" | "local") => void;
  onClose: () => void;
  currentRegionName: string;
  worldRegions: WorldMapRegion[];
  localArea?: LocalMapArea | null;
  playerX: number;
  playerY: number;
};

const markerIcon: Record<LocalMapMarkerType, string> = {
  player: "◆",
  npc: "●",
  merchant: "◆",
  quest: "!",
  blacksmith: "⚒",
  shop: "$",
  dungeon: "◆",
  poi: "✧",
  exit: "↗",
};

const markerLabel: Record<LocalMapMarkerType, string> = {
  player: "Você",
  npc: "NPC",
  merchant: "Mercador",
  quest: "Quest",
  blacksmith: "Ferreiro",
  shop: "Loja",
  dungeon: "Dungeon",
  poi: "Ponto de interesse",
  exit: "Saída",
};

const focusableSelector =
  "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

export default function AreaMapOverlay({
  open,
  view,
  onViewChange,
  onClose,
  currentRegionName,
  worldRegions,
  localArea,
  playerX,
  playerY,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const previousOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      if (previousOpenRef.current) restoreFocusRef.current?.focus();
      previousOpenRef.current = false;
      return;
    }
    previousOpenRef.current = true;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !overlayRef.current) return;
      const focusable = Array.from(
        overlayRef.current.querySelectorAll<HTMLElement>(focusableSelector)
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const normalizedWorldRegions = worldRegions.map(normalizeWorldRegion);
  const localMarkers = [
    ...(localArea?.markers ?? [])
      .filter(marker => marker.type !== "player")
      .map(normalizeMapMarker),
    {
      id: "__player__",
      name: "Você",
      type: "player" as const,
      x: normalizeMapCoordinate(playerX),
      y: normalizeMapCoordinate(playerY),
    },
  ];
  const title =
    view === "world"
      ? "Mapa de Aetherion · Mundo"
      : `Mapa local · ${localArea?.name ?? currentRegionName}`;
  const hasWorldData = normalizedWorldRegions.length > 0;
  const displayView = view === "world" && !hasWorldData ? "local" : view;

  return (
    <div
      ref={overlayRef}
      className="map-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-overlay-title"
    >
      <header className="map-overlay-header">
        <div>
          <strong id="map-overlay-title">Mapa de Aetherion</strong>
          <span aria-hidden="true">◆</span>
          <span>
            {displayView === "world"
              ? "Mundo"
              : (localArea?.name ?? currentRegionName)}
          </span>
        </div>
        <nav className="map-overlay-actions" aria-label="Modo do mapa">
          <button
            type="button"
            className={view === "world" ? "selected" : ""}
            aria-pressed={view === "world"}
            onClick={() => onViewChange("world")}
          >
            Mundo
          </button>
          {localArea && (
            <button
              type="button"
              className={view === "local" ? "selected" : ""}
              aria-pressed={view === "local"}
              onClick={() => onViewChange("local")}
            >
              Local
            </button>
          )}
          <button
            ref={closeButtonRef}
            type="button"
            className="map-overlay-close"
            onClick={onClose}
            aria-label="Fechar mapa"
          >
            Fechar
          </button>
        </nav>
      </header>

      <main className="map-overlay-main">
        {displayView === "world" ? (
          <section
            className="map-overlay-canvas"
            aria-label="Mapa mundial de Aetherion"
          >
            {hasWorldData ? (
              normalizedWorldRegions.map(region => (
                <div
                  key={region.id}
                  className={`map-world-region ${region.current ? "current" : ""} ${region.unlocked === false ? "locked" : ""}`}
                  style={{ left: `${region.x}%`, top: `${region.y}%` }}
                  title={region.name}
                >
                  <span aria-hidden="true">{region.current ? "◆" : "•"}</span>
                  <b>{region.name}</b>
                </div>
              ))
            ) : (
              <div className="map-overlay-empty" role="status">
                <strong>Atlas mundial aguardando dados do Eco</strong>
                <p>
                  O mapa local continua disponível. Quando o pai fornecer as
                  regiões reais, a troca para Mundo será atualizada por
                  <code>onViewChange</code>.
                </p>
              </div>
            )}
          </section>
        ) : (
          <section
            className="map-overlay-canvas local"
            aria-label={`Mapa local de ${currentRegionName}`}
          >
            {localMarkers.map(marker => (
              <div
                key={marker.id}
                className={`map-local-marker ${marker.type}`}
                style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                title={`${marker.name} — ${markerLabel[marker.type]}`}
              >
                <span aria-hidden="true">{markerIcon[marker.type]}</span>
                <b>{marker.name}</b>
              </div>
            ))}
            <p className="map-overlay-description">
              {localArea?.description ?? currentRegionName}
            </p>
          </section>
        )}

        <aside
          className="map-overlay-legend"
          aria-label={
            displayView === "world" ? "Legenda do mundo" : "Locais da área"
          }
        >
          <strong>{displayView === "world" ? "Legenda" : "Locais"}</strong>
          {displayView === "local" ? (
            <div className="map-legend-list">
              {localMarkers.map(marker => (
                <div key={marker.id}>
                  <span aria-hidden="true">{markerIcon[marker.type]}</span>
                  <span>{marker.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="map-legend-list">
              <div>
                <span aria-hidden="true">◆</span>
                <span>Região atual</span>
              </div>
              <div>
                <span aria-hidden="true">•</span>
                <span>Região/área</span>
              </div>
              <p>Áreas bloqueadas aparecem apagadas.</p>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
