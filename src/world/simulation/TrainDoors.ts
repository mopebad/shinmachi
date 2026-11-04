import { STATION, createStationLayout } from '../generation/StationLayout.ts';
import { RAIL_PLATFORM, RAIL_VEHICLE, railGeometry, stoppingEnvelope } from './RailGeometry.ts';
import { stationBoardingApproach } from './StationBoardingAccess.ts';
import type { StationBoardingApproach } from './StationBoardingAccess.ts';

export const TRAIN_DOOR = {
  width: RAIL_VEHICLE.doorWidth, height: 1.85, centerY: 8.38,
  leafWidth: RAIL_VEHICLE.doorWidth / 2, leafTravel: .55,
  panelZ: 1.38, panelDepth: .02, sillOuterZ: RAIL_VEHICLE.halfWidth,
} as const;
export type DoorState = 'CLOSED' | 'OPENING' | 'OPEN' | 'CLOSING';
export interface DoorSafety { x: number; velocity: number; active: boolean; atStation: boolean }
export interface TrainDoorDefinition { id: string; car: number; door: number; side: -1 | 1; localX: number }
export interface DoorOpening {
  minX: number; maxX: number; bottomY: number; topY: number; z: number;
  normal: { x: number; y: number; z: number }; width: number;
}
export interface TrainDoorSnapshot extends TrainDoorDefinition {
  state: DoorState; fraction: number; leafSpeed: number; obstructed: boolean; closedConfirmed: boolean;
  obstructionSources: string[];
  platformSide: boolean; opening: DoorOpening; clearOpening: DoorOpening;
  boarding: {
    platformPoint: { x: number; y: number; z: number } | null;
    thresholdPoint: { x: number; y: number; z: number };
    interiorPoint: { x: number; y: number; z: number };
    aligned: boolean; doorPassable: boolean;
    platformBarrier: 'OPEN_PLATFORM' | 'NO_PLATFORM'; passengerAccess: boolean;
    /** Physical access and NPC boarding permission are deliberately separate. */
    npcBoardingEnabled: boolean; approach: StationBoardingApproach | null;
  };
}

export function trainDoorDefinitions(): TrainDoorDefinition[] {
  return railGeometry().centers.flatMap((x, car) => ([-1, 1] as const).flatMap(side =>
    RAIL_VEHICLE.doorOffsets.map((dx, door) => ({ id: `car-${car + 1}-${side > 0 ? 'south' : 'north'}-${door + 1}`, car, door, side, localX: x + dx }))));
}

/** Full consist + opening frontage, zero velocity and a committed station hold are required. */
export function trainDoorsAligned(s: DoorSafety): boolean {
  const envelope = stoppingEnvelope();
  return Number.isFinite(s.x) && s.active && s.atStation && s.velocity === 0 &&
    Math.abs(s.x - RAIL_PLATFORM.stopX) <= RAIL_PLATFORM.tolerance + 1e-10 &&
    s.x >= envelope.minCenterX && s.x <= envelope.maxCenterX;
}

interface Actuator extends TrainDoorDefinition {
  state: DoorState; fraction: number; leafSpeed: number; obstructed: boolean;
  origin: number; target: number; elapsed: number; duration: number;
  obstructionSources: Set<string>;
}

/** Authoritative door actuators. Meshes only read snapshots; they never advance a timer. */
export class TrainDoors {
  private readonly platformLayout = createStationLayout();
  private readonly approachCache = new Map<string, { x: number; approach: StationBoardingApproach }>();
  private readonly actuators: Actuator[] = trainDoorDefinitions().map(d => ({ ...d,
    state: 'CLOSED', fraction: 0, leafSpeed: 0, obstructed: false, obstructionSources: new Set<string>(), origin: 0, target: 0, elapsed: 0, duration: 0 }));

  get allClosed(): boolean { return this.actuators.every(d => d.state === 'CLOSED' && d.fraction === 0 && d.leafSpeed === 0 && !d.obstructed); }
  get platformDoorsOpen(): boolean { return this.actuators.filter(d => d.side === 1).every(d => d.state === 'OPEN' && d.fraction === 1); }
  get obstructed(): boolean { return this.actuators.some(d => d.obstructed); }
  get remainingSeconds(): number { return Math.max(0, ...this.actuators.map(d => d.duration - d.elapsed)); }

