import React from "react";

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

export function normalizeMapCoordinate(value: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

type Props = {
  open: boolean;
  view: "world" | "local";
  onViewChange: (view: "world" | "local") => void;
  onClose: () => void;
  currentRegionName: string;
  worldRegions: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    unlocked?: boolean;
    current?: boolean;
  }>;
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
  if (!open) return null;

  const localMarkers = localArea
    ? [
        ...localArea.markers.filter((m) => m.type !== "player"),
        {
          id: "__player__",
          name: "Você",
          type: "player" as const,
          // O componente pai deve passar playerX/playerY já normalizados em 0..100.
          x: normalizeMapCoordinate(playerX),
          y: normalizeMapCoordinate(playerY),
        },
      ]
    : [];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(5, 7, 12, .94)",
        display: "flex",
        flexDirection: "column",
        color: "#f5f0df",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <header
        style={{
          minHeight: 64,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
          borderBottom: "1px solid rgba(255,255,255,.12)",
        }}
      >
        <strong style={{ fontSize: 20 }}>Mapa de Aetherion</strong>
        <span style={{ opacity: .7 }}>•</span>
        <span>{view === "world" ? "Mundo" : localArea?.name ?? currentRegionName}</span>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={() => onViewChange("world")}
            style={{
              padding: "9px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,.18)",
              background: view === "world" ? "rgba(255,255,255,.18)" : "transparent",
              color: "inherit",
            }}
          >
            Mundo
          </button>

          {localArea && (
            <button
              onClick={() => onViewChange("local")}
              style={{
                padding: "9px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,.18)",
                background: view === "local" ? "rgba(255,255,255,.18)" : "transparent",
                color: "inherit",
              }}
            >
              Local
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              padding: "9px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,.18)",
              background: "transparent",
              color: "inherit",
            }}
          >
            Fechar
          </button>
        </div>
      </header>

      <main style={{ flex: 1, minHeight: 0, padding: 16, display: "flex", gap: 16 }}>
        {view === "world" ? (
          <section
            style={{
              position: "relative",
              flex: 1,
              minHeight: 0,
              borderRadius: 14,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,.14)",
              background:
                "radial-gradient(circle at 50% 40%, #354c37 0, #1d2d25 38%, #111a1a 75%)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px)",
                backgroundSize: "5% 5%",
              }}
            />

            {worldRegions.map((region) => (
              <button
                key={region.id}
                title={region.name}
                style={{
                  position: "absolute",
                  left: `${region.x}%`,
                  top: `${region.y}%`,
                  transform: "translate(-50%, -50%)",
                  width: region.current ? 42 : 34,
                  height: region.current ? 42 : 34,
                  borderRadius: "50%",
                  border: region.current
                    ? "3px solid #fff2a8"
                    : "2px solid rgba(255,255,255,.5)",
                  background: region.unlocked === false ? "#34383a" : "#8d7044",
                  color: "#fff",
                  cursor: "default",
                  boxShadow: region.current
                    ? "0 0 0 8px rgba(255,242,168,.14)"
                    : "0 4px 14px rgba(0,0,0,.3)",
                }}
              >
                {region.current ? "◆" : "•"}
              </button>
            ))}

            {worldRegions.map((region) => (
              <div
                key={`${region.id}-label`}
                style={{
                  position: "absolute",
                  left: `${region.x}%`,
                  top: `calc(${region.y}% + 25px)`,
                  transform: "translateX(-50%)",
                  whiteSpace: "nowrap",
                  fontSize: 12,
                  textShadow: "0 2px 3px #000",
                  opacity: region.unlocked === false ? .45 : 1,
                }}
              >
                {region.name}
              </div>
            ))}
          </section>
        ) : (
          <section
            style={{
              position: "relative",
              flex: 1,
              minHeight: 0,
              borderRadius: 14,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,.14)",
              background:
                "radial-gradient(circle at 50% 50%, #756344 0, #4b4937 42%, #272c29 100%)",
            }}
          >
            {/* Grade para dar leitura de ruas/quadras enquanto o mapa local real é desenhado. */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)",
                backgroundSize: "5% 5%",
              }}
            />

            {localMarkers.map((marker) => (
              <div
                key={marker.id}
                title={`${marker.name} — ${markerLabel[marker.type]}`}
                style={{
                  position: "absolute",
                  left: `${marker.x}%`,
                  top: `${marker.y}%`,
                  transform: "translate(-50%, -50%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  pointerEvents: "none",
                }}
              >
                <span
                  style={{
                    width: marker.type === "player" ? 34 : 28,
                    height: marker.type === "player" ? 34 : 28,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    background:
                      marker.type === "player"
                        ? "#f4d35e"
                        : marker.type === "quest"
                          ? "#d7a62f"
                          : "rgba(15,18,20,.9)",
                    border: "2px solid rgba(255,255,255,.85)",
                    color: marker.type === "player" || marker.type === "quest" ? "#151515" : "#fff",
                    fontWeight: 800,
                    boxShadow: "0 3px 12px rgba(0,0,0,.4)",
                  }}
                >
                  {markerIcon[marker.type]}
                </span>
                <span
                  style={{
                    marginTop: 3,
                    padding: "2px 5px",
                    borderRadius: 4,
                    background: "rgba(0,0,0,.7)",
                    whiteSpace: "nowrap",
                    fontSize: 11,
                  }}
                >
                  {marker.name}
                </span>
              </div>
            ))}

            <div
              style={{
                position: "absolute",
                left: 12,
                bottom: 12,
                padding: "8px 10px",
                borderRadius: 8,
                background: "rgba(0,0,0,.68)",
                fontSize: 12,
              }}
            >
              {localArea?.description ?? currentRegionName}
            </div>
          </section>
        )}

        <aside
          style={{
            width: 250,
            maxWidth: "30vw",
            padding: 14,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(255,255,255,.045)",
            overflow: "auto",
          }}
        >
          <strong>{view === "world" ? "Legenda" : "Locais"}</strong>

          {view === "local" && localArea ? (
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {localArea.markers.map((marker) => (
                <div key={marker.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ width: 22, textAlign: "center" }}>{markerIcon[marker.type]}</span>
                  <span>{marker.name}</span>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ width: 22, textAlign: "center" }}>◆</span>
                <span>Você</span>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 12, lineHeight: 1.7, fontSize: 13 }}>
              <div>◆ Região atual</div>
              <div>• Região/área</div>
              <div style={{ opacity: .7 }}>Áreas bloqueadas aparecem apagadas.</div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
