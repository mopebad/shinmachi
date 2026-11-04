export const MAX_TRAFFIC_VOICE_GAIN = .045;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (lo: number, hi: number, v: number) => { const t = clamp((v - lo) / (hi - lo), 0, 1); return t * t * (3 - 2 * t); };

/** Distance attenuation owns the vehicle mix; traffic panners only position it. */
export function trafficVoiceMix(kind: string, speed: number, distance: number,acceleration=0,wet=false) {
  const motion = smooth(.3, 7, Number.isFinite(speed) ? clamp(speed, 0, 24) : 0);
  const d = Number.isFinite(distance) ? Math.max(0, distance) : 32, heavy = kind === 'truck'||kind==='van',kei=kind==='kei',hybrid=kind==='hybrid';
  const premium=['luxury','wagon','crossover','modern'].includes(kind),sport=kind==='coupe'||kind==='executive';
  const load=Number.isFinite(acceleration)?clamp(acceleration/2,-1,1):0;
  const attenuation = 1 / (1 + (d / 8) ** 2) * (1 - smooth(24, 32, d));
  let engineGain = (.004 + .013 * motion) * (heavy ? 1.15 : hybrid?.35:premium?.8:1)*(1+Math.max(0,load)*.4+Math.min(0,load)*.35), tireGain = .024 * motion ** 1.4*(wet?1.35:1);
  const cap = Math.min(1, MAX_TRAFFIC_VOICE_GAIN / (engineGain + tireGain)); engineGain *= attenuation * cap; tireGain *= attenuation * cap;
  return { engineGain, tireGain, engineHz: (heavy ? 31 : kei?67:hybrid?76:sport?49:44) + (heavy ? 32 : sport?68:kei?61:45) * Math.sqrt(motion)+Math.max(0,load)*12, tireLowpassHz: (wet?1800:1300) + 1800 * motion, playbackRate: .85 + .55 * motion };
}
