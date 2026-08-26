/**
 * Linha dos Ecos — criação de personagem é um altar de escolhas, não uma tela genérica.
 * O mundo usa sprites 2D no canvas; cartões existem apenas para decisões de RPG, nunca como personagens.
 */
import { useEffect, useMemo, useState } from "react";
import { classes, origins, races, type ClassId, type OriginId, type RaceId, type Stats } from "../game/content";
import RpgWorldCanvas from "./RpgWorldCanvas";
import AuthGate from "./AuthGate";
import { supabase } from "../lib/supabase";

export type CharacterProfile = { raceId: RaceId; classId: ClassId; originId: OriginId; name: string };
type CharacterSlot = { id: string; slot_index: number; profile: CharacterProfile; world: Record<string, unknown> };

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
      <svg viewBox="0 0 64 72" role="img" aria-hidden="true" shapeRendering="crispEdges">
        <rect x="4" y="4" width="56" height="56" fill="#0b2426" opacity=".66" />
        <rect x="8" y="8" width="48" height="48" fill="none" stroke={race.palette.accent} strokeWidth="1" opacity=".48" />
        <rect x="12" y="60" width="40" height="5" fill="rgba(3,12,16,.52)" />
        {slime ? <>
          <rect x="17" y="40" width="30" height="16" fill="#133832" /><rect x="20" y="32" width="24" height="24" fill={race.palette.skin} /><rect x="24" y="27" width="16" height="8" fill={race.palette.skin} /><rect x="22" y="35" width="8" height="4" fill="#6dbb94" /><rect x="34" y="31" width="6" height="4" fill="#73cda5" /><rect x="25" y="42" width="4" height="4" fill="#092120" /><rect x="36" y="42" width="4" height="4" fill="#092120" /><rect x="30" y="35" width="4" height="16" fill={race.palette.accent} /><rect x="18" y="52" width="10" height="3" fill="rgba(225,255,213,.3)" />
        </> : <>
          <rect x="24" y="15" width="16" height="16" fill={race.palette.skin} /><rect x="21" y="12" width="22" height="7" fill="#1a2930" /><rect x="22" y="9" width="20" height="5" fill={race.palette.cloak} /><rect x="20" y="31" width="24" height="20" fill="#142126" /><rect x="22" y="31" width="20" height="24" fill={race.palette.cloak} /><rect x="17" y="33" width="5" height="15" fill={race.palette.skin} /><rect x="42" y="33" width="5" height="15" fill={race.palette.skin} /><rect x="24" y="51" width="7" height="9" fill="#142126" /><rect x="34" y="51" width="7" height="9" fill="#142126" /><rect x="26" y="21" width="3" height="3" fill="#142126" /><rect x="35" y="21" width="3" height="3" fill="#142126" />
          {(race.id === "elf" || race.id === "wolfkin" || race.id === "beastfolk" || race.id === "kobold" || race.id === "lizard") && <><rect x="18" y="14" width="6" height="8" fill={race.palette.cloak} /><rect x="40" y="14" width="6" height="8" fill={race.palette.cloak} /></>}
          <rect x="48" y="23" width="3" height="31" fill="#1b292b" /><rect x="51" y="20" width="4" height="25" fill={playerClass.id === "arcanist" ? race.palette.accent : "#d5c496"} /><rect x="46" y="43" width="10" height="3" fill="#b8954b" />
        </>}
        <rect x="16" y="66" width="32" height="2" fill={race.palette.accent} opacity=".7" />
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
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [stage, setStage] = useState<"select" | "create" | "world">("select");
  const [slots, setSlots] = useState<CharacterSlot[]>([]);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
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
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setAccountEmail(data.session?.user.email ?? null)); const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setAccountEmail(session?.user.email ?? null)); return () => listener.subscription.unsubscribe(); }, []);
  useEffect(() => { if (!accountEmail) return; supabase.from("character_slots").select("id,slot_index,profile,world").order("slot_index").then(({ data }) => { setSlots((data ?? []) as CharacterSlot[]); setStage("select"); }); }, [accountEmail]);

  const begin = async () => {
    const nextProfile = { ...profile, originId: origin.id };
    const { data: account } = await supabase.auth.getUser();
    if (!account.user) return;
    const active = slots.find((slot) => slot.id === activeSlotId);
    const slotIndex = active?.slot_index ?? [1, 2, 3, 4, 5].find((index) => !slots.some((slot) => slot.slot_index === index));
    if (!slotIndex) return;
    const { data } = await supabase.from("character_slots").upsert({ user_id: account.user.id, slot_index: slotIndex, profile: nextProfile, world: active?.world ?? {} }, { onConflict: "user_id,slot_index" }).select("id,slot_index,profile,world").single();
    if (data) { const slot = data as CharacterSlot; setSlots((old) => [...old.filter((item) => item.id !== slot.id), slot].sort((a, b) => a.slot_index - b.slot_index)); setActiveSlotId(slot.id); localStorage.setItem(`aetherion-profile:${slot.id}`, JSON.stringify(nextProfile)); }
    setStage("world");
  };

  const chooseSlot = (slot: CharacterSlot) => { setActiveSlotId(slot.id); setProfile(slot.profile); if (Object.keys(slot.world ?? {}).length) localStorage.setItem(`aetherion-world-v2:${slot.id}`, JSON.stringify(slot.world)); setStage("world"); };
  const returnToSelector = async () => { const active = slots.find((slot) => slot.id === activeSlotId); if (active) { const world = JSON.parse(localStorage.getItem(`aetherion-world-v2:${active.id}`) ?? "{}"); await supabase.from("character_slots").update({ world, updated_at: new Date().toISOString() }).eq("id", active.id); setSlots((old) => old.map((slot) => slot.id === active.id ? { ...slot, world } : slot)); } setActiveSlotId(null); setStage("select"); };
  const logout = async () => { if (!window.confirm("Sair da conta? Todos os seus personagens permanecem salvos.")) return; const active = slots.find((slot) => slot.id === activeSlotId); if (active) { const saved = JSON.parse(localStorage.getItem(`aetherion-world-v2:${active.id}`) ?? "{}"); await supabase.from("character_slots").update({ world: saved, updated_at: new Date().toISOString() }).eq("id", active.id); } await supabase.auth.signOut(); setActiveSlotId(null); setStage("select"); };
  if (!accountEmail) return <AuthGate onAuthenticated={setAccountEmail} />;
  if (stage === "world" && activeSlotId) return <RpgWorldCanvas profile={{ ...profile, originId: origin.id }} slotId={activeSlotId} onReturnToCreation={returnToSelector} onLogout={logout} />;
  if (stage === "select") return <main className="creation-shell slot-shell"><header className="creation-header"><div className="brand-symbol"><i /><span>✦</span></div><p>ECOS DE AETHERION · ARQUIVO DE ECOS</p><h1>ESCOLHA QUEM<br /><em>RETORNARÁ À RUPTURA</em></h1><span>{accountEmail} · {slots.length}/5 personagens</span></header><section className="slot-grid">{[1,2,3,4,5].map((index) => { const slot = slots.find((item) => item.slot_index === index); return slot ? <button key={index} className="slot-card occupied" onClick={() => chooseSlot(slot)}><CharacterPreview profile={slot.profile} size="small" /><div><small>SLOT {index}</small><b>{slot.profile.name}</b><span>{races.find((race) => race.id === slot.profile.raceId)?.name} · {classes.find((item) => item.id === slot.profile.classId)?.name}</span><em>CONTINUAR ↗</em></div></button> : <button key={index} className="slot-card empty" onClick={() => { setActiveSlotId(null); setProfile(defaultProfile); setStage("create"); }}><span>+</span><b>CRIAR NOVO ECO</b><small>SLOT {index} DISPONÍVEL</small></button>; })}</section><button className="logout-button slot-logout" onClick={logout}>SAIR DA CONTA</button></main>;

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
