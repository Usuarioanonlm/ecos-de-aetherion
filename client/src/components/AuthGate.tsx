import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function readableError(raw: string) {
  const message = raw.toLowerCase();
  if (message.includes("rate limit") || message.includes("60 seconds")) return "Aguarde 1 minuto antes de solicitar outro e-mail de confirmação.";
  if (message.includes("email not confirmed")) return "Seu e-mail ainda não foi confirmado. Abra a mensagem recebida ou reenvie a confirmação.";
  if (message.includes("invalid login")) return "E-mail ou senha incorretos.";
  return raw;
}

export default function AuthGate({ onAuthenticated }: { onAuthenticated: (email: string) => void }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [mode, setMode] = useState<"login" | "register">("login"); const [message, setMessage] = useState(""); const [pendingConfirmation, setPendingConfirmation] = useState(false); const [seconds, setSeconds] = useState(0);
  useEffect(() => { if (!seconds) return; const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000); return () => window.clearTimeout(timer); }, [seconds]);
  const submit = async () => { if (!email || password.length < 6) { setMessage("Informe um e-mail e senha de no mínimo 6 caracteres."); return; } const result = mode === "login" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` } }); if (result.error) { const text = readableError(result.error.message); setMessage(text); if (text.includes("Aguarde 1 minuto")) setSeconds(60); if (text.includes("confirmado")) setPendingConfirmation(true); return; } if (result.data.session?.user) { onAuthenticated(result.data.session.user.email ?? email); return; } setPendingConfirmation(true); setSeconds(60); setMessage("Conta criada. Confira a caixa de entrada e o spam para confirmar seu e-mail."); };
  const resend = async () => { if (!email || seconds) return; const result = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` } }); if (result.error) { const text = readableError(result.error.message); setMessage(text); if (text.includes("Aguarde 1 minuto")) setSeconds(60); return; } setMessage("Novo e-mail enviado. Aguarde até 1 minuto e confirme pelo link recebido."); setSeconds(60); };
  return <main className="auth-gate"><section><p>ECOS DE AETHERION · CONTA</p><h1>{mode === "login" ? "RETORNE AO ÉTER" : "CRIE SEU ECO"}</h1><span>Use a mesma conta no PC e no celular para manter seu progresso.</span><label>E-mail<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" /></label><label>Senha<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>{message && <small>{message}</small>}<button onClick={submit}>{mode === "login" ? "ENTRAR" : "CRIAR CONTA"}</button>{pendingConfirmation && <button className="auth-resend" disabled={seconds > 0} onClick={resend}>{seconds > 0 ? `REENVIAR EM ${seconds}s` : "REENVIAR CONFIRMAÇÃO"}</button>}<button className="auth-switch" onClick={() => { setMode(mode === "login" ? "register" : "login"); setMessage(""); }}>{mode === "login" ? "Ainda não tem conta? Criar agora" : "Já possui uma conta? Entrar"}</button></section></main>;
}
