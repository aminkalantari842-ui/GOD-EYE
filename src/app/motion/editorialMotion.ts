/**
 * Editorial Motion Choreography & Spring Physics Engine
 * Compositor-first transitions (transform & opacity only) engineered for Kian (Flow).
 */

export const SPRING_SNAPPY = {
  type: "spring" as const,
  stiffness: 520,
  damping: 38,
  mass: 0.65,
};

export const SPRING_SILK = {
  type: "spring" as const,
  stiffness: 340,
  damping: 32,
  mass: 0.8,
};

export const SPRING_POP = {
  type: "spring" as const,
  stiffness: 640,
  damping: 22,
  mass: 0.5,
};

export const EASE_EDITORIAL: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const TRANSITION_FAST = {
  duration: 0.18,
  ease: EASE_EDITORIAL,
};

export const TRANSITION_EDITORIAL = {
  duration: 0.26,
  ease: EASE_EDITORIAL,
};

/**
 * Computes a bounded waterfall stagger delay (in seconds) so the visible viewport
 * cascades crisply while deep items never suffer perceptible latency.
 */
export function computeStaggerDelay(
  index: number,
  stepSec = 0.025,
  maxDelaySec = 0.2
): number {
  if (!Number.isFinite(index) || index <= 0) return 0;
  const raw = index * stepSec;
  return Math.min(maxDelaySec, Math.round(raw * 1000) / 1000);
}

/**
 * Computes directional slide polarity in an RTL workspace tab bar.
 * Moving from an earlier tab (right) to a later tab (left) yields -1,
 * and moving back yields +1. Same or unknown tabs yield 0.
 */
export function computeRtlSlideDirection(
  fromTab: string,
  toTab: string,
  tabOrder: readonly string[]
): -1 | 0 | 1 {
  if (fromTab === toTab) return 0;
  const fromIdx = tabOrder.indexOf(fromTab);
  const toIdx = tabOrder.indexOf(toTab);
  if (fromIdx === -1 || toIdx === -1) return 0;
  return toIdx > fromIdx ? -1 : 1;
}

/**
 * Clamps scroll depth to a unit [0, 1] scalar for GPU-composited `scaleX` progress bars.
 */
export function clampReadingProgress(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number
): number {
  const maxScroll = scrollHeight - clientHeight;
  if (!Number.isFinite(maxScroll) || maxScroll <= 0) return 0;
  if (!Number.isFinite(scrollTop) || scrollTop <= 0) return 0;
  return Math.min(1, Math.max(0, scrollTop / maxScroll));
}

/**
 * Computes subtle magnetic pull displacement (clamped in pixels) toward pointer coordinates.
 */
export function computeMagneticPull(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  strength = 0.16,
  maxDisplacementPx = 4
): { x: number; y: number } {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = (clientX - centerX) * strength;
  const dy = (clientY - centerY) * strength;
  const clamp = (v: number) =>
    Math.max(-maxDisplacementPx, Math.min(maxDisplacementPx, Math.round(v * 100) / 100));
  return { x: clamp(dx), y: clamp(dy) };
}

const RTL_SCRIPT_RE = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
const LTR_SCRIPT_RE = /[A-Za-z\u00C0-\u024F]/g;

/**
 * Detects natural script direction ("rtl" vs "ltr") for multilingual Persian + International feeds
 * so Latin headlines/paragraphs do not suffer reversed punctuation inside an RTL shell.
 */
export function detectTextDirection(text: string | undefined | null): "rtl" | "ltr" {
  if (!text) return "rtl";
  const sample = text.slice(0, 400);
  const rtlCount = (sample.match(RTL_SCRIPT_RE) || []).length;
  const ltrCount = (sample.match(LTR_SCRIPT_RE) || []).length;
  if (rtlCount === 0 && ltrCount > 0) return "ltr";
  if (ltrCount > rtlCount * 2) return "ltr";
  return "rtl";
}

/**
 * Identifies 1x1 / tiny RSS tracking pixels (e.g. FeedBurner, WordPress stats beacons)
 * that report `complete: true` without firing `onError`.
 */
export function isTrackingPixelDimensions(naturalWidth: number, naturalHeight: number): boolean {
  if (!Number.isFinite(naturalWidth) || !Number.isFinite(naturalHeight)) return true;
  return naturalWidth <= 4 || naturalHeight <= 4;
}
