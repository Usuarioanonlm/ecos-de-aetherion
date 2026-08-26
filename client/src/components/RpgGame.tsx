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

function PixelWeapon({ classId, accent }: { classId: ClassId; accent: string }) {
  const dark = "#101c21"; const steel = "#d9d3b3"; const wood = "#795235";
  if (classId === "hunter") return <g><rect x="72" y="39" width="4" height="38" fill={dark}/><rect x="76" y="35" width="4" height="46" fill={wood}/><rect x="80" y="35" width="4" height="4" fill={steel}/><rect x="80" y="77" width="4" height="4" fill={steel}/><rect x="84" y="42" width="2" height="32" fill="#a5d8c5"/><rect x="62" y="57" width="22" height="3" fill={accent}/><rect x="60" y="56" width="4" height="5" fill={steel}/></g>;
  if (classId === "artificer") return <g><rect x="72" y="40" width="7" height="41" fill={dark}/><rect x="76" y="43" width="4" height="36" fill={wood}/><rect x="65" y="34" width="24" height="13" fill={dark}/><rect x="68" y="36" width="18" height="8" fill="#7c8992"/><rect x="72" y="36" width="10" height="3" fill={accent}/></g>;
  if (classId === "arcanist") return <g><rect x="73" y="39" width="7" height="43" fill={dark}/><rect x="76" y="42" width="4" height="37" fill={wood}/><rect x="70" y="28" width="16" height="16" fill={dark}/><rect x="73" y="31" width="10" height="10" fill={accent}/><rect x="76" y="28" width="4" height="16" fill="#eaf0bc"/></g>;
  if (classId === "warden") return <g><rect x="72" y="45" width="9" height="31" fill={dark}/><rect x="75" y="47" width="4" height="26" fill="#ad7250"/><rect x="60" y="48" width="17" height="23" fill={dark}/><rect x="63" y="51" width="12" height="17" fill={accent}/><rect x="66" y="54" width="6" height="11" fill="#d9d3b3"/></g>;
  if (classId === "vigil") return <g><rect x="74" y="24" width="7" height="60" fill={dark}/><rect x="77" y="31" width="3" height="51" fill={wood}/><rect x="72" y="22" width="11" height="14" fill={steel}/><rect x="76" y="16" width="4" height="8" fill={accent}/></g>;
  return <g><rect x="73" y="31" width="7" height="53" fill={dark}/><rect x="76" y="36" width="3" height="45" fill={wood}/><rect x="80" y="23" width="7" height="34" fill={dark}/><rect x="82" y="25" width="3" height="29" fill={steel}/><rect x="71" y="54" width="16" height="5" fill="#bc9450"/></g>;
}

