/* ==========================================================================
   Interactive: gradient descent, momentum and Adam on a curved valley
   f(x, y) = (1 − x)² + 5(y − x²)², minimum f = 0 at (1, 1).
   Left: contours and the three paths (click to move the starting point).
   Right: f(θ_t) against t on a log scale. Paths are animated by "Run".
   Requires common.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ;
  const T_MAX = 300, XL = [-2, 2], YL = [-1, 3];
  const f = (x, y) => (1 - x) ** 2 + 5 * (y - x * x) ** 2;
  const grad = (x, y) => [-2 * (1 - x) - 20 * x * (y - x * x), 10 * (y - x * x)];
  const LEVELS = Array.from({ length: 14 }, (_, k) => 0.01 * Math.pow(2, k));

  function path(kind, start, lr, beta, lrAdam) {
    let [x, y] = start, v = [0, 0], m = [0, 0], s = [0, 0];
    const pts = [[x, y]];
    for (let t = 1; t <= T_MAX; t++) {
      const g = grad(x, y);
      if (kind === "gd") { x -= lr * g[0]; y -= lr * g[1]; }
      else if (kind === "mom") { v = [beta * v[0] + g[0], beta * v[1] + g[1]]; x -= lr * v[0]; y -= lr * v[1]; }
      else {
        m = m.map((mi, i) => 0.9 * mi + 0.1 * g[i]);
        s = s.map((si, i) => 0.999 * si + 0.001 * g[i] * g[i]);
        const st = m.map((mi, i) => (mi / (1 - 0.9 ** t)) / (Math.sqrt(s[i] / (1 - 0.999 ** t)) + 1e-8));
        x -= lrAdam * st[0]; y -= lrAdam * st[1];
      }
      if (!isFinite(x) || !isFinite(y) || Math.abs(x) > 1e3 || Math.abs(y) > 1e3) { pts.diverged = t; break; }
      pts.push([x, y]);
    }
    return pts;
  }

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-lr">Learning rate η (GD, momentum) <output id="${id}-lr-out" for="${id}-lr"></output></label>
          <input type="range" id="${id}-lr" min="-3" max="-1.2" step="0.05" value="-2">
        </div>
        <div class="control">
          <label for="${id}-b">Momentum β <output id="${id}-b-out" for="${id}-b"></output></label>
          <input type="range" id="${id}-b" min="0" max="0.98" step="0.01" value="0.9">
        </div>
        <div class="control">
          <label for="${id}-la">Adam step size η <output id="${id}-la-out" for="${id}-la"></output></label>
          <input type="range" id="${id}-la" min="-3" max="-0.7" step="0.05" value="-1.3">
        </div>
        <div class="viz__buttons viz__buttons--row">
          <button type="button" class="btn btn--primary" data-act="run">Run</button>
          <button type="button" class="btn" data-act="end">Show all 300 steps</button>
        </div>
      </div>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">Contours of f and the iterates (click to choose the start)</p>
          <canvas class="viz__canvas" data-c="map" role="img" style="cursor: crosshair"
            aria-label="Contour lines of a curved valley function with its minimum at (1, 1), and the paths taken by gradient descent, momentum and Adam from the same starting point."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">f(θ<sub>t</sub>) against iteration (log scale)</p>
          <canvas class="viz__canvas" data-c="loss" role="img"
            aria-label="Function value against iteration for the three methods on a logarithmic scale."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-curve)">Gradient descent</span>
        <span style="--swatch: var(--viz-path)">Momentum</span>
        <span style="--swatch: var(--viz-c3)">Adam</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cM = stage.querySelector('[data-c="map"]'), cL = stage.querySelector('[data-c="loss"]');
    const lrIn = stage.querySelector(`#${id}-lr`), bIn = stage.querySelector(`#${id}-b`), laIn = stage.querySelector(`#${id}-la`);
    const readout = stage.querySelector(".viz__readout");
    let start = [-1.5, 2], paths, shown = T_MAX, raf = 0, F = null;
    const KINDS = ["gd", "mom", "adam"];
    const colors = (T) => [T.curve, T.path, T.clusters[2]];

    function compute() {
      const lr = Math.pow(10, +lrIn.value), beta = +bIn.value, la = Math.pow(10, +laIn.value);
      stage.querySelector(`#${id}-lr-out`).textContent = lr.toFixed(3);
      stage.querySelector(`#${id}-b-out`).textContent = beta.toFixed(2);
      stage.querySelector(`#${id}-la-out`).textContent = la.toFixed(3);
      paths = KINDS.map((k) => path(k, start, lr, beta, la));
      report();
    }

    function report() {
      const names = ["gradient descent", "momentum", "Adam"];
      readout.innerHTML = paths.map((p, i) => {
        if (p.diverged && p.diverged <= shown) return `<span>${names[i]}: <b>diverged</b> at step ${p.diverged}</span>`;
        const q = p[Math.min(shown, p.length - 1)];
        return `<span>${names[i]}: f = <b>${f(q[0], q[1]).toExponential(1)}</b></span>`;
      }).join("") + `<span>step <b>${shown}</b></span>`;
    }

    function drawMap() {
      const c = V.canvas(cM);
      if (!c) return;
      const pad = { l: 36, r: 12, t: 12, b: 30 };
      F = V.frame(c, { xlim: XL, ylim: YL, xticks: [-2, -1, 0, 1, 2], yticks: [-1, 0, 1, 2, 3], pad });
      const { ctx, sx, sy, T } = F;
      F.clip();
      V.contour(F, f, LEVELS, T.axis, 70, 1);
      const col = colors(T);
      paths.forEach((p, i) => {
        const vis = p.slice(0, shown + 1).map(([x, y]) => [sx(x), sy(y)]);
        V.line(ctx, vis, col[i], 2);
        vis.forEach(([u, v], k) => { if (k % 5 === 0) V.dot(ctx, u, v, col[i], 2.2); });
        const last = vis[vis.length - 1];
        V.dot(ctx, last[0], last[1], T.bg, 6); V.dot(ctx, last[0], last[1], col[i], 4.5);
      });
      V.dot(ctx, sx(start[0]), sy(start[1]), T.text, 5, "square");
      V.dot(ctx, sx(1), sy(1), T.text, 6, "ring");
      F.unclip();
    }

    function drawLoss() {
      const c = V.canvas(cL);
      if (!c) return;
      const G = V.frame(c, { xlim: [0, T_MAX], ylim: [1e-8, 100], logy: true, xticks: [0, 100, 200, 300],
        yticks: [1e-8, 1e-6, 1e-4, 1e-2, 1, 100], fmtY: (v) => `1e${Math.round(Math.log10(v))}`, xlabel: "iteration t", pad: { l: 48 } });
      const { ctx, sx, sy, T } = G;
      G.clip();
      const col = colors(T);
      paths.forEach((p, i) => V.line(ctx, p.slice(0, shown + 1).map(([x, y], t) => [sx(t), sy(Math.max(f(x, y), 1e-8))]), col[i], 2.5));
      G.unclip();
    }

    function draw() { drawMap(); drawLoss(); }
    function update() { cancelAnimationFrame(raf); compute(); draw(); }
    function run() {
      cancelAnimationFrame(raf); shown = 0;
      const tick = () => { shown = Math.min(T_MAX, shown + 3); report(); draw(); if (shown < T_MAX) raf = requestAnimationFrame(tick); };
      tick();
    }

    cM.addEventListener("click", (e) => {
      if (!F) return;
      const rect = cM.getBoundingClientRect();
      const x = F.ix(e.clientX - rect.left), y = F.iy(e.clientY - rect.top);
      if (x < XL[0] || x > XL[1] || y < YL[0] || y > YL[1]) return;
      start = [x, y]; shown = T_MAX; update();
    });
    [lrIn, bIn, laIn].forEach((el) => el.addEventListener("input", () => { shown = T_MAX; update(); }));
    stage.querySelector('[data-act="run"]').addEventListener("click", run);
    stage.querySelector('[data-act="end"]').addEventListener("click", () => { cancelAnimationFrame(raf); shown = T_MAX; report(); draw(); });
    V.onRedraw([cM, cL], draw);
    update();
  }

  V.mountAll("nn-optimizers", mount);
})();
