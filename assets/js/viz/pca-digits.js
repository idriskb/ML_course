/* ==========================================================================
   Interactive: PCA on 150 handwritten digits (8×8 images, p = 64).
   Panels: explained variance ratio (individual and cumulative), PC1–PC2
   scores of all images, and a strip with the selected image, its
   reconstruction from k components, the mean image and the first three
   principal directions ("eigen-digits").
   Requires common.js and digits-data.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ;
  const P = 64, SHOW = 30;
  const SHAPES = { 0: "circle", 3: "triangle", 4: "square" };

  let model = null; // shared by all instances: computed once
  function fit() {
    if (model) return model;
    const D = window.VIZ_DIGITS;
    const n = D.labels.length;
    const X = Array.from({ length: n }, (_, i) =>
      Array.from({ length: P }, (_, j) => D.pixels.charCodeAt(i * P + j) - 97));
    const mean = Array.from({ length: P }, (_, j) => X.reduce((s, r) => s + r[j], 0) / n);
    const Xc = X.map((r) => r.map((v, j) => v - mean[j]));
    const S = Array.from({ length: P }, () => new Array(P).fill(0));
    Xc.forEach((r) => { for (let a = 0; a < P; a++) { if (!r[a]) continue; for (let b = a; b < P; b++) S[a][b] += (r[a] * r[b]) / n; } });
    for (let a = 0; a < P; a++) for (let b = 0; b < a; b++) S[a][b] = S[b][a];
    const { values, vectors } = V.eigSym(S);
    // fix signs so that each direction has a positive largest-magnitude entry
    vectors.forEach((u) => { let m = 0; u.forEach((v) => { if (Math.abs(v) > Math.abs(m)) m = v; }); if (m < 0) u.forEach((v, j) => (u[j] = -v)); });
    const total = values.reduce((s, v) => s + v, 0);
    const scores = Xc.map((r) => vectors.map((u) => V.dotp(u, r)));
    model = { n, X, mean, values, vectors, total, scores, labels: D.labels };
    return model;
  }

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-k">Components kept k <output id="${id}-k-out" for="${id}-k"></output></label>
          <input type="range" id="${id}-k" min="0" max="64" step="1" value="2">
        </div>
        <div class="viz__buttons">
          <button type="button" class="btn" data-act="prev">Previous image</button>
          <button type="button" class="btn btn--primary" data-act="next">Next image</button>
        </div>
      </div>
      <p class="viz__panel-title">Selected image, its reconstruction from k components, the mean image and the first
        three principal directions</p>
      <canvas class="viz__canvas viz__canvas--strip" data-c="strip" role="img"
        aria-label="Six small 8 by 8 images: the selected handwritten digit, its reconstruction from k principal components, the mean digit, and the first three principal directions shown as images with positive and negative weights in two colours."></canvas>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">Explained variance ratio (first 30 of 64 components)</p>
          <canvas class="viz__canvas" data-c="scree" role="img"
            aria-label="Bars show the fraction of variance explained by each principal component, decreasing quickly after the second; a line shows the cumulative fraction, reaching 90 percent at 13 components."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">Scores on the first two principal components</p>
          <canvas class="viz__canvas" data-c="scores" role="img"
            aria-label="Each image plotted at its first two principal component scores. Zeros, threes and fours form three separate groups. The selected image is ringed."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-curve)">Digit 0 (circles) / individual ratio</span>
        <span style="--swatch: var(--viz-path)">Digit 3 (triangles) / cumulative ratio</span>
        <span style="--swatch: var(--viz-text)">Digit 4 (squares) / selected image</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cStrip = stage.querySelector('[data-c="strip"]');
    const cScree = stage.querySelector('[data-c="scree"]');
    const cScores = stage.querySelector('[data-c="scores"]');
    const kIn = stage.querySelector(`#${id}-k`);
    const readout = stage.querySelector(".viz__readout");
    const M = fit();
    let sel = 0;

    const cum = (k) => M.values.slice(0, k).reduce((s, v) => s + v, 0) / M.total;
    function recon(i, k) {
      const x = M.mean.slice();
      for (let j = 0; j < k; j++) { const z = M.scores[i][j], u = M.vectors[j]; for (let a = 0; a < P; a++) x[a] += z * u[a]; }
      return x;
    }

    function update() {
      const k = +kIn.value;
      stage.querySelector(`#${id}-k-out`).textContent = k;
      const r = recon(sel, k), x = M.X[sel];
      const err = r.reduce((s, v, a) => s + (v - x[a]) ** 2, 0);
      const avgErr = M.values.slice(k).reduce((s, v) => s + v, 0);
      readout.innerHTML = `<span>image <b>${sel + 1}</b> of ${M.n} (a <b>${M.labels[sel]}</b>)</span>
        <span>numbers stored per image: <b>${k}</b> instead of 64</span>
        <span>variance explained <b>${(100 * cum(k)).toFixed(1)}%</b></span>
        <span>this image's squared error <b>${err.toFixed(0)}</b></span>
        <span>average squared error λ<sub>k+1</sub> + … + λ<sub>64</sub> = <b>${avgErr.toFixed(0)}</b></span>`;
      draw();
    }

    // draw an 8×8 image; signed = true uses two colours for ±
    function img(ctx, T, x0, y0, size, vals, signed) {
      const cell = size / 8, mx = Math.max(...vals.map(Math.abs)) || 1;
      for (let a = 0; a < P; a++) {
        const v = vals[a], i = a % 8, j = Math.floor(a / 8);
        if (signed) {
          ctx.fillStyle = v >= 0 ? T.path : T.curve;
          ctx.globalAlpha = Math.min(1, Math.abs(v) / mx);
        } else {
          ctx.fillStyle = T.text;
          ctx.globalAlpha = Math.max(0, Math.min(1, v / 16));
        }
        ctx.fillRect(x0 + i * cell, y0 + j * cell, cell + 0.5, cell + 0.5);
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = T.axis; ctx.lineWidth = 1;
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, size - 1, size - 1);
    }

    function drawStrip() {
      const c = V.canvas(cStrip);
      if (!c) return;
      const T = V.theme(), ctx = c.ctx, k = +kIn.value;
      const items = [
        ["original", M.X[sel], false],
        [`k = ${k}`, recon(sel, k), false],
        ["mean", M.mean, false],
        ["u|1", M.vectors[0], true], ["u|2", M.vectors[1], true], ["u|3", M.vectors[2], true],
      ];
      const gap = 14, size = Math.min(c.h - 30, (c.w - gap * 7) / 6);
      const total = 6 * size + 5 * gap + gap; // extra gap separates the two groups
      let x = (c.w - total) / 2;
      ctx.font = T.font(12, 600); ctx.textAlign = "center";
      items.forEach(([name, vals, signed], i) => {
        if (i === 3) x += gap;
        img(ctx, T, x, 4, size, vals, signed);
        ctx.fillStyle = T.text;
        if (name.includes("|")) { // "u|1" → u with a subscript 1
          const [b, sub] = name.split("|");
          ctx.font = T.font(13, 700); ctx.fillText(b, x + size / 2 - 3, size + 22);
          ctx.font = T.font(10, 700); ctx.fillText(sub, x + size / 2 + 5, size + 26);
          ctx.font = T.font(12, 600);
        } else ctx.fillText(name, x + size / 2, size + 22);
        x += size + gap;
      });
    }

    function drawScree() {
      const c = V.canvas(cScree);
      if (!c) return;
      const k = +kIn.value;
      const F = V.frame(c, { xlim: [0, SHOW + 1], ylim: [0, 1], xticks: [1, 5, 10, 15, 20, 25, 30], yticks: [0, 0.25, 0.5, 0.75, 0.9, 1],
        xlabel: "component j", pad: { l: 44 } });
      const { ctx, sx, sy, T } = F;
      F.clip();
      const bw = Math.max(2, (sx(1) - sx(0)) * 0.7);
      for (let j = 1; j <= SHOW; j++) {
        ctx.globalAlpha = j <= k ? 0.9 : 0.3;
        ctx.fillStyle = T.curve;
        const v = M.values[j - 1] / M.total;
        ctx.fillRect(sx(j) - bw / 2, sy(v), bw, sy(0) - sy(v));
      }
      ctx.globalAlpha = 1;
      V.line(ctx, [[sx(0), sy(0.9)], [sx(SHOW + 1), sy(0.9)]], T.axis, 1, [3, 4]);
      const pts = [];
      for (let j = 1; j <= SHOW; j++) pts.push([sx(j), sy(cum(j))]);
      V.line(ctx, pts, T.path, 2.5);
      pts.forEach(([px, py], j) => V.dot(ctx, px, py, T.path, j + 1 === k ? 6 : 2.5, j + 1 === k ? "triangle" : "circle"));
      if (k >= 1 && k <= SHOW) V.line(ctx, [[sx(k), sy(0)], [sx(k), sy(1)]], T.text, 1.5);
      F.unclip();
    }

    function drawScores() {
      const c = V.canvas(cScores);
      if (!c) return;
      const z1 = M.scores.map((s) => s[0]), z2 = M.scores.map((s) => s[1]);
      const lim = (a) => { const m = Math.max(...a.map(Math.abs)) * 1.1; return [-m, m]; };
      const xl = lim(z1), yl = lim(z2);
      const F = V.frame(c, { xlim: xl, ylim: yl, xticks: [-30, -20, -10, 0, 10, 20, 30].filter((v) => v > xl[0] && v < xl[1]),
        yticks: [-30, -20, -10, 0, 10, 20, 30].filter((v) => v > yl[0] && v < yl[1]),
        xlabel: "score on PC 1", ylabel: "score on PC 2", pad: { l: 44 } });
      const { ctx, sx, sy, T } = F;
      F.clip();
      const colour = { 0: T.curve, 3: T.path, 4: T.text };
      M.scores.forEach((s, i) => {
        const d = M.labels[i];
        V.dot(ctx, sx(s[0]), sy(s[1]), T.bg, 6, SHAPES[d]);
        V.dot(ctx, sx(s[0]), sy(s[1]), colour[d], 4.2, SHAPES[d]);
      });
      const s = M.scores[sel];
      V.dot(ctx, sx(s[0]), sy(s[1]), T.text, 10, "ring");
      F.unclip();
    }

    function draw() { drawStrip(); drawScree(); drawScores(); }

    kIn.addEventListener("input", update);
    stage.querySelector('[data-act="next"]').addEventListener("click", () => { sel = (sel + 1) % M.n; update(); });
    stage.querySelector('[data-act="prev"]').addEventListener("click", () => { sel = (sel - 1 + M.n) % M.n; update(); });
    V.onRedraw([cStrip, cScree, cScores], draw);
    update();
  }

  V.mountAll("pca-digits", mount);
})();
