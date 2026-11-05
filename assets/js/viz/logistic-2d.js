/* ==========================================================================
   Interactive: logistic regression trained by gradient descent on two
   standardised tumour features. Left: data, predicted probability (shading)
   and decision boundary. Right: training loss against iteration.
   Options: overlapping or linearly separable data, raw or standardised
   features, L2 penalty λ, learning rate η (log scale). With raw features the
   loss surface is much more curved, so a large η makes gradient descent blow up.
   Requires common.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ;
  const T_MAX = 600, LIM = [-3.5, 3.5];
  // Raw units: size = 14 + 4·z₁ (mm), texture = 20 + 4·z₂, z = standardised feature.
  const MU = [14, 20], SD = [4, 4];

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-data">Data</label>
          <select id="${id}-data">
            <option value="overlap">Overlapping classes</option>
            <option value="sep">Linearly separable classes</option>
          </select>
        </div>
        <div class="control">
          <label for="${id}-feat">Features</label>
          <select id="${id}-feat">
            <option value="std">Standardised</option>
            <option value="raw">Raw units</option>
          </select>
        </div>
        <div class="control">
          <label for="${id}-lam">L2 penalty λ</label>
          <select id="${id}-lam">
            <option value="0">λ = 0 (no penalty)</option>
            <option value="0.01">λ = 0.01</option>
            <option value="0.1">λ = 0.1</option>
          </select>
        </div>
        <div class="control">
          <label for="${id}-lr">Learning rate η <output id="${id}-lr-out" for="${id}-lr"></output></label>
          <input type="range" id="${id}-lr" min="-3" max="1" step="0.1" value="0"
            aria-describedby="${id}-lr-hint">
          <small id="${id}-lr-hint" class="visually-hidden">Logarithmic scale from 0.001 to 10.</small>
        </div>
        <div class="viz__buttons viz__buttons--row">
          <button type="button" class="btn btn--primary" data-act="step">Step ×10</button>
          <button type="button" class="btn" data-act="run">Run</button>
          <button type="button" class="btn" data-act="reset">Reset</button>
        </div>
      </div>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">Predicted probability of malignant</p>
          <canvas class="viz__canvas" data-c="map" role="img"
            aria-label="Scatter plot of benign and malignant tumours in two standardised features, shaded by the predicted probability of malignancy, with the decision boundary where the probability equals one half."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">Training loss against iteration</p>
          <canvas class="viz__canvas" data-c="loss" role="img"
            aria-label="Average cross-entropy loss on the training data at each iteration of gradient descent."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-curve)">Benign (circles) / p &lt; 0.5</span>
        <span style="--swatch: var(--viz-path)">Malignant (triangles) / p &gt; 0.5</span>
        <span style="--swatch: var(--viz-text)">Decision boundary p = 0.5</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cMap = stage.querySelector('[data-c="map"]');
    const cLoss = stage.querySelector('[data-c="loss"]');
    const dSel = stage.querySelector(`#${id}-data`);
    const lamSel = stage.querySelector(`#${id}-lam`);
    const fSel = stage.querySelector(`#${id}-feat`);
    const lr = stage.querySelector(`#${id}-lr`);
    const readout = stage.querySelector(".viz__readout");
    const runBtn = stage.querySelector('[data-act="run"]');
    let data, dataStd, th, losses, timer = null;
    const raw = () => fSel.value === "raw";
    const eta = () => Math.pow(10, +lr.value);
    const fmtEta = (v) => (v >= 1 ? v.toFixed(1) : v.toPrecision(2).replace(/0+$/, ""));
    const showEta = () => { stage.querySelector(`#${id}-lr-out`).textContent = fmtEta(eta()); };
    // Parameters expressed on the standardised axes (for drawing): z = θ0 + θ1 x1 + θ2 x2 with x = μ + σ·u.
    const thStd = () => raw()
      ? [th[0] + th[1] * MU[0] + th[2] * MU[1], th[1] * SD[0], th[2] * SD[1]]
      : th;
    const diverging = () => losses.length > 3 && losses[losses.length - 1] > 3 * losses[0];

    const lam = () => +lamSel.value;
    function lossOf(t) {
      let s = 0;
      data.forEach(([a, b, y]) => {
        const z = t[0] + t[1] * a + t[2] * b;
        // log(1 + e^{-z}) for y = 1, log(1 + e^{z}) for y = 0, computed stably
        const m = y ? -z : z;
        s += m > 0 ? m + Math.log1p(Math.exp(-m)) : Math.log1p(Math.exp(m)); // stable log(1 + e^m)
      });
      return s / data.length + lam() * (t[1] * t[1] + t[2] * t[2]);
    }

    function reset() {
      stop();
      dataStd = V.tumours(60, 11, dSel.value === "sep");
      data = raw() ? dataStd.map(([a, b, y]) => [MU[0] + SD[0] * a, MU[1] + SD[1] * b, y]) : dataStd;
      th = [0, 0, 0];
      losses = [lossOf(th)];
      showEta();
      update();
    }

    function step() {
      const n = data.length, g = [0, 0, 0];
      data.forEach(([a, b, y]) => {
        const r = V.sigmoid(th[0] + th[1] * a + th[2] * b) - y;
        g[0] += r / n; g[1] += (r * a) / n; g[2] += (r * b) / n;
      });
      g[1] += 2 * lam() * th[1]; g[2] += 2 * lam() * th[2];
      const e = eta();
      th = th.map((v, j) => v - e * g[j]);
      const L = lossOf(th);
      losses.push(isFinite(L) ? L : 1e6);
    }
    function steps(k) {
      for (let i = 0; i < k && losses.length <= T_MAX; i++) step();
      update();
      return losses.length <= T_MAX;
    }
    function run() {
      if (timer) { stop(); return; }
      runBtn.textContent = "Pause";
      timer = setInterval(() => { if (!steps(5)) stop(); }, 40);
    }
    function stop() { clearInterval(timer); timer = null; runBtn.textContent = "Run"; }

    function update() {
      const correct = data.filter(([a, b, y]) => ((th[0] + th[1] * a + th[2] * b >= 0) ? 1 : 0) === y).length;
      const wn = Math.hypot(th[1], th[2]);
      readout.innerHTML = `<span>iteration t = <b>${losses.length - 1}</b></span>
        <span>θ = (<b>${th[0].toFixed(2)}</b>, <b>${th[1].toFixed(2)}</b>, <b>${th[2].toFixed(2)}</b>)</span>
        <span>loss = <b>${losses[losses.length - 1].toFixed(4)}</b></span>
        <span>training accuracy = <b>${Math.round((100 * correct) / data.length)}%</b></span>
        <span>‖w‖ = <b>${wn.toFixed(2)}</b></span>
        ${diverging() ? `<span class="viz__status">${V.WARN_ICON} the loss is increasing: η is too large for these features</span>` : ""}`;
      draw();
    }

    function drawMap() {
      const c = V.canvas(cMap);
      if (!c) return;
      const R = raw();
      const F = V.frame(c, { xlim: LIM, ylim: LIM, xticks: [-3, -2, -1, 0, 1, 2, 3], yticks: [-3, -2, -1, 0, 1, 2, 3],
        fmtX: (v) => String(R ? MU[0] + SD[0] * v : v), fmtY: (v) => String(R ? MU[1] + SD[1] * v : v),
        xlabel: R ? "x₁ = size (mm)" : "x₁ (standardised size)", ylabel: R ? "x₂ = texture" : "x₂ (standardised texture)",
        pad: { l: 40 } });
      const { ctx, sx, sy, ix, iy, T, pad } = F;
      const th = thStd();
      F.clip();
      const cell = 6;
      for (let px = pad.l; px < c.w - pad.r; px += cell) {
        for (let py = pad.t; py < c.h - pad.b; py += cell) {
          const p = V.sigmoid(th[0] + th[1] * ix(px + cell / 2) + th[2] * iy(py + cell / 2));
          ctx.globalAlpha = Math.abs(p - 0.5) * 0.55;
          ctx.fillStyle = p > 0.5 ? T.path : T.curve;
          ctx.fillRect(px, py, cell, cell);
        }
      }
      ctx.globalAlpha = 1;
      if (Math.abs(th[2]) > 1e-9 || Math.abs(th[1]) > 1e-9) {
        // boundary θ0 + θ1 x1 + θ2 x2 = 0
        const pts = [];
        if (Math.abs(th[2]) > Math.abs(th[1])) {
          [LIM[0], LIM[1]].forEach((a) => pts.push([sx(a), sy(-(th[0] + th[1] * a) / th[2])]));
        } else {
          [LIM[0], LIM[1]].forEach((b) => pts.push([sx(-(th[0] + th[2] * b) / th[1]), sy(b)]));
        }
        V.line(ctx, pts, T.text, 2.5);
      }
      dataStd.forEach(([a, b, y]) => {
        V.dot(ctx, sx(a), sy(b), T.bg, 6.5, y ? "triangle" : "circle");
        V.dot(ctx, sx(a), sy(b), y ? T.path : T.curve, y ? 5 : 4.2, y ? "triangle" : "circle");
      });
      F.unclip();
    }

    function drawLoss() {
      const c = V.canvas(cLoss);
      if (!c) return;
      // log scale so that both slow convergence towards 0 and blow-ups stay visible
      const top = Math.pow(10, Math.max(0, Math.ceil(Math.log10(Math.max(...losses) * 1.2))));
      const yt = [0.001, 0.01, 0.1, 1, 10, 100, 1000, 1e4, 1e5, 1e6].filter((v) => v <= top);
      const F = V.frame(c, { xlim: [0, T_MAX], ylim: [0.001, top], logy: true, xticks: [0, 100, 200, 300, 400, 500, 600],
        yticks: yt, fmtY: (v) => (v >= 1e4 ? "1e" + Math.round(Math.log10(v)) : String(v)),
        xlabel: "iteration t", ylabel: "cross-entropy (log scale)", pad: { l: 48 } });
      const { ctx, sx, sy, T } = F;
      F.clip();
      V.line(ctx, [[sx(0), sy(losses[0])], [sx(T_MAX), sy(losses[0])]], T.axis, 1, [3, 4]);
      V.line(ctx, losses.map((L, i) => [sx(i), sy(Math.max(L, 1e-3))]), T.path, 2);
      F.unclip();
    }

    function draw() { drawMap(); drawLoss(); }

    lr.addEventListener("input", showEta);
    fSel.addEventListener("change", reset);
    dSel.addEventListener("change", reset);
    lamSel.addEventListener("change", reset);
    stage.querySelector('[data-act="step"]').addEventListener("click", () => steps(10));
    runBtn.addEventListener("click", run);
    stage.querySelector('[data-act="reset"]').addEventListener("click", reset);
    V.onRedraw([cMap, cLoss], draw);
    reset();
  }

  V.mountAll("logistic-2d", mount);
})();
