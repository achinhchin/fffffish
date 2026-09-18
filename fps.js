// Small FPS counter in the bottom-right corner (updated twice a second).
const label = document.createElement("div");
label.className = "fps-meter";
document.body.append(label);

let frames = 0;
let last = performance.now();
function tick(now) {
  frames++;
  if (now - last >= 500) {
    const fps = Math.round((frames * 1000) / (now - last));
    label.textContent = `${fps} FPS`;
    label.dataset.level = fps >= 50 ? "good" : fps >= 30 ? "ok" : "bad";
    frames = 0;
    last = now;
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
