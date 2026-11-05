/* ==========================================================================
   Interactive: bias–variance decomposition for polynomial regression.
   Many training sets of n = 20 points from y = sin(2πx) + ε, ε ~ N(0, 0.25²).
   Left: fits from 20 training sets, their average and the truth.
   Right: bias², variance and expected test error against degree.
   Requires common.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ;
  const truth = (x) => Math.sin(2 * Math.PI * x);
  const SIGMA = 0.25, N = 20, R = 200, D_MAX = 12, SHOW = 20;
  // Fixed design: the inputs are the same in every training set, only the noise is redrawn.
  const XS = Array.from({ length: N }, (_, i) => (i + 0.5) / N);
  const GRID = Array.from({ length: 96 }, (_, i) => XS[0] + (i * (XS[N - 1] - XS[0])) / 95);

  function compute() {
    const rng = V.rng(31);
    const sets = [];
    for (let r = 0; r < R; r++) {
      const s = [];
      XS.forEach((x) => s.push([x, truth(x) + SIGMA * rng.normal()]));
      sets.push(s);
    }
    const out = [];
    for (let d = 0; d <= D_MAX; d++) {
      // predictions of each fit on the grid
      const preds = sets.map((s) => {
        const th = V.lstsq(s.map(([x]) => V.legendre(2 * x - 1, d)), s.map((p) => p[1]));
        return GRID.map((x) => V.dotp(th, V.legendre(2 * x - 1, d)));
      });
      const mean = GRID.map((_, g) => preds.reduce((a, p) => a + p[g], 0) / R);
      let bias2 = 0, vari = 0;
      GRID.forEach((x, g) => {
        bias2 += (mean[g] - truth(x)) ** 2 / GRID.length;
        vari += preds.reduce((a, p) => a + (p[g] - mean[g]) ** 2, 0) / R / GRID.length;
      });
      out.push({ preds, mean, bias2, vari, total: bias2 + vari + SIGMA * SIGMA });
    }
    return out;
  }

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-d">Polynomial degree d <output id="${id}-d-out" for="${id}-d"></output></label>
          <input type="range" id="${id}-d" min="0" max="${D_MAX}" step="1" value="1">
        </div>
      </div>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">Fits on ${SHOW} different training sets</p>
          <canvas class="viz__canvas" data-c="fits" role="img"
            aria-label="Polynomial fits obtained from ${SHOW} independent training sets, drawn as thin lines, with their average and the true function."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">Decomposition of the expected test error</p>
          <canvas class="viz__canvas" data-c="dec" role="img"
            aria-label="Squared bias, variance and expected test error, on a log scale, for degrees 0 to ${D_MAX}."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-axis)">True function / noise σ² (dashed)</span>
        <span style="--swatch: var(--viz-curve)">Average fit / bias²</span>
        <span style="--swatch: var(--viz-path)">Individual fits / variance</span>
        <span style="--swatch: var(--viz-text)">Expected test error</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cFits = stage.querySelector('[data-c="fits"]');
    const cDec = stage.querySelector('[data-c="dec"]');
    const dIn = stage.querySelector(`#${id}-d`);
    const dOut = stage.querySelector(`#${id}-d-out`);
    const readout = stage.querySelector(".viz__readout");
    const res = compute();

    function update() {
      const d = +dIn.value, r = res[d];
      dOut.textContent = d;
      readout.innerHTML = `<span>bias² = <b>${r.bias2.toFixed(4)}</b></span>
        <span>variance = <b>${r.vari.toFixed(4)}</b></span>
        <span>noise σ² = <b>${(SIGMA * SIGMA).toFixed(4)}</b></span>
        <span>expected test MSE = <b>${r.total.toFixed(4)}</b></span>`;
      draw();
    }

    function drawFits() {
      const c = V.canvas(cFits);
      if (!c) return;
      const F = V.frame(c, { xlim: [0, 1], ylim: [-2, 2], xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [-2, -1, 0, 1, 2], xlabel: "x", ylabel: "y", pad: { l: 40 } });
      const { ctx, sx, sy, T } = F;
      const r = res[+dIn.value];
      F.clip();
      ctx.globalAlpha = 0.45;
      r.preds.slice(0, SHOW).forEach((p) => V.line(ctx, GRID.map((x, g) => [sx(x), sy(p[g])]), T.path, 1.2));
      ctx.globalAlpha = 1;
      V.line(ctx, GRID.map((x) => [sx(x), sy(truth(x))]), T.axis, 2, [6, 5]);
      V.line(ctx, GRID.map((x, g) => [sx(x), sy(r.mean[g])]), T.curve, 3);
      F.unclip();
    }

    function drawDec() {
      const c = V.canvas(cDec);
      if (!c) return;
      const F = V.frame(c, {
        xlim: [-0.5, D_MAX + 0.5], ylim: [1e-3, 10], logy: true, xticks: [0, 2, 4, 6, 8, 10, 12],
        yticks: [1e-3, 1e-2, 1e-1, 1, 10], fmtY: (v) => String(v), xlabel: "degree d", ylabel: "log scale", pad: { l: 50 },
      });
      const { ctx, sx, sy, T } = F;
      const d = +dIn.value;
      const cl = (v) => Math.min(Math.max(v, 1e-3), 1e2);
      F.clip();
      ctx.globalAlpha = 0.14; ctx.fillStyle = T.curve;
      ctx.fillRect(sx(d - 0.5), F.pad.t, sx(d + 0.5) - sx(d - 0.5), c.h - F.pad.t - F.pad.b);
      ctx.globalAlpha = 1;
      V.line(ctx, [[sx(-1), sy(SIGMA * SIGMA)], [sx(D_MAX + 1), sy(SIGMA * SIGMA)]], T.axis, 1.5, [6, 5]);
      const series = [["bias2", T.curve, "circle"], ["vari", T.path, "square"], ["total", T.text, "triangle"]];
      series.forEach(([k, col, shape]) => {
        V.line(ctx, res.map((r, i) => [sx(i), sy(cl(r[k]))]), col, 2);
        res.forEach((r, i) => V.dot(ctx, sx(i), sy(cl(r[k])), col, i === d ? 5 : 3, shape));
      });
      F.unclip();
    }

    function draw() { drawFits(); drawDec(); }
    dIn.addEventListener("input", update);
    V.onRedraw([cFits, cDec], draw);
    update();
  }

  V.mountAll("bias-variance", mount);
})();
