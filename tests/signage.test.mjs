import test from 'node:test';
import assert from 'node:assert/strict';
import { ATLAS_SIZE, ATLAS_GUTTER, faceKey, fittedRun, packSignFaces, signAtlasUv, signDimensions, signEmission, signTextLayout, verticalRuns } from '../src/world/generation/SignLayout.ts';
import { SHOP_NAMES, SIGN_NAMES, KONBINI_SIGNS, storefrontSign } from '../src/world/generation/SignCatalog.ts';
import { businessOpen, signBusiness } from '../src/world/simulation/WorldRules.ts';

// Asymmetric ink boxes catch alignment errors; browser review also uses actual system glyph metrics.
const measure = (text, size) => ({ width: text.length * size, left: size * .07, right: Math.max(.2, text.length - .12) * size, ascent: size * .82, descent: size * .19 });
const contains = (outer, inner) => inner.x >= outer.x - 1e-6 && inner.y >= outer.y - 1e-6 && inner.x + inner.width <= outer.x + outer.width + 1e-6 && inner.y + inner.height <= outer.y + outer.height + 1e-6;

test('actual-aspect sign sources retain round glyph scale within a bounded resolution', () => {
  for (const [width, height] of [[6.4,.54],[.7,3.2],[.66,1.7],[.45,.33],[1.2,.72],[.12,6]]) {
    const px = signDimensions(width, height);
    assert.ok(Math.max(px.width, px.height) <= 1536);
    assert.ok(Math.abs(px.width / px.height / (width / height) - 1) < .025);
  }
  for (const invalid of [0, -1, NaN, Infinity]) assert.throws(() => signDimensions(invalid, 1), RangeError);
});

test('packed sign faces deduplicate and preserve non-overlapping mipmap gutters across pages', () => {
  const faces = SIGN_NAMES.flatMap((_, index) => [[6,.6],[.7,3.2],[.85,1],[1.2,.7]].map(([width,height]) => ({ index, width, height, business: 3 })));
  const entries = packSignFaces([...faces, ...faces]);
  assert.equal(entries.length, new Set(faces.map(faceKey)).size);
  assert.ok(entries.some(e => e.page > 0));
  for (const e of entries) {
    assert.ok(contains({x:ATLAS_GUTTER,y:ATLAS_GUTTER,width:ATLAS_SIZE-2*ATLAS_GUTTER,height:ATLAS_SIZE-2*ATLAS_GUTTER},e));
    const uv = signAtlasUv(e, ATLAS_SIZE, ATLAS_SIZE);
    assert.ok(uv.every(n => n > 0 && n < 1));
    assert.ok(uv[0] * ATLAS_SIZE > e.x && uv[2] * ATLAS_SIZE < e.x + e.width);
    assert.ok((1 - uv[5]) * ATLAS_SIZE > e.y && (1 - uv[1]) * ATLAS_SIZE < e.y + e.height);
    for (const b of entries) if (e !== b && e.page === b.page) assert.ok(e.x + e.width + 2*ATLAS_GUTTER <= b.x || b.x + b.width + 2*ATLAS_GUTTER <= e.x || e.y + e.height + 2*ATLAS_GUTTER <= b.y || b.y + b.height + 2*ATLAS_GUTTER <= e.y);
  }
});

test('every Japanese sign fits its measured ink without compressed or clipped text', () => {
  for (const [title, subtitle] of SIGN_NAMES) for (const ratio of [.15,.22,.45,.7,.9,1.3,2,4,12]) {
    const {width,height} = signDimensions(ratio*2,2), area = {x:0,y:0,width,height};
    for (const run of signTextLayout(title, subtitle, width, height, measure)) {
      assert.ok(run.size > 0 && Number.isFinite(run.x + run.y + run.rotation));
      assert.ok(contains(area, run.bounds), `${title} at ${ratio}: ${JSON.stringify(run)}`);
    }
  }
  assert.deepEqual(signTextLayout('青空マート','',256,256,measure).map(r=>r.text),['青空','マート']);
  assert.deepEqual(signTextLayout('おにぎり・お弁当','',320,240,measure).map(r=>r.text),['おにぎり','お弁当']);
  const runs = verticalRuns('青空マート',{x:0,y:0,width:100,height:600},measure);
  assert.equal(runs[3].text,'ー'); assert.equal(runs[3].rotation,Math.PI/2);
  assert.ok(runs.filter(r=>r.text!=='ー').every(r=>r.rotation===0));
  assert.ok(contains({x:20,y:10,width:40,height:100}, fittedRun('カラオケ',{x:20,y:10,width:40,height:100},150,measure).bounds));
});

test('store identity, service notices and 24-hour lighting remain coherent', () => {
  assert.equal(SHOP_NAMES.length,32); assert.equal(SHOP_NAMES[12][0],'青空マート');
  assert.equal(storefrontSign('convenience',14),12); assert.equal(storefrontSign('retail',8),8);
  assert.equal(storefrontSign('office',1),15); assert.equal(storefrontSign('apartment',8),15);
  for (const index of Object.values(KONBINI_SIGNS)) assert.ok(SIGN_NAMES[index]);
  assert.match(SIGN_NAMES[KONBINI_SIGNS.services][0],/ATM・宅配便/);
  assert.equal(SIGN_NAMES[KONBINI_SIGNS.hours][0],'24');
  for (const hour of [0,3,12,21,23.9]) assert.equal(businessOpen(signBusiness(12),hour),true);
  for (const n of [-1,0,.5,1,2]) assert.ok(signEmission(n) >= .045 && signEmission(n) <= .4);
  assert.ok(signEmission(0) < signEmission(1));
  assert.equal(SIGN_NAMES[16][0],'新町駅'); assert.equal(SIGN_NAMES[23][0],'東口商店街');
  assert.ok(SIGN_NAMES.flat().every(s=>!s.includes('\ufffd')));
});
