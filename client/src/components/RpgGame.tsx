/**
 * Linha dos Ecos — criação de personagem é um altar de escolhas, não uma tela genérica.
 * O mundo usa sprites 2D no canvas; cartões existem apenas para decisões de RPG, nunca como personagens.
 */
import { useEffect, useMemo, useState } from "react";
import { classes, origins, races, type ClassId, type OriginId, type RaceId, type Stats } from "../game/content";
import RpgWorldCanvas from "./RpgWorldCanvas";

export type CharacterProfile = { raceId: RaceId; classId: ClassId; originId: OriginId; name: string };

const emptyStats: Stats = { vitality: 0, power: 0, ether: 0, agility: 0, resolve: 0 };

export function profileStats(profile: CharacterProfile) {
  const race = races.find((item) => item.id === profile.raceId)!;
  const playerClass = classes.find((item) => item.id === profile.classId)!;
  return Object.entries(emptyStats).reduce((total, [key]) => ({
    ...total,
    [key]: race.stats[key as keyof Stats] + (playerClass.bonus[key as keyof Stats] ?? 0),
  }), emptyStats);
}

function CharacterPreview({ profile, size = "large" }: { profile: CharacterProfile; size?: "large" | "small" }) {
  const race = races.find((item) => item.id === profile.raceId)!;
  const playerClass = classes.find((item) => item.id === profile.classId)!;
  const slime = race.id === "slime";
  return (
    <div className={`character-preview ${size} race-${race.id}`} aria-label={`Retrato de ${race.name}`}>
      <svg viewBox="0 0 180 210" role="img" aria-hidden="true">
        <ellipse cx="90" cy="190" rx="51" ry="10" fill="rgba(3,12,16,.38)" />
        {slime ? <>
          <path d="M43 169 C40 126 55 76 88 60 C125 71 145 124 137 169 C124 187 56 187 43 169Z" fill="#183f3a" stroke="#0a2524" strokeWidth="8" />
          <path d="M49 163 C46 124 60 82 88 69 C118 78 137 123 131 163 C120 177 60 177 49 163Z" fill={race.palette.skin} />
          <path d="M57 151 C69 119 95 95 120 89" fill="none" stroke="rgba(239,255,214,.38)" strokeWidth="8" strokeLinecap="round" />
          <path d="M91 80 L82 109 L98 124 L87 145 L101 163" fill="none" stroke={race.palette.accent} strokeWidth="5" strokeLinecap="square" />
          <path d="M61 169 L74 176 M109 176 L124 168" stroke="#10322f" strokeWidth="6" strokeLinecap="round" />
          <circle cx="65" cy="145" r="3" fill="rgba(231,255,207,.45)" /><circle cx="115" cy="151" r="2.5" fill="rgba(231,255,207,.38)" />
          <circle cx="77" cy="122" r="5" fill="#09221e" /><circle cx="106" cy="122" r="5" fill="#09221e" />
        </> : <>
          <path d="M66 170 L68 135 L84 135 L85 177 M96 177 L97 135 L114 135 L119 170" fill={race.palette.cloak} stroke="#15242b" strokeWidth="6" strokeLinejoin="round" />
          <path d="M56 137 L68 92 L114 92 L128 137 L112 151 L71 151Z" fill={race.palette.cloak} stroke="#15242b" strokeWidth="7" strokeLinejoin="round" />
          <path d="M55 119 L29 145 M124 119 L150 98" stroke={race.palette.skin} strokeWidth="12" strokeLinecap="round" />
          <circle cx="91" cy="66" r="32" fill={race.palette.skin} stroke="#15242b" strokeWidth="7" />
          <path d="M61 63 Q89 25 121 61 L118 49 Q91 21 66 49Z" fill={race.palette.cloak} />
          {race.id === "elf" && <path d="M62 67 L38 52 L63 84 M120 67 L144 52 L120 84" fill={race.palette.skin} stroke="#15242b" strokeWidth="5" />}
          {race.id === "wolfkin" || race.id === "beastfolk" ? <path d="M61 48 L62 22 L78 38 M105 38 L122 22 L121 50" fill={race.palette.cloak} stroke="#15242b" strokeWidth="6" /> : null}
          {race.id === "kobold" || race.id === "lizard" ? <path d="M61 49 L72 18 L85 40 M101 40 L114 18 L121 50" fill={race.palette.accent} stroke="#15242b" strokeWidth="6" /> : null}
          <circle cx="79" cy="67" r="3" fill="#15242b" /><circle cx="103" cy="67" r="3" fill="#15242b" />
          <path d="M84 82 Q91 87 99 82" stroke="#15242b" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M130 142 L157 69" stroke={playerClass.id === "arcanist" ? race.palette.accent : "#b9a67c"} strokeWidth="8" strokeLinecap="round" />
          <path d="M149 71 L165 65" stroke={race.palette.accent} strokeWidth="5" strokeLinecap="round" />
        </>}
        <path d="M39 182 H141" stroke={race.palette.accent} strokeWidth="2" opacity=".58" />
      </svg>
      <span className="portrait-rune">{playerClass.icon}</span>
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: number }) {
  return <div className="stat-line"><span>{label}</span><div><i style={{ width: `${value * 9}%` }} /></div><b>{value}</b></div>;
}

const defaultProfile: CharacterProfile = { raceId: "slime", classId: "arcanist", originId: "rupture-born", name: "Eco Sem Nome" };

