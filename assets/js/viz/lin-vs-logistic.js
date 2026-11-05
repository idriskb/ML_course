/* ==========================================================================
   Interactive: why linear regression fails for classification (1-D).
   Tumour size x, label y ∈ {0 benign, 1 malignant}. Compares the least-squares
   line (thresholded at 0.5) with the logistic fit. A button adds a few very
   large malignant tumours, which drag the linear threshold but barely move the
   logistic one.
   Requires common.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ;
  const X_MAX = 28;

  // Small fixed dataset: 9 benign and 9 malignant tumours (sizes in mm).
  function baseData() {
    const benign = [1.0, 1.6, 2.1, 2.5, 2.9, 3.3, 3.7, 4.2, 4.9];
    const malignant = [4.5, 5.1, 5.5, 5.9, 6.3, 6.7, 7.1, 7.6, 8.2];
    return benign.map((x) => [x, 0]).concat(malignant.map((x) => [x, 1]));
  }
  const EXTRA = [[20, 1], [22, 1], [24, 1], [26, 1]];

  // Logistic regression in 1-D by Newton's method (tiny L2 for numerical safety).
  function logistic(data) {
    let a = 0, b = 0;
    for (let it = 0; it < 50; it++) {
      let g0 = 0, g1 = 0, h00 = 1e-4, h01 = 0, h11 = 1e-4;
      data.forEach(([x, y]) => {
        const p = V.sigmoid(a + b * x), w = p * (1 - p);
        g0 += p - y; g1 += (p - y) * x;
        h00 += w; h01 += w * x; h11 += w * x * x;
      });
      g0 += 1e-4 * a; g1 += 1e-4 * b;
      const det = h00 * h11 - h01 * h01;
      a -= (h11 * g0 - h01 * g1) / det;
      b -= (-h01 * g0 + h00 * g1) / det;
    }
    return [a, b];
  }

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control control--check">
          <label><input type="checkbox" id="${id}-extra"> Add four very large malignant tumours</label>
        </div>
      </div>
      <canvas class="viz__canvas" role="img"
        aria-label="Tumours plotted at height 0 (benign) or 1 (malignant) against size, with the least-squares line, the logistic curve, and the size at which each one predicts malignant."></canvas>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-curve)">Benign (y = 0, circles) / logistic curve</span>
        <span style="--swatch: var(--viz-path)">Malignant (y = 1, triangles) / least-squares line</span>
        <span style="--swatch: var(--viz-axis)">Thresholds where each model crosses 0.5</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const canvas = stage.querySelector("canvas");
    const extra = stage.querySelector(`#${id}-extra`);
    const readout = stage.querySelector(".viz__readout");
    const base = baseData();
    let data, lin, log;

    // mistakes on the 18 original tumours
    const errs = (f) => base.filter(([x, y]) => (f(x) >= 0.5 ? 1 : 0) !== y).length;

    function update() {
      data = extra.checked ? base.concat(EXTRA) : base;
      lin = V.ols1(data);
      log = logistic(data);
      const tLin = (0.5 - lin[0]) / lin[1], tLog = -log[0] / log[1];
      readout.innerHTML = `<span>least-squares threshold: <b>${tLin.toFixed(2)}</b>
        (<b>${errs((x) => lin[0] + lin[1] * x)}</b> mistakes on the 18 original tumours)</span>
        <span>logistic threshold: <b>${tLog.toFixed(2)}</b>
        (<b>${errs((x) => V.sigmoid(log[0] + log[1] * x))}</b> mistakes)</span>`;
      draw();
    }

    function draw() {
      const c = V.canvas(canvas);
      if (!c) return;
      const F = V.frame(c, {
        xlim: [0, X_MAX], ylim: [-0.35, 1.45], xticks: [0, 4, 8, 12, 16, 20, 24, 28], yticks: [0, 0.5, 1],
        xlabel: "tumour size (mm)", ylabel: "y   /   predicted", pad: { l: 44 },
      });
      const { ctx, sx, sy, T } = F;
      F.clip();
      V.line(ctx, [[sx(0), sy(0.5)], [sx(X_MAX), sy(0.5)]], T.axis, 1, [3, 4]);
      V.line(ctx, [[sx(0), sy(lin[0])], [sx(X_MAX), sy(lin[0] + lin[1] * X_MAX)]], T.path, 2.5);
      const pts = [];
      for (let k = 0; k <= 300; k++) { const x = (X_MAX * k) / 300; pts.push([sx(x), sy(V.sigmoid(log[0] + log[1] * x))]); }
      V.line(ctx, pts, T.curve, 2.5);
      const tLin = (0.5 - lin[0]) / lin[1], tLog = -log[0] / log[1];
      [[tLin, T.path], [tLog, T.curve]].forEach(([t, col]) => {
        V.line(ctx, [[sx(t), sy(-0.3)], [sx(t), sy(1.4)]], col, 1.5, [6, 4]);
      });
      ctx.font = T.font(12, 600); ctx.textAlign = "center";
      ctx.fillStyle = T.path; ctx.fillText("least squares", sx(tLin), sy(1.38));
      ctx.fillStyle = T.curve; ctx.fillText("logistic", sx(tLog), sy(-0.26));
      data.forEach(([x, y]) => V.dot(ctx, sx(x), sy(y), y ? T.path : T.curve, y ? 5 : 4.5, y ? "triangle" : "circle"));
      F.unclip();
    }

    extra.addEventListener("change", update);
    V.onRedraw(canvas, draw);
    update();
  }

  V.mountAll("lin-vs-logistic", mount);
})();
