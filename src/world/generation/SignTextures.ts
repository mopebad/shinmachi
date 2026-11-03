import * as THREE from 'three';
import { SIGN_NAMES } from './SignCatalog.ts';
import { ATLAS_SIZE, ATLAS_GUTTER, SIGN_FONT, fittedRun, packSignFaces, signTextLayout } from './SignLayout.ts';
import type { SignFace, TextRun } from './SignLayout.ts';

export function measureSignInk(c: CanvasRenderingContext2D, text: string, size: number, font = SIGN_FONT) {
  c.font = `700 ${size}px ${font}`;
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  const m = c.measureText(text);
  return { width: m.width, left: m.actualBoundingBoxLeft, right: m.actualBoundingBoxRight, ascent: m.actualBoundingBoxAscent, descent: m.actualBoundingBoxDescent };
}
export function drawRun(c: CanvasRenderingContext2D, run: TextRun, font = SIGN_FONT): void {
  c.save(); c.translate(run.x, run.y); c.rotate(run.rotation); c.font = `700 ${run.size}px ${font}`;
  c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText(run.text, 0, 0); c.restore();
}
export function signTextureSettings(t: THREE.CanvasTexture): THREE.CanvasTexture {
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.anisotropy = 8; return t;
}

/** The measured layout and the sampled UV rectangle share exactly the same pixel dimensions. */
export function createSignAtlas(faces: readonly SignFace[]) {
  const entries = packSignFaces(faces), textures: THREE.CanvasTexture[] = [];
  for (let page = 0; page <= Math.max(-1, ...entries.map(e => e.page)); page++) {
    const onPage = entries.filter(e => e.page === page), source = document.createElement('canvas');
    source.width = ATLAS_SIZE; source.height = Math.min(ATLAS_SIZE, THREE.MathUtils.ceilPowerOfTwo(Math.max(...onPage.map(e => e.y + e.height + ATLAS_GUTTER))));
    const c = source.getContext('2d')!, layouts: { index: number; width: number; height: number; runs: TextRun[] }[] = [];
    for (const e of onPage) {
      const content = SIGN_NAMES[e.index]; if (!content) throw new RangeError(`Unknown sign identity ${e.index}`);
      const [title, subtitle, bg, fg] = content;
      c.fillStyle = bg; c.fillRect(e.x - ATLAS_GUTTER, e.y - ATLAS_GUTTER, e.width + ATLAS_GUTTER * 2, e.height + ATLAS_GUTTER * 2);
      c.save(); c.translate(e.x, e.y); c.beginPath(); c.rect(0, 0, e.width, e.height); c.clip();
      const border = Math.min(e.width, e.height) * .022;
      c.strokeStyle = fg; c.globalAlpha = .5; c.lineWidth = border; c.strokeRect(border, border, e.width - border * 2, e.height - border * 2); c.globalAlpha = 1;
      const measure = (s: string, size: number) => measureSignInk(c, s, size);
      const lines = e.index === 35 ? ['ATM', '宅配便', '公共料金・切手'] : e.index === 40 ? ['24', '時間営業'] : null;
      const runs = lines ? lines.map((text, i) => fittedRun(text, { x: e.width * .08, y: e.height * (.1 + i * .8 / lines.length), width: e.width * .84, height: e.height * .72 / lines.length }, e.height * (e.index === 40 && i === 0 ? .42 : .24), measure)) : signTextLayout(title, subtitle, e.width, e.height, measure);
      c.fillStyle = fg; runs.forEach(r => drawRun(c, r));
      // Original AoZora fascia: one amber rule, not another brand's stripe pattern or logo.
      if (e.index === 32) { c.fillStyle = '#c68e32'; c.fillRect(e.width * .02, e.height * .93, e.width * .96, e.height * .035); }
      layouts.push({ index: e.index, width: e.width, height: e.height, runs }); c.restore();
    }
    const texture = signTextureSettings(new THREE.CanvasTexture(source)); texture.userData.layouts = layouts; textures.push(texture);
  }
  return { entries, textures };
}
