/* ==========================================================================
   Interactive: Lloyd's algorithm for k-means, one half-step at a time.
   Left: data, centroids with their trails, and the Voronoi cells of the
   current centroids. Right: the objective J after every half-step.
   Options: dataset, K, initialisation (random data points or k-means++).
   Requires common.js and cluster-data.js (and digits-data.js for "digits").
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ, KM = V.KM;

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
          <input type="range" id="${id}-k" min="1" max="6" step="1" value="3">
        </div>
        <div class="control">
          <label for="${id}-init">Initialisation</label>
          <select id="${id}-init">
            <option value="random">K random data points</option>
            <option value="pp">k-means++</option>
          </select>
        </div>
        <div class="viz__buttons viz__buttons--row">
          <button type="button" class="btn btn--primary" data-act="step">Assign points</button>
          <button type="button" class="btn" data-act="run">Run to convergence</button>
          <button type="button" class="btn" data-act="new">New start</button>
        </div>
      </div>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">Data, centroids and their regions</p>
          <canvas class="viz__canvas" data-c="map" role="img"
            aria-label="Scatter plot of the data coloured by cluster, the centroids drawn as large crosses with the path they followed, and the plane shaded by the nearest centroid."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">Objective J after each half-step</p>
          <canvas class="viz__canvas" data-c="obj" role="img"
            aria-label="The within-cluster sum of squares after each assignment step and each update step. It never increases."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-c1)">Cluster 1</span>
        <span style="--swatch: var(--viz-c2)">Cluster 2</span>
        <span style="--swatch: var(--viz-c3)">Cluster 3 …</span>
        <span style="--swatch: var(--viz-text)">Centroids (crosses) and their paths</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cMap = stage.querySelector('[data-c="map"]');
    const cObj = stage.querySelector('[data-c="obj"]');
    const dSel = stage.querySelector(`#${id}-data`);
    const kIn = stage.querySelector(`#${id}-k`);
    const iSel = stage.querySelector(`#${id}-init`);
    const stepBtn = stage.querySelector('[data-act="step"]');
    const readout = stage.querySelector(".viz__readout");
    let X, mus, lab, trails, Js, phase, done, seed = 1;

    function start() {
      X = D.get(dSel.value);
      const K = +kIn.value;
      stage.querySelector(`#${id}-k-out`).textContent = K;
      const r = V.rng(1000 * seed + K);
      mus = iSel.value === "pp" ? KM.initPlusPlus(X, K, r) : KM.initRandom(X, K, r);
      trails = mus.map((m) => [m.slice()]);
      lab = null; Js = []; phase = "assign"; done = false;
      update();
    }

    function step() {
      if (done) return false;
      if (phase === "assign") {
        const nl = KM.assign(X, mus);
        if (lab && nl.every((v, i) => v === lab[i])) done = true;
        lab = nl; phase = "update";
      } else {
        mus = KM.update(X, lab, mus);
        mus.forEach((m, k) => trails[k].push(m.slice()));
        phase = "assign";
      }
      Js.push(KM.wcss(X, lab, mus));
      return !done;
    }

    function update() {
      stepBtn.textContent = done ? "Converged" : phase === "assign" ? "Assign points" : "Move centroids";
      stepBtn.disabled = done;
      const K = mus.length;
      const sizes = lab ? mus.map((_, k) => lab.filter((l) => l === k).length) : null;
      const empty = sizes ? sizes.filter((s) => s === 0).length : 0;
      readout.innerHTML = `<span>half-steps <b>${Js.length}</b></span>
        <span>J = <b>${lab ? KM.wcss(X, lab, mus).toFixed(2) : "—"}</b></span>
        <span>cluster sizes <b>${sizes ? sizes.join(", ") : "—"}</b></span>
        ${done ? "<span><b>converged</b>: the assignment step changed nothing</span>" : ""}
        ${empty ? `<span class="viz__status">${V.WARN_ICON} ${empty} empty cluster${empty > 1 ? "s" : ""}: its centroid stays put</span>` : ""}`;
      draw();
    }

    function drawMap() {
      const c = V.canvas(cMap);
      if (!c) return;
      const pad = { l: 40, r: 12, t: 12, b: 40 };
      const { xlim, ylim } = V.equalLims(c, pad, X, 0.06);
      const ax = D.axes[dSel.value] || ["feature 1", "feature 2"];
      const F = V.frame(c, { xlim, ylim, xticks: V.ticks(xlim[0], xlim[1], 6), yticks: V.ticks(ylim[0], ylim[1], 5),
        xlabel: ax[0], ylabel: ax[1], pad });
      const { ctx, sx, sy, ix, iy, T } = F;
      const col = T.clusters;
      F.clip();
      if (lab) { // Voronoi cells of the current centroids
        const cell = 5;
        ctx.globalAlpha = 0.13;
        for (let px = pad.l; px < c.w - pad.r; px += cell) {
          for (let py = pad.t; py < c.h - pad.b; py += cell) {
            ctx.fillStyle = col[KM.nearest([ix(px + cell / 2), iy(py + cell / 2)], mus) % 6];
            ctx.fillRect(px, py, cell, cell);
          }
        }
        ctx.globalAlpha = 1;
      }
      X.forEach((x, i) => {
        const k = lab ? lab[i] : -1;
        V.dot(ctx, sx(x[0]), sy(x[1]), T.bg, 5.5, k < 0 ? "circle" : V.SHAPES[k]);
        V.dot(ctx, sx(x[0]), sy(x[1]), k < 0 ? T.axis : col[k], 4, k < 0 ? "circle" : V.SHAPES[k]);
      });
      trails.forEach((tr, k) => V.line(ctx, tr.map((m) => [sx(m[0]), sy(m[1])]), T.text, 1.5, [4, 3]));
      mus.forEach((m, k) => {
        const x = sx(m[0]), y = sy(m[1]);
        V.dot(ctx, x, y, T.bg, 11);
        V.dot(ctx, x, y, col[k], 8, V.SHAPES[k] === "ring" ? "circle" : V.SHAPES[k]);
        ctx.strokeStyle = T.text; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(x - 7, y - 7); ctx.lineTo(x + 7, y + 7); ctx.moveTo(x - 7, y + 7); ctx.lineTo(x + 7, y - 7); ctx.stroke();
      });
      F.unclip();
    }

    function drawObj() {
      const c = V.canvas(cObj);
      if (!c) return;
      const n = Math.max(8, Js.length);
      const top = Js.length ? Math.max(...Js) * 1.1 : 1;
      const F = V.frame(c, { xlim: [0.5, n + 0.5], ylim: [0, top], xticks: V.ticks(1, n, 6).filter((v) => v >= 1 && Number.isInteger(v)),
        yticks: V.ticks(0, top, 4), xlabel: "half-step (assign, move, assign, …)", ylabel: "J", pad: { l: 52 } });
      const { ctx, sx, sy, T } = F;
      F.clip();
      if (Js.length) {
        V.line(ctx, Js.map((J, i) => [sx(i + 1), sy(J)]), T.path, 2);
        Js.forEach((J, i) => V.dot(ctx, sx(i + 1), sy(J), T.path, 4, i % 2 === 0 ? "circle" : "square"));
      } else {
        ctx.fillStyle = T.text; ctx.font = T.font(13, 600); ctx.textAlign = "center";
        ctx.fillText("Press “Assign points” to start", c.w / 2, c.h / 2);
      }
      F.unclip();
    }

    function draw() { drawMap(); drawObj(); }

    stepBtn.addEventListener("click", () => { step(); update(); });
    stage.querySelector('[data-act="run"]').addEventListener("click", () => { for (let i = 0; i < 400 && step(); i++); update(); });
    stage.querySelector('[data-act="new"]').addEventListener("click", () => { seed++; start(); });
    [dSel, iSel].forEach((el) => el.addEventListener("change", start));
    kIn.addEventListener("input", start);
    V.onRedraw([cMap, cObj], draw);
    start();
  }

  V.mountAll("kmeans-lloyd", mount);
})();
