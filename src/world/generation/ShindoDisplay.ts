/** Pure layout helpers for the in-world Shindo music display.
 * Keep track titles intact: a long name pauses at each end and scrolls through its full width. */
export const SHINDO_MARQUEE = {
  startHold: 1.8,
  endHold: 1.4,
  pixelsPerSecond: 72,
} as const;

export function shindoMarqueeOffset(elapsed: number, textWidth: number, visibleWidth: number): number {
  if (![elapsed, textWidth, visibleWidth].every(Number.isFinite) || textWidth <= visibleWidth || visibleWidth <= 0) return 0;
  const overflow = textWidth - visibleWidth;
  const travel = overflow / SHINDO_MARQUEE.pixelsPerSecond;
  const cycle = SHINDO_MARQUEE.startHold + travel + SHINDO_MARQUEE.endHold;
  const phase = Math.max(0, elapsed) % cycle;
  return Math.max(0, Math.min(overflow, (phase - SHINDO_MARQUEE.startHold) * SHINDO_MARQUEE.pixelsPerSecond));
}

/** Unknown or infinite media duration (including live streams) has no finite progress bar. */
export function shindoPlaybackProgress(time: number, duration: number): number | null {
  if (!Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0) return null;
  return Math.max(0, Math.min(1, time / duration));
}
