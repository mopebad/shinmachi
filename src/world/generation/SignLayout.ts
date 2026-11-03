/** Browser-independent sign geometry, packing and measured text layout. Units are source pixels. */
export interface Rect { x: number; y: number; width: number; height: number }
export interface SignFace { index: number; width: number; height: number; business: number }
export interface InkMetrics { left: number; right: number; ascent: number; descent: number; width: number }
export type MeasureInk = (text: string, size: number) => InkMetrics;
export interface TextRun { text: string; x: number; y: number; size: number; rotation: number; bounds: Rect }
export interface AtlasEntry extends Rect { key: string; page: number; index: number }
export const ATLAS_SIZE = 4096;
export const ATLAS_GUTTER = 16;
export const SIGN_FONT = '"Yu Gothic", "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans CJK JP", sans-serif';

export function signDimensions(width: number, height: number): { width: number; height: number } {
  if (![width, height].every(n => Number.isFinite(n) && n > 0)) throw new RangeError('Positive finite sign dimensions required');
  // Enough pixels for pedestrian close-ups; bounded long edge and no power-of-two aspect distortion.
  const density = Math.min(1536 / Math.max(width, height), Math.max(256, 128 / Math.min(width, height)));
  return { width: Math.max(1, Math.round(width * density)), height: Math.max(1, Math.round(height * density)) };
}
export function faceKey(face: Pick<SignFace, 'index' | 'width' | 'height'>): string {
  const size = signDimensions(face.width, face.height); return `${face.index}:${size.width}x${size.height}`;
}

/** Shelf-packed, deduplicated actual-aspect faces. Extra pages are explicit, never silently clipped. */
export function packSignFaces(faces: readonly SignFace[]): AtlasEntry[] {
  const unique = new Map<string, AtlasEntry>();
  for (const face of faces) {
    const key = faceKey(face), size = signDimensions(face.width, face.height);
    if (!unique.has(key)) unique.set(key, { key, ...size, x: 0, y: 0, page: 0, index: face.index });
  }
  const entries = [...unique.values()].sort((a, b) => b.height - a.height || b.width - a.width || a.key.localeCompare(b.key));
  const pages: { usedHeight: number; shelves: { x: number; y: number; height: number }[] }[] = [];
  for (const e of entries) {
    const w = e.width + 2 * ATLAS_GUTTER, h = e.height + 2 * ATLAS_GUTTER;
    // Reuse gaps on earlier shelves instead of abandoning them when one wide sign cannot fit.
    let page = pages.findIndex(p => p.shelves.some(s => s.height >= h && s.x + w <= ATLAS_SIZE));
    if (page < 0) page = pages.findIndex(p => p.usedHeight + h <= ATLAS_SIZE);
    if (page < 0) { page = pages.length; pages.push({ usedHeight: 0, shelves: [] }); }
    const p = pages[page];
    let shelf = p.shelves.filter(s => s.height >= h && s.x + w <= ATLAS_SIZE).sort((a,b) => b.x - a.x)[0];
    if (!shelf) { shelf = { x: 0, y: p.usedHeight, height: h }; p.shelves.push(shelf); p.usedHeight += h; }
    e.x = shelf.x + ATLAS_GUTTER; e.y = shelf.y + ATLAS_GUTTER; e.page = page;
    shelf.x += w;
  }
  return entries;
}

export function signAtlasUv(rect: Rect, atlasWidth: number, atlasHeight: number): number[] {
  // Pixel-centre inset, with 16px extruded colour beyond each face for mipmaps.
  const l = (rect.x + .5) / atlasWidth, r = (rect.x + rect.width - .5) / atlasWidth;
  const b = 1 - (rect.y + rect.height - .5) / atlasHeight, t = 1 - (rect.y + .5) / atlasHeight;
  return [l, b, r, b, r, t, l, t];
}

export function fittedRun(text: string, rect: Rect, maxSize: number, measure: MeasureInk, rotation = 0): TextRun {
  let size = Math.max(.1, maxSize), m = measure(text, size);
  for (let i = 0; i < 8; i++) {
    const w = m.left + m.right, h = m.ascent + m.descent;
    const sx = rotation ? h : w, sy = rotation ? w : h;
    const factor = Math.min(1, rect.width / Math.max(sx, .001), rect.height / Math.max(sy, .001));
    if (factor >= .999) break;
    size *= factor * .98; m = measure(text, size);
  }
  const inkWidth = m.left + m.right, inkHeight = m.ascent + m.descent;
  const width = rotation ? inkHeight : inkWidth, height = rotation ? inkWidth : inkHeight;
  // Place the actual ink centre, not the font's often-asymmetric baseline box.
  const cx = rect.x + rect.width / 2, cy = rect.y + rect.height / 2;
  const dx = (m.right - m.left) / 2, dy = (m.descent - m.ascent) / 2;
  return { text, size, rotation, x: cx - (rotation ? -dy : dx), y: cy - (rotation ? dx : dy), bounds: { x: cx - width / 2, y: cy - height / 2, width, height } };
}

/** Upright Japanese glyphs; the prolonged vowel mark follows vertical typesetting. */
export function verticalRuns(title: string, area: Rect, measure: MeasureInk): TextRun[] {
  const chars = Array.from(title.replace(/\s/g, '')), step = area.height / Math.max(1, chars.length);
  const size = Math.min(area.width * .9, step * .86);
  return chars.map((text, i) => fittedRun(text, { x: area.x, y: area.y + i * step, width: area.width, height: step * .95 }, size, measure, /[ー―（）「」]/.test(text) ? Math.PI / 2 : 0));
}

export function signTextLayout(title: string, subtitle: string, width: number, height: number, measure: MeasureInk): TextRun[] {
  const ratio = width / height, margin = Math.min(width, height) * .09;
  const inner = { x: margin, y: margin, width: width - margin * 2, height: height - margin * 2 };
  if (ratio < .72) return verticalRuns(title, inner, measure);
  const chars = Array.from(title), words = title.split(/[・\s]+/).filter(Boolean), split = title === '青空マート' ? 2 : Math.ceil(chars.length / 2);
  const lines = ratio < 1.6 && chars.length > 4
    ? words.length === 2 ? words : [chars.slice(0, split).join('').trim(), chars.slice(split).join('').trim()] : [title];
  const showSub = subtitle.length > 0 && ratio > 1.2;
  const titleHeight = inner.height * (showSub ? .64 : 1), step = titleHeight / lines.length;
  const runs = lines.map((text, i) => fittedRun(text, { ...inner, y: margin + i * step, height: step * .92 }, Math.min(height * .58, step * .86), measure));
  if (showSub) runs.push(fittedRun(subtitle, { x: margin, y: height * .75, width: inner.width, height: height * .13 }, height * .115, measure));
  return runs;
}

/** Authoritative schedule changes light level, not the contrast of the printed ink. */
export function signEmission(night: number): number { return .045 + Math.max(0, Math.min(1, night)) * .355; }
