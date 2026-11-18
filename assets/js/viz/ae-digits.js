/* ==========================================================================
   Interactive: an autoencoder with a 2-dimensional code on 150 handwritten
   digits (8×8, p = 64, pixel values scaled to [0, 1] and centred), against
   PCA with k = 2.
   Architectures: non-linear 64–32–2–32–64 (tanh hidden layers, linear code
   and output) or linear 64–2–64. Trained by full-batch Adam on the mean
   squared reconstruction error.
   Left: 2-D codes of all images (autoencoder or PCA scores).
   Right: originals and their reconstructions by PCA and by the autoencoder.
   Requires common.js, nn-lib.js and digits-data.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ, NN = V.NN;
  const P = 64, MAX_STEPS = 2000, PER_FRAME = 8, LR = 0.01, SHOW = 5;
  const SHAPES = { 0: "circle", 3: "triangle", 4: "square" };

  let data = null; // shared: images and PCA, computed once
  function prepare() {
    if (data) return data;
    const D = window.VIZ_DIGITS, n = D.labels.length;
    const X = Array.from({ length: n }, (_, i) => Array.from({ length: P }, (_, j) => (D.pixels.charCodeAt(i * P + j) - 97) / 16));
    const mean = Array.from({ length: P }, (_, j) => X.reduce((s, r) => s + r[j], 0) / n);
    const Xc = X.map((r) => r.map((v, j) => v - mean[j]));
    const S = Array.from({ length: P }, () => new Array(P).fill(0));
    Xc.forEach((r) => { for (let a = 0; a < P; a++) for (let b = a; b < P; b++) S[a][b] += (r[a] * r[b]) / n; });
    for (let a = 0; a < P; a++) for (let b = 0; b < a; b++) S[a][b] = S[b][a];
    const { values, vectors } = V.eigSym(S);
    const U = vectors.slice(0, 2);
    const pcaCodes = Xc.map((r) => U.map((u) => V.dotp(u, r)));
    const pcaRec = pcaCodes.map((z) => mean.map((m, j) => m + z[0] * U[0][j] + z[1] * U[1][j]));
    const pcaErr = values.slice(2).reduce((s, v) => s + v, 0);
    data = { n, X, Xc, mean, labels: D.labels, pcaCodes, pcaRec, pcaErr };
    return data;
  }

  function mount(fig, id) {
    const M = prepare();
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-a">Autoencoder</label>
          <select id="${id}-a">
            <option value="nonlin">Non-linear 64–32–2–32–64 (tanh)</option>
            <option value="lin">Linear 64–2–64</option>
          </select>
        </div>
        <div class="control">
          <label for="${id}-v">Left panel shows the codes of</label>
          <select id="${id}-v">
            <option value="ae">the autoencoder</option>
            <option value="pca">PCA (first two scores)</option>
          </select>
        </div>
        <div class="viz__buttons viz__buttons--row">
          <button type="button" class="btn btn--primary" data-act="train">Train</button>
          <button type="button" class="btn" data-act="reset">New initialisation</button>
        </div>
      </div>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">Two-dimensional codes of the 150 images</p>
          <canvas class="viz__canvas" data-c="codes" role="img"
            aria-label="Scatter plot of the two-dimensional codes of all digit images; zeros, threes and fours are drawn with different shapes and colours."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">Originals and reconstructions from 2 numbers</p>
          <canvas class="viz__canvas" data-c="imgs" role="img"
            aria-label="Three rows of five small digit images: the originals, their PCA reconstructions from two components, and their autoencoder reconstructions from a two-dimensional code."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-c1)">Digit 0 (circles)</span>
        <span style="--swatch: var(--viz-c2)">Digit 3 (triangles)</span>
        <span style="--swatch: var(--viz-c3)">Digit 4 (squares)</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cC = stage.querySelector('[data-c="codes"]'), cI = stage.querySelector('[data-c="imgs"]');
    const aSel = stage.querySelector(`#${id}-a`), vSel = stage.querySelector(`#${id}-v`);
    const trainBtn = stage.querySelector('[data-act="train"]'), readout = stage.querySelector(".viz__readout");
    let seed = 2, net, opt, step, err, running = false, raf = 0;

    const encode = (x) => NN.forward(net, x, 0).as[aSel.value === "lin" ? 1 : 2];
    const recon = (x) => NN.predict(net, x);

    function init() {
      net = aSel.value === "lin"
        ? NN.create([P, 2, P], ["id", "id"], seed)
        : NN.create([P, 32, 2, 32, P], ["tanh", "id", "tanh", "id"], seed);
      opt = { loss: "mse", lr: LR };
      step = 0; err = NN.loss(net, M.Xc, M.Xc, "mse");
    }

    function report() {
      readout.innerHTML = `<span>step <b>${step}</b> / ${MAX_STEPS}</span>
        <span>autoencoder error <b>${err.toFixed(3)}</b></span>
        <span>PCA error (k = 2) <b>${M.pcaErr.toFixed(3)}</b></span>
        <span>(average squared reconstruction error per image, pixels in [0, 1])</span>`;
      trainBtn.textContent = running ? "Pause" : step >= MAX_STEPS ? "Trained" : step > 0 ? "Continue" : "Train";
      trainBtn.disabled = !running && step >= MAX_STEPS;
    }

    function frame() {
      for (let k = 0; k < PER_FRAME && step < MAX_STEPS; k++) { err = NN.step(net, M.Xc, M.Xc, opt); step++; }
      if (step >= MAX_STEPS) { running = false; err = NN.loss(net, M.Xc, M.Xc, "mse"); }
      report(); draw();
      if (running) raf = requestAnimationFrame(frame);
    }
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    const restart = () => { stop(); init(); report(); draw(); };

    function drawCodes() {
      const c = V.canvas(cC);
      if (!c) return;
      const Z = vSel.value === "pca" ? M.pcaCodes : M.Xc.map(encode);
      const pad = { l: 40, r: 12, t: 12, b: 30 };
      const lim = V.equalLims(c, pad, Z, 0.1);
      const F = V.frame(c, { xlim: lim.xlim, ylim: lim.ylim, xticks: V.ticks(lim.xlim[0], lim.xlim[1], 6), yticks: V.ticks(lim.ylim[0], lim.ylim[1], 5), pad });
      const { ctx, sx, sy, T } = F;
      F.clip();
      Z.forEach((z, i) => {
        const lab = +M.labels[i], k = lab === 0 ? 0 : lab === 3 ? 1 : 2;
        V.dot(ctx, sx(z[0]), sy(z[1]), T.bg, 5.5, SHAPES[lab]);
        V.dot(ctx, sx(z[0]), sy(z[1]), T.clusters[k], 4, SHAPES[lab]);
      });
      F.unclip();
    }

    function img(ctx, T, x0, y0, size, vals) {
      const cell = size / 8;
      for (let a = 0; a < P; a++) {
        ctx.fillStyle = T.text;
        ctx.globalAlpha = Math.max(0, Math.min(1, vals[a]));
        ctx.fillRect(x0 + (a % 8) * cell, y0 + Math.floor(a / 8) * cell, cell + 0.5, cell + 0.5);
      }
      ctx.globalAlpha = 1; ctx.strokeStyle = T.axis; ctx.lineWidth = 1;
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, size - 1, size - 1);
    }

    function drawImgs() {
      const c = V.canvas(cI);
      if (!c) return;
      const { ctx, w, h } = c, T = V.theme();
      const left = 96, gap = 8, rowGap = 16;
      const size = Math.min((w - left - 8 - gap * (SHOW - 1)) / SHOW, (h - 20 - 2 * rowGap) / 3);
      const top = (h - 3 * size - 2 * rowGap) / 2; // centre the block vertically
      const rows = [
        ["original", (i) => M.X[i]],
        ["PCA, k = 2", (i) => M.pcaRec[i]],
        ["autoencoder", (i) => recon(M.Xc[i]).map((v, j) => v + M.mean[j])],
      ];
      rows.forEach(([name, get], r) => {
        const y0 = top + r * (size + rowGap);
        ctx.fillStyle = T.text; ctx.font = T.font(12, 600); ctx.textAlign = "right";
        ctx.fillText(name, left - 8, y0 + size / 2 + 4);
        for (let i = 0; i < SHOW; i++) img(ctx, T, left + i * (size + gap), y0, size, get(i));
      });
    }

    function draw() { drawCodes(); drawImgs(); }

    trainBtn.addEventListener("click", () => {
      if (running) { stop(); report(); return; }
      if (step >= MAX_STEPS) return;
      running = true; raf = requestAnimationFrame(frame); report();
    });
    stage.querySelector('[data-act="reset"]').addEventListener("click", () => { seed++; restart(); });
    aSel.addEventListener("change", restart);
    vSel.addEventListener("change", draw);
    V.onRedraw([cC, cI], draw);
    restart();
  }

  V.mountAll("ae-digits", mount);
})();
