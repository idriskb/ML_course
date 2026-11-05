/* ==========================================================================
   Interactive: (mini-batch / stochastic) gradient descent for simple linear
   regression on the simulated house data. Left: contours of the training MSE
   in the (θ0, θ1) plane with the path of the iterates. Right: training MSE
   against iteration.
   Usage: <figure class="viz" data-viz="gd-regression"><div class="viz__stage"></div>…</figure>
   Requires common.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ;
  const T_MAX = 200;

  function mount(fig, id) {
    const raw = V.houses();
    const n = raw.length;
    const mx = raw.reduce((s, d) => s + d[0], 0) / n;
    const sd = Math.sqrt(raw.reduce((s, d) => s + (d[0] - mx) ** 2, 0) / n);

    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-m">Gradient computed on</label>
          <select id="${id}-m" class="select">
            <option value="${n}">all ${n} points (GD)</option>
            <option value="8">8 points (mini-batch)</option>
            <option value="1">1 point (SGD)</option>
          </select>
        </div>
        <div class="control">
          <label for="${id}-lr">Learning rate η <output id="${id}-lr-out" for="${id}-lr"></output></label>
          <input type="range" id="${id}-lr" min="0.01" max="1.2" step="0.01" value="0.10">
        </div>
        <div class="control control--check">
          <label><input type="checkbox" id="${id}-std"> Standardise the feature (area)</label>
        </div>
        <div class="viz__buttons viz__buttons--row">
          <button type="button" class="btn btn--primary" data-act="step">Step</button>
          <button type="button" class="btn" data-act="run">Run</button>
          <button type="button" class="btn" data-act="reset">Reset</button>
        </div>
      </div>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">Contours of the training MSE in the (θ<sub>0</sub>, θ<sub>1</sub>) plane</p>
          <canvas class="viz__canvas" data-c="path" role="img"
            aria-label="Contour lines of the mean squared error as a function of intercept and slope, with the path of the gradient-descent iterates from the starting point towards the least-squares solution."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">Training MSE against iteration</p>
          <canvas class="viz__canvas" data-c="loss" role="img"
            aria-label="Training mean squared error, on a log scale, at each iteration; a dashed line marks the minimum."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-curve)">Contours / minimum MSE</span>
        <span style="--swatch: var(--viz-path)">Iterates θ<sup>(0)</sup>, θ<sup>(1)</sup>, …</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cPath = stage.querySelector('[data-c="path"]');
    const cLoss = stage.querySelector('[data-c="loss"]');
    const mSel = stage.querySelector(`#${id}-m`);
    const lr = stage.querySelector(`#${id}-lr`);
    const lrOut = stage.querySelector(`#${id}-lr-out`);
    const std = stage.querySelector(`#${id}-std`);
    const readout = stage.querySelector(".viz__readout");
    const runBtn = stage.querySelector('[data-act="run"]');
    const stepBtn = stage.querySelector('[data-act="step"]');

    let data, best, bestMse, start, view, etaMax, kappa, path, losses, rng, timer = null, diverged = false;

    const mse = (t) => data.reduce((s, [x, y]) => s + (y - t[0] - t[1] * x) ** 2, 0) / n;

    function setup() {
      data = std.checked ? raw.map(([x, y]) => [(x - mx) / sd, y]) : raw;
      best = V.ols1(data);
      bestMse = mse(best);
      start = [best[0] - 1.6, best[1] + 1.3];
      view = { x: [best[0] - 2.4, best[0] + 2.4], y: [best[1] - 2.0, best[1] + 2.0] };
      // Hessian H = (2/n) XᵀX  for X = [1, x]
      let s1 = 0, s2 = 0;
      data.forEach(([x]) => { s1 += x / n; s2 += (x * x) / n; });
      const tr = 2 * (1 + s2), det = 4 * (s2 - s1 * s1);
      const lmax = tr / 2 + Math.sqrt(Math.max(0, (tr * tr) / 4 - det)), lmin = det / lmax;
      etaMax = 2 / lmax;
      kappa = lmax / lmin;
      reset();
    }

    function reset() {
      stop();
      rng = V.rng(99);
      path = [start.slice()];
      losses = [mse(start)];
      diverged = false;
      lrOut.textContent = (+lr.value).toFixed(2);
      update();
    }

    function step() {
      if (diverged || path.length > T_MAX) return false;
      const m = +mSel.value;
      const t = path[path.length - 1];
      let g0 = 0, g1 = 0;
      for (let k = 0; k < m; k++) {
        const [x, y] = m === n ? data[k] : data[Math.floor(rng() * n)];
        const r = y - t[0] - t[1] * x;
        g0 += (-2 * r) / m;
        g1 += (-2 * r * x) / m;
      }
      const eta = +lr.value;
      const next = [t[0] - eta * g0, t[1] - eta * g1];
      path.push(next);
      const L = mse(next);
      losses.push(L);
      if (!isFinite(L) || L > 1e4) diverged = true;
      update();
      return !diverged && path.length <= T_MAX;
    }

    function run() {
      if (timer) { stop(); return; }
      runBtn.textContent = "Pause";
      timer = setInterval(() => { if (!step()) stop(); }, 60);
    }
    function stop() { clearInterval(timer); timer = null; runBtn.textContent = "Run"; }

    function update() {
      const k = path.length - 1, t = path[k];
      stepBtn.disabled = diverged || k >= T_MAX;
      const stable = `<span>full-batch GD is stable for η &lt; <b>${etaMax.toFixed(3)}</b></span>
        <span>condition number κ = <b>${kappa.toFixed(1)}</b></span>`;
      if (diverged) {
        readout.innerHTML = `<span class="viz__status">${V.WARN_ICON} Diverged after ${k} steps</span>
          <span>η is larger than 2/λ<sub>max</sub>; try a smaller learning rate.</span>${stable}`;
      } else {
        readout.innerHTML = `<span>iteration t = <b>${k}</b></span>
          <span>θ = (<b>${t[0].toFixed(3)}</b>, <b>${t[1].toFixed(3)}</b>)</span>
          <span>MSE = <b>${losses[k].toFixed(4)}</b> (min <b>${bestMse.toFixed(4)}</b>)</span>${stable}`;
      }
      draw();
    }

    function drawPath() {
      const c = V.canvas(cPath);
      if (!c) return;
      const tick = (a, b) => { const out = []; for (let v = Math.ceil(a); v <= b; v++) out.push(v); return out; };
      const F = V.frame(c, {
        xlim: view.x, ylim: view.y, xticks: tick(view.x[0], view.x[1]), yticks: tick(view.y[0], view.y[1]),
        xlabel: "intercept θ0", ylabel: "slope θ1", pad: { l: 40 },
      });
      const { ctx, sx, sy, T } = F;
      F.clip();
      const top = mse(start) - bestMse;
      const levels = [];
      for (let k = -6; k <= 3; k++) levels.push(bestMse + top * Math.pow(2, k));
      V.contour(F, (a, b) => mse([a, b]), levels, T.curve, 70, 1.1);
      V.dot(ctx, sx(best[0]), sy(best[1]), T.curve, 5);
      const pts = path.filter((p) => isFinite(p[0]) && isFinite(p[1])).map((p) => [sx(p[0]), sy(p[1])]);
      V.line(ctx, pts, T.path, 1.5);
      pts.forEach(([x, y], i) => V.dot(ctx, x, y, T.path, i === pts.length - 1 ? 5 : 2.5));
      F.unclip();
    }

    function drawLoss() {
      const c = V.canvas(cLoss);
      if (!c) return;
      const lo = Math.pow(10, Math.floor(Math.log10(bestMse * 0.9)));
      const hi = Math.pow(10, Math.ceil(Math.log10(losses[0] * 1.5)));
      const yt = [];
      for (let v = lo; v <= hi * 1.001; v *= 10) yt.push(v);
      const F = V.frame(c, {
        xlim: [0, T_MAX], ylim: [lo, hi], logy: true,
        xticks: [0, 50, 100, 150, 200], yticks: yt, fmtY: (v) => (v >= 1 ? String(Math.round(v)) : String(+v.toPrecision(1))),
        xlabel: "iteration t", ylabel: "training MSE (log)", pad: { l: 46 },
      });
      const { ctx, sx, sy, T } = F;
      F.clip();
      V.line(ctx, [[sx(0), sy(bestMse)], [sx(T_MAX), sy(bestMse)]], T.curve, 1.5, [6, 5]);
      V.line(ctx, losses.map((L, i) => [sx(i), sy(Math.min(Math.max(L, lo), hi * 10))]), T.path, 2);
      F.unclip();
    }

    function draw() { drawPath(); drawLoss(); }

    lr.addEventListener("input", reset);
    mSel.addEventListener("change", reset);
    std.addEventListener("change", setup);
    stepBtn.addEventListener("click", step);
    runBtn.addEventListener("click", run);
    stage.querySelector('[data-act="reset"]').addEventListener("click", reset);
    V.onRedraw([cPath, cLoss], draw);
    setup();
  }

  V.mountAll("gd-regression", mount);
})();
