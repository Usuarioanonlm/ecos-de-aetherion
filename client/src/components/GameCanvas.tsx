/**
 * Ecos de Aetherion — Cartografia Viva.
 * Esta moldura apresenta instrumentos de exploração em placas de pergaminho sem encobrir a clareira.
 */
import { useEffect, useRef, useState } from "react";
import { Engine } from "@babylonjs/core/Engines/engine";
import { createGameScene, type GameHandle } from "../game/scene";
import { emblemUrl } from "../game/assetUrls";
import type { HudSnapshot } from "../game/types";

const initialHud: HudSnapshot = {
  health: 100,
  maxHealth: 100,
  essence: 0,
  wolvesDefeated: 0,
  wolvesTotal: 3,
  quest: "Expulse os lobos da clareira",
  notice: "O Éter pulsa sob seus pés.",
  traitUnlocked: false,
  completed: false,
};

function VitalBar({ value, max }: { value: number; max: number }) {
  return (
    <div className="vital-track" aria-label={`Vitalidade: ${value} de ${max}`}>
      <div className="vital-fill" style={{ width: `${Math.max(0, (value / max) * 100)}%` }} />
    </div>
  );
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);
  const [hud, setHud] = useState<HudSnapshot>(initialHud);
  const [showChronicle, setShowChronicle] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || startedRef.current) return;
    startedRef.current = true;

    const engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      adaptToDeviceRatio: true,
    });

    let handle: GameHandle | null = null;
    let cancelled = false;

    createGameScene(engine, canvas, (nextHud) => {
      if (!cancelled) setHud(nextHud);
    }).then((sceneHandle) => {
      if (cancelled) {
        sceneHandle.dispose();
        return;
      }
      handle = sceneHandle;
      engine.runRenderLoop(() => sceneHandle.scene.render());
    });

    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      handle?.dispose();
      engine.dispose();
      startedRef.current = false;
    };
  }, []);

  return (
    <main className="game-shell" aria-label="Ecos de Aetherion, prólogo jogável">
      <canvas ref={canvasRef} className="game-canvas" style={{ touchAction: "none" }} />

      <div className="cartography-layer" aria-hidden="true">
        <div className="engraved-border" />
        <div className="contour-field contour-field-a" />
        <div className="contour-field contour-field-b" />
        <div className="compass-rose"><span>✦</span><i>N</i><b>V</b><em>E</em><strong>S</strong></div>
        <div className="aether-scale"><span>ÉTER</span><i /><i /><i /></div>
      </div>

      <div className="hud-layer">
        <header className="game-titlebar">
          <div className="brand-lockup">
            <img className="brand-emblem" src={emblemUrl} alt="Emblema de Éter" />
            <div>
              <p className="eyebrow">CRÔNICA I · A GRANDE RUPTURA</p>
              <h1>ECOS DE AETHERION</h1>
            </div>
          </div>
          <div className="scene-badge"><span className="ether-dot" /> FLORESTA PRIMORDIAL</div>
        </header>

        <section className="vitals-panel hud-panel" aria-label="Estado do personagem">
          <p className="panel-kicker">FORMA ATUAL</p>
          <div className="vitals-heading">
            <span>Slime do Éter</span>
            <strong>Nv. 01</strong>
          </div>
          <VitalBar value={hud.health} max={hud.maxHealth} />
          <div className="vitals-meta"><span>Vitalidade</span><b>{hud.health}/{hud.maxHealth}</b></div>
          <div className="essence-row"><span>✦</span> Essência absorvida <b>{hud.essence}</b></div>
        </section>

        <section className="quest-panel hud-panel" aria-label="Objetivo atual">
          <p className="panel-kicker">ECO ATUAL</p>
          <h2>{hud.completed ? "A vila ainda respira" : hud.quest}</h2>
          <p>{hud.completed ? "Você protegeu a Vila de Musgo. O continente notou sua presença." : `${hud.wolvesDefeated}/${hud.wolvesTotal} lobos primordiais dissipados`}</p>
          <div className="quest-rule"><span /></div>
          <p className="notice-text">{hud.notice}</p>
        </section>

        {showChronicle && (
          <aside className="chronicle-panel hud-panel" aria-label="Introdução do prólogo">
            <button className="close-chronicle" onClick={() => setShowChronicle(false)} aria-label="Fechar introdução">×</button>
            <p className="panel-kicker">O DESPERTAR</p>
            <p>Quando a Árvore Primordial foi sacrificada, o Éter acordou tudo o que dormia. Você abriu os olhos entre raízes antigas — sem nome, mas não sem escolha.</p>
            <button className="chronicle-action" onClick={() => setShowChronicle(false)}>Entrar na clareira <span>↗</span></button>
          </aside>
        )}

        <section className="trait-panel hud-panel" aria-label="Traço conquistado">
          <p className="panel-kicker">EVOLUÇÃO</p>
          <div className={`trait-seal ${hud.traitUnlocked ? "is-unlocked" : ""}`}>◈</div>
          <div>
            <strong>{hud.traitUnlocked ? "Instinto Lupino" : "Traço adormecido"}</strong>
            <p>{hud.traitUnlocked ? "A floresta agora reconhece sua fome." : "Absorva uma essência para despertar."}</p>
          </div>
        </section>

        <footer className="controls-panel" aria-label="Controles">
          <span><kbd>WASD</kbd><kbd>↑↓←→</kbd> mover</span>
          <span><kbd>ESPAÇO</kbd> golpe de éter</span>
          <span><kbd>F</kbd> absorver essência</span>
        </footer>

        {hud.completed && <div className="completion-ribbon">PRÓLOGO CONCLUÍDO · A VILA DE MUSGO ESTÁ SEGURA</div>}
      </div>
    </main>
  );
}
