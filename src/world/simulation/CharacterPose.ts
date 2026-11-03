/** Joint locations keep the existing articulated capsule limbs connected throughout a stride. */
export function legPose(swing: number, side: number) {
  const upper = swing * side, lower = upper + Math.max(0, -upper) * 1.1;
  const hip = { y: .79, z: 0 }, knee = { y: hip.y - Math.cos(upper) * .34, z: Math.sin(upper) * .34 };
  const ankle = { y: knee.y - Math.cos(lower) * .34, z: knee.z + Math.sin(lower) * .34 };
  return { hip, knee, ankle, upperRotation: -upper, lowerRotation: -lower };
}
