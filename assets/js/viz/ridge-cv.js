/* ==========================================================================
   Interactive: ridge regularisation of a degree-12 polynomial, with the
   regularisation strength λ chosen by 5-fold cross-validation.
   Left: data, fit, truth. Right: training, CV and test MSE against log10 λ.
   Requires common.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ;
  const truth = (x) => Math.sin(2 * Math.PI * x);
  const SIGMA = 0.25, N = 20, N_TEST = 300, DEG = 12, K = 5;
  const LOGS = Array.from({ length: 37 }, (_, i) => -8 + i * 0.25); // log10 λ from -8 to 1
  const phi = (x) => V.legendre(2 * x - 1, DEG);

  function sample(n, rng) {
    const out = [];
    for (let i = 0; i < n; i++) { const x = rng(); out.push([x, truth(x) + SIGMA * rng.normal()]); }
    return out;
  }
  const mse = (th, data) => data.reduce((s, [x, y]) => s + (V.dotp(th, phi(x)) - y) ** 2, 0) / data.length;
  const fit = (data, lam) => V.ridge(data.map(([x]) => phi(x)), data.map((p) => p[1]), lam);

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-l">Regularisation log<sub>10</sub> λ <output id="${id}-l-out" for="${id}-l"></output></label>
          <input type="range" id="${id}-l" min="0" max="${LOGS.length - 1}" step="1" value="0">
        </div>
        <div class="control control--check">
          <label><input type="checkbox" id="${id}-test"> Show the test error (peek)</label>
        </div>
        <div class="viz__buttons">
          <button type="button" class="btn btn--primary" data-act="cv">Use the CV choice</button>
          <button type="button" class="btn" data-act="resample">New sample</button>
        </div>
      </div>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">Degree-${DEG} polynomial fitted with ridge</p>
          <canvas class="viz__canvas" data-c="fit" role="img"
            aria-label="Twenty training points and the ridge-regularised degree ${DEG} polynomial for the chosen λ."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">Error against log<sub>10</sub> λ</p>
          <canvas class="viz__canvas" data-c="err" role="img"
            aria-label="Training error and 5-fold cross-validation error as functions of log ten of lambda; the current lambda and the cross-validation minimum are marked."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-path)">Fit / training error</span>
        <span style="--swatch: var(--viz-curve)">5-fold CV error</span>
        <span style="--swatch: var(--viz-axis)">Truth / test error (dashed)</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cFit = stage.querySelector('[data-c="fit"]');
    const cErr = stage.querySelector('[data-c="err"]');
    const lIn = stage.querySelector(`#${id}-l`);
    const lOut = stage.querySelector(`#${id}-l-out`);
    const showTest = stage.querySelector(`#${id}-test`);
    const readout = stage.querySelector(".viz__readout");
    const test = sample(N_TEST, V.rng(777));
    let seed = 5, train, rows, best;

    function resample() {
      train = sample(N, V.rng(seed));
      rows = LOGS.map((lg) => {
        const lam = Math.pow(10, lg);
        const th = fit(train, lam);
        let cv = 0;
        for (let k = 0; k < K; k++) {
          const val = train.filter((_, i) => i % K === k);
          const tr = train.filter((_, i) => i % K !== k);
          cv += mse(fit(tr, lam), val) / K;
        }
        return { th, train: mse(th, train), cv, test: mse(th, test) };
      });
      best = rows.reduce((b, r, i) => (r.cv < rows[b].cv ? i : b), 0);
      update();
    }

    function update() {
      const i = +lIn.value, r = rows[i];
      lOut.textContent = LOGS[i].toFixed(2);
      readout.innerHTML = `<span>training MSE: <b>${r.train.toFixed(4)}</b></span>
        <span>CV MSE: <b>${r.cv > 99 ? r.cv.toExponential(1) : r.cv.toFixed(4)}</b></span>
        <span>CV chooses log<sub>10</sub> λ = <b>${LOGS[best].toFixed(2)}</b></span>
        ${showTest.checked ? `<span>test MSE: <b>${r.test > 99 ? r.test.toExponential(1) : r.test.toFixed(4)}</b></span>` : ""}`;
      draw();
    }

    function drawFit() {
      const c = V.canvas(cFit);
      if (!c) return;
      const F = V.frame(c, { xlim: [0, 1], ylim: [-2, 2], xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [-2, -1, 0, 1, 2], xlabel: "x", ylabel: "y", pad: { l: 40 } });
      const { ctx, sx, sy, T } = F;
      const th = rows[+lIn.value].th;
      const xs = Array.from({ length: 401 }, (_, k) => k / 400);
      F.clip();
      V.line(ctx, xs.map((x) => [sx(x), sy(truth(x))]), T.axis, 2, [6, 5]);
      V.line(ctx, xs.map((x) => [sx(x), sy(V.dotp(th, phi(x)))]), T.path, 2.5);
      train.forEach(([x, y]) => V.dot(ctx, sx(x), sy(y), T.text, 4));
      F.unclip();
    }

    function drawErr() {
      const c = V.canvas(cErr);
      if (!c) return;
      const F = V.frame(c, {
        xlim: [-8, 1], ylim: [1e-2, 10], logy: true, xticks: [-8, -6, -4, -2, 0], yticks: [1e-2, 1e-1, 1, 10],
        fmtY: (v) => String(v), xlabel: "log10 λ   (← more flexible · simpler →)", ylabel: "MSE (log scale)", pad: { l: 46 },
      });
      const { ctx, sx, sy, T } = F;
      const i = +lIn.value;
      const cl = (v) => Math.min(Math.max(v, 1e-2), 1e3);
      F.clip();
      ctx.globalAlpha = 0.14; ctx.fillStyle = T.curve;
      ctx.fillRect(sx(LOGS[i]) - 5, F.pad.t, 10, c.h - F.pad.t - F.pad.b);
      ctx.globalAlpha = 1;
      V.line(ctx, rows.map((r, k) => [sx(LOGS[k]), sy(cl(r.train))]), T.path, 2);
      V.line(ctx, rows.map((r, k) => [sx(LOGS[k]), sy(cl(r.cv))]), T.curve, 2);
      if (showTest.checked) V.line(ctx, rows.map((r, k) => [sx(LOGS[k]), sy(cl(r.test))]), T.axis, 2, [6, 5]);
      V.dot(ctx, sx(LOGS[best]), sy(cl(rows[best].cv)), T.curve, 6, "ring");
      V.dot(ctx, sx(LOGS[i]), sy(cl(rows[i].train)), T.path, 4.5, "square");
      V.dot(ctx, sx(LOGS[i]), sy(cl(rows[i].cv)), T.curve, 4.5);
      F.unclip();
    }

    function draw() { drawFit(); drawErr(); }
    lIn.addEventListener("input", update);
    showTest.addEventListener("change", update);
    stage.querySelector('[data-act="cv"]').addEventListener("click", () => { lIn.value = best; update(); });
    stage.querySelector('[data-act="resample"]').addEventListener("click", () => { seed += 1; resample(); });
    V.onRedraw([cFit, cErr], draw);
    resample();
  }

  V.mountAll("ridge-cv", mount);
})();
