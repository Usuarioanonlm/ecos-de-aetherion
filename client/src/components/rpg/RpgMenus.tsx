import { useEffect, useState, type ReactNode } from "react";
import { useRpgDialog } from "./useRpgDialog";
import {
  bosses,
  dungeons,
  factions,
  kingdoms,
  mobs,
  pointsOfInterest,
  primordialDragonsAtlas,
} from "../../game/aetherionAtlas";
import { endings, races, classes, type Stats } from "../../game/content";
import { AtlasDetails } from "./RpgAtlas";
import type { CharacterProfile } from "../RpgGame";
import { CharacterPreview } from "../RpgGame";
import type { RegionId, ServicePoint } from "../../game/worldContent";
import type {
  AudioSettings,
  ControlAction,
  ControlSettings,
  Menu,
} from "../../game/runtime/types";

export type { AudioSettings, ControlAction, ControlSettings, Menu };
export type MenuStats = Stats;

export type MenuQuestContent = ReactNode;
export type MenuInventoryContent = ReactNode;

export type ControlsWindowProps = {
  controls: ControlSettings;
  close: () => void;
  bind: (action: ControlAction, code: string) => boolean;
  restore: () => void;
};

export type MenuWindowProps = {
  menu: Menu;
  close: () => void;
  profile: CharacterProfile;
  stats: MenuStats;
  buildings: string[];
  potions: number;
  build: (name: string) => void;
  beginDungeon: () => void;
  audio: AudioSettings;
  changeAudio: (key: keyof AudioSettings, value: number) => void;
  region: RegionId;
  unlockedRegions: RegionId[];
  focus: number;
  gold: number;
  questContent?: MenuQuestContent;
  inventoryContent?: MenuInventoryContent;
};

export type ServiceWindowProps = {
  service: ServicePoint | null;
  close: () => void;
  gold: number;
  wood: number;
  ore: number;
  opened: boolean;
  buyPotion: () => void;
  sellWood: () => void;
  sellOre: () => void;
  receiveBlessing: () => void;
  openChest: () => void;
};

const controlLabels: Record<ControlAction, string> = {
  moveUp: "Mover para cima",
  moveDown: "Mover para baixo",
  moveLeft: "Mover para esquerda",
  moveRight: "Mover para direita",
  attack: "Ataque",
  skill: "Habilidades",
  inventory: "Inventário",
  map: "Mapa",
  interact: "Interagir",
  dodge: "Esquiva",
  menu: "Abrir menu",
};

const formatControl = (code: string) =>
  (
    ({
      ArrowUp: "↑",
      ArrowDown: "↓",
      ArrowLeft: "←",
      ArrowRight: "→",
    }) as Record<string, string>
  )[code] ??
  (code === "Space"
    ? "Espaço"
    : code === "ShiftLeft"
      ? "Shift"
      : code === "Tab"
        ? "Tab"
        : code
            .replace(/^Key/, "")
            .replace(/^Digit/, "")
            .replace(/^Arrow/, ""));

