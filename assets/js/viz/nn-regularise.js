/* ==========================================================================
   Interactive: overfitting and regularisation of a 2–64–1 ReLU network on a
   small noisy two-moons sample (40 training points, 400 validation points).
   Controls: weight decay λ, dropout probability, train / pause / new init,
   and a switch to show the early-stopped network (best validation loss).
   Left: probability map and boundary. Right: training and validation loss.
   Requires common.js and nn-lib.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ, NN = V.NN;
  const MAX_STEPS = 3000, PER_FRAME = 20, EVERY = 10, LR = 0.01, H = 64;

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-wd">Weight decay λ</label>
          <select id="${id}-wd">
            <option value="0">0 (none)</option>
            <option value="0.001">0.001</option>
            <option value="0.01">0.01</option>
            <option value="0.05">0.05</option>
          </select>
        </div>
        <div class="control">
          <label for="${id}-p">Dropout probability <output id="${id}-p-out" for="${id}-p"></output></label>
          <input type="range" id="${id}-p" min="0" max="0.5" step="0.1" value="0">
        </div>
        <div class="control control--check">
          <label><input type="checkbox" id="${id}-es"> <span>Show the early-stopped network (lowest validation loss)</span></label>
        </div>
        <div class="viz__buttons viz__buttons--row">
          <button type="button" class="btn btn--primary" data-act="train">Train</button>
          <button type="button" class="btn" data-act="reset">New initialisation</button>
        </div>
      </div>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">Predicted probability and decision boundary</p>
          <canvas class="viz__canvas" data-c="map" role="img"
            aria-label="Forty noisy two-moons training points with the network's predicted probability shading and decision boundary."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">Cross-entropy against gradient step</p>
          <canvas class="viz__canvas" data-c="loss" role="img"
            aria-label="Training loss, which keeps decreasing, and validation loss, which decreases then increases when the network overfits; a marker shows the step with the lowest validation loss."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-curve)">Class 0 (circles) / training loss</span>
        <span style="--swatch: var(--viz-path)">Class 1 (triangles) / validation loss</span>
        <span style="--swatch: var(--viz-text)">Decision boundary / early-stopping step</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cM = stage.querySelector('[data-c="map"]'), cL = stage.querySelector('[data-c="loss"]');
    const wdSel = stage.querySelector(`#${id}-wd`), pIn = stage.querySelector(`#${id}-p`), esBox = stage.querySelector(`#${id}-es`);
    const trainBtn = stage.querySelector('[data-act="train"]'), readout = stage.querySelector(".viz__readout");
    const train = V.moons(40, 0.3, 3), val = V.moons(400, 0.3, 41);
    const X = train.map((p) => [p[0], p[1]]), Y = train.map((p) => [p[2]]);
    const Xv = val.map((p) => [p[0], p[1]]), Yv = val.map((p) => [p[2]]);
    let seed = 1, net, opt, step, hist, best, running = false, raf = 0;

    const clone = (n) => ({ sizes: n.sizes, acts: n.acts, W: n.W.map((M) => M.map((r) => r.slice())), b: n.b.map((v) => v.slice()) });
    const errRate = (n, Xs, Ys) => Xs.filter((x, i) => ((NN.predict(n, x)[0] > 0 ? 1 : 0) !== Ys[i][0])).length / Xs.length;

    function record() {
      const tr = NN.loss(net, X, Y, "bce"), va = NN.loss(net, Xv, Yv, "bce");
      hist.push([step, tr, va]);
      if (!best || va < best.va) best = { step, va, net: clone(net) };
    }

    function init() {
      net = NN.create([2, H, 1], ["relu", "id"], seed);
      opt = { loss: "bce", lr: LR, wd: +wdSel.value, drop: +pIn.value, rng: V.rng(seed + 100) };
      step = 0; hist = []; best = null; record();
    }

    function report() {
      stage.querySelector(`#${id}-p-out`).textContent = (+pIn.value).toFixed(1);
      const last = hist[hist.length - 1], shownNet = esBox.checked ? best.net : net;
      readout.innerHTML = `<span>step <b>${step}</b> / ${MAX_STEPS}</span>
        <span>training loss <b>${last[1].toFixed(3)}</b></span>
        <span>validation loss <b>${last[2].toFixed(3)}</b></span>
        <span>lowest validation loss <b>${best.va.toFixed(3)}</b> at step ${best.step}</span>
        <span>${esBox.checked ? "early-stopped" : "current"} network: training error <b>${(100 * errRate(shownNet, X, Y)).toFixed(0)}%</b>,
          validation error <b>${(100 * errRate(shownNet, Xv, Yv)).toFixed(1)}%</b></span>`;
      trainBtn.textContent = running ? "Pause" : step >= MAX_STEPS ? "Trained" : step > 0 ? "Continue" : "Train";
      trainBtn.disabled = !running && step >= MAX_STEPS;
    }

    function frame() {
      for (let k = 0; k < PER_FRAME && step < MAX_STEPS; k++) {
        NN.step(net, X, Y, opt); step++;
        if (step % EVERY === 0) record();
      }
      if (step >= MAX_STEPS) running = false;
      report(); draw();
      if (running) raf = requestAnimationFrame(frame);
    }
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    const restart = () => { stop(); init(); report(); draw(); };

    function drawMap() {
      const c = V.canvas(cM);
      if (!c) return;
      const pad = { l: 36, r: 12, t: 12, b: 30 };
      const lim = V.equalLims(c, pad, [[-1.8, -1.3], [2.8, 1.8]], 0);
      const F = V.frame(c, { xlim: lim.xlim, ylim: lim.ylim, xticks: V.ticks(lim.xlim[0], lim.xlim[1], 8), yticks: V.ticks(lim.ylim[0], lim.ylim[1], 5), pad });
      const { ctx, sx, sy, ix, iy, T } = F;
      const n = esBox.checked && best ? best.net : net;
      F.clip();
      const cell = 6, cols = [], rows = [];
      for (let px = pad.l; px < c.w - pad.r; px += cell) cols.push(px);
      for (let py = pad.t; py < c.h - pad.b; py += cell) rows.push(py);
      const O = cols.map((px) => rows.map((py) => NN.predict(n, [ix(px + cell / 2), iy(py + cell / 2)])[0]));
      cols.forEach((px, i) => rows.forEach((py, j) => {
        const p = V.sigmoid(O[i][j]);
        ctx.globalAlpha = 0.08 + Math.abs(p - 0.5) * 0.5;
        ctx.fillStyle = p > 0.5 ? T.path : T.curve;
        ctx.fillRect(px, py, cell, cell);
      }));
      ctx.globalAlpha = 1; ctx.fillStyle = T.text;
      cols.forEach((px, i) => rows.forEach((py, j) => {
        if ((i + 1 < cols.length && Math.sign(O[i][j]) !== Math.sign(O[i + 1][j])) ||
            (j + 1 < rows.length && Math.sign(O[i][j]) !== Math.sign(O[i][j + 1]))) ctx.fillRect(px + cell / 2 - 1.5, py + cell / 2 - 1.5, 3, 3);
      }));
      train.forEach(([u, v, l]) => {
        V.dot(ctx, sx(u), sy(v), T.bg, 6, l ? "triangle" : "circle");
        V.dot(ctx, sx(u), sy(v), l ? T.path : T.curve, 4.5, l ? "triangle" : "circle");
      });
      F.unclip();
    }

    function drawLoss() {
      const c = V.canvas(cL);
      if (!c) return;
      const top = 1.2;
      const F = V.frame(c, { xlim: [0, MAX_STEPS], ylim: [0, top], xticks: [0, 1000, 2000, 3000], yticks: [0, 0.3, 0.6, 0.9, 1.2],
        xlabel: "gradient step", pad: { l: 40 } });
      const { ctx, sx, sy, T } = F;
      F.clip();
      V.line(ctx, hist.map(([s, tr]) => [sx(s), sy(Math.min(tr, top))]), T.curve, 2.5);
      V.line(ctx, hist.map(([s, , va]) => [sx(s), sy(Math.min(va, top))]), T.path, 2.5);
      if (best) {
        V.line(ctx, [[sx(best.step), sy(0)], [sx(best.step), sy(top)]], T.text, 1, [3, 3]);
        V.dot(ctx, sx(best.step), sy(Math.min(best.va, top)), T.text, 4.5);
      }
      F.unclip();
    }

    function draw() { drawMap(); drawLoss(); }

    trainBtn.addEventListener("click", () => {
      if (running) { stop(); report(); return; }
      if (step >= MAX_STEPS) return;
      running = true; raf = requestAnimationFrame(frame); report();
    });
    stage.querySelector('[data-act="reset"]').addEventListener("click", () => { seed++; restart(); });
    wdSel.addEventListener("change", restart);
    pIn.addEventListener("input", restart);
    esBox.addEventListener("change", () => { report(); draw(); });
    V.onRedraw([cM, cL], draw);
    restart();
  }

  V.mountAll("nn-regularise", mount);
})();
