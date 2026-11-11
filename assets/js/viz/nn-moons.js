/* ==========================================================================
   Interactive: a one-hidden-layer network on the two moons.
   p(x) = sigmoid(c + Σ_j v_j σ(w_j·x + b_j)), m hidden units, trained on the
   average cross-entropy by full-batch gradient descent with Adam steps
   (how the gradients are computed is the subject of Chapter 11).
   Left: probability shading, decision boundary, optionally the line
   w_j·x + b_j = 0 of each hidden unit. Right: training loss against step.
   Requires common.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ;
  const MAX_STEPS = 3000, PER_FRAME = 15, LR = 0.03;

  const ACT = {
    relu: { f: (z) => (z > 0 ? z : 0), d: (z) => (z > 0 ? 1 : 0) },
    tanh: { f: Math.tanh, d: (z) => 1 - Math.tanh(z) ** 2 },
    linear: { f: (z) => z, d: () => 1 },
  };

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-a">Hidden activation</label>
          <select id="${id}-a">
            <option value="relu">ReLU</option>
            <option value="tanh">Tanh</option>
            <option value="linear">Identity (no non-linearity)</option>
          </select>
        </div>
        <div class="control">
          <label for="${id}-m">Hidden units m <output id="${id}-m-out" for="${id}-m"></output></label>
          <input type="range" id="${id}-m" min="1" max="32" step="1" value="8">
        </div>
        <div class="control control--check">
          <label><input type="checkbox" id="${id}-h"> <span>Show each hidden unit's line w<sub>j</sub>·x + b<sub>j</sub> = 0</span></label>
        </div>
        <div class="viz__buttons viz__buttons--row">
          <button type="button" class="btn btn--primary" data-act="train">Train</button>
          <button type="button" class="btn" data-act="reset">New initialisation</button>
        </div>
      </div>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">Predicted probability of class 1 and decision boundary</p>
          <canvas class="viz__canvas" data-c="map" role="img"
            aria-label="The two moons training data, shaded by the network's predicted probability of class 1, with the decision boundary where the probability is one half and optionally the lines where each hidden unit switches on."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">Training loss (cross-entropy) against step</p>
          <canvas class="viz__canvas" data-c="loss" role="img"
            aria-label="Average training cross-entropy at each gradient step. It starts near log 2 and decreases during training."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-curve)">Class 0 (circles)</span>
        <span style="--swatch: var(--viz-path)">Class 1 (triangles) / loss</span>
        <span style="--swatch: var(--viz-text)">Decision boundary p = 0.5</span>
        <span style="--swatch: var(--viz-axis)">Hidden-unit lines (dashed)</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cM = stage.querySelector('[data-c="map"]');
    const cL = stage.querySelector('[data-c="loss"]');
    const aSel = stage.querySelector(`#${id}-a`);
    const mIn = stage.querySelector(`#${id}-m`);
    const hBox = stage.querySelector(`#${id}-h`);
    const trainBtn = stage.querySelector('[data-act="train"]');
    const resetBtn = stage.querySelector('[data-act="reset"]');
    const readout = stage.querySelector(".viz__readout");
    const train = V.moons(150, 0.2, 3), test = V.moons(400, 0.2, 41);
    const N = train.length;

    let seed = 5, net, opt, step, losses, running = false, raf = 0;

    function init() {
      const m = +mIn.value, r = V.rng(seed);
      const s1 = aSel.value === "relu" ? Math.sqrt(2 / 2) : Math.sqrt(1 / 2), s2 = Math.sqrt(1 / m);
      net = {
        W: Array.from({ length: m }, () => [s1 * r.normal(), s1 * r.normal()]),
        b: Array.from({ length: m }, () => 0.1 * r.normal()),
        v: Array.from({ length: m }, () => s2 * r.normal()),
        c: 0,
      };
      // Adam moments, same layout as the parameters, flattened
      const P = 4 * m + 1;
      opt = { m: new Float64Array(P), s: new Float64Array(P), t: 0 };
      step = 0;
      losses = [lossAndGrad().loss];
    }

    function forward(x) {
      const A = ACT[aSel.value];
      const z = net.W.map((w, j) => w[0] * x[0] + w[1] * x[1] + net.b[j]);
      const h = z.map(A.f);
      const out = net.c + h.reduce((s, hj, j) => s + net.v[j] * hj, 0);
      return { z, h, out };
    }

    function lossAndGrad() {
      const A = ACT[aSel.value], m = net.v.length;
      const g = new Float64Array(4 * m + 1); // [W (2m), b (m), v (m), c]
      let loss = 0;
      train.forEach(([x1, x2, y]) => {
        const { z, h, out } = forward([x1, x2]);
        const p = V.sigmoid(out);
        loss += -(y ? Math.log(Math.max(p, 1e-12)) : Math.log(Math.max(1 - p, 1e-12)));
        const dOut = (p - y) / N;
        g[4 * m] += dOut;
        for (let j = 0; j < m; j++) {
          g[3 * m + j] += dOut * h[j];
          const dz = dOut * net.v[j] * A.d(z[j]);
          g[2 * j] += dz * x1;
          g[2 * j + 1] += dz * x2;
          g[2 * m + j] += dz;
        }
      });
      return { loss: loss / N, g };
    }

    function adamStep() {
      const { g } = lossAndGrad(), m = net.v.length;
      const b1 = 0.9, b2 = 0.999, eps = 1e-8;
      opt.t++;
      const upd = new Float64Array(g.length);
      for (let i = 0; i < g.length; i++) {
        opt.m[i] = b1 * opt.m[i] + (1 - b1) * g[i];
        opt.s[i] = b2 * opt.s[i] + (1 - b2) * g[i] * g[i];
        const mh = opt.m[i] / (1 - b1 ** opt.t), sh = opt.s[i] / (1 - b2 ** opt.t);
        upd[i] = (LR * mh) / (Math.sqrt(sh) + eps);
      }
      for (let j = 0; j < m; j++) {
        net.W[j][0] -= upd[2 * j];
        net.W[j][1] -= upd[2 * j + 1];
        net.b[j] -= upd[2 * m + j];
        net.v[j] -= upd[3 * m + j];
      }
      net.c -= upd[4 * m];
      step++;
    }

    const prob = (x) => V.sigmoid(forward(x).out);
    const err = (set) => set.filter((p) => ((prob([p[0], p[1]]) > 0.5 ? 1 : 0) !== p[2])).length / set.length;

    function report() {
      const m = net.v.length;
      stage.querySelector(`#${id}-m-out`).textContent = m;
      readout.innerHTML = `<span>step <b>${step}</b> / ${MAX_STEPS}</span>
        <span>training loss <b>${losses[losses.length - 1].toFixed(3)}</b></span>
        <span>training error <b>${(100 * err(train)).toFixed(1)}%</b></span>
        <span>test error <b>${(100 * err(test)).toFixed(1)}%</b></span>
        <span>parameters 4m + 1 = <b>${4 * m + 1}</b></span>`;
      trainBtn.textContent = running ? "Pause" : step >= MAX_STEPS ? "Trained" : step > 0 ? "Continue" : "Train";
      trainBtn.disabled = !running && step >= MAX_STEPS;
    }

    function frame() {
      for (let k = 0; k < PER_FRAME && step < MAX_STEPS; k++) {
        adamStep();
        if (step % 5 === 0) losses.push(lossAndGrad().loss);
      }
      if (step >= MAX_STEPS) running = false;
      report();
      draw();
      if (running) raf = requestAnimationFrame(frame);
    }

    function stop() { running = false; cancelAnimationFrame(raf); }
    function restart() { stop(); init(); report(); draw(); }

    function drawMap() {
      const c = V.canvas(cM);
      if (!c) return;
      const pad = { l: 36, r: 12, t: 12, b: 30 };
      const lim = V.equalLims(c, pad, [[-1.6, -1.2], [2.6, 1.7]], 0);
      const F = V.frame(c, { xlim: lim.xlim, ylim: lim.ylim, xticks: V.ticks(lim.xlim[0], lim.xlim[1], 8), yticks: V.ticks(lim.ylim[0], lim.ylim[1], 5), pad });
      const { ctx, sx, sy, ix, iy, T } = F;
      F.clip();
      const cell = 5, cols = [], rows = [];
      for (let px = pad.l; px < c.w - pad.r; px += cell) cols.push(px);
      for (let py = pad.t; py < c.h - pad.b; py += cell) rows.push(py);
      const O = cols.map((px) => rows.map((py) => forward([ix(px + cell / 2), iy(py + cell / 2)]).out));
      cols.forEach((px, i) => rows.forEach((py, j) => {
        const p = V.sigmoid(O[i][j]);
        ctx.globalAlpha = 0.08 + Math.abs(p - 0.5) * 0.5;
        ctx.fillStyle = p > 0.5 ? T.path : T.curve;
        ctx.fillRect(px, py, cell, cell);
      }));
      ctx.globalAlpha = 1;
      if (hBox.checked) {
        const [X0, X1] = lim.xlim, [Y0, Y1] = lim.ylim;
        net.W.forEach(([a, b2], j) => {
          const bb = net.b[j];
          const seg = Math.abs(b2) > Math.abs(a)
            ? [[X0, -(a * X0 + bb) / b2], [X1, -(a * X1 + bb) / b2]]
            : [[-(b2 * Y0 + bb) / a, Y0], [-(b2 * Y1 + bb) / a, Y1]];
          V.line(ctx, seg.map(([u, v]) => [sx(u), sy(v)]), T.axis, 1.25, [5, 4]);
        });
      }
      ctx.fillStyle = T.text;
      cols.forEach((px, i) => rows.forEach((py, j) => {
        if ((i + 1 < cols.length && Math.sign(O[i][j]) !== Math.sign(O[i + 1][j])) ||
            (j + 1 < rows.length && Math.sign(O[i][j]) !== Math.sign(O[i][j + 1]))) ctx.fillRect(px + cell / 2 - 1.5, py + cell / 2 - 1.5, 3, 3);
      }));
      train.forEach(([u, v, l]) => {
        V.dot(ctx, sx(u), sy(v), T.bg, 5.5, l ? "triangle" : "circle");
        V.dot(ctx, sx(u), sy(v), l ? T.path : T.curve, 4, l ? "triangle" : "circle");
      });
      F.unclip();
    }

    function drawLoss() {
      const c = V.canvas(cL);
      if (!c) return;
      const F = V.frame(c, { xlim: [0, MAX_STEPS], ylim: [0, 0.8], xticks: [0, 1000, 2000, 3000], yticks: [0, 0.2, 0.4, 0.6, 0.8],
        xlabel: "gradient step", pad: { l: 40 } });
      const { ctx, sx, sy, T } = F;
      F.clip();
      V.line(ctx, [[sx(0), sy(Math.LN2)], [sx(MAX_STEPS), sy(Math.LN2)]], T.axis, 1, [2, 4]);
      V.line(ctx, losses.map((L, i) => [sx(i * 5), sy(Math.min(L, 0.8))]), T.path, 2.5);
      F.unclip();
    }

    function draw() { drawMap(); drawLoss(); }

    trainBtn.addEventListener("click", () => {
      if (running) { stop(); report(); return; }
      if (step >= MAX_STEPS) return;
      running = true;
      raf = requestAnimationFrame(frame);
      report();
    });
    resetBtn.addEventListener("click", () => { seed++; restart(); });
    aSel.addEventListener("change", restart);
    mIn.addEventListener("input", restart);
    hBox.addEventListener("change", draw);
    V.onRedraw([cM, cL], draw);
    restart();
  }

  V.mountAll("nn-moons", mount);
})();
