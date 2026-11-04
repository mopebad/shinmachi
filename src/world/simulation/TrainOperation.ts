import { railServiceOpen } from './WorldRules.ts';
import { RAIL_PLATFORM, stoppingEnvelope } from './RailGeometry.ts';
import { TrainDoors, trainDoorsAligned } from './TrainDoors.ts';

export type TrainState = 'APPROACHING' | 'DECELERATING' | 'STOPPED' | 'DOOR OPENING' | 'DWELLING' |
  'DEPARTURE WARNING' | 'DOOR CLOSING' | 'PREPARING DEPARTURE' | 'ACCELERATING' | 'RUNNING';
type Motion = 'cruise' | 'accelerating' | 'braking' | 'hold';
type Destination = 'station' | 'turnback';
export const TRAIN_DEFAULTS = {
  cruiseSpeed: 4, accelerationSeconds: 8, brakingSeconds: 8,
  stoppedSeconds: 1, dwellSeconds: 24, preparationSeconds: 3,
  doorOpeningSeconds: 2.4, doorClosingSeconds: 2.4, departureWarningSeconds: 3,
  approachDistance: 30, turnbackSeconds: 5,
  // The old passing service already implied track beyond the rendered district.
  // Reverse on that same straight alignment, outside the city, instead of wrapping X.
  westTurnbackX: -130, eastTurnbackX: 200,
} as const;
export type TrainConfig = { [K in keyof typeof TRAIN_DEFAULTS]: number };

/** Browser-independent, continuous kinematics; called by the city's authoritative 30 Hz step.
 * Cubic speed ramps have zero acceleration at both ends. Integrals place the train
 * exactly at its target; event splitting consumes the remainder of each fixed tick.
 */
export class TrainOperation {
  readonly config: Readonly<TrainConfig>;
  private _state: TrainState = 'RUNNING';
  private _x: number;
  private _velocity = 0;
  private _acceleration = 0;
  private _direction: 1 | -1 = 1;
  private _active = false;
  private _serviceOpen = false;
  private _completedStops = 0;
  private _turnbacks = 0;
  private _lastStopError: number | null = null;
  private motion: Motion = 'hold';
  private destination: Destination = 'turnback';
  private parked = true;
  private elapsed = 0;
  private origin = 0;
  private target = 0;
  private readonly doorController = new TrainDoors();
  private _doorReopenings = 0;
  private _doorCycles = 0;
  private readonly passengerHolds = new Set<string>();

