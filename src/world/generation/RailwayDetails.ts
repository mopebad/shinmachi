import * as THREE from 'three';
import type { CityBatch } from './CityBatch';
import type { Materials } from './Materials';
import { STATION } from './StationLayout';

export function addRailwayDetails(b: CityBatch, m: Materials): void {
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  for (const side of [-1, 1]) {
    const z = -57 + side * 3.77, runs = side > 0 ? [[-70.5,STATION.platformMinX],[STATION.platformMaxX,70.5]] : [[-70.5,70.5]];
    for(const [a,c]of runs){b.b(m.metal,(a+c)/2,6.84,z,c-a,.12,.65);b.b(m.dark,(a+c)/2,6.43,z,c-a,.16,.24);for(const y of [7.33,7.74])b.b(m.metal,(a+c)/2,y,z+side*.26,c-a,.045,.045);}
    for(let x=-69;x<=69;x+=3)if(side<0||x<STATION.platformMinX||x>STATION.platformMaxX)b.b(m.metal,x,7.3,z+side*.26,.045,.94,.045);
  }
  for (let x = -63; x <= 63; x += 9) { b.b(m.dark, x, 5.66, -57, .17, .22, 5.96); b.rod(m.metal, v(x - 2.6, 5.7, -59.85), v(x + 2.6, 5.7, -54.15), .055); b.rod(m.metal, v(x + 2.6, 5.7, -59.85), v(x - 2.6, 5.7, -54.15), .055); }
  for (let x = -60; x <= 60; x += 15) {
    for (const z of [-59.3, -54.7]) b.rod(m.metal, v(x, 10.27, z), v(x, 11.46, z + (z < -57 ? 1.4 : -1.4)), .047);
    for (const z of [-57.75, -56.25]) { b.rod(m.metal, v(x, 11.42, z), v(x, 10.94, z), .025); for (let ring = 0; ring < 4; ring++) b.part('cylinder', m.cream, x, 11.34 - ring * .085, z, .13, .045, .13); }
    if (x < 60) { b.cable(v(x, 11.33, -57.06), v(x + 15, 11.33, -57.06), .19); for (const dx of [3.75, 7.5, 11.25]) b.rod(m.dark, v(x + dx, 11.15, -57.06), v(x + dx, 10.72, -57), .012); }
  }
}
