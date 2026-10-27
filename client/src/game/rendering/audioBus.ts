export type AudioEvent =
  | "hit"
  | "block"
  | "defeat"
  | "hurt"
  | "ether"
  | "heal"
  | "collect"
  | "quest"
  | "menu"
  | "npc"
  | "crit";

export type AudioBusSettings = {
  sfx: number;
  music: number;
};

export type AudioBusOptions = {
  settings?: Partial<AudioBusSettings>;
  maxVoices?: number;
  contextFactory?: () => AudioContext;
};

type AudioSpec = {
  wave: OscillatorType;
  from: number;
  to: number;
  duration: number;
  volume: number;
};

export const audioEventSpecs: Record<AudioEvent, AudioSpec> = {
  hit: { wave: "square", from: 160, to: 78, duration: 0.09, volume: 0.055 },
  block: {
    wave: "triangle",
    from: 480,
    to: 310,
    duration: 0.11,
    volume: 0.045,
  },
  defeat: {
    wave: "sawtooth",
    from: 260,
    to: 48,
    duration: 0.25,
    volume: 0.065,
  },
  hurt: { wave: "square", from: 95, to: 54, duration: 0.12, volume: 0.06 },
  ether: { wave: "sine", from: 360, to: 720, duration: 0.19, volume: 0.045 },
  heal: { wave: "sine", from: 420, to: 760, duration: 0.2, volume: 0.04 },
  collect: {
    wave: "triangle",
    from: 520,
    to: 940,
    duration: 0.12,
    volume: 0.035,
  },
  quest: { wave: "sine", from: 320, to: 640, duration: 0.28, volume: 0.045 },
  menu: { wave: "triangle", from: 260, to: 190, duration: 0.07, volume: 0.026 },
  npc: { wave: "sine", from: 220, to: 280, duration: 0.1, volume: 0.022 },
  crit: { wave: "square", from: 240, to: 980, duration: 0.16, volume: 0.06 },
};

export function normalizeAudioSettings(
  settings: Partial<AudioBusSettings> = {}
): AudioBusSettings {
  const bounded = (value: number | undefined, fallback: number) =>
    Number.isFinite(value)
      ? Math.max(0, Math.min(1, value as number))
      : fallback;
  return {
    sfx: bounded(settings.sfx, 0.7),
    music: bounded(settings.music, 0.38),
  };
}

export type AudioBus = {
  play(event: AudioEvent): boolean;
  setSettings(next: Partial<AudioBusSettings>): AudioBusSettings;
  getSettings(): AudioBusSettings;
  getActiveVoices(): number;
  dispose(): void;
};

/**
 * Áudio proposital, curto e opcional. Se AudioContext for bloqueado, play retorna
 * false sem lançar exceção e o jogo continua. maxVoices evita avalanche no RAF.
 */
export function createAudioBus(options: AudioBusOptions = {}): AudioBus {
  let settings = normalizeAudioSettings(options.settings);
  const maxVoices = Math.max(1, Math.floor(options.maxVoices ?? 8));
  const contextFactory = options.contextFactory ?? (() => new AudioContext());
  let context: AudioContext | null = null;
  let activeVoices = 0;
  const oscillators = new Set<OscillatorNode>();

  const ensureContext = (): AudioContext | null => {
    if (typeof AudioContext === "undefined" && !options.contextFactory)
      return null;
    try {
      context ??= contextFactory();
      if (context.state === "suspended") void context.resume();
      return context;
    } catch {
      return null;
    }
  };

  return {
    play(event) {
      if (activeVoices >= maxVoices || settings.sfx <= 0) return false;
      const engine = ensureContext();
      if (!engine) return false;
      const spec = audioEventSpecs[event];
      try {
        const now = engine.currentTime;
        const oscillator = engine.createOscillator();
        const gain = engine.createGain();
        oscillator.type = spec.wave;
        oscillator.frequency.setValueAtTime(spec.from, now);
        oscillator.frequency.exponentialRampToValueAtTime(
          spec.to,
          now + spec.duration
        );
        gain.gain.setValueAtTime(spec.volume * settings.sfx, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + spec.duration);
        oscillator.connect(gain).connect(engine.destination);
        activeVoices += 1;
        oscillators.add(oscillator);
        const release = () => {
          if (!oscillators.delete(oscillator)) return;
          activeVoices = Math.max(0, activeVoices - 1);
        };
        oscillator.addEventListener("ended", release, { once: true });
        oscillator.start(now);
        oscillator.stop(now + spec.duration);
        return true;
      } catch {
        return false;
      }
    },
    setSettings(next) {
      settings = normalizeAudioSettings({ ...settings, ...next });
      return settings;
    },
    getSettings() {
      return settings;
    },
    getActiveVoices() {
      return activeVoices;
    },
    dispose() {
      oscillators.forEach(oscillator => {
        try {
          oscillator.stop();
        } catch {
          /* já encerrado */
        }
      });
      oscillators.clear();
      activeVoices = 0;
      void context?.close();
      context = null;
    },
  };
}
