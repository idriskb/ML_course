/* ==========================================================================
   Interactive: k-NN regression in one dimension, against a straight line.
   Data: fuel consumption (L/100 km) of a car against its speed (km/h),
   a U-shaped relationship (simulated). Left: data, true curve, k-NN fit,
   optional least-squares line. Right: training and test MSE against k.
   Requires common.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ;
  const XL = [15, 135], N = 40, NTEST = 300, SIGMA = 0.5;
  const f = (s) => 4 + 0.0008 * (s - 70) ** 2 + 25 / s;

  function sample(n, seed) {
    const r = V.rng(seed);
    return Array.from({ length: n }, () => { const s = 20 + 110 * r(); return [s, f(s) + SIGMA * r.normal()]; });
  }

  // k-NN prediction at x from training data (1-D); weighted: inverse-distance weights
  function predict(train, x, k, weighted) {
    const d = train.map(([s, y]) => [Math.abs(s - x), y]).sort((a, b) => a[0] - b[0]);
    let num = 0, den = 0;
    for (let i = 0; i < k; i++) { const w = weighted ? 1 / (d[i][0] + 1e-3) : 1; num += w * d[i][1]; den += w; }
    return num / den;
  }

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-k">Number of neighbours k <output id="${id}-k-out" for="${id}-k"></output></label>
          <input type="range" id="${id}-k" min="1" max="${N}" step="1" value="1">
        </div>
        <div class="control control--check">
          <label><input type="checkbox" id="${id}-w"> Weight neighbours by 1/distance</label>
        </div>
        <div class="control control--check">
          <label><input type="checkbox" id="${id}-line" checked> Show the least-squares line</label>
        </div>
      </div>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">Fuel consumption against speed</p>
          <canvas class="viz__canvas" data-c="fit" role="img"
            aria-label="Training data of fuel consumption against speed, the true U-shaped curve, the k-nearest-neighbour prediction as a step-like curve, and optionally the least-squares straight line."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">Mean squared error against k</p>
          <canvas class="viz__canvas" data-c="err" role="img"
            aria-label="Training and test mean squared error of k-nearest-neighbour regression for k from 1 to 40. Training error is zero at k equals 1 and grows with k; test error is U-shaped. A dashed line shows the test error of the straight line."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-curve)">Training data / training MSE</span>
        <span style="--swatch: var(--viz-path)">k-NN prediction / test MSE</span>
        <span style="--swatch: var(--viz-axis)">True curve (dotted) / straight line (dashed)</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cF = stage.querySelector('[data-c="fit"]');
    const cE = stage.querySelector('[data-c="err"]');
    const kIn = stage.querySelector(`#${id}-k`);
    const wBox = stage.querySelector(`#${id}-w`);
    const lBox = stage.querySelector(`#${id}-line`);
    const readout = stage.querySelector(".viz__readout");
    const train = sample(N, 8), test = sample(NTEST, 99);
    const line = V.ols1(train);
    const mse = (data, g) => data.reduce((s, [x, y]) => s + (y - g(x)) ** 2, 0) / data.length;
    const lineTest = mse(test, (x) => line[0] + line[1] * x);
    let curves;

    function computeCurves() {
      const w = wBox.checked;
      curves = { tr: [], te: [] };
      for (let k = 1; k <= N; k++) {
        curves.tr[k] = mse(train, (x) => predict(train, x, k, w));
        curves.te[k] = mse(test, (x) => predict(train, x, k, w));
      }
      update();
    }

    function update() {
      const k = +kIn.value;
      stage.querySelector(`#${id}-k-out`).textContent = k;
      let best = 1; for (let j = 2; j <= N; j++) if (curves.te[j] < curves.te[best]) best = j;
      readout.innerHTML = `<span>k = <b>${k}</b></span>
        <span>training MSE <b>${curves.tr[k].toFixed(3)}</b></span>
        <span>test MSE <b>${curves.te[k].toFixed(3)}</b></span>
        <span>straight line: test MSE <b>${lineTest.toFixed(3)}</b></span>
        <span>best k on the test set: <b>${best}</b></span>
        <span>effective number of parameters n/k ≈ <b>${(N / k).toFixed(1)}</b></span>`;
      draw();
    }

    function drawFit() {
      const c = V.canvas(cF);
      if (!c) return;
      const F = V.frame(c, { xlim: XL, ylim: [3, 9], xticks: [20, 40, 60, 80, 100, 120], yticks: [3, 4, 5, 6, 7, 8, 9],
        xlabel: "speed (km/h)", ylabel: "L / 100 km", pad: { l: 44 } });
      const { ctx, sx, sy, T } = F;
      const k = +kIn.value, w = wBox.checked;
      F.clip();
      const tru = [], pred = [];
      for (let i = 0; i <= 400; i++) {
        const x = XL[0] + ((XL[1] - XL[0]) * i) / 400;
        tru.push([sx(x), sy(f(x))]); pred.push([sx(x), sy(predict(train, x, k, w))]);
      }
      V.line(ctx, tru, T.axis, 2, [2, 4]);
      if (lBox.checked) V.line(ctx, [[sx(XL[0]), sy(line[0] + line[1] * XL[0])], [sx(XL[1]), sy(line[0] + line[1] * XL[1])]], T.axis, 2, [8, 5]);
      V.line(ctx, pred, T.path, 2.5);
      train.forEach(([x, y]) => { V.dot(ctx, sx(x), sy(y), T.bg, 5.5); V.dot(ctx, sx(x), sy(y), T.curve, 4); });
      F.unclip();
    }

    function drawErr() {
      const c = V.canvas(cE);
      if (!c) return;
      const top = Math.max(1.2, lineTest * 1.15);
      const F = V.frame(c, { xlim: [0, N + 1], ylim: [0, top], xticks: [1, 5, 10, 15, 20, 25, 30, 35, 40], yticks: V.ticks(0, top, 4),
        xlabel: "k  (← more flexible   |   smoother →)", ylabel: "MSE", pad: { l: 44 } });
      const { ctx, sx, sy, T } = F;
      const k = +kIn.value;
      F.clip();
      V.line(ctx, [[sx(0), sy(lineTest)], [sx(N + 1), sy(lineTest)]], T.axis, 1.5, [8, 5]);
      V.line(ctx, [[sx(0), sy(SIGMA * SIGMA)], [sx(N + 1), sy(SIGMA * SIGMA)]], T.axis, 1, [2, 4]);
      const tr = [], te = [];
      for (let j = 1; j <= N; j++) { tr.push([sx(j), sy(Math.min(top, curves.tr[j]))]); te.push([sx(j), sy(Math.min(top, curves.te[j]))]); }
      V.line(ctx, tr, T.curve, 2.5);
      V.line(ctx, te, T.path, 2.5);
      V.line(ctx, [[sx(k), sy(0)], [sx(k), sy(top)]], T.text, 1.5);
      V.dot(ctx, sx(k), sy(Math.min(top, curves.te[k])), T.path, 6, "square");
      V.dot(ctx, sx(k), sy(Math.min(top, curves.tr[k])), T.curve, 6);
      ctx.font = T.font(11, 600); ctx.fillStyle = T.text; ctx.textAlign = "left";
      ctx.fillText("straight line (test)", sx(1.5), sy(lineTest) - 6);
      ctx.textAlign = "right";
      ctx.fillText("noise level σ²", sx(N + 0.5), sy(SIGMA * SIGMA) + 14);
      F.unclip();
    }

    function draw() { drawFit(); drawErr(); }
    kIn.addEventListener("input", update);
    wBox.addEventListener("change", computeCurves);
    lBox.addEventListener("change", draw);
    V.onRedraw([cF, cE], draw);
    computeCurves();
  }

  V.mountAll("knn-regression", mount);
})();
