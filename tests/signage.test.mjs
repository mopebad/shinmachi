import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { signAtlasUv, signTextLayout, signVariantForAspect } from '../src/world/generation/SurfaceTextures.ts';
import { signBusiness } from '../src/world/simulation/WorldRules.ts';

test('sign variants preserve the intended aspect treatment', () => {
  assert.equal(signVariantForAspect(3), 0);
  assert.equal(signVariantForAspect(1), 1);
  assert.equal(signVariantForAspect(.5), 2);
  assert.equal(signVariantForAspect(.2), 3);
});

test('every sign UV rectangle stays inside its atlas cell with an inset', () => {
  for (const aspect of [.2, .45, .8, 1, 2.5, 4]) for (let index = 0; index < 32; index++) {
    const uv = signAtlasUv(index, aspect);
    assert.equal(uv.length, 8);
    assert.ok(uv.every(value => value > 0 && value < 1));
    assert.ok(uv[0] < uv[2] && uv[1] < uv[5]);
    assert.ok(uv[2] - uv[0] < 1 / 16 && uv[5] - uv[1] < 1 / 8);
  }
});

test('sign text layouts reserve bounded title and subtitle areas', () => {
  for (const variant of [0, 1, 2, 3]) {
    const layout = signTextLayout('新町食堂', 'SHINMACHI DINING', variant);
    assert.ok(layout.titleSize > 0 && layout.titleWidth <= 218);
    assert.ok(layout.subtitleWidth <= 206);
    assert.ok(layout.titleY >= 0 && layout.titleY <= 256);
    assert.ok(layout.subtitleY >= 0 && layout.subtitleY <= 256);
  }
});

test('commercial sign identities remain present and aligned with their scheduled businesses', async () => {
  const source = await readFile(new URL('../src/world/generation/Materials.ts', import.meta.url), 'utf8');
  assert.equal((source.match(/\['/g) ?? []).length >= 32, true);
  for (const index of [0, 2, 3, 12, 15, 16, 20, 24, 29, 31]) {
    assert.ok(['restaurant', 'cafe', 'retail', 'convenience', 'office'].includes(signBusiness(index)));
  }
  assert.match(source, /\['新町駅', 'SHINMACHI STATION'/);
  assert.match(source, /\['東口商店街', 'SHINMACHI SHOPPING STREET'/);
  assert.doesNotMatch(source, /(?:æ.|ã.)/);
});