function RaceSprite({ raceId, skin, cloak, accent }: { raceId: RaceId; skin: string; cloak: string; accent: string }) {
  const outline = "#101a1e"; const shade = "#17282b"; const light = "#f1d7a1"; const R = ({ x, y, w, h, fill }: { x: number; y: number; w: number; h: number; fill: string }) => <rect x={x} y={y} width={w} height={h} fill={fill} />;
  if (raceId === "slime") return <g><R x={22} y={72} w={50} h={9} fill={outline}/><R x={18} y={51} w={57} h={28} fill={outline}/><R x={24} y={42} w={44} h={38} fill={skin}/><R x={30} y={36} w={30} h={10} fill={skin}/><R x={25} y={51} w={17} h={8} fill="#86e6a4"/><R x={49} y={47} w={10} h={6} fill="#aaf2bd"/><R x={32} y={58} w={6} h={6} fill={outline}/><R x={53} y={58} w={6} h={6} fill={outline}/><R x={43} y={45} w={5} h={27} fill={accent}/><R x={38} y={70} w={21} h={5} fill="#3a9474"/><R x={66} y={62} w={8} h={8} fill="#3b9d78"/></g>;
  if (raceId === "dwarf") return <g><R x={22} y={83} w={48} h={8} fill={outline}/><R x={28} y={57} w={35} h={30} fill={outline}/><R x={31} y={56} w={29} h={28} fill={cloak}/><R x={27} y={30} w={37} h={31} fill={outline}/><R x={31} y={34} w={29} h={22} fill={skin}/><R x={27} y={27} w={37} h={11} fill="#4a3940"/><R x={31} y={23} w={28} h={8} fill="#70503b"/><R x={26} y={51} w={12} h={19} fill="#6e4431"/><R x={53} y={51} w={12} h={19} fill="#6e4431"/><R x={34} y={50} w={22} h={17} fill="#c28a52"/><R x={38} y={56} w={14} h={16} fill="#8b542f"/><R x={35} y={83} w={9} h={10} fill={outline}/><R x={51} y={83} w={9} h={10} fill={outline}/></g>;
  if (raceId === "elf") return <g><R x={28} y={88} w={36} h={7} fill={outline}/><R x={33} y={55} w={25} h={36} fill={outline}/><R x={36} y={56} w={19} h={32} fill={cloak}/><R x={31} y={27} w={30} h={31} fill={outline}/><R x={35} y={31} w={22} h={24} fill={skin}/><R x={21} y={34} w={14} h={10} fill={outline}/><R x={24} y={36} w={12} h={5} fill={skin}/><R x={57} y={34} w={14} h={10} fill={outline}/><R x={58} y={36} w={12} h={5} fill={skin}/><R x={32} y={23} w={28} h={12} fill="#294e49"/><R x={39} y={41} w={4} h={4} fill={outline}/><R x={50} y={41} w={4} h={4} fill={outline}/><R x={35} y={88} w={7} h={10} fill={outline}/><R x={51} y={88} w={7} h={10} fill={outline}/></g>;
  if (raceId === "goblin") return <g><R x={22} y={83} w={43} h={8} fill={outline}/><R x={28} y={59} w={32} h={28} fill={outline}/><R x={31} y={60} w={26} h={25} fill={cloak}/><R x={25} y={35} w={37} h={29} fill={outline}/><R x={29} y={38} w={28} h={22} fill={skin}/><R x={14} y={39} w={16} h={9} fill={outline}/><R x={17} y={41} w={14} h={4} fill={skin}/><R x={57} y={39} w={16} h={9} fill={outline}/><R x={56} y={41} w={14} h={4} fill={skin}/><R x={26} y={31} w={33} h={11} fill="#445338"/><R x={35} y={48} w={5} h={4} fill={outline}/><R x={49} y={48} w={5} h={4} fill={outline}/><R x={30} y={83} w={8} h={10} fill={outline}/><R x={50} y={83} w={8} h={10} fill={outline}/><R x={18} y={63} w={9} h={9} fill={accent}/></g>;
  if (raceId === "wolfkin") return <g><R x={18} y={86} w={57} h={8} fill={outline}/><R x={30} y={57} w={32} h={34} fill={outline}/><R x={33} y={58} w={26} h={29} fill={cloak}/><R x={27} y={26} w={38} h={35} fill={outline}/><R x={31} y={31} w={31} h={26} fill={skin}/><R x={26} y={12} w={15} h={24} fill={outline}/><R x={30} y={17} w={9} h={18} fill={skin}/><R x={53} y={12} w={15} h={24} fill={outline}/><R x={55} y={17} w={9} h={18} fill={skin}/><R x={57} y={39} w={16} h={12} fill={outline}/><R x={61} y={41} w={14} h={8} fill={skin}/><R x={39} y={43} w={5} h={4} fill={outline}/><R x={53} y={43} w={5} h={4} fill={outline}/><R x={55} y={70} w={28} h={8} fill={outline}/><R x={60} y={71} w={22} h={4} fill={skin}/></g>;
  if (raceId === "kobold") return <g><R x={21} y={83} w={49} h={8} fill={outline}/><R x={28} y={58} w={33} h={29} fill={outline}/><R x={31} y={59} w={27} h={25} fill={cloak}/><R x={26} y={33} w={37} h={29} fill={outline}/><R x={30} y={37} w={30} h={22} fill={skin}/><R x={27} y={18} w={11} h={20} fill={outline}/><R x={30} y={21} w={6} h={17} fill={accent}/><R x={52} y={18} w={11} h={20} fill={outline}/><R x={54} y={21} w={6} h={17} fill={accent}/><R x={56} y={47} w={18} h={10} fill={outline}/><R x={60} y={49} w={14} h={6} fill={skin}/><R x={38} y={45} w={5} h={4} fill={outline}/><R x={52} y={45} w={5} h={4} fill={outline}/><R x={57} y={69} w={24} h={8} fill={outline}/><R x={60} y={70} w={19} h={4} fill={skin}/></g>;
  if (raceId === "lizard") return <g><R x={22} y={88} w={49} h={7} fill={outline}/><R x={30} y={56} w={34} h={36} fill={outline}/><R x={33} y={57} w={27} h={31} fill={cloak}/><R x={27} y={28} w={37} h={33} fill={outline}/><R x={31} y={32} w={30} h={26} fill={skin}/><R x={30} y={17} w={30} h={15} fill={outline}/><R x={34} y={18} w={6} h={12} fill={accent}/><R x={42} y={14} w={6} h={16} fill={accent}/><R x={51} y={18} w={6} h={12} fill={accent}/><R x={38} y={43} w={5} h={4} fill={outline}/><R x={53} y={43} w={5} h={4} fill={outline}/><R x={57} y={67} w={28} h={11} fill={outline}/><R x={61} y={69} w={24} h={6} fill={skin}/><R x={35} y={88} w={8} h={10} fill={outline}/><R x={51} y={88} w={8} h={10} fill={outline}/></g>;
  if (raceId === "beastfolk") return <g><R x={23} y={88} w={48} h={7} fill={outline}/><R x={30} y={56} w={34} h={36} fill={outline}/><R x={33} y={57} w={27} h={31} fill={cloak}/><R x={27} y={29} w={37} h={32} fill={outline}/><R x={31} y={33} w={30} h={25} fill={skin}/><R x={26} y={15} w={15} h={23} fill={outline}/><R x={30} y={19} w={9} h={17} fill={cloak}/><R x={51} y={15} w={15} h={23} fill={outline}/><R x={54} y={19} w={9} h={17} fill={cloak}/><R x={38} y={44} w={5} h={4} fill={outline}/><R x={53} y={44} w={5} h={4} fill={outline}/><R x={58} y={66} w={25} h={9} fill={outline}/><R x={62} y={67} w={21} h={5} fill={skin}/><R x={35} y={88} w={8} h={10} fill={outline}/><R x={52} y={88} w={8} h={10} fill={outline}/></g>;
  return <g><R x={24} y={88} w={48} h={7} fill={outline}/><R x={30} y={57} w={34} h={35} fill={outline}/><R x={33} y={58} w={28} h={30} fill={cloak}/><R x={27} y={29} w={37} h={32} fill={outline}/><R x={31} y={33} w={30} h={25} fill={skin}/><R x={27} y={23} w={37} h={13} fill="#304557"/><R x={33} y={19} w={26} h={8} fill="#314d68"/><R x={38} y={43} w={5} h={4} fill={outline}/><R x={53} y={43} w={5} h={4} fill={outline}/><R x={34} y={88} w={9} h={10} fill={outline}/><R x={52} y={88} w={9} h={10} fill={outline}/></g>;
}

