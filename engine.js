import kaplay from "https://unpkg.com/kaplay@3001.0.19/dist/kaplay.mjs";

kaplay({
  width: 800,
  height: 600,
  letterbox: true,
  stretch: true,
  pixelDensity: Math.min(2, window.devicePixelRatio || 1),
  background: [191, 227, 240],
  font: "monospace",
  debug: false,
  global: true,
});

layers(["bg", "fog", "world", "fx", "ui"], "world");

// ---------- drawing performance ----------
// KAPLAY's defaults are costly for the hundreds of small shapes we draw each frame:
// - every multi-point line (which includes every shape outline) adds a full
//   45-segment circle at each joint unless a join style is given;
// - every circle/ellipse uses 45 segments, even a 2px dot.
// These wrappers pick cheaper defaults; anything that passes its own
// `join` / `resolution` keeps it.
function withJoin(fn, join) {
  return (opt) => {
    if (opt.outline && opt.outline.join === undefined) opt = { ...opt, outline: { ...opt.outline, join } };
    return fn(opt);
  };
}
function withResolution(fn) {
  return (opt) => {
    if (opt.resolution === undefined) {
      const r = Math.max(opt.radius ?? 0, opt.radiusX ?? 0, opt.radiusY ?? 0);
      opt = { ...opt, resolution: Math.min(1, Math.max(0.2, r / 20)) };
    }
    return fn(opt);
  };
}
const baseDrawLines = window.drawLines;
window.drawLines = (opt) => baseDrawLines(opt.join === undefined ? { ...opt, join: "none" } : opt);
window.drawCircle = withResolution(withJoin(window.drawCircle, "none"));
window.drawEllipse = withResolution(withJoin(window.drawEllipse, "none"));
window.drawRect = withJoin(window.drawRect, "miter");
window.drawPolygon = withJoin(window.drawPolygon, "miter");
window.drawTriangle = withJoin(window.drawTriangle, "miter");
