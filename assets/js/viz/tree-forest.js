/* ==========================================================================
   Interactive: from one tree to a forest, on the two moons.
   B fully grown trees are trained on bootstrap samples, either with all
   features at every split (bagging) or with one random feature per split
   (random forest, m = 1 of p = 2). Left: the averaged probability of the
   first B trees. Right: test error and out-of-bag error against B, with
   the test error of a single fully grown tree for reference.
   Requires common.js and tree-lib.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ, Tr = V.Tree;
  const BMAX = 200;

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-m">Ensemble</label>
          <select id="${id}-m">
            <option value="bag">Bagging (all features at each split)</option>
            <option value="rf">Random forest (1 random feature per split)</option>
          </select>
        </div>
        <div class="control">
          <label for="${id}-b">Number of trees B <output id="${id}-b-out" for="${id}-b"></output></label>
          <input type="range" id="${id}-b" min="1" max="${BMAX}" step="1" value="1">
        </div>
      </div>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">Average of the first B trees</p>
          <canvas class="viz__canvas" data-c="map" role="img"
            aria-label="The two moons training data, shaded by the average predicted probability of the first B trees. With one tree the regions are blocky and jagged; with many trees the shading becomes smooth."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">Error rate against the number of trees</p>
          <canvas class="viz__canvas" data-c="err" role="img"
            aria-label="Test error and out-of-bag error of bagging and random forests as the number of trees grows from 1 to 200, and a dashed line at the test error of a single fully grown tree."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-path)">Test error / class 1 (triangles)</span>
        <span style="--swatch: var(--viz-curve)">Out-of-bag error / class 0 (circles)</span>
        <span style="--swatch: var(--viz-text)">Single tree, test error (dashed)</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cM = stage.querySelector('[data-c="map"]');
    const cE = stage.querySelector('[data-c="err"]');
    const mSel = stage.querySelector(`#${id}-m`);
    const bIn = stage.querySelector(`#${id}-b`);
    const readout = stage.querySelector(".viz__readout");
    const train = V.moons(150, 0.35, 3), test = V.moons(400, 0.35, 41);
    const single = Tr.fit(train, { task: "clf" });
    const singleErr = test.filter((p) => ((Tr.predict(single, p) > 0.5 ? 1 : 0) !== p[2])).length / test.length;
    const ens = {};

    function grow(kind) {
      if (ens[kind]) return ens[kind];
      const r = V.rng(kind === "bag" ? 101 : 202);
      const trees = [], te = [], oob = [];
      const sumTest = new Array(test.length).fill(0);
      const sumOob = new Array(train.length).fill(0), cntOob = new Array(train.length).fill(0);
      for (let b = 0; b < BMAX; b++) {
        const bs = Tr.bootstrap(train, r);
        const t = Tr.fit(bs.rows, { task: "clf", mtry: kind === "rf" ? 1 : null, rng: r });
        trees.push(t);
        test.forEach((p, i) => { sumTest[i] += Tr.predict(t, p); });
        bs.oob.forEach((i) => { sumOob[i] += Tr.predict(t, train[i]); cntOob[i]++; });
        te.push(test.filter((p, i) => ((sumTest[i] / (b + 1) > 0.5 ? 1 : 0) !== p[2])).length / test.length);
        let wrong = 0, seen = 0;
        train.forEach((p, i) => { if (cntOob[i]) { seen++; if (((sumOob[i] / cntOob[i] > 0.5) ? 1 : 0) !== p[2]) wrong++; } });
        oob.push(seen ? wrong / seen : NaN);
      }
      return (ens[kind] = { trees, te, oob });
    }

    function update() {
      const E = grow(mSel.value), B = +bIn.value;
      stage.querySelector(`#${id}-b-out`).textContent = B;
      readout.innerHTML = `<span>B = <b>${B}</b></span>
        <span>test error <b>${(100 * E.te[B - 1]).toFixed(1)}%</b></span>
        <span>out-of-bag error <b>${isFinite(E.oob[B - 1]) ? (100 * E.oob[B - 1]).toFixed(1) + "%" : "—"}</b></span>
        <span>single fully grown tree: test error <b>${(100 * singleErr).toFixed(1)}%</b></span>`;
      draw();
    }

    function drawMap() {
      const c = V.canvas(cM);
      if (!c) return;
      const E = grow(mSel.value), B = +bIn.value;
      const pad = { l: 36, r: 12, t: 12, b: 30 };
      const lim = V.equalLims(c, pad, train, 0.06);
      const F = V.frame(c, { xlim: lim.xlim, ylim: lim.ylim, xticks: V.ticks(lim.xlim[0], lim.xlim[1], 6), yticks: V.ticks(lim.ylim[0], lim.ylim[1], 5), pad });
      const { ctx, sx, sy, ix, iy, T } = F;
      F.clip();
      const cell = 5;
      for (let px = pad.l; px < c.w - pad.r; px += cell) {
        for (let py = pad.t; py < c.h - pad.b; py += cell) {
          const x = [ix(px + cell / 2), iy(py + cell / 2)];
          let s = 0; for (let b = 0; b < B; b++) s += Tr.predict(E.trees[b], x);
          const p = s / B;
          ctx.globalAlpha = 0.08 + Math.abs(p - 0.5) * 0.5;
          ctx.fillStyle = p > 0.5 ? T.path : T.curve;
          ctx.fillRect(px, py, cell, cell);
        }
      }
      ctx.globalAlpha = 1;
      train.forEach(([a, b, y]) => {
        V.dot(ctx, sx(a), sy(b), T.bg, 5.5, y ? "triangle" : "circle");
        V.dot(ctx, sx(a), sy(b), y ? T.path : T.curve, 4, y ? "triangle" : "circle");
      });
      F.unclip();
    }

    function drawErr() {
      const c = V.canvas(cE);
      if (!c) return;
      const E = grow(mSel.value), B = +bIn.value, top = 0.25;
      const F = V.frame(c, { xlim: [1, BMAX], ylim: [0, top], xticks: [1, 50, 100, 150, 200], yticks: [0, 0.05, 0.1, 0.15, 0.2, 0.25],
        fmtY: (v) => `${Math.round(100 * v)}%`, xlabel: "number of trees B", pad: { l: 44 } });
      const { ctx, sx, sy, T } = F;
      F.clip();
      V.line(ctx, [[sx(1), sy(singleErr)], [sx(BMAX), sy(singleErr)]], T.text, 1.5, [8, 5]);
      V.line(ctx, E.oob.map((v, i) => [sx(i + 1), sy(isFinite(v) ? Math.min(v, top) : top)]), T.curve, 2);
      V.line(ctx, E.te.map((v, i) => [sx(i + 1), sy(Math.min(v, top))]), T.path, 2.5);
      V.line(ctx, [[sx(B), sy(0)], [sx(B), sy(top)]], T.text, 1.5);
      ctx.font = T.font(11, 600); ctx.fillStyle = T.text; ctx.textAlign = "right";
      ctx.fillText("single tree (test)", sx(BMAX) - 4, sy(singleErr) - 6);
      F.unclip();
    }

    function draw() { drawMap(); drawErr(); }
    mSel.addEventListener("change", update);
    bIn.addEventListener("input", update);
    V.onRedraw([cM, cE], draw);
    update();
  }

  V.mountAll("tree-forest", mount);
})();
