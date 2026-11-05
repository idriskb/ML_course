/* ==========================================================================
   Interactive: gradient boosting with small regression trees (squared loss).
   Fuel consumption against speed. Start from the mean; at each stage fit a
   small tree to the current residuals and add ν times it. Left: the data,
   the boosted fit f_M and the last tree added (scaled by ν, around the
   axis). Right: training and test MSE against the number of trees M.
   Requires common.js and tree-lib.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ, Tr = V.Tree;
  const XL = [15, 135], MMAX = 300;
  const f = (s) => 4 + 0.0008 * (s - 70) ** 2 + 25 / s;
  const sample = (n, seed) => { const r = V.rng(seed); return Array.from({ length: n }, () => { const s = 20 + 110 * r(); return [s, f(s) + 0.5 * r.normal()]; }); };

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-m">Number of trees M <output id="${id}-m-out" for="${id}-m"></output></label>
          <input type="range" id="${id}-m" min="0" max="${MMAX}" step="1" value="1">
        </div>
        <div class="control">
          <label for="${id}-nu">Learning rate ν (nu)</label>
          <select id="${id}-nu">
            <option value="1">ν = 1</option>
            <option value="0.3">ν = 0.3</option>
            <option value="0.1" selected>ν = 0.1</option>
          </select>
        </div>
        <div class="control">
          <label for="${id}-depth">Depth of each tree</label>
          <select id="${id}-depth">
            <option value="1">1 (stumps)</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </div>
      </div>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">Boosted fit after M trees</p>
          <canvas class="viz__canvas" data-c="fit" role="img"
            aria-label="Fuel consumption against speed with the boosted prediction, a step function that becomes more detailed as trees are added, and the last tree added drawn near the bottom."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">Mean squared error against M</p>
          <canvas class="viz__canvas" data-c="err" role="img"
            aria-label="Training and test mean squared error of the boosted model as the number of trees grows. Training error keeps decreasing; test error decreases and then slowly increases when the model starts to overfit."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-curve)">Training data / training MSE</span>
        <span style="--swatch: var(--viz-path)">Boosted fit f<sub>M</sub> / test MSE</span>
        <span style="--swatch: var(--viz-axis)">Last tree added, h<sub>M</sub>, before scaling by ν (bottom)</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cF = stage.querySelector('[data-c="fit"]');
    const cE = stage.querySelector('[data-c="err"]');
    const mIn = stage.querySelector(`#${id}-m`);
    const nuSel = stage.querySelector(`#${id}-nu`);
    const dSel = stage.querySelector(`#${id}-depth`);
    const readout = stage.querySelector(".viz__readout");
    const train = sample(40, 8), test = sample(300, 99);
    const mean = train.reduce((s, p) => s + p[1], 0) / train.length;
    let trees, trErr, teErr;

    const fM = (x, M) => { let v = mean; const nu = +nuSel.value; for (let m = 0; m < M; m++) v += nu * Tr.predict(trees[m], [x]); return v; };

    function boost() {
      const nu = +nuSel.value, depth = +dSel.value;
      trees = []; trErr = []; teErr = [];
      const ftr = train.map(() => mean), fte = test.map(() => mean);
      const mse = (set, fv) => set.reduce((s, p, i) => s + (p[1] - fv[i]) ** 2, 0) / set.length;
      trErr.push(mse(train, ftr)); teErr.push(mse(test, fte));
      for (let m = 0; m < MMAX; m++) {
        const res = train.map((p, i) => [p[0], p[1] - ftr[i]]); // residuals = negative gradient
        const h = Tr.fit(res, { task: "reg", maxDepth: depth });
        trees.push(h);
        train.forEach((p, i) => { ftr[i] += nu * Tr.predict(h, [p[0]]); });
        test.forEach((p, i) => { fte[i] += nu * Tr.predict(h, [p[0]]); });
        trErr.push(mse(train, ftr)); teErr.push(mse(test, fte));
      }
      update();
    }

    function update() {
      const M = +mIn.value;
      stage.querySelector(`#${id}-m-out`).textContent = M;
      let best = 0; teErr.forEach((v, i) => { if (v < teErr[best]) best = i; });
      readout.innerHTML = `<span>M = <b>${M}</b></span>
        <span>training MSE <b>${trErr[M].toFixed(3)}</b></span>
        <span>test MSE <b>${teErr[M].toFixed(3)}</b></span>
        <span>lowest test MSE <b>${teErr[best].toFixed(3)}</b> at M = <b>${best}</b></span>`;
      draw();
    }

    function drawFit() {
      const c = V.canvas(cF);
      if (!c) return;
      const M = +mIn.value, nu = +nuSel.value;
      const F = V.frame(c, { xlim: XL, ylim: [1.5, 9], xticks: [20, 40, 60, 80, 100, 120], yticks: [2, 3, 4, 5, 6, 7, 8, 9],
        xlabel: "speed (km/h)", ylabel: "L / 100 km", pad: { l: 44 } });
      const { ctx, sx, sy, T } = F;
      F.clip();
      const pts = [], last = [];
      for (let i = 0; i <= 480; i++) {
        const x = XL[0] + ((XL[1] - XL[0]) * i) / 480;
        pts.push([sx(x), sy(fM(x, M))]);
        if (M > 0) last.push([sx(x), sy(2.2 + Tr.predict(trees[M - 1], [x]))]);
      }
      if (M > 0) {
        V.line(ctx, [[sx(XL[0]), sy(2.2)], [sx(XL[1]), sy(2.2)]], T.axis, 1, [2, 3]);
        V.line(ctx, last, T.axis, 2);
      }
      train.forEach(([x, y]) => { V.dot(ctx, sx(x), sy(y), T.bg, 5.5); V.dot(ctx, sx(x), sy(y), T.curve, 4); });
      V.line(ctx, pts, T.path, 2.5);
      F.unclip();
    }

    function drawErr() {
      const c = V.canvas(cE);
      if (!c) return;
      const M = +mIn.value, top = 1.2;
      const F = V.frame(c, { xlim: [0, MMAX], ylim: [0, top], xticks: [0, 50, 100, 150, 200, 250, 300], yticks: [0, 0.25, 0.5, 0.75, 1],
        xlabel: "number of trees M", ylabel: "MSE", pad: { l: 44 } });
      const { ctx, sx, sy, T } = F;
      F.clip();
      V.line(ctx, [[sx(0), sy(0.25)], [sx(MMAX), sy(0.25)]], T.axis, 1, [2, 4]);
      V.line(ctx, trErr.map((v, i) => [sx(i), sy(Math.min(v, top))]), T.curve, 2.5);
      V.line(ctx, teErr.map((v, i) => [sx(i), sy(Math.min(v, top))]), T.path, 2.5);
      V.line(ctx, [[sx(M), sy(0)], [sx(M), sy(top)]], T.text, 1.5);
      ctx.font = T.font(11, 600); ctx.fillStyle = T.text; ctx.textAlign = "right";
      ctx.fillText("noise level σ²", sx(MMAX) - 4, sy(0.25) - 6);
      F.unclip();
    }

    function draw() { drawFit(); drawErr(); }
    mIn.addEventListener("input", update);
    nuSel.addEventListener("change", boost);
    dSel.addEventListener("change", boost);
    V.onRedraw([cF, cE], draw);
    boost();
  }

  V.mountAll("tree-boost", mount);
})();