export function ControlsWindow({
  controls,
  close,
  bind,
  restore,
}: ControlsWindowProps) {
  const dialogRef = useRpgDialog(true, close);
  const [capturing, setCapturing] = useState<ControlAction | null>(null);
  const [feedback, setFeedback] = useState(
    "Selecione uma ação e pressione a nova tecla."
  );

  useEffect(() => {
    if (!capturing) return;
    const capture = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.code === "Escape") {
        setCapturing(null);
        setFeedback("Remapeamento cancelado.");
        return;
      }
      const accepted = bind(capturing, event.code);
      setFeedback(
        accepted
          ? `${controlLabels[capturing]}: ${formatControl(event.code)}.`
          : "Essa tecla já pertence a outra ação. Escolha uma diferente."
      );
      setCapturing(null);
    };
    window.addEventListener("keydown", capture, true);
    return () => window.removeEventListener("keydown", capture, true);
  }, [capturing, bind]);

  return (
    <aside
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      className="rpg-menu-window controls-window"
      aria-label="Teclas de comando"
    >
      <button
        type="button"
        className="menu-close"
        onClick={close}
        aria-label="Fechar controles"
      >
        ×
      </button>
      <p className="menu-overline">CONFIGURAÇÕES · CONTROLES</p>
      <h2>Teclas de comando</h2>
      <p>{feedback}</p>
      <div className="control-grid">
        {(Object.keys(controlLabels) as ControlAction[]).map(action => (
          <button
            type="button"
            key={action}
            className={capturing === action ? "listening" : ""}
            onClick={() => {
              setCapturing(action);
              setFeedback(
                `Pressione uma tecla para ${controlLabels[action].toLowerCase()}.`
              );
            }}
          >
            <span>{controlLabels[action]}</span>
            <kbd>
              {capturing === action ? "..." : formatControl(controls[action])}
            </kbd>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="restore-controls"
        onClick={() => {
          restore();
          setFeedback("Controles padrão restaurados.");
        }}
      >
        RESTAURAR CONTROLES PADRÃO
      </button>
      <small className="dungeon-note">
        A tecla pressionada vale apenas para este Eco e não pode duplicar outra
        ação.
      </small>
    </aside>
  );
}

export function MenuWindow({
  menu,
  close,
  profile,
  stats,
  buildings,
  potions,
  build,
  beginDungeon,
  audio,
  changeAudio,
  region,
  unlockedRegions,
  focus,
  gold,
  questContent,
  inventoryContent,
}: MenuWindowProps) {
  const dialogRef = useRpgDialog(
    menu !== "none" && menu !== "controls" && menu !== "local-map",
    close
  );
  if (menu === "none" || menu === "controls" || menu === "local-map")
    return null;
  if (menu === "dungeon")
    return (
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="rpg-menu-window expedition-window"
        aria-label="Expedição"
      >
        <button
          type="button"
          className="menu-close"
          onClick={close}
          aria-label="Fechar expedição"
        >
          ×
        </button>
        <p className="menu-overline">DUNGEON · FLORESTA PRIMORDIAL</p>
        <h2>Ruínas da Raiz Silenciosa</h2>
        <p>
          Uma fissura aberta sob as raízes antigas conduz a um santuário onde a
          primeira memória da Árvore Primordial foi acorrentada.
        </p>
        <div className="dungeon-facts">
          <span>
            <b>AMEAÇA</b> Guardião da Raiz
          </span>
          <span>
            <b>RECOMPENSA</b> Fragmento Primordial
          </span>
          <span>
            <b>VÍNCULO</b> Círculo Élfico
          </span>
        </div>
        <button
          type="button"
          className="expedition-button"
          onClick={beginDungeon}
        >
          ENTRAR NA FISSURA <span>↗</span>
        </button>
        <small className="dungeon-note">
          As dungeons alimentam a rota do Novo Deus e abrem regiões mais
          perigosas.
        </small>
      </aside>
    );

  const race = races.find(item => item.id === profile.raceId)!;
  const playerClass = classes.find(item => item.id === profile.classId)!;
  const content =
    menu === "character" ? (
      <>
        <div className="menu-portrait">
          <CharacterPreview profile={profile} size="small" />
        </div>
        <h2>{profile.name}</h2>
        <p>
          {race.name} · {playerClass.name} · {race.talent}
        </p>
        <div className="detail-stats">
          {Object.entries(stats).map(([label, value]) => (
            <span key={label}>
              <small>{label}</small>
              <b>{value}</b>
            </span>
          ))}
        </div>
        <h3>Linhas de evolução</h3>
        <ol>
          {race.evolution.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </>
    ) : menu === "inventory" ? (
      (inventoryContent ?? (
        <>
          <h2>Bolsa de viagem</h2>
          <p>Equipamento e recursos carregados pelo seu eco.</p>
          <div className="item-grid">
            <span>
              ◈ Núcleo de Essência <b>1</b>
            </span>
            <span>
              ✦ Poção de musgo <b>{potions}</b>
            </span>
            <span>
              ⌁ Madeira viva <b>coletável</b>
            </span>
            <span>
              ◆ Minério de raiz <b>coletável</b>
            </span>
          </div>
          <h3>Equipamento inicial</h3>
          <p>
            <b>{playerClass.weapon}</b> · Manto de viagem · item da origem. Use{" "}
            <b>H</b> para consumir uma poção.
          </p>
          <h3>Habilidade de classe</h3>
          <p>
            <b>{playerClass.skills[0]}</b> — use <b>R</b> para liberar uma
            descarga de Éter quando o foco estiver cheio.
          </p>
        </>
      ))
    ) : menu === "map" ? (
      <>
        <h2>Mapa de Aetherion</h2>
        <p>
          Toque no minimapa para consultar o atlas. Rotas seladas revelam o
          caminho conforme este Eco atravessa portais e estradas físicas.
        </p>
        <AtlasDetails
          currentRegion={region}
          unlockedRegions={unlockedRegions}
          focus={focus}
          gold={gold}
        />
      </>
    ) : menu === "quests" ? (
      (questContent ?? (
        <>
          <h2>Crônicas e escolhas</h2>
          <div className="quest-log">
            <article>
              <small>PRÓLOGO ATIVO</small>
              <b>O Lobo e a Raiz</b>
              <p>
                Expulse os Lobos Primordiais da trilha norte e leve a primeira
                essência à Vila de Musgo.
              </p>
            </article>
            <article>
              <small>ORIGEM</small>
              <b>{profile.name}</b>
              <p>
                A origem escolhida vai definir sua primeira aliança e o primeiro
                título.
              </p>
            </article>
            <article>
              <small>FINAIS POSSÍVEIS</small>
              <p>{endings.join(" · ")}</p>
            </article>
          </div>
        </>
      ))
    ) : menu === "codex" ? (
      <>
        <h2>Codex da Grande Ruptura</h2>
        <h3>7 Dragões Primordiais</h3>
        <div className="codex-row">
          {primordialDragonsAtlas.map(dragon => (
            <span key={dragon.name}>
              ◉ {dragon.name} · {dragon.element}
            </span>
          ))}
        </div>
        <h3>Chefes principais</h3>
        <div className="codex-row">
          {bosses.map(boss => (
            <span key={boss.id}>
              ⚔ {boss.name}, {boss.title}
            </span>
          ))}
        </div>
        <h3>Masmorras</h3>
        <div className="codex-row">
          {dungeons.map(dungeon => (
            <span key={dungeon.id}>
              ◇ {dungeon.name} · T{dungeon.tier}
            </span>
          ))}
        </div>
        <h3>Mobs catalogados</h3>
        <div className="codex-row">
          {mobs.map(mob => (
            <span key={mob.id}>◈ {mob.name}</span>
          ))}
        </div>
        <h3>Facções e reinos</h3>
        <p>
          {factions.join(" · ")}
          <br />
          {kingdoms.join(" · ")}
        </p>
        <h3>Pontos de interesse</h3>
        <div className="codex-row">
          {pointsOfInterest.map(place => (
            <span key={place}>✧ {place}</span>
          ))}
        </div>
      </>
    ) : menu === "settings" ? (
      <>
        <h2>Configurações de áudio</h2>
        <p>
          O som começa depois da primeira interação com o jogo, conforme a regra
          do navegador.
        </p>
        <div className="audio-settings">
          <label>
            <span>
              <b>Efeitos sonoros</b>
              <small>{Math.round(audio.sfx * 100)}%</small>
            </span>
            <input
              aria-label="Volume dos efeitos sonoros"
              type="range"
              min="0"
              max="100"
              value={Math.round(audio.sfx * 100)}
              onChange={event =>
                changeAudio("sfx", Number(event.target.value) / 100)
              }
            />
          </label>
          <label>
            <span>
              <b>Música ambiente</b>
              <small>{Math.round(audio.music * 100)}%</small>
            </span>
            <input
              aria-label="Volume da música ambiente"
              type="range"
              min="0"
              max="100"
              value={Math.round(audio.music * 100)}
              onChange={event =>
                changeAudio("music", Number(event.target.value) / 100)
              }
            />
          </label>
        </div>
        <small className="dungeon-note">
          Cada Eco mantém seus próprios níveis de áudio.
        </small>
      </>
    ) : (
      <>
        <h2>Vila de Musgo</h2>
        <p>
          Transforme o refúgio em uma civilização. Construções alteram recursos,
          segurança e missões disponíveis.
        </p>
        <div className="build-list">
          {[
            "Cabana",
            "Horta de musgo",
            "Forja",
            "Torre de vigia",
            "Santuário do Éter",
          ].map(name => (
            <button
              type="button"
              key={name}
              disabled={buildings.includes(name)}
              onClick={() => build(name)}
            >
              {buildings.includes(name) ? "✓ " : "+ "}
              {name}
              <small>{name === "Forja" ? "8 minério" : "12 madeira"}</small>
            </button>
          ))}
        </div>
      </>
    );

  return (
    <aside
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      className="rpg-menu-window"
      aria-label="Registro de Aetherion"
    >
      <button
        type="button"
        className="menu-close"
        onClick={close}
        aria-label="Fechar menu"
      >
        ×
      </button>
      <p className="menu-overline">REGISTRO DE AETHERION</p>
      {content}
    </aside>
  );
}

export function ServiceWindow({
  service,
  close,
  gold,
  wood,
  ore,
  opened,
  buyPotion,
  sellWood,
  sellOre,
  receiveBlessing,
  openChest,
}: ServiceWindowProps) {
  const dialogRef = useRpgDialog(Boolean(service), close);
  if (!service) return null;
  const title =
    service.kind === "shop"
      ? "Comércio local"
      : service.kind === "church"
        ? "Capela e bênção"
        : "Baú da região";
  const detail =
    service.kind === "shop"
      ? "Poções de viagem restauram vitalidade durante explorações mais longas."
      : service.kind === "church"
        ? "A capela cura a forma do eco e restaura o foco para a jornada."
        : opened
          ? "Este baú já foi aberto por este personagem."
          : "Um baú antigo guarda uma recompensa única para este personagem.";
  return (
    <aside
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      className="rpg-menu-window service-window"
      aria-label={title}
    >
      <button
        type="button"
        className="menu-close"
        onClick={close}
        aria-label="Fechar serviço"
      >
        ×
      </button>
      <p className="menu-overline">{service.label.toUpperCase()}</p>
      <h2>{title}</h2>
      <p>{detail}</p>
      <div className="service-facts">
        <span>
          OURO DISPONÍVEL <b>{gold}</b>
        </span>
        {service.reward && (
          <span>
            RECOMPENSA <b>{service.reward.gold} ouro</b>
          </span>
        )}
      </div>
      {service.kind === "shop" ? (
        <div className="trade-actions">
          <button
            type="button"
            className="expedition-button"
            onClick={buyPotion}
          >
            COMPRAR POÇÃO · 7 OURO
          </button>
          <button type="button" onClick={sellWood} disabled={wood < 4}>
            VENDER 4 MADEIRAS · +3 OURO
          </button>
          <button type="button" onClick={sellOre} disabled={ore < 2}>
            VENDER 2 MINÉRIOS · +5 OURO
          </button>
        </div>
      ) : service.kind === "church" ? (
        <button
          type="button"
          className="expedition-button"
          onClick={receiveBlessing}
        >
          RECEBER BÊNÇÃO · 5 OURO
        </button>
      ) : (
        <button
          type="button"
          className="expedition-button"
          disabled={opened}
          onClick={openChest}
        >
          {opened ? "BAÚ JÁ ABERTO" : "ABRIR E RECEBER RECOMPENSA"}
        </button>
      )}
      <small className="dungeon-note">
        Comércio, bênçãos e baús são salvos separadamente para cada Eco.
      </small>
    </aside>
  );
}
