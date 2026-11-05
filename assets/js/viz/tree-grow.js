/* ==========================================================================
   Interactive: growing a classification tree.
   Left: the axis-aligned regions of the tree (shading = class proportion in
   the leaf) and the training points. Right: training and test error against
   the maximum depth. Below: the tree written as rules, when it is small.
   Options: dataset, maximum depth, minimum leaf size, impurity criterion.
   Requires common.js and tree-lib.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ, Tr = V.Tree;
  const DMAX = 12;

  function diagonal(n, seed) {
    const r = V.rng(seed);
    return Array.from({ length: n }, () => {
      const a = -2 + 4 * r(), b = -2 + 4 * r();
      return [a, b, a + b + 0.35 * r.normal() > 0 ? 1 : 0];
    });
  }
  const DATA = {
    moons: { name: "Two moons", train: () => V.moons(150, 0.35, 3), test: () => V.moons(400, 0.35, 41), names: ["x₁", "x₂"] },
    tumours: { name: "Tumours (size, texture)", train: () => V.tumours(160, 11), test: () => V.tumours(400, 12), names: ["size (std.)", "texture (std.)"] },
    diagonal: { name: "A diagonal boundary", train: () => diagonal(150, 4), test: () => diagonal(400, 5), names: ["x₁", "x₂"] },
  };

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    const opts = Object.keys(DATA).map((k) => `<option value="${k}">${DATA[k].name}</option>`).join("");
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-data">Data</label>
          <select id="${id}-data">${opts}</select>
        </div>
        <div class="control">
          <label for="${id}-d">Maximum depth <output id="${id}-d-out" for="${id}-d"></output></label>
          <input type="range" id="${id}-d" min="0" max="${DMAX}" step="1" value="2">
        </div>
        <div class="control">
          <label for="${id}-leaf">Minimum leaf size <output id="${id}-leaf-out" for="${id}-leaf"></output></label>
          <input type="range" id="${id}-leaf" min="1" max="30" step="1" value="1">
        </div>
        <div class="control">
          <label for="${id}-crit">Impurity</label>
          <select id="${id}-crit">
            <option value="gini">Gini</option>
            <option value="entropy">Entropy</option>
          </select>
        </div>
      </div>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">Regions of the tree</p>
          <canvas class="viz__canvas" data-c="map" role="img"
            aria-label="Training points of two classes and the rectangular regions of the decision tree, shaded by the proportion of each class in the region."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">Error rate against maximum depth</p>
          <canvas class="viz__canvas" data-c="err" role="img"
            aria-label="Training and test error rates of the tree for maximum depths 0 to 12. The training error decreases with depth; the test error decreases and then increases."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-curve)">Class 0 (circles) / training error</span>
        <span style="--swatch: var(--viz-path)">Class 1 (triangles) / test error</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>
      <div class="viz__rules" aria-live="polite"></div>`;

    const cM = stage.querySelector('[data-c="map"]');
    const cE = stage.querySelector('[data-c="err"]');
    const dSel = stage.querySelector(`#${id}-data`);
    const dIn = stage.querySelector(`#${id}-d`);
    const lIn = stage.querySelector(`#${id}-leaf`);
    const cSel = stage.querySelector(`#${id}-crit`);
    const readout = stage.querySelector(".viz__readout");
    const rulesBox = stage.querySelector(".viz__rules");
    let train, test, tree, errs;

    const err = (set, cap) => set.filter((p) => ((Tr.predict(tree, p, cap) > 0.5 ? 1 : 0) !== p[2])).length / set.length;

    function build() {
      const D = DATA[dSel.value];
      train = D.train(); test = D.test();
      stage.querySelector(`#${id}-leaf-out`).textContent = lIn.value;
      tree = Tr.fit(train, { task: "clf", criterion: cSel.value, minLeaf: +lIn.value });
      errs = { tr: [], te: [] };
      for (let d = 0; d <= DMAX; d++) { errs.tr[d] = err(train, d); errs.te[d] = err(test, d); }
      update();
    }

    function update() {
      const d = +dIn.value, D = DATA[dSel.value];
      stage.querySelector(`#${id}-d-out`).textContent = d;
      const L = Tr.leaves(tree, d);
      readout.innerHTML = `<span>leaves <b>${L}</b></span>
        <span>training error <b>${(100 * errs.tr[d]).toFixed(1)}%</b></span>
        <span>test error <b>${(100 * errs.te[d]).toFixed(1)}%</b></span>`;
      if (L <= 8) {
        const rs = Tr.rules(tree, d, D.names);
        rulesBox.innerHTML = `<p class="viz__panel-title">The tree as rules</p><ol>${rs.map((r) =>
          `<li>${r.conds.length ? "if " + r.conds.join(" and ") : "always"} → predict <b>class ${r.value > 0.5 ? 1 : 0}</b>
            <span class="viz__muted">(${r.n} training points, ${Math.round(100 * Math.max(r.value, 1 - r.value))}% of that class)</span></li>`).join("")}</ol>`;
      } else {
        rulesBox.innerHTML = `<p class="viz__panel-title">The tree as rules</p><p class="viz__muted">${L} leaves: too many rules to read comfortably.</p>`;
      }
      draw();
    }

    function drawMap() {
      const c = V.canvas(cM);
      if (!c) return;
      const pad = { l: 36, r: 12, t: 12, b: 30 };
      const lim = V.equalLims(c, pad, train, 0.06);
      const F = V.frame(c, { xlim: lim.xlim, ylim: lim.ylim, xticks: V.ticks(lim.xlim[0], lim.xlim[1], 6), yticks: V.ticks(lim.ylim[0], lim.ylim[1], 5), pad });
      const { ctx, sx, sy, ix, iy, T } = F;
      const d = +dIn.value;
      F.clip();
      const cell = 4;
      for (let px = pad.l; px < c.w - pad.r; px += cell) {
        for (let py = pad.t; py < c.h - pad.b; py += cell) {
          const p = Tr.predict(tree, [ix(px + cell / 2), iy(py + cell / 2)], d);
          ctx.globalAlpha = 0.1 + Math.abs(p - 0.5) * 0.45;
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
      const d = +dIn.value, top = Math.max(0.3, Math.ceil(Math.max(errs.te[0], errs.tr[0]) * 10) / 10);
      const F = V.frame(c, { xlim: [-0.5, DMAX + 0.5], ylim: [0, top], xticks: [0, 2, 4, 6, 8, 10, 12], yticks: V.ticks(0, top, 4),
        fmtY: (v) => `${Math.round(100 * v)}%`, xlabel: "maximum depth  (← simpler   |   more complex →)", pad: { l: 44 } });
      const { ctx, sx, sy, T } = F;
      F.clip();
      const tr = [], te = [];
      for (let j = 0; j <= DMAX; j++) { tr.push([sx(j), sy(errs.tr[j])]); te.push([sx(j), sy(errs.te[j])]); }
      V.line(ctx, tr, T.curve, 2.5); V.line(ctx, te, T.path, 2.5);
      tr.forEach(([x, y]) => V.dot(ctx, x, y, T.curve, 3)); te.forEach(([x, y]) => V.dot(ctx, x, y, T.path, 3.5, "square"));
      V.line(ctx, [[sx(d), sy(0)], [sx(d), sy(top)]], T.text, 1.5);
      F.unclip();
    }

    function draw() { drawMap(); drawErr(); }
    dSel.addEventListener("change", build);
    cSel.addEventListener("change", build);
    lIn.addEventListener("input", build);
    dIn.addEventListener("input", update);
    V.onRedraw([cM, cE], draw);
    build();
  }

  V.mountAll("tree-grow", mount);
})();