export default function RpgGame() {
  const [stage, setStage] = useState<"create" | "world">(() => localStorage.getItem("aetherion-profile") || new URLSearchParams(window.location.search).has("world") ? "world" : "create");
  const [profile, setProfile] = useState<CharacterProfile>(() => {
    try { return JSON.parse(localStorage.getItem("aetherion-profile") ?? "null") ?? defaultProfile; } catch { return defaultProfile; }
  });
  const race = useMemo(() => races.find((item) => item.id === profile.raceId)!, [profile.raceId]);
  const playerClass = useMemo(() => classes.find((item) => item.id === profile.classId)!, [profile.classId]);
  const compatibleOrigins = useMemo(() => origins.filter((item) => item.compatible.includes(profile.raceId)), [profile.raceId]);
  const origin = origins.find((item) => item.id === profile.originId) ?? compatibleOrigins[0];
  const stats = profileStats(profile);

  useEffect(() => {
    if (!compatibleOrigins.some((item) => item.id === profile.originId)) setProfile((old) => ({ ...old, originId: compatibleOrigins[0].id }));
  }, [compatibleOrigins, profile.originId]);

  const begin = () => {
    const nextProfile = { ...profile, originId: origin.id };
    const priorProfile = localStorage.getItem("aetherion-profile");
    if (priorProfile !== JSON.stringify(nextProfile)) localStorage.removeItem("aetherion-world-v2");
    localStorage.setItem("aetherion-profile", JSON.stringify(nextProfile));
    setStage("world");
  };

  if (stage === "world") return <RpgWorldCanvas profile={{ ...profile, originId: origin.id }} onReturnToCreation={() => setStage("create")} />;

  return <main className="creation-shell">
    <div className="creation-noise" aria-hidden="true" />
    <header className="creation-header">
      <div className="brand-symbol" aria-hidden="true"><i /><span>✦</span></div>
      <p>ECOS DE AETHERION · CRÔNICA DA RUPTURA</p>
      <h1>ESCOLHA O ECO<br /><em>QUE A FLORESTA VAI LEMBRAR</em></h1>
      <span>Personagem · raça · classe · origem</span>
    </header>
    <section className="creation-layout" aria-label="Criação de personagem">
      <aside className="choice-column race-choice">
        <div className="section-heading"><span>01</span><div><p>LINHAGEM</p><h2>Escolha sua raça</h2></div></div>
        <div className="race-grid">
          {races.map((item) => <button key={item.id} className={`race-card ${profile.raceId === item.id ? "selected" : ""}`} onClick={() => setProfile((old) => ({ ...old, raceId: item.id }))}>
            <span className="race-sigil">{item.kind === "Monstro" ? "◉" : item.kind === "Humano" ? "✦" : "⌁"}</span><b>{item.name}</b><small>{item.epithet}</small>
          </button>)}
        </div>
      </aside>
      <section className="character-altar">
        <p className="altar-kicker">FORMA POSSÍVEL</p>
        <CharacterPreview profile={{ ...profile, originId: origin.id }} />
        <div className="identity-name"><input value={profile.name} onChange={(event) => setProfile((old) => ({ ...old, name: event.target.value.slice(0, 20) }))} aria-label="Nome do personagem" /><span>{race.name} · {playerClass.name}</span></div>
        <div className="talent-stamp"><span>✦</span><div><small>TALENTO RACIAL</small><b>{race.talent}</b><p>{race.starterSkill}</p></div></div>
        <div className="stats-box">
          <StatLine label="Vitalidade" value={stats.vitality} /><StatLine label="Poder" value={stats.power} /><StatLine label="Éter" value={stats.ether} /><StatLine label="Agilidade" value={stats.agility} /><StatLine label="Vontade" value={stats.resolve} />
        </div>
        <button className="awaken-button" onClick={begin}>DESPERTAR EM AETHERION <span>↗</span></button>
      </section>
      <aside className="choice-column class-choice">
        <div className="section-heading"><span>02</span><div><p>VOCAÇÃO</p><h2>Defina sua classe</h2></div></div>
        <div className="class-list">
          {classes.map((item) => <button key={item.id} className={`class-card ${profile.classId === item.id ? "selected" : ""}`} onClick={() => setProfile((old) => ({ ...old, classId: item.id }))}>
            <span>{item.icon}</span><div><b>{item.name}</b><small>{item.weapon}</small></div><i>+</i>
          </button>)}
        </div>
        <article className="class-detail"><p>{playerClass.description}</p><div>{playerClass.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></article>
      </aside>
    </section>
    <section className="origin-deck"><div className="section-heading"><span>03</span><div><p>MEMÓRIA</p><h2>De onde veio este eco?</h2></div></div><div className="origin-list">
      {compatibleOrigins.map((item) => <button key={item.id} className={`origin-card ${origin.id === item.id ? "selected" : ""}`} onClick={() => setProfile((old) => ({ ...old, originId: item.id }))}><small>{item.faction}</small><b>{item.name}</b><p>{item.description}</p><span>{item.startingItem}</span></button>)}
    </div></section>
    <footer className="creation-footer"><span>Seu primeiro vínculo: <b>{origin.faction}</b></span><span>Missão pessoal: <b>{origin.quest}</b></span><span>Sem escolhas irreversíveis no prólogo.</span></footer>
  </main>;
}

export { CharacterPreview };
