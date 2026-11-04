import { inStationRect, stationBodyBlocked, stationSupport } from '../generation/StationLayout.ts';
import type { StationSpatial, StationPoint } from '../generation/StationLayout.ts';

export const BOARDING_CLEARANCE = { radius: .25, height: 1.65, maxGap: .08, maxSillError: .02, sampleStep: .025 } as const;
export interface PlatformDoorOpening { minX: number; maxX: number; bottomY: number; topY: number; z: number }
export interface StationBoardingApproach {
  clear: boolean; reason: 'CLEAR' | 'OUTSIDE_FRONTAGE' | 'SILL_MISMATCH' | 'INVALID_GAP' | 'NARROW_OPENING' | 'BLOCKED_APPROACH' | 'UNSUPPORTED_APPROACH' | 'UNSAFE_WAITING';
  waitingPoint: StationPoint; platformPoint: StationPoint; edgePoint: StationPoint; thresholdPoint: StationPoint;
  /** Platform walk followed by a short, conditional step across the normal platform/train gap. No live NPC graph edge. */
  path: StationPoint[]; gap: number; sillError: number; pedestrianRadius: number; openingWidth: number;
}

/** Geometry only. The caller must additionally require an aligned, stationary train and fully open doors. */
export function stationBoardingApproach(layout: StationSpatial, opening: PlatformDoorOpening): StationBoardingApproach {
  const f = layout.boardingFrontage, c = BOARDING_CLEARANCE, x = (opening.minX + opening.maxX) / 2;
  // This is the existing first east waiting destination, reached through the fare gates and all four flights.
  const waiting = layout.areas.find(a => a.id === 'waiting-east')!;
  const waitingPoint = { x: waiting.minX + 2.2, y: f.y, z: (waiting.minZ + waiting.maxZ) / 2 };
  const platformPoint = { x, y: f.y, z: waitingPoint.z }, edgePoint = { x, y: f.y, z: f.edgeZ };
  const thresholdPoint = { x, y: opening.bottomY, z: opening.z };
  const result: StationBoardingApproach = { clear: false, reason: 'CLEAR', waitingPoint, platformPoint, edgePoint, thresholdPoint,
    path: [waitingPoint, platformPoint, edgePoint, thresholdPoint], gap: f.edgeZ - opening.z,
    sillError: opening.bottomY - f.y, pedestrianRadius: c.radius, openingWidth: opening.maxX - opening.minX };
  const fail = (reason: StationBoardingApproach['reason']) => ({ ...result, reason });
  if (![opening.minX, opening.maxX, opening.bottomY, opening.topY, opening.z].every(Number.isFinite) ||
    opening.minX < f.minX || opening.maxX > f.maxX) return fail('OUTSIDE_FRONTAGE');
  if (Math.abs(result.sillError) > c.maxSillError) return fail('SILL_MISMATCH');
  if (result.gap < 0 || result.gap > c.maxGap) return fail('INVALID_GAP');
  if (result.openingWidth < c.radius * 2 + .1 || opening.topY - opening.bottomY < c.height + .1) return fail('NARROW_OPENING');
  if (!inStationRect(waitingPoint, waiting, c.radius) || waitingPoint.z - c.radius < f.safeWaitingMinZ) return fail('UNSAFE_WAITING');
  for (let i = 1; i < result.path.length; i++) {
    const a = result.path[i - 1], b = result.path[i], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / c.sampleStep));
    for (let j = 0; j <= n; j++) {
      const t = j / n, q = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
      if (stationBodyBlocked(layout, q.x, q.z, q.y, c.radius)) return fail('BLOCKED_APPROACH');
      // The sole exception to platform support is the measured <=80mm step straight into this doorway.
      if (q.z >= f.edgeZ && stationSupport(layout, q.x, q.z, f.y) === null) return fail('UNSUPPORTED_APPROACH');
    }
  }
  return { ...result, clear: true };
}
