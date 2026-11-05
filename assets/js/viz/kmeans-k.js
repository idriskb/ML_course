/* ==========================================================================
   Interactive: choosing the number of clusters K.
   For each K = 1..8, k-means is run from 10 k-means++ starts and the best
   result is kept. Left: WCSS(K)/WCSS(1) (elbow) and the mean silhouette.
   Right: the clustering for the selected K.
   Requires common.js and cluster-data.js (and digits-data.js for "digits").
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ, KM = V.KM;
  const KMAX = 8, RESTARTS = 10;

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    const D = V.CLUSTER_DATA;
    const opts = Object.keys(D.names).map((k) => `<option value="${k}">${D.names[k]}</option>`).join("");
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-data">Data</label>
          <select id="${id}-data">${opts}</select>
        </div>
        <div class="control">
          <label for="${id}-k">Number of clusters K <output id="${id}-k-out" for="${id}-k"></output></label>
          <input type="range" id="${id}-k" min="1" max="${KMAX}" step="1" value="2">
        </div>
      </div>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">Elbow and silhouette against K</p>
          <canvas class="viz__canvas" data-c="curves" role="img"
            aria-label="Two curves against the number of clusters: the within-cluster sum of squares as a fraction of its value for one cluster, which always decreases, and the mean silhouette score, which peaks at a good number of clusters."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">Best clustering found for the selected K</p>
          <canvas class="viz__canvas" data-c="map" role="img"
            aria-label="Scatter plot of the data coloured by the clusters found by k-means for the selected number of clusters, with the centroids drawn as crosses."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-path)">WCSS(K) / WCSS(1) (squares)</span>
        <span style="--swatch: var(--viz-curve)">Mean silhouette (circles)</span>
        <span style="--swatch: var(--viz-text)">Selected K</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cC = stage.querySelector('[data-c="curves"]');
    const cM = stage.querySelector('[data-c="map"]');
    const dSel = stage.querySelector(`#${id}-data`);
    const kIn = stage.querySelector(`#${id}-k`);
    const readout = stage.querySelector(".viz__readout");
    let X, res, sil;

    function compute() {
      X = D.get(dSel.value);
      const r = V.rng(77);
      res = [];
      for (let K = 1; K <= KMAX; K++) res[K] = KM.best(X, K, RESTARTS, r);
      sil = [];
      for (let K = 2; K <= KMAX; K++) sil[K] = KM.silhouette(X, res[K].lab, K);
      update();
    }

    function update() {
      const K = +kIn.value;
      stage.querySelector(`#${id}-k-out`).textContent = K;
      let bestK = 2; for (let k = 3; k <= KMAX; k++) if (sil[k] > sil[bestK]) bestK = k;
      readout.innerHTML = `<span>K = <b>${K}</b></span>
        <span>WCSS = <b>${res[K].J.toFixed(1)}</b> (<b>${((100 * res[K].J) / res[1].J).toFixed(0)}%</b> of K = 1)</span>
        <span>silhouette = <b>${K > 1 ? sil[K].toFixed(2) : "—"}</b></span>
        <span>highest silhouette at K = <b>${bestK}</b></span>`;
      draw();
    }

    function drawCurves() {
      const c = V.canvas(cC);
      if (!c) return;
      const K = +kIn.value;
      const F = V.frame(c, { xlim: [0.5, KMAX + 0.5], ylim: [0, 1.05], xticks: [1, 2, 3, 4, 5, 6, 7, 8], yticks: [0, 0.25, 0.5, 0.75, 1],
        xlabel: "number of clusters K", pad: { l: 44 } });
      const { ctx, sx, sy, T } = F;
      F.clip();
      V.line(ctx, [[sx(K), sy(0)], [sx(K), sy(1.05)]], T.text, 1.5, [4, 3]);
      const w = []; for (let k = 1; k <= KMAX; k++) w.push([sx(k), sy(res[k].J / res[1].J)]);
      V.line(ctx, w, T.path, 2.5);
      w.forEach(([x, y]) => V.dot(ctx, x, y, T.path, 4.5, "square"));
      const s = []; for (let k = 2; k <= KMAX; k++) s.push([sx(k), sy(Math.max(0, sil[k]))]);
      V.line(ctx, s, T.curve, 2.5);
      s.forEach(([x, y]) => V.dot(ctx, x, y, T.curve, 4.5));
      F.unclip();
    }

    function drawMap() {
      const c = V.canvas(cM);
      if (!c) return;
      const K = +kIn.value, { lab, mus } = res[K];
      const pad = { l: 40, r: 12, t: 12, b: 40 };
      const { xlim, ylim } = V.equalLims(c, pad, X, 0.06);
      const ax = D.axes[dSel.value] || ["feature 1", "feature 2"];
      const F = V.frame(c, { xlim, ylim, xticks: V.ticks(xlim[0], xlim[1], 6), yticks: V.ticks(ylim[0], ylim[1], 5),
        xlabel: ax[0], ylabel: ax[1], pad });
      const { ctx, sx, sy, T } = F;
      const col = T.clusters;
      F.clip();
      X.forEach((x, i) => {
        V.dot(ctx, sx(x[0]), sy(x[1]), T.bg, 5.5, V.SHAPES[lab[i] % 6]);
        V.dot(ctx, sx(x[0]), sy(x[1]), col[lab[i] % 6], 4, V.SHAPES[lab[i] % 6]);
      });
      mus.forEach((m) => {
        const x = sx(m[0]), y = sy(m[1]);
        ctx.strokeStyle = T.bg; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(x - 7, y - 7); ctx.lineTo(x + 7, y + 7); ctx.moveTo(x - 7, y + 7); ctx.lineTo(x + 7, y - 7); ctx.stroke();
        ctx.strokeStyle = T.text; ctx.lineWidth = 2.5; ctx.stroke();
      });
      F.unclip();
    }

    function draw() { drawCurves(); drawMap(); }

    dSel.addEventListener("change", compute);
    kIn.addEventListener("input", update);
    V.onRedraw([cC, cM], draw);
    compute();
  }

  V.mountAll("kmeans-k", mount);
})();
