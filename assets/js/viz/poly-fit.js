/* ==========================================================================
   Interactive: polynomial regression of increasing degree (capacity,
   overfitting, train vs test error).
   Data: y = sin(2πx) + ε, ε ~ N(0, 0.25²), x ~ U[0, 1].
   Usage: <figure class="viz" data-viz="poly-fit"><div class="viz__stage"></div>…</figure>
   Requires common.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ;
  const truth = (x) => Math.sin(2 * Math.PI * x);
  const SIGMA = 0.25, N_TRAIN = 15, N_TEST = 300, D_MAX = 14;

  function features(x, d) { return V.legendre(2 * x - 1, d); }

  function fit(data, d) {
    return V.lstsq(data.map((p) => features(p[0], d)), data.map((p) => p[1]));
  }
  function predict(theta, x) {
    const phi = features(x, theta.length - 1);
    let s = 0;
    for (let j = 0; j < theta.length; j++) s += theta[j] * phi[j];
    return s;
  }
  function mse(theta, data) {
    let s = 0;
    data.forEach(([x, y]) => { s += (predict(theta, x) - y) ** 2; });
    return s / data.length;
  }
  function sample(n, rng) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const x = rng();
      out.push([x, truth(x) + SIGMA * rng.normal()]);
    }
    return out.sort((a, b) => a[0] - b[0]);
  }

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-d">Polynomial degree d <output id="${id}-d-out" for="${id}-d"></output></label>
          <input type="range" id="${id}-d" min="0" max="${D_MAX}" step="1" value="3">
        </div>
        <div class="control control--check">
          <label><input type="checkbox" id="${id}-truth"> Show the true function</label>
          <label><input type="checkbox" id="${id}-test"> Show test points</label>
        </div>
        <div class="viz__buttons">
          <button type="button" class="btn" data-act="resample">New training sample</button>
        </div>
      </div>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">Data and fitted polynomial</p>
          <canvas class="viz__canvas" data-c="fit" role="img"
            aria-label="Scatter plot of ${N_TRAIN} training points with the fitted polynomial of the chosen degree."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">Mean squared error against degree</p>
          <canvas class="viz__canvas" data-c="err" role="img"
            aria-label="Training and test mean squared error, on a log scale, for every degree from 0 to ${D_MAX}; the current degree is marked."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-text)">Training points</span>
        <span style="--swatch: var(--viz-path)">Fitted polynomial / training error</span>
        <span style="--swatch: var(--viz-curve)">Test error</span>
        <span style="--swatch: var(--viz-axis)">True function (dashed)</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cFit = stage.querySelector('[data-c="fit"]');
    const cErr = stage.querySelector('[data-c="err"]');
    const dIn = stage.querySelector(`#${id}-d`);
    const dOut = stage.querySelector(`#${id}-d-out`);
    const showTruth = stage.querySelector(`#${id}-truth`);
    const showTest = stage.querySelector(`#${id}-test`);
    const readout = stage.querySelector(".viz__readout");

    let seed = 7;
    const testRng = V.rng(12345);
    const test = sample(N_TEST, testRng);
    let train, thetas, errs;

    function resample() {
      train = sample(N_TRAIN, V.rng(seed));
      thetas = [];
      errs = [];
      for (let d = 0; d <= D_MAX; d++) {
        const th = fit(train, d);
        thetas.push(th);
        errs.push({ train: mse(th, train), test: mse(th, test) });
      }
      update();
    }

    function update() {
      const d = parseInt(dIn.value, 10);
      dOut.textContent = d;
      const e = errs[d];
      const best = errs.reduce((b, v, i) => (v.test < errs[b].test ? i : b), 0);
      readout.innerHTML = `<span>parameters: <b>${d + 1}</b></span>
        <span>training MSE: <b>${e.train < 1e-6 ? "≈ 0" : e.train.toFixed(4)}</b></span>
        <span>test MSE: <b>${e.test > 99 ? e.test.toExponential(1) : e.test.toFixed(4)}</b></span>
        <span>lowest test MSE at d = <b>${best}</b></span>`;
      draw();
    }

    function drawFit() {
      const c = V.canvas(cFit);
      if (!c) return;
      const F = V.frame(c, {
        xlim: [0, 1], ylim: [-2, 2], xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [-2, -1, 0, 1, 2],
        xlabel: "x", ylabel: "y", pad: { l: 40 },
      });
      const { ctx, sx, sy, T } = F;
      const th = thetas[parseInt(dIn.value, 10)];
      F.clip();
      if (showTest.checked) test.forEach(([x, y]) => V.dot(ctx, sx(x), sy(y), T.axis, 2.2));
      if (showTruth.checked) {
        const pts = [];
        for (let i = 0; i <= 200; i++) { const x = i / 200; pts.push([sx(x), sy(truth(x))]); }
        V.line(ctx, pts, T.axis, 2, [6, 5]);
      }
      const pts = [];
      for (let i = 0; i <= 400; i++) { const x = i / 400; pts.push([sx(x), sy(predict(th, x))]); }
      V.line(ctx, pts, T.path, 2.5);
      train.forEach(([x, y]) => {
        V.dot(ctx, sx(x), sy(y), T.bg, 5.5);
        V.dot(ctx, sx(x), sy(y), T.text, 4);
      });
      F.unclip();
    }

    function drawErr() {
      const c = V.canvas(cErr);
      if (!c) return;
      const F = V.frame(c, {
        xlim: [-0.5, D_MAX + 0.5], ylim: [1e-3, 10], logy: true,
        xticks: [0, 2, 4, 6, 8, 10, 12, 14], yticks: [1e-3, 1e-2, 1e-1, 1, 10],
        fmtY: (v) => (v >= 1 ? String(v) : v.toString()),
        xlabel: "degree d", ylabel: "MSE (log scale)", pad: { l: 50 },
      });
      const { ctx, sx, sy, T } = F;
      const d = parseInt(dIn.value, 10);
      F.clip();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = T.curve;
      ctx.fillRect(sx(d - 0.5), F.pad.t, sx(d + 0.5) - sx(d - 0.5), c.h - F.pad.t - F.pad.b);
      ctx.globalAlpha = 1;
      const cl = (v) => Math.min(Math.max(v, 1e-3), 1e3);
      V.line(ctx, errs.map((e, i) => [sx(i), sy(cl(e.train))]), T.path, 2);
      V.line(ctx, errs.map((e, i) => [sx(i), sy(cl(e.test))]), T.curve, 2);
      errs.forEach((e, i) => {
        V.dot(ctx, sx(i), sy(cl(e.train)), T.path, i === d ? 5.5 : 3, "square");
        V.dot(ctx, sx(i), sy(cl(e.test)), T.curve, i === d ? 5.5 : 3);
      });
      F.unclip();
    }

    function draw() { drawFit(); drawErr(); }

    dIn.addEventListener("input", update);
    showTruth.addEventListener("change", draw);
    showTest.addEventListener("change", draw);
    stage.querySelector('[data-act="resample"]').addEventListener("click", () => { seed += 1; resample(); });
    V.onRedraw([cFit, cErr], draw);
    resample();
  }

  V.mountAll("poly-fit", mount);
})();
