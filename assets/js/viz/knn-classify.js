/* ==========================================================================
   Interactive: k-NN classification on the two moons.
   Left: training points, the region where k-NN predicts each class (shading
   = estimated probability of class B), and a movable query point with its
   neighbourhood (circle for Euclidean, diamond for Manhattan distance).
   Optional: the linear boundary of logistic regression.
   Right: training and test error against k.
   Requires common.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ;
  const KMAX = 75, XL = [-1.6, 2.6], YL = [-1.3, 1.8];

  const dist = {
    euclid: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]),
    manhattan: (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]),
  };

  // logistic regression on (x, y) by Newton's method → [b, w1, w2]
  function logistic(data) {
    let t = [0, 0, 0];
    for (let it = 0; it < 30; it++) {
      const g = [0, 0, 0], H = [[1e-6, 0, 0], [0, 1e-6, 0], [0, 0, 1e-6]];
      data.forEach(([a, b, y]) => {
        const x = [1, a, b], p = V.sigmoid(t[0] + t[1] * a + t[2] * b), w = p * (1 - p);
        for (let i = 0; i < 3; i++) { g[i] += (p - y) * x[i]; for (let j = 0; j < 3; j++) H[i][j] += w * x[i] * x[j]; }
      });
      t = t.map((v, i) => v - V.lstsq(H, g)[i]);
    }
    return t;
  }

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-k">Number of neighbours k <output id="${id}-k-out" for="${id}-k"></output></label>
          <input type="range" id="${id}-k" min="1" max="${KMAX}" step="2" value="1">
        </div>
        <div class="control">
          <label for="${id}-m">Distance</label>
          <select id="${id}-m">
            <option value="euclid">Euclidean (q = 2)</option>
            <option value="manhattan">Manhattan (q = 1)</option>
          </select>
        </div>
        <div class="control control--check">
          <label><input type="checkbox" id="${id}-lr"> Show the logistic regression boundary</label>
        </div>
      </div>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">Prediction regions (click or drag to move the query point)</p>
          <canvas class="viz__canvas" data-c="map" role="img" tabindex="0"
            aria-label="Two interleaving half-moons of training points, the plane shaded by the predicted class, the k-NN decision boundary, and a query point with a circle or diamond enclosing its k nearest neighbours. Use the arrow keys to move the query point."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">Error rate against k</p>
          <canvas class="viz__canvas" data-c="err" role="img"
            aria-label="Training and test error rates of k-NN for odd k from 1 to 75. The training error is zero at k equals 1 and increases with k; the test error first decreases and then increases. A dashed line shows the test error of logistic regression."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-curve)">Class A (circles) / training error</span>
        <span style="--swatch: var(--viz-path)">Class B (triangles) / test error</span>
        <span style="--swatch: var(--viz-text)">Query point, its neighbourhood; logistic regression (dashed)</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cM = stage.querySelector('[data-c="map"]');
    const cE = stage.querySelector('[data-c="err"]');
    const kIn = stage.querySelector(`#${id}-k`);
    const mSel = stage.querySelector(`#${id}-m`);
    const lrBox = stage.querySelector(`#${id}-lr`);
    const readout = stage.querySelector(".viz__readout");
    const train = V.moons(150, 0.22, 3), test = V.moons(400, 0.22, 41);
    const lr = logistic(train);
    const lrErr = test.filter(([a, b, y]) => ((lr[0] + lr[1] * a + lr[2] * b >= 0) ? 1 : 0) !== y).length / test.length;
    let q = [0.5, 0.25], F = null, errs;

    // labels of the training points sorted by distance from x
    const sortedLabels = (x, d) => train.map((p) => [d(x, p), p[2]]).sort((a, b) => a[0] - b[0]);
    const phat = (x, k, d) => { const s = sortedLabels(x, d); let c = 0; for (let i = 0; i < k; i++) c += s[i][1]; return c / k; };

    function computeErrors() {
      const d = dist[mSel.value];
      const tr = new Array(KMAX + 1).fill(0), te = new Array(KMAX + 1).fill(0);
      const acc = (set, out) => set.forEach((p) => {
        const s = sortedLabels(p, d); let c = 0;
        for (let k = 1; k <= KMAX; k++) { c += s[k - 1][1]; if (k % 2) out[k] += ((c / k > 0.5 ? 1 : 0) !== p[2]) / set.length; }
      });
      acc(train, tr); acc(test, te);
      errs = { tr, te };
      update();
    }

    function update() {
      const k = +kIn.value, d = dist[mSel.value];
      stage.querySelector(`#${id}-k-out`).textContent = k;
      const p = phat(q, k, d), nB = Math.round(p * k);
      let best = 1; for (let j = 3; j <= KMAX; j += 2) if (errs.te[j] < errs.te[best]) best = j;
      readout.innerHTML = `<span>query (<b>${q[0].toFixed(2)}</b>, <b>${q[1].toFixed(2)}</b>): neighbours
          <b>${k - nB}</b> A, <b>${nB}</b> B → p̂<sub>B</sub> = <b>${p.toFixed(2)}</b>, predict <b>${p > 0.5 ? "B" : "A"}</b></span>
        <span>training error <b>${(100 * errs.tr[k]).toFixed(1)}%</b></span>
        <span>test error <b>${(100 * errs.te[k]).toFixed(1)}%</b></span>
        <span>logistic regression: test error <b>${(100 * lrErr).toFixed(1)}%</b></span>
        <span>best k on the test set: <b>${best}</b></span>`;
      draw();
    }

    function drawMap() {
      const c = V.canvas(cM);
      if (!c) return;
      const pad = { l: 36, r: 12, t: 12, b: 30 };
      const lim = V.equalLims(c, pad, [[XL[0], YL[0]], [XL[1], YL[1]]], 0);
      F = V.frame(c, { xlim: lim.xlim, ylim: lim.ylim, xticks: V.ticks(lim.xlim[0], lim.xlim[1], 6), yticks: V.ticks(lim.ylim[0], lim.ylim[1], 5), pad });
      const { ctx, sx, sy, ix, iy, T } = F;
      const k = +kIn.value, d = dist[mSel.value];
      F.clip();
      const cell = 6;
      for (let px = pad.l; px < c.w - pad.r; px += cell) {
        for (let py = pad.t; py < c.h - pad.b; py += cell) {
          const p = phat([ix(px + cell / 2), iy(py + cell / 2)], k, d);
          ctx.globalAlpha = 0.08 + Math.abs(p - 0.5) * 0.4;
          ctx.fillStyle = p > 0.5 ? T.path : T.curve;
          ctx.fillRect(px, py, cell, cell);
        }
      }
      ctx.globalAlpha = 1;
      if (lrBox.checked) {
        const y0 = (x) => -(lr[0] + lr[1] * x) / lr[2];
        V.line(ctx, [[sx(lim.xlim[0]), sy(y0(lim.xlim[0]))], [sx(lim.xlim[1]), sy(y0(lim.xlim[1]))]], T.text, 2.5, [8, 5]);
      }
      // neighbourhood of the query point
      const s = train.map((p) => [d(q, p), p]).sort((a, b) => a[0] - b[0]);
      const r = s[k - 1][0];
      ctx.strokeStyle = T.text; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
      ctx.beginPath();
      if (mSel.value === "euclid") ctx.arc(sx(q[0]), sy(q[1]), sx(q[0] + r) - sx(q[0]), 0, 2 * Math.PI);
      else { ctx.moveTo(sx(q[0] + r), sy(q[1])); ctx.lineTo(sx(q[0]), sy(q[1] + r)); ctx.lineTo(sx(q[0] - r), sy(q[1])); ctx.lineTo(sx(q[0]), sy(q[1] - r)); ctx.closePath(); }
      ctx.stroke(); ctx.setLineDash([]);
      train.forEach(([a, b, y]) => {
        V.dot(ctx, sx(a), sy(b), T.bg, 5.5, y ? "triangle" : "circle");
        V.dot(ctx, sx(a), sy(b), y ? T.path : T.curve, 4, y ? "triangle" : "circle");
      });
      ctx.lineWidth = 2;
      for (let i = 0; i < k; i++) V.dot(ctx, sx(s[i][1][0]), sy(s[i][1][1]), T.text, 7.5, "ring");
      V.dot(ctx, sx(q[0]), sy(q[1]), T.bg, 9, "square");
      V.dot(ctx, sx(q[0]), sy(q[1]), T.text, 6.5, "square");
      F.unclip();
    }

    function drawErr() {
      const c = V.canvas(cE);
      if (!c) return;
      const k = +kIn.value, top = 0.3;
      const G = V.frame(c, { xlim: [0, KMAX + 2], ylim: [0, top], xticks: [1, 15, 29, 45, 59, 75], yticks: [0, 0.1, 0.2, 0.3],
        fmtY: (v) => `${Math.round(100 * v)}%`, xlabel: "k  (← more flexible   |   smoother →)", pad: { l: 44 } });
      const { ctx, sx, sy, T } = G;
      G.clip();
      V.line(ctx, [[sx(0), sy(lrErr)], [sx(KMAX + 2), sy(lrErr)]], T.text, 1.5, [8, 5]);
      const tr = [], te = [];
      for (let j = 1; j <= KMAX; j += 2) { tr.push([sx(j), sy(errs.tr[j])]); te.push([sx(j), sy(errs.te[j])]); }
      V.line(ctx, tr, T.curve, 2.5); V.line(ctx, te, T.path, 2.5);
      V.line(ctx, [[sx(k), sy(0)], [sx(k), sy(top)]], T.text, 1.5);
      V.dot(ctx, sx(k), sy(errs.te[k]), T.path, 6, "square");
      V.dot(ctx, sx(k), sy(errs.tr[k]), T.curve, 6);
      ctx.font = T.font(11, 600); ctx.fillStyle = T.text; ctx.textAlign = "left";
      ctx.fillText("logistic regression (test)", sx(2), sy(lrErr) - 6);
      G.unclip();
    }

    function draw() { drawMap(); drawErr(); }

    function setQ(e) {
      if (!F) return;
      const r = cM.getBoundingClientRect();
      q = [F.ix(e.clientX - r.left), F.iy(e.clientY - r.top)];
      update();
    }
    let dragging = false;
    cM.addEventListener("pointerdown", (e) => { dragging = true; cM.setPointerCapture(e.pointerId); setQ(e); });
    cM.addEventListener("pointermove", (e) => { if (dragging) setQ(e); });
    cM.addEventListener("pointerup", () => { dragging = false; });
    cM.style.touchAction = "none"; cM.style.cursor = "crosshair";
    cM.addEventListener("keydown", (e) => {
      const dd = { ArrowLeft: [-0.05, 0], ArrowRight: [0.05, 0], ArrowUp: [0, 0.05], ArrowDown: [0, -0.05] }[e.key];
      if (!dd) return;
      e.preventDefault(); q = [q[0] + dd[0], q[1] + dd[1]]; update();
    });
    kIn.addEventListener("input", update);
    mSel.addEventListener("change", computeErrors);
    lrBox.addEventListener("change", draw);
    V.onRedraw([cM, cE], draw);
    computeErrors();
  }

  V.mountAll("knn-classify", mount);
})();
