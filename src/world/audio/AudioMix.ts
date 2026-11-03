export const MAX_TRAFFIC_VOICE_GAIN = .045;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (lo: number, hi: number, v: number) => { const t = clamp((v - lo) / (hi - lo), 0, 1); return t * t * (3 - 2 * t); };

/** Distance attenuation owns the vehicle mix; traffic panners only position it. */
export function trafficVoiceMix(kind: string, speed: number, distance: number) {
  const motion = smooth(.5, 16, Number.isFinite(speed) ? clamp(speed, 0, 24) : 0);
  const d = Number.isFinite(distance) ? Math.max(0, distance) : 32, heavy = kind === 'truck';
  const attenuation = 1 / (1 + (d / 8) ** 2) * (1 - smooth(24, 32, d));
  let engineGain = (.004 + .013 * motion) * (heavy ? 1.15 : 1), tireGain = .024 * motion ** 1.4;
  const cap = Math.min(1, MAX_TRAFFIC_VOICE_GAIN / (engineGain + tireGain)); engineGain *= attenuation * cap; tireGain *= attenuation * cap;
  return { engineGain, tireGain, engineHz: (heavy ? 31 : 44) + (heavy ? 32 : 45) * Math.sqrt(motion), tireLowpassHz: 1300 + 1800 * motion, playbackRate: .85 + .55 * motion };
}
