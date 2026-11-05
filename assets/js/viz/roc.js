/* ==========================================================================
   Interactive: decision threshold, confusion matrix and ROC curve.
   Predicted probabilities for 60 benign and 60 malignant test tumours
   (simulated). A threshold slider moves the operating point on the ROC curve;
   a separation slider changes how good the classifier is.
   Requires common.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ;
  const N = 60;

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-t">Threshold τ <output id="${id}-t-out" for="${id}-t"></output></label>
          <input type="range" id="${id}-t" min="0" max="1" step="0.01" value="0.5">
        </div>
        <div class="control">
          <label for="${id}-s">Class separation <output id="${id}-s-out" for="${id}-s"></output></label>
          <input type="range" id="${id}-s" min="0" max="4" step="0.1" value="1.8">
        </div>
      </div>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">Predicted probabilities on the test set</p>
          <canvas class="viz__canvas" data-c="scores" role="img"
            aria-label="Predicted probability of malignancy for each test tumour, benign on the lower row and malignant on the upper row, with a vertical line at the threshold."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">ROC curve</p>
          <canvas class="viz__canvas" data-c="roc" role="img"
            aria-label="ROC curve: true positive rate against false positive rate over all thresholds, with the current threshold marked and the diagonal of a random classifier."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-curve)">Benign (circles)</span>
        <span style="--swatch: var(--viz-path)">Malignant (triangles) / ROC curve</span>
        <span style="--swatch: var(--viz-axis)">Threshold / random classifier</span>
      </div>
      <div class="viz__cm" aria-live="polite"></div>`;

    const cS = stage.querySelector('[data-c="scores"]');
    const cR = stage.querySelector('[data-c="roc"]');
    const tIn = stage.querySelector(`#${id}-t`), sIn = stage.querySelector(`#${id}-s`);
    const cm = stage.querySelector(".viz__cm");
    const r = V.rng(4);
    const zNeg = Array.from({ length: N }, () => r.normal());
    const zPos = Array.from({ length: N }, () => r.normal());
    const jit = Array.from({ length: 2 * N }, () => r() - 0.5);
    let neg, pos, roc, auc;

    function scores() {
      const s = +sIn.value;
      neg = zNeg.map((z) => V.sigmoid(1.6 * (z - s / 2)));
      pos = zPos.map((z) => V.sigmoid(1.6 * (z + s / 2)));
      // ROC: sweep the threshold over all distinct scores (descending)
      const all = neg.map((v) => [v, 0]).concat(pos.map((v) => [v, 1])).sort((a, b) => b[0] - a[0]);
      roc = [[0, 0]];
      let tp = 0, fp = 0;
      all.forEach(([, y]) => { y ? tp++ : fp++; roc.push([fp / N, tp / N]); });
      // AUC = fraction of (positive, negative) pairs ranked correctly (ties count 1/2)
      let good = 0;
      pos.forEach((p) => neg.forEach((q) => { good += p > q ? 1 : p === q ? 0.5 : 0; }));
      auc = good / (N * N);
      update();
    }

    function update() {
      const t = +tIn.value;
      stage.querySelector(`#${id}-t-out`).textContent = t.toFixed(2);
      stage.querySelector(`#${id}-s-out`).textContent = (+sIn.value).toFixed(1);
      const TP = pos.filter((p) => p >= t).length, FN = N - TP;
      const FP = neg.filter((p) => p >= t).length, TN = N - FP;
      const prec = TP + FP ? TP / (TP + FP) : NaN, rec = TP / N, f1 = prec + rec ? (2 * prec * rec) / (prec + rec) : NaN;
      const fmt = (v) => (isFinite(v) ? v.toFixed(2) : "—");
      cm.innerHTML = `
        <table class="cm-table">
          <caption>Confusion matrix at τ = ${t.toFixed(2)}</caption>
          <thead><tr><th scope="col"></th><th scope="col">Predicted benign</th><th scope="col">Predicted malignant</th></tr></thead>
          <tbody>
            <tr><th scope="row">Truly benign</th><td>TN = <b>${TN}</b></td><td>FP = <b>${FP}</b></td></tr>
            <tr><th scope="row">Truly malignant</th><td>FN = <b>${FN}</b></td><td>TP = <b>${TP}</b></td></tr>
          </tbody>
        </table>
        <p class="viz__readout">
          <span>accuracy <b>${fmt((TP + TN) / (2 * N))}</b></span>
          <span>precision <b>${fmt(prec)}</b></span>
          <span>recall (TPR) <b>${fmt(rec)}</b></span>
          <span>FPR <b>${fmt(FP / N)}</b></span>
          <span>F1 <b>${fmt(f1)}</b></span>
          <span>AUC <b>${auc.toFixed(3)}</b></span>
        </p>`;
      draw();
    }

    function drawScores() {
      const c = V.canvas(cS);
      if (!c) return;
      const F = V.frame(c, { xlim: [0, 1], ylim: [-0.6, 1.6], xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [],
        xlabel: "predicted P(malignant | x)", pad: { l: 76 } });
      const { ctx, sx, sy, T } = F;
      const t = +tIn.value;
      ctx.fillStyle = T.text; ctx.font = T.font(12, 600); ctx.textAlign = "right";
      ctx.fillText("malignant", F.pad.l - 8, sy(1) + 4);
      ctx.fillText("benign", F.pad.l - 8, sy(0) + 4);
      F.clip();
      ctx.globalAlpha = 0.12; ctx.fillStyle = T.path;
      ctx.fillRect(sx(t), F.pad.t, sx(1) - sx(t), c.h - F.pad.t - F.pad.b);
      ctx.globalAlpha = 1;
      neg.forEach((p, i) => V.dot(ctx, sx(p), sy(0 + 0.55 * jit[i]), T.curve, 4));
      pos.forEach((p, i) => V.dot(ctx, sx(p), sy(1 + 0.55 * jit[N + i]), T.path, 4.5, "triangle"));
      V.line(ctx, [[sx(t), sy(-0.6)], [sx(t), sy(1.6)]], T.text, 2);
      ctx.fillStyle = T.text; ctx.font = T.font(12, 600); ctx.textAlign = "left";
      ctx.fillText("predict malignant →", Math.min(sx(t) + 6, c.w - 140), sy(1.5));
      F.unclip();
    }

    function drawRoc() {
      const c = V.canvas(cR);
      if (!c) return;
      const pad = { l: 46, r: 12, t: 12, b: 40 };
      const side = Math.min(c.w - pad.l - pad.r, c.h - pad.t - pad.b);
      pad.r = c.w - pad.l - side;
      const F = V.frame(c, { xlim: [0, 1], ylim: [0, 1], xticks: [0, 0.5, 1], yticks: [0, 0.5, 1],
        xlabel: "false positive rate", ylabel: "true positive rate", pad });
      const { ctx, sx, sy, T } = F;
      const t = +tIn.value;
      F.clip();
      V.line(ctx, [[sx(0), sy(0)], [sx(1), sy(1)]], T.axis, 1.5, [6, 5]);
      ctx.beginPath();
      roc.forEach(([x, y], i) => (i ? ctx.lineTo(sx(x), sy(y)) : ctx.moveTo(sx(x), sy(y))));
      ctx.lineTo(sx(1), sy(0)); ctx.closePath();
      ctx.globalAlpha = 0.12; ctx.fillStyle = T.path; ctx.fill(); ctx.globalAlpha = 1;
      V.line(ctx, roc.map(([x, y]) => [sx(x), sy(y)]), T.path, 2.5);
      const tpr = pos.filter((p) => p >= t).length / N, fpr = neg.filter((p) => p >= t).length / N;
      V.dot(ctx, sx(fpr), sy(tpr), T.bg, 8);
      V.dot(ctx, sx(fpr), sy(tpr), T.text, 6);
      F.unclip();
    }

    function draw() { drawScores(); drawRoc(); }
    tIn.addEventListener("input", update);
    sIn.addEventListener("input", scores);
    V.onRedraw([cS, cR], draw);
    scores();
  }

  V.mountAll("roc", mount);
})();
