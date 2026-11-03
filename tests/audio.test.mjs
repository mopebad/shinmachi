import test from 'node:test';
import assert from 'node:assert/strict';
import { trafficVoiceMix, MAX_TRAFFIC_VOICE_GAIN } from '../src/world/audio/AudioMix.ts';
const gain = m => m.engineGain + m.tireGain;
test('stationary traffic has no tire hiss and a quiet idle', () => {
  const idle = trafficVoiceMix('compact', 0, 0); assert.equal(idle.tireGain, 0); assert.ok(idle.engineGain <= .004);
});
test('traffic fades with distance and is silent beyond 32 metres', () => {
  const values = [0, 4, 8, 16, 24, 28, 31, 32, 40].map(d => gain(trafficVoiceMix('taxi', 10, d)));
  values.forEach((v, i) => { if (i) assert.ok(v <= values[i - 1]); }); assert.equal(values.at(-2), 0); assert.equal(values.at(-1), 0);
});
test('four nearby vehicles respect the gain budget across speeds and types', () => {
  for (const kind of ['compact', 'taxi', 'van', 'truck']) for (const speed of [0, .5, 3, 8, 16, 24, 100]) assert.ok(gain(trafficVoiceMix(kind, speed, 0)) <= MAX_TRAFFIC_VOICE_GAIN + 1e-12);
  assert.ok(MAX_TRAFFIC_VOICE_GAIN * 4 <= .18);
});
test('invalid positions are silent and all audio parameters stay finite', () => {
  const m = trafficVoiceMix('compact', NaN, Infinity); assert.equal(gain(m), 0); assert.ok(Object.values(m).every(Number.isFinite));
});
