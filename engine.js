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
