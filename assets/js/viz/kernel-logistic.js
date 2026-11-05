/* ==========================================================================
   Interactive: kernel logistic regression on the two moons.
   f(x) = Σ α_i k(x_i, x) with a constant added to the kernel (intercept);
   α minimises the average cross-entropy + (λ/2) αᵀKα, by Newton's method.
   Left: probability shading and the boundary f = 0. Right: the same model
   with a linear kernel for comparison is reported in the readout.
   Requires common.js and kernel-lib.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ, Kn = V.Kern;

  function fitKLR(K, y, lam) {
    const n = y.length;
    let a = new Array(n).fill(0);
    for (let it = 0; it < 25; it++) {
      const f = K.map((row) => V.dotp(row, a));
      const p = f.map(V.sigmoid);
      // Newton step for the α-equation:  ((1/n) W K + λ I) Δ = (1/n)(p − y) + λ α
      const A = K.map((row, i) => row.map((v, j) => (p[i] * (1 - p[i]) * v) / n + (i === j ? lam : 0)));
      const g = p.map((pi, i) => (pi - y[i]) / n + lam * a[i]);
      const d = V.lstsq(A, g);
      let step = 0; d.forEach((v) => { step = Math.max(step, Math.abs(v)); });
      a = a.map((v, i) => v - d[i]);
      if (step < 1e-8) break;
    }
    return a;
  }

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-k">Kernel</label>
          <select id="${id}-k">
            <option value="rbf">Gaussian (RBF)</option>
            <option value="poly">Polynomial, degree 3</option>
            <option value="linear">Linear</option>
          </select>
        </div>
        <div class="control">
          <label for="${id}-s">RBF width σ <output id="${id}-s-out" for="${id}-s"></output></label>
          <input type="range" id="${id}-s" min="-1.3" max="0.7" step="0.05" value="-0.3">
        </div>
        <div class="control">
          <label for="${id}-l">Regularisation λ <output id="${id}-l-out" for="${id}-l"></output></label>
          <input type="range" id="${id}-l" min="-5" max="0" step="0.25" value="-3">
        </div>
      </div>
      <canvas class="viz__canvas" data-c="map" role="img"
        aria-label="The two moons training data, shaded by the predicted probability of class 1 from kernel logistic regression, with the decision boundary where the probability is one half."></canvas>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-curve)">Class 0 (circles)</span>
        <span style="--swatch: var(--viz-path)">Class 1 (triangles)</span>
        <span style="--swatch: var(--viz-text)">Decision boundary p = 0.5</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cM = stage.querySelector('[data-c="map"]');
    const kSel = stage.querySelector(`#${id}-k`);
    const sIn = stage.querySelector(`#${id}-s`);
    const lIn = stage.querySelector(`#${id}-l`);
    const readout = stage.querySelector(".viz__readout");
    const train = V.moons(150, 0.2, 3), test = V.moons(400, 0.2, 41);
    const X = train.map((p) => [p[0], p[1]]), y = train.map((p) => p[2]);
    let kfun, a;

    function fit() {
      const type = kSel.value, sigma = Math.pow(10, +sIn.value), lam = Math.pow(10, +lIn.value);
      sIn.disabled = type !== "rbf";
      stage.querySelector(`#${id}-s-out`).textContent = type === "rbf" ? sigma.toFixed(2) : "—";
      stage.querySelector(`#${id}-l-out`).textContent = lam.toExponential(0);
      const base = Kn.make(type, { sigma, degree: 3 });
      kfun = (u, v) => base(u, v) + 1; // constant kernel = intercept
      a = fitKLR(Kn.matrix(kfun, X, X), y, lam);
      const prob = (x) => V.sigmoid(X.reduce((s, xi, i) => s + a[i] * kfun(xi, x), 0));
      const err = (set) => set.filter((p) => ((prob([p[0], p[1]]) > 0.5 ? 1 : 0) !== p[2])).length / set.length;
      const big = a.filter((v) => Math.abs(v) > 0.05 * Math.max(...a.map(Math.abs))).length;
      readout.innerHTML = `<span>training error <b>${(100 * err(train)).toFixed(1)}%</b></span>
        <span>test error <b>${(100 * err(test)).toFixed(1)}%</b></span>
        <span>training points with a large weight |α<sub>i</sub>|: <b>${big}</b> of ${train.length}</span>`;
      draw();
    }

    function draw() {
      const c = V.canvas(cM);
      if (!c) return;
      const pad = { l: 36, r: 12, t: 12, b: 30 };
      const lim = V.equalLims(c, pad, [[-1.6, -1.2], [2.6, 1.7]], 0);
      const F = V.frame(c, { xlim: lim.xlim, ylim: lim.ylim, xticks: V.ticks(lim.xlim[0], lim.xlim[1], 8), yticks: V.ticks(lim.ylim[0], lim.ylim[1], 5), pad });
      const { ctx, sx, sy, ix, iy, T } = F;
      F.clip();
      const cell = 5, cols = [], ys = [];
      for (let px = pad.l; px < c.w - pad.r; px += cell) cols.push(px);
      for (let py = pad.t; py < c.h - pad.b; py += cell) ys.push(py);
      const P = cols.map((px) => ys.map((py) => {
        const x = [ix(px + cell / 2), iy(py + cell / 2)];
        return X.reduce((s, xi, i) => s + a[i] * kfun(xi, x), 0);
      }));
      cols.forEach((px, i) => ys.forEach((py, j) => {
        const p = V.sigmoid(P[i][j]);
        ctx.globalAlpha = 0.08 + Math.abs(p - 0.5) * 0.5;
        ctx.fillStyle = p > 0.5 ? T.path : T.curve;
        ctx.fillRect(px, py, cell, cell);
      }));
      ctx.globalAlpha = 1;
      // boundary: cells where the sign of f changes
      ctx.fillStyle = T.text;
      cols.forEach((px, i) => ys.forEach((py, j) => {
        if ((i + 1 < cols.length && Math.sign(P[i][j]) !== Math.sign(P[i + 1][j])) ||
            (j + 1 < ys.length && Math.sign(P[i][j]) !== Math.sign(P[i][j + 1]))) ctx.fillRect(px + cell / 2 - 1.5, py + cell / 2 - 1.5, 3, 3);
      }));
      train.forEach(([u, v, l]) => {
        V.dot(ctx, sx(u), sy(v), T.bg, 5.5, l ? "triangle" : "circle");
        V.dot(ctx, sx(u), sy(v), l ? T.path : T.curve, 4, l ? "triangle" : "circle");
      });
      F.unclip();
    }

    [kSel].forEach((e) => e.addEventListener("change", fit));
    sIn.addEventListener("change", fit);
    lIn.addEventListener("change", fit);
    sIn.addEventListener("input", () => { stage.querySelector(`#${id}-s-out`).textContent = Math.pow(10, +sIn.value).toFixed(2); });
    lIn.addEventListener("input", () => { stage.querySelector(`#${id}-l-out`).textContent = Math.pow(10, +lIn.value).toExponential(0); });
    V.onRedraw(cM, draw);
    fit();
  }

  V.mountAll("kernel-logistic", mount);
})();