  constructor(config: Partial<TrainConfig> = {}) {
    this.config = Object.freeze({ ...TRAIN_DEFAULTS, ...config });
    const c = this.config, envelope = stoppingEnvelope();
    if (!Object.values(c).every(Number.isFinite) || c.cruiseSpeed <= 0 ||
      [c.accelerationSeconds, c.brakingSeconds, c.stoppedSeconds, c.dwellSeconds,
        c.preparationSeconds, c.approachDistance, c.turnbackSeconds, c.doorOpeningSeconds,
        c.doorClosingSeconds, c.departureWarningSeconds].some(v => v <= 0)) throw new Error('Invalid train timing');
    const required = c.cruiseSpeed * (c.accelerationSeconds + c.brakingSeconds) / 2 + c.approachDistance;
    if (!envelope.fits || RAIL_PLATFORM.stopX < envelope.minCenterX + RAIL_PLATFORM.tolerance ||
      RAIL_PLATFORM.stopX > envelope.maxCenterX - RAIL_PLATFORM.tolerance ||
      RAIL_PLATFORM.stopX - c.westTurnbackX <= required || c.eastTurnbackX - RAIL_PLATFORM.stopX <= required) throw new Error('Train or stopping ramps do not fit the route');
    this._x = c.westTurnbackX;
  }
  get snapshot() {
    return { state: this._state, x: this._x, velocity: this._velocity, speed: Math.abs(this._velocity),
      acceleration: this._acceleration, direction: this._direction, active: this._active,
      serviceOpen: this._serviceOpen, service: this.parked ? 'OUT_OF_SERVICE' : this._serviceOpen ? 'IN_SERVICE' : 'FINISHING_SERVICE',
      motion: this.motion, destination: this.destination, stateElapsed: this.elapsed,
      stopX: RAIL_PLATFORM.stopX, stoppingError: this._x - RAIL_PLATFORM.stopX,
      lastStopError: this._lastStopError, completedStops: this._completedStops, turnbacks: this._turnbacks,
      doors: this.doors, allDoorsClosed: this.doorController.allClosed, doorCycles: this._doorCycles,
      doorReopenings: this._doorReopenings,
      passengerHolds: [...this.passengerHolds].sort(), passengerExchangeBusy: this.passengerHolds.size > 0,
      warningLampOn: this._state === 'DOOR CLOSING' || this._state === 'DEPARTURE WARNING' && Math.floor(this.elapsed * 2) % 2 === 0 };
  }
  get x(): number { return this._x; }
  /** Stable IDs, structural/current openings and physical boarding anchors, in world metres. */
  get doors() { return this.doorController.snapshots(this.doorSafety()); }
  private doorSafety() { return { x: this._x, velocity: this._velocity, active: this._active, atStation: this.motion === 'hold' && this.destination === 'station' }; }
  requestDoorsOpen(): boolean {
    if (this._state !== 'STOPPED' || this.elapsed < this.config.stoppedSeconds - 1e-10) return false;
    return this.openDoors(false);
  }
  setDoorObstructed(id: string, blocked: boolean, source = 'external'): boolean {
    return this.doorController.setObstructed(id, blocked, this.doorSafety(), source);
  }
  /** A reserved physical traversal holds the full-open service until its safe endpoint. */
  setPassengerHold(id: string, held: boolean): boolean {
    if (!id || held && !trainDoorsAligned(this.doorSafety())) return false;
    if (held) this.passengerHolds.add(id); else this.passengerHolds.delete(id);
    return true;
  }
  requestDeparture(): boolean {
    if (this._state !== 'PREPARING DEPARTURE' || this.elapsed < this.config.preparationSeconds - 1e-10 ||
      this.passengerHolds.size > 0 || !this.doorController.allClosed || !trainDoorsAligned(this.doorSafety())) return false;
    this.enter('ACCELERATING', 'accelerating', 'turnback'); return true;
  }
  private openDoors(reopening: boolean): boolean {
    if (!this.doorController.open(this.config.doorOpeningSeconds, this.doorSafety())) return false;
    if (reopening) this._doorReopenings++;
    this.enter('DOOR OPENING', 'hold', 'station'); return true;
  }
  update(dt: number, hour: number): void {
    if (!Number.isFinite(dt) || dt < 0 || !Number.isFinite(hour)) throw new Error('Invalid train update');
    this._serviceOpen = railServiceOpen(hour);
    if (this.parked && this._serviceOpen) this.launch();
    let remaining = dt;
    while (remaining > 1e-10 && !this.parked) {
      if ((this._state === 'DOOR CLOSING' || this._state === 'PREPARING DEPARTURE') && (this.doorController.obstructed || this.passengerHolds.size > 0)) {
        if (!this.openDoors(true)) throw new Error('Unsafe train-door reopening');
      }
      if (this._state === 'DOOR OPENING' || this._state === 'DOOR CLOSING') {
        const step = Math.min(remaining, this.doorController.remainingSeconds);
        this.doorController.update(step); this.elapsed += step; remaining -= step;
        if (this._state === 'DOOR OPENING' && this.doorController.platformDoorsOpen) this.enter('DWELLING', 'hold', 'station');
        else if (this._state === 'DOOR CLOSING' && this.doorController.allClosed) {
          this._doorCycles++; this.enter('PREPARING DEPARTURE', 'hold', 'station');
        } else if (step <= 1e-10) break; // An unconfirmed limit never grants departure.
        continue;
      }
      if (this.motion === 'cruise') {
        const brakeDistance = this.config.cruiseSpeed * this.config.brakingSeconds / 2;
        const end = this._direction > 0 ? this.config.eastTurnbackX : this.config.westTurnbackX;
        const boundary = this.destination === 'turnback' ? end - this._direction * brakeDistance :
          RAIL_PLATFORM.stopX - this._direction * (brakeDistance + (this._state === 'RUNNING' ? this.config.approachDistance : 0));
        const duration = Math.max(0, (boundary - this._x) / this._velocity);
        const step = Math.min(remaining, duration);
        this._x += this._velocity * step; this.elapsed += step; remaining -= step;
        if (step >= duration - 1e-10) {
          if (this.destination === 'station' && this._state === 'RUNNING') this.enter('APPROACHING', 'cruise', 'station');
          else this.brake(this.destination === 'station' ? RAIL_PLATFORM.stopX : end);
        }
      } else {
        const duration = this.motion === 'accelerating' ? this.config.accelerationSeconds :
          this.motion === 'braking' ? this.config.brakingSeconds : this.holdDuration();
        const step = Math.min(remaining, Math.max(0, duration - this.elapsed));
        this.elapsed += step; remaining -= step;
        if (this.motion !== 'hold') this.sampleRamp(Math.min(1, this.elapsed / duration), duration);
        if (this.elapsed >= duration - 1e-10) {
          if (this.passengerHolds.size && this.motion === 'hold' && (this._state === 'DWELLING' || this._state === 'DEPARTURE WARNING')) {
            this.elapsed += remaining; remaining = 0;
          } else this.finishPhase();
        }
      }
    }
  }
  private enter(state: TrainState, motion: Motion, destination: Destination): void {
    this._state = state; this.motion = motion; this.destination = destination; this.elapsed = 0; this.origin = this._x;
  }
  private launch(): void {
    if (!this.doorController.allClosed) throw new Error('Train launch interlock refused');
    this.parked = false; this._active = true;
    this.enter('ACCELERATING', 'accelerating', 'station');
  }
  private brake(target: number): void {
    this.target = target;
    this.enter(this.destination === 'station' ? 'DECELERATING' : 'RUNNING', 'braking', this.destination);
  }
  private sampleRamp(u: number, duration: number): void {
    const v = this.config.cruiseSpeed, ramp = 3 * u * u - 2 * u * u * u;
    const integral = u * u * u - u * u * u * u / 2;
    const accelerating = this.motion === 'accelerating';
    this._x = this.origin + this._direction * v * duration * (accelerating ? integral : u - integral);
    this._velocity = this._direction * v * (accelerating ? ramp : 1 - ramp);
    this._acceleration = this._direction * v / duration * 6 * u * (1 - u) * (accelerating ? 1 : -1);
  }
  private holdDuration(): number {
    return this._state === 'STOPPED' ? this.config.stoppedSeconds : this._state === 'DWELLING' ? this.config.dwellSeconds :
      this._state === 'DEPARTURE WARNING' ? this.config.departureWarningSeconds :
        this._state === 'PREPARING DEPARTURE' ? this.config.preparationSeconds : this.config.turnbackSeconds;
  }
  private finishPhase(): void {
    if (this.motion === 'accelerating') {
      this._velocity = this._direction * this.config.cruiseSpeed; this._acceleration = 0;
      this.enter('RUNNING', 'cruise', this.destination);
    } else if (this.motion === 'braking') {
      // Numerical roundoff only: analytic displacement is exactly v*T/2, never a recovery snap.
      if (Math.abs(this._x - this.target) > 1e-7) throw new Error('Train missed its braking target');
      this._x = this.target; this._velocity = 0; this._acceleration = 0;
      if (this.destination === 'station') {
        this._lastStopError = this._x - RAIL_PLATFORM.stopX; this._completedStops++;
        this.enter('STOPPED', 'hold', 'station');
      } else this.enter('RUNNING', 'hold', 'turnback');
    } else if (this._state === 'STOPPED') {
      if (!this.requestDoorsOpen()) throw new Error('Train is not aligned for door opening');
    } else if (this._state === 'DWELLING') this.enter('DEPARTURE WARNING', 'hold', 'station');
    else if (this._state === 'DEPARTURE WARNING') {
      this.doorController.close(this.config.doorClosingSeconds); this.enter('DOOR CLOSING', 'hold', 'station');
    } else if (this._state === 'PREPARING DEPARTURE') {
      if (!this.requestDeparture()) throw new Error('Train departure interlock refused');
    } else {
      this._direction = this._direction === 1 ? -1 : 1; this._turnbacks++;
      if (this._serviceOpen) this.launch();
      else { this.parked = true; this._active = false; }
    }
  }
}
