/** Joint locations keep the existing articulated capsule limbs connected throughout a stride. */
export function legPose(swing: number, side: number) {
  const upper = swing * side, lower = upper + Math.max(0, -upper) * 1.1;
  const hip = { y: .79, z: 0 }, knee = { y: hip.y - Math.cos(upper) * .34, z: Math.sin(upper) * .34 };
  const ankle = { y: knee.y - Math.cos(lower) * .34, z: knee.z + Math.sin(lower) * .34 };
  return { hip, knee, ankle, upperRotation: -upper, lowerRotation: -lower };
}

/** Visual ground contact on the existing flat roads, raised walks and marked curb approaches. */
export function pedestrianSurfaceHeight(x: number, z: number): number {
  const ramp = (v: number, lo: number, hi: number) => { const t = Math.max(0, Math.min(1, (v - lo) / (hi - lo))); return .03 + t * t * (3 - 2 * t) * .085; };
  if (Math.abs(z + 25) < 2.15 && Math.abs(x) > 5.7) return .012;
  if (x > 27.5 && x < 32.4 && Math.abs(z - 12) > 7) return .012;
  if ((Math.abs(z - 2.6) < 1.4 || Math.abs(z - 21.4) < 1.4) && Math.abs(x) < 4.55) return ramp(Math.abs(x), 3.3, 4.4);
  if (Math.abs(Math.abs(x) - 7.8) < 1.2 && Math.abs(z - 12) < 6.2) return ramp(Math.abs(z - 12), 4.5, 5.8);
  if (Math.abs(x) < 3.7 || Math.abs(z - 12) < 5) return .03;
  return .115;
}
