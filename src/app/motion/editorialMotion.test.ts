import test from "node:test";
import assert from "node:assert/strict";
import {
  computeStaggerDelay,
  computeRtlSlideDirection,
  clampReadingProgress,
  computeMagneticPull,
  detectTextDirection,
  isTrackingPixelDimensions,
} from "./editorialMotion";

test("computeStaggerDelay scales linearly and caps at maxDelaySec", () => {
  assert.equal(computeStaggerDelay(0), 0);
  assert.equal(computeStaggerDelay(-3), 0);
  assert.equal(computeStaggerDelay(1, 0.025, 0.2), 0.025);
  assert.equal(computeStaggerDelay(4, 0.025, 0.2), 0.1);
  assert.equal(computeStaggerDelay(25, 0.025, 0.2), 0.2);
});

test("computeRtlSlideDirection returns RTL-accurate slide polarity", () => {
  const order = ["reader", "editorial", "visual_flow", "graph"] as const;
  assert.equal(computeRtlSlideDirection("reader", "editorial", order), -1);
  assert.equal(computeRtlSlideDirection("graph", "reader", order), 1);
  assert.equal(computeRtlSlideDirection("reader", "reader", order), 0);
  assert.equal(computeRtlSlideDirection("unknown", "reader", order), 0);
});

test("clampReadingProgress returns [0, 1] safely across edge cases", () => {
  assert.equal(clampReadingProgress(0, 1000, 500), 0);
  assert.equal(clampReadingProgress(250, 1000, 500), 0.5);
  assert.equal(clampReadingProgress(600, 1000, 500), 1);
  assert.equal(clampReadingProgress(100, 400, 500), 0);
  assert.equal(clampReadingProgress(-20, 1000, 500), 0);
});

test("computeMagneticPull centers and clamps displacement within budget", () => {
  const rect = { left: 100, top: 100, width: 200, height: 60 };
  assert.deepEqual(computeMagneticPull(200, 130, rect), { x: 0, y: 0 });
  const pull = computeMagneticPull(210, 140, rect, 0.2, 4);
  assert.equal(pull.x, 2);
  assert.equal(pull.y, 2);
  const clamped = computeMagneticPull(500, 500, rect, 0.2, 4);
  assert.equal(clamped.x, 4);
  assert.equal(clamped.y, 4);
});

test("detectTextDirection distinguishes Persian/Arabic RTL from English LTR prose", () => {
  assert.equal(detectTextDirection("هوش مصنوعی در موسیقی؛ از آهنگ‌سازی تا هویت هنری"), "rtl");
  assert.equal(detectTextDirection("Digital Borders Exposed: an online launch by Protect Not Surveil"), "ltr");
  assert.equal(detectTextDirection("گزارش OpenAI درباره GPT"), "rtl");
  assert.equal(detectTextDirection(""), "rtl");
});

test("isTrackingPixelDimensions rejects 1x1 RSS beacons and accepts editorial images", () => {
  assert.equal(isTrackingPixelDimensions(1, 1), true);
  assert.equal(isTrackingPixelDimensions(0, 0), true);
  assert.equal(isTrackingPixelDimensions(800, 1), true);
  assert.equal(isTrackingPixelDimensions(640, 480), false);
});