function SpriteDetails({ raceId, accent, cloak }: { raceId: RaceId; accent: string; cloak: string }) {
  const glow = "#eaf4bd"; const ink = "#111b20";
  const marks: Array<[number, number, number, number, string]> = raceId === "human" ? [[34,34,4,3,"#7b503b"],[55,34,3,3,"#7b503b"],[33,52,9,3,"#e1bd83"],[51,52,8,3,"#e1bd83"],[34,64,25,3,"#203a4b"],[43,60,7,4,accent],[36,72,5,9,"#244052"],[53,72,4,9,"#244052"],[29,41,3,12,"#8b5b41"],[60,40,3,12,"#8b5b41"]] : raceId === "slime" ? [[29,48,6,3,glow],[61,58,5,4,"#2b8b6d"],[24,66,5,4,"#2b8b6d"],[53,68,4,3,glow],[38,57,3,3,"#d8f7b9"],[50,72,7,2,"#1a5e54"],[64,71,5,3,"#1a5e54"]] : raceId === "goblin" ? [[31,52,6,3,ink],[49,52,6,3,ink],[41,56,7,3,"#cad36a"],[37,61,14,3,"#d7bd58"],[34,68,20,3,"#2e2721"],[38,72,4,8,"#8d5a34"],[50,72,4,8,"#8d5a34"],[18,63,4,4,"#d7bd58"]] : raceId === "wolfkin" ? [[34,35,4,4,"#bdc7cc"],[56,35,4,4,"#bdc7cc"],[44,48,5,3,"#1e292d"],[59,48,7,3,"#1e292d"],[36,55,9,3,"#93a0a5"],[51,58,9,3,"#aeb8bd"],[36,66,20,3,"#1b2830"],[34,74,4,8,"#31414b"],[54,74,4,8,"#31414b"],[71,43,4,3,accent]] : raceId === "kobold" ? [[34,41,5,3,"#f1d496"],[52,41,5,3,"#f1d496"],[42,51,7,4,"#602d29"],[31,55,4,4,"#db9d63"],[56,54,4,4,"#db9d63"],[35,64,19,3,"#734334"],[38,71,4,8,"#6c4637"],[50,71,4,8,"#6c4637"],[64,70,8,3,accent]] : raceId === "lizard" ? [[34,35,4,3,glow],[54,35,4,3,glow],[40,43,3,8,"#2b6358"],[52,44,3,8,"#2b6358"],[32,55,6,3,"#68b39b"],[49,57,7,3,"#68b39b"],[35,67,23,3,"#163e3d"],[38,74,4,8,"#315e58"],[52,74,4,8,"#315e58"],[67,70,10,3,accent]] : raceId === "elf" ? [[33,33,4,20,"#554936"],[55,33,4,18,"#554936"],[40,41,4,3,ink],[51,41,4,3,ink],[45,52,7,2,"#d7c48c"],[35,62,18,3,"#397860"],[38,70,4,11,"#235244"],[51,70,4,11,"#235244"],[22,39,5,2,accent],[61,39,5,2,accent]] : raceId === "dwarf" ? [[33,35,4,3,ink],[53,35,4,3,ink],[36,42,18,3,"#7f4c2d"],[39,46,12,17,"#b26a38"],[42,49,3,10,"#e0a258"],[48,50,3,12,"#e0a258"],[33,64,24,3,"#303d4b"],[37,72,4,8,"#303d4b"],[53,72,4,8,"#303d4b"],[27,57,4,7,accent]] : [[34,34,4,4,"#6e4d3b"],[55,34,4,4,"#6e4d3b"],[39,43,4,3,ink],[52,43,4,3,ink],[44,52,8,3,"#cb9a6b"],[34,64,23,3,cloak],[38,72,4,9,"#664a38"],[52,72,4,9,"#664a38"],[30,58,4,6,accent],[65,69,11,3,accent]];
  return <g>{marks.map(([x, y, w, h, fill], index) => <rect key={`${raceId}-${index}`} x={x} y={y} width={w} height={h} fill={fill}/>)}</g>;
}

