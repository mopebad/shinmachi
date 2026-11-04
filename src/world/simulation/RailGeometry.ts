import { STATION } from '../generation/StationLayout.ts';

/** Shared with the actual instanced meshes, including projecting cab lamps and handles. */
export const RAIL_VEHICLE = {
  cars: 3, carLength: 12.8, pitch: 13.1, cabProjection: .0625,
  doorOffsets: [-3.6, 3.6], doorWidth: 1.06, halfWidth: 1.445,
  sillY: 8.38 - 1.85 / 2,
} as const;

export function railGeometry(cars: number = RAIL_VEHICLE.cars) {
  const centers = Array.from({ length: cars }, (_, i) => (i - (cars - 1) / 2) * RAIL_VEHICLE.pitch);
  const bodyHalfLength = ((cars - 1) * RAIL_VEHICLE.pitch + RAIL_VEHICLE.carLength) / 2;
  const halfLength = bodyHalfLength + RAIL_VEHICLE.cabProjection;
  return { cars, centers, bodyHalfLength, halfLength, length: halfLength * 2,
    doors: centers.flatMap(x => RAIL_VEHICLE.doorOffsets.map(dx => x + dx)) };
}

/** One metre at each guarded end is deliberately excluded from the usable frontage. */
export const RAIL_PLATFORM = {
  minX: STATION.platformMinX + STATION.boardingEndInset, maxX: STATION.platformMaxX - STATION.boardingEndInset,
  stopX: (STATION.platformMinX + STATION.platformMaxX) / 2, tolerance: .05,
} as const;

export function stoppingEnvelope(cars: number = RAIL_VEHICLE.cars) {
  const geometry = railGeometry(cars);
  const minCenterX = RAIL_PLATFORM.minX + geometry.halfLength;
  const maxCenterX = RAIL_PLATFORM.maxX - geometry.halfLength;
  return { ...geometry, minCenterX, maxCenterX, fits: minCenterX <= maxCenterX };
}
