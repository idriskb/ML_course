/* ==========================================================================
   Interactive: universal approximation in one dimension.
   A one-hidden-layer network f(x) = c + Σ_j v_j σ(w_j x + b_j) approximates a
   target f on [0, 1] with m pieces, built by hand (no training):
     relu  – piecewise-linear interpolation at t_j = j/m, m ReLU units
             f(0) + Σ_j v_j ReLU(x − t_j), v_j = change of slope at t_j
     rrect – rectangles of height f(midpoint), each made of 4 ReLU units
             (two ramps of width δ)
     srect – rectangles made of 2 steep sigmoid units each
   Left: target, network, optionally the contribution of each piece.
   Right: max error over [0, 1] against the number of pieces m (log scale).
   Requires common.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ;
  const M_MAX = 40;
  const relu = (z) => (z > 0 ? z : 0);

  const TARGETS = {
    wave: { f: (x) => Math.sin(2 * Math.PI * x) + 0.5 * x, ylim: [-1.4, 1.8] },
    bump: { f: (x) => Math.exp(-(((x - 0.5) / 0.08) ** 2)), ylim: [-0.4, 1.4] },
    wiggly: { f: (x) => 0.8 * Math.sin(6 * Math.PI * x) * (0.3 + x), ylim: [-1.3, 1.3] },
  };

  // Returns { pieces: [fn, …], c, units } with network(x) = c + Σ pieces(x).
  function build(kind, f, m, edge) {
    const h = 1 / m, pieces = [];
    if (kind === "relu") {
      const t = Array.from({ length: m + 1 }, (_, j) => j * h);
      const s = Array.from({ length: m }, (_, j) => (f(t[j + 1]) - f(t[j])) / h);
      for (let j = 0; j < m; j++) {
        const v = j === 0 ? s[0] : s[j] - s[j - 1], tj = t[j];
        pieces.push((x) => v * relu(x - tj));
      }
      return { pieces, c: f(0), units: m };
    }
    const d = edge * h; // edge width of each rectangle
    // step centred at t: goes from 0 to 1 over a width d
    const step = kind === "rrect"
      ? (x, t) => (relu(x - t + d / 2) - relu(x - t - d / 2)) / d
      : (x, t) => V.sigmoid((4.4 * (x - t)) / d);
    for (let j = 0; j < m; j++) {
      // outer edges pushed outside [0, 1] so that the ends are fully covered
      const lo = j === 0 ? -d / 2 : j * h, hi = j === m - 1 ? 1 + d / 2 : (j + 1) * h;
      const height = f((j + 0.5) * h);
      pieces.push((x) => height * (step(x, lo) - step(x, hi)));
    }
    return { pieces, c: 0, units: (kind === "rrect" ? 4 : 2) * m };
  }
  const evalNet = (net, x) => net.pieces.reduce((s, p) => s + p(x), net.c);

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-t">Target function</label>
          <select id="${id}-t">
            <option value="wave">A smooth wave</option>
            <option value="bump">A narrow bump</option>
            <option value="wiggly">A wiggly function</option>
          </select>
        </div>
        <div class="control">
          <label for="${id}-k">Construction</label>
          <select id="${id}-k">
            <option value="relu">ReLU hinges (piecewise linear)</option>
            <option value="rrect">Rectangles from ReLU ramps</option>
            <option value="srect">Rectangles from steep sigmoids</option>
          </select>
        </div>
        <div class="control">
          <label for="${id}-m">Number of pieces m <output id="${id}-m-out" for="${id}-m"></output></label>
          <input type="range" id="${id}-m" min="1" max="${M_MAX}" step="1" value="6">
        </div>
        <div class="control">
          <label for="${id}-e">Edge width δ (fraction of a rectangle) <output id="${id}-e-out" for="${id}-e"></output></label>
          <input type="range" id="${id}-e" min="0.02" max="1" step="0.02" value="0.3">
        </div>
        <div class="control control--check">
          <label><input type="checkbox" id="${id}-u" checked> <span>Show the pieces (one per hinge or rectangle)</span></label>
        </div>
      </div>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">Target and one-hidden-layer network on [0, 1]</p>
          <canvas class="viz__canvas" data-c="fit" role="img"
            aria-label="The target function on the interval from 0 to 1, the network built from the chosen number of pieces, and optionally each piece drawn as a thin line."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">Largest error on [0, 1] against m</p>
          <canvas class="viz__canvas" data-c="err" role="img"
            aria-label="Maximum absolute error between the target and the network as a function of the number of pieces, on a logarithmic error axis. The error decreases as the number of pieces grows."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-curve)">Target f</span>
        <span style="--swatch: var(--viz-path)">Network f<sub>θ</sub> / its error</span>
        <span style="--swatch: var(--viz-axis)">Pieces (thin)</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cF = stage.querySelector('[data-c="fit"]');
    const cE = stage.querySelector('[data-c="err"]');
    const tSel = stage.querySelector(`#${id}-t`);
    const kSel = stage.querySelector(`#${id}-k`);
    const mIn = stage.querySelector(`#${id}-m`);
    const eIn = stage.querySelector(`#${id}-e`);
    const uBox = stage.querySelector(`#${id}-u`);
    const readout = stage.querySelector(".viz__readout");
    const grid = Array.from({ length: 801 }, (_, i) => i / 800);
    let errs = [];

    const maxErr = (net, f) => grid.reduce((s, x) => Math.max(s, Math.abs(f(x) - evalNet(net, x))), 0);

    function prepare() {
      const f = TARGETS[tSel.value].f, kind = kSel.value, edge = +eIn.value;
      eIn.disabled = kind === "relu";
      stage.querySelector(`#${id}-e-out`).textContent = kind === "relu" ? "—" : edge.toFixed(2);
      errs = Array.from({ length: M_MAX }, (_, i) => maxErr(build(kind, f, i + 1, edge), f));
      update();
    }

    function update() {
      const m = +mIn.value, kind = kSel.value;
      stage.querySelector(`#${id}-m-out`).textContent = m;
      const units = build(kind, TARGETS[tSel.value].f, m, +eIn.value).units;
      readout.innerHTML = `<span>hidden units <b>${units}</b></span>
        <span>parameters (3 per unit + 1) <b>${3 * units + 1}</b></span>
        <span>largest error on [0, 1] <b>${errs[m - 1].toFixed(3)}</b></span>`;
      draw();
    }

    function drawFit() {
      const c = V.canvas(cF);
      if (!c) return;
      const T0 = TARGETS[tSel.value], f = T0.f, m = +mIn.value;
      const net = build(kSel.value, f, m, +eIn.value);
      const F = V.frame(c, { xlim: [-0.05, 1.05], ylim: T0.ylim, xticks: [0, 0.25, 0.5, 0.75, 1], yticks: V.ticks(T0.ylim[0], T0.ylim[1], 4),
        xlabel: "x", pad: { l: 40 } });
      const { ctx, sx, sy, T } = F;
      F.clip();
      const xs = Array.from({ length: 551 }, (_, i) => -0.05 + (1.1 * i) / 550);
      if (uBox.checked) {
        net.pieces.forEach((p) => V.line(ctx, xs.map((x) => [sx(x), sy(p(x))]), T.axis, 1));
      }
      V.line(ctx, xs.map((x) => [sx(x), sy(f(x))]), T.curve, 2.5);
      V.line(ctx, xs.map((x) => [sx(x), sy(evalNet(net, x))]), T.path, 2.5);
      F.unclip();
    }

    function drawErr() {
      const c = V.canvas(cE);
      if (!c) return;
      const F = V.frame(c, { xlim: [0, M_MAX + 1], ylim: [1e-3, 2], logy: true, xticks: [1, 10, 20, 30, 40], yticks: [0.001, 0.01, 0.1, 1],
        xlabel: "number of pieces m", pad: { l: 48 } });
      const { ctx, sx, sy, T } = F;
      F.clip();
      V.line(ctx, errs.map((e, i) => [sx(i + 1), sy(Math.max(e, 1e-3))]), T.path, 2.5);
      const m = +mIn.value;
      V.dot(ctx, sx(m), sy(Math.max(errs[m - 1], 1e-3)), T.bg, 7);
      V.dot(ctx, sx(m), sy(Math.max(errs[m - 1], 1e-3)), T.path, 5);
      F.unclip();
    }

    function draw() { drawFit(); drawErr(); }
    tSel.addEventListener("change", prepare);
    kSel.addEventListener("change", prepare);
    eIn.addEventListener("input", prepare);
    mIn.addEventListener("input", update);
    uBox.addEventListener("change", draw);
    V.onRedraw([cF, cE], draw);
    prepare();
  }

  V.mountAll("nn-universal", mount);
})();