  setObstructed(id: string, blocked: boolean, safety: DoorSafety, source = 'external'): boolean {
    const d = this.actuators.find(d => d.id === id);
    if (!d || d.side !== 1 || (blocked && !trainDoorsAligned(safety))) return false;
    if (blocked) d.obstructionSources.add(source); else d.obstructionSources.delete(source);
    d.obstructed = d.obstructionSources.size > 0; return true;
  }
  open(seconds: number, safety: DoorSafety): boolean {
    if (!trainDoorsAligned(safety) || !Number.isFinite(seconds) || seconds <= 0) return false;
    this.command(1, seconds); return true;
  }
  close(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Invalid door closing duration');
    this.command(0, seconds);
  }
  private command(target: number, seconds: number): void {
    for (const d of this.actuators) {
      if (d.side !== 1) continue; // The north side has no platform, including on return services.
      if (d.target === target && ((target === 1 && d.state === 'OPENING') || (target === 0 && d.state === 'CLOSING'))) continue;
      d.origin = d.fraction; d.target = target; d.elapsed = 0;
      d.duration = seconds * Math.abs(target - d.origin); d.leafSpeed = 0;
      d.state = d.duration > 1e-10 ? target === 1 ? 'OPENING' : 'CLOSING' : target === 1 ? 'OPEN' : 'CLOSED';
    }
  }
  update(dt: number): void {
    if (!Number.isFinite(dt) || dt < 0) throw new Error('Invalid door timestep');
    for (const d of this.actuators) {
      if (d.state !== 'OPENING' && d.state !== 'CLOSING') continue;
      // Obstruction is a physical safety input; never acknowledge a blocked closed limit.
      if (d.state === 'CLOSING' && d.obstructed) { d.leafSpeed = 0; continue; }
      d.elapsed = Math.min(d.duration, d.elapsed + dt);
      const u = d.elapsed / d.duration;
      d.fraction = d.origin + (d.target - d.origin) * (3 * u * u - 2 * u * u * u);
      d.leafSpeed = TRAIN_DOOR.leafTravel * (d.target - d.origin) * 6 * u * (1 - u) / d.duration;
      if (d.elapsed >= d.duration - 1e-10) { d.fraction = d.target; d.leafSpeed = 0; d.state = d.target === 1 ? 'OPEN' : 'CLOSED'; }
    }
  }
  snapshots(safety: DoorSafety): TrainDoorSnapshot[] {
    const aligned = trainDoorsAligned(safety);
    return this.actuators.map(d => {
      const x = safety.x + d.localX, y = RAIL_VEHICLE.sillY, z = STATION.trackZ + d.side * TRAIN_DOOR.sillOuterZ;
      const width = Math.min(TRAIN_DOOR.width, 2 * TRAIN_DOOR.leafTravel * d.fraction);
      const opening = { minX: x - TRAIN_DOOR.width / 2, maxX: x + TRAIN_DOOR.width / 2,
        bottomY: y, topY: y + TRAIN_DOOR.height, z, normal: { x: 0, y: 0, z: d.side }, width: TRAIN_DOOR.width };
      const platformSide = d.side === 1;
      let approach: StationBoardingApproach | null = null;
      if (platformSide && aligned) {
        let cached = this.approachCache.get(d.id);
        if (!cached || cached.x !== x) {
          cached = { x, approach: stationBoardingApproach(this.platformLayout, opening) }; this.approachCache.set(d.id, cached);
        }
        const a = cached.approach;
        // Return fresh metadata just like the actuator snapshot; callers cannot change authority.
        approach = { ...a, waitingPoint: { ...a.waitingPoint }, platformPoint: { ...a.platformPoint }, edgePoint: { ...a.edgePoint },
          thresholdPoint: { ...a.thresholdPoint }, path: a.path.map(p => ({ ...p })) };
      }
      const doorPassable = platformSide && aligned && d.state === 'OPEN' && d.fraction === 1 && !d.obstructed;
      return { id: d.id, car: d.car, door: d.door, side: d.side, localX: d.localX,
        state: d.state, fraction: d.fraction, leafSpeed: d.leafSpeed, obstructed: d.obstructed,
        obstructionSources: [...d.obstructionSources].sort(),
        closedConfirmed: d.state === 'CLOSED' && d.fraction === 0 && d.leafSpeed === 0 && !d.obstructed,
        platformSide, opening, clearOpening: { ...opening, minX: x - width / 2, maxX: x + width / 2, width },
        boarding: { platformPoint: approach ? { ...approach.platformPoint } : null,
          thresholdPoint: { x, y, z }, interiorPoint: { x, y, z: STATION.trackZ + d.side * .85 },
          aligned: platformSide && aligned && opening.minX >= RAIL_PLATFORM.minX && opening.maxX <= RAIL_PLATFORM.maxX,
          doorPassable, platformBarrier: platformSide ? 'OPEN_PLATFORM' : 'NO_PLATFORM',
          passengerAccess: doorPassable && approach?.clear === true, npcBoardingEnabled: doorPassable && approach?.clear === true, approach } };
    });
  }
}
