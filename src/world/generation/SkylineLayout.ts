import { seededRandom } from '../simulation/WorldRules.ts';

export interface SkylineBuilding { x: number; z: number; width: number; depth: number; floors: number; family: number; layer: number; yaw: number; seed: number }

/** Background-only parcels reserve the existing district, its arterial and tower foundations. */
export function skylineLayout(seed = 72831): SkylineBuilding[] {
  const rng = seededRandom(seed), buildings: SkylineBuilding[] = [];
  const add = (x: number, z: number, width: number, depth: number, floors: number, family: number, layer: number, yaw: number) => {
    const halfX = (Math.abs(Math.cos(yaw)) * width + Math.abs(Math.sin(yaw)) * depth) / 2, halfZ = (Math.abs(Math.cos(yaw)) * depth + Math.abs(Math.sin(yaw)) * width) / 2;
    if (x - halfX < 66 && x + halfX > -66 && z - halfZ < 68 && z + halfZ > -68) return;
    if (x - halfX < 10 && x + halfX > -22 && z - halfZ < -198 && z + halfZ > -231) return;
    buildings.push({ x, z, width, depth, floors, family, layer, yaw, seed: Math.floor(rng() * 0xffffff) });
  };
  for (const side of [-1, 1]) for (let layer = 0; layer < 4; layer++) for (let i = 0; i < 8; i++) {
    const width = (i === 0 ? 10 : 11) + rng() * (i === 0 ? 3 : 11), depth = 13 + rng() * 14;
    add(side * (18 + i * 23 + layer * 4), -86 - layer * 65 - rng() * 13, width, depth, 5 + Math.floor(rng() * (layer === 0 ? 15 : 27)), (i + layer + (side > 0 ? 2 : 0)) % 5, layer, 0);
  }
  // Cross-street background: visible above/around the nightlife lane's middle-distance blocks.
  for (let layer = 0; layer < 2; layer++) for (let i = 0; i < 7; i++) add(89 + layer * 45 + rng() * 10, -64 + i * 24, 11 + rng() * 12, 14 + rng() * 14, 7 + Math.floor(rng() * 21), (i + 3 * layer) % 5, layer + 1, -Math.PI / 2);
  return buildings;
}