function CharacterPreview({ profile, size = "large" }: { profile: CharacterProfile; size?: "large" | "small" }) {
  const race = races.find((item) => item.id === profile.raceId)!; const playerClass = classes.find((item) => item.id === profile.classId)!;
  return <div className={`character-preview ${size} race-${race.id}`} aria-label={`Sprite de ${race.name}`}><svg viewBox="0 0 96 112" role="img" aria-hidden="true" shapeRendering="crispEdges"><rect x="8" y="8" width="80" height="88" fill="#071e21"/><rect x="12" y="12" width="72" height="80" fill="#0c3233"/><rect x="12" y="12" width="72" height="4" fill="#214b45"/><rect x="12" y="88" width="72" height="4" fill="#061417"/><path d="M12 80h72v8H12zM16 16h4v4h-4zm12 0h4v4h-4zm48 0h4v4h-4zM16 84h4v4h-4zm56 0h4v4h-4z" fill="rgba(162,208,137,.22)"/><RaceSprite raceId={race.id} skin={race.palette.skin} cloak={race.palette.cloak} accent={race.palette.accent}/><SpriteDetails raceId={race.id} cloak={race.palette.cloak} accent={race.palette.accent}/><PixelWeapon classId={playerClass.id} accent={race.palette.accent}/><rect x="16" y="99" width="64" height="3" fill={race.palette.accent}/><rect x="28" y="103" width="40" height="2" fill="#d6c58c" opacity=".72"/></svg><span className="portrait-rune">{playerClass.icon}</span></div>;
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
