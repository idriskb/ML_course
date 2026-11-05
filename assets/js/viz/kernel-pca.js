/* ==========================================================================
   Interactive: kernel PCA.
   Left: the data (colours show the true groups, which kernel PCA does not
   use). Right: scores on the first two (kernel) principal components.
   Linear kernel = ordinary PCA. Scores of training points:
   z_k = √μ_k u_k, with (μ_k, u_k) eigenpairs of the centred kernel matrix.
   Requires common.js and kernel-lib.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ, Kn = V.Kern;

  function circles(n, seed) {
    const r = V.rng(seed);
    return Array.from({ length: n }, (_, i) => {
      const lab = i % 2, rad = lab ? 1.5 : 0.5, t = 2 * Math.PI * r();
      return [rad * Math.cos(t) + 0.1 * r.normal(), rad * Math.sin(t) + 0.1 * r.normal(), lab];
    });
  }
  const DATA = {
    circles: { name: "Two concentric circles", rows: () => circles(100, 6) },
    moons: { name: "Two moons", rows: () => V.moons(100, 0.06, 9).map(([x, y, l]) => [1.6 * (x - 0.5), 1.6 * (y - 0.25), l]) },
  };

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    const opts = Object.keys(DATA).map((k) => `<option value="${k}">${DATA[k].name}</option>`).join("");
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-d">Data</label>
          <select id="${id}-d">${opts}</select>
        </div>
        <div class="control">
          <label for="${id}-k">Kernel</label>
          <select id="${id}-k">
            <option value="rbf">Gaussian (RBF)</option>
            <option value="linear">Linear (ordinary PCA)</option>
          </select>
        </div>
        <div class="control">
          <label for="${id}-s">RBF width σ <output id="${id}-s-out" for="${id}-s"></output></label>
          <input type="range" id="${id}-s" min="-0.7" max="0.7" step="0.05" value="-0.3">
        </div>
      </div>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">Data (groups shown only for reference)</p>
          <canvas class="viz__canvas" data-c="data" role="img"
            aria-label="The original two-dimensional data: an inner and an outer ring, or two moons, with the two groups marked by shape."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">Scores on the first two principal components</p>
          <canvas class="viz__canvas" data-c="proj" role="img"
            aria-label="The same points plotted at their scores on the first two kernel principal components. With a suitable Gaussian kernel the two groups become separated along the first component."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-curve)">Group A (circles)</span>
        <span style="--swatch: var(--viz-path)">Group B (triangles)</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cD = stage.querySelector('[data-c="data"]');
    const cP = stage.querySelector('[data-c="proj"]');
    const dSel = stage.querySelector(`#${id}-d`);
    const kSel = stage.querySelector(`#${id}-k`);
    const sIn = stage.querySelector(`#${id}-s`);
    const readout = stage.querySelector(".viz__readout");
    let rows, Z;

    function compute() {
      rows = DATA[dSel.value].rows();
      const X = rows.map((p) => [p[0], p[1]]);
      const sigma = Math.pow(10, +sIn.value), isRbf = kSel.value === "rbf";
      sIn.disabled = !isRbf;
      stage.querySelector(`#${id}-s-out`).textContent = isRbf ? sigma.toFixed(2) : "—";
      const Kc = Kn.center(Kn.matrix(Kn.make(kSel.value, { sigma }), X, X));
      const { values, vectors } = V.eigSym(Kc, 30);
      Z = rows.map((_, i) => [0, 1].map((k) => Math.sqrt(values[k]) * vectors[k][i]));
      const tr = values.reduce((s, v) => s + v, 0);
      // how well does the first component alone separate the groups? (best threshold)
      const s1 = rows.map((p, i) => [Z[i][0], p[2]]).sort((a, b) => a[0] - b[0]);
      let best = 0, cnt = 0; const nB = rows.filter((p) => p[2]).length;
      s1.forEach(([, l], i) => { cnt += l; const acc = Math.max((i + 1 - cnt) + (nB - cnt), cnt + (rows.length - i - 1 - (nB - cnt))); best = Math.max(best, acc); });
      readout.innerHTML = `<span>variance share of the first two components <b>${((100 * (values[0] + values[1])) / tr).toFixed(0)}%</b></span>
        <span>groups separated by one threshold on component 1: <b>${Math.round((100 * best) / rows.length)}%</b> of points</span>`;
      draw();
    }

    function scatter(canvas, pts, labels) {
      const c = V.canvas(canvas);
      if (!c) return;
      const pad = { l: 40, r: 12, t: 12, b: 34 };
      const lim = V.equalLims(c, pad, pts, 0.08);
      const F = V.frame(c, { xlim: lim.xlim, ylim: lim.ylim, xticks: V.ticks(lim.xlim[0], lim.xlim[1], 6), yticks: V.ticks(lim.ylim[0], lim.ylim[1], 5), pad, fmtX: (v) => String(+v.toFixed(2)), fmtY: (v) => String(+v.toFixed(2)) });
      const { ctx, sx, sy, T } = F;
      F.clip();
      pts.forEach((p, i) => {
        const l = labels[i];
        V.dot(ctx, sx(p[0]), sy(p[1]), T.bg, 5.5, l ? "triangle" : "circle");
        V.dot(ctx, sx(p[0]), sy(p[1]), l ? T.path : T.curve, 4, l ? "triangle" : "circle");
      });
      F.unclip();
    }
    function draw() {
      const labels = rows.map((p) => p[2]);
      scatter(cD, rows.map((p) => [p[0], p[1]]), labels);
      scatter(cP, Z, labels);
    }

    dSel.addEventListener("change", compute);
    kSel.addEventListener("change", compute);
    sIn.addEventListener("change", compute);
    sIn.addEventListener("input", () => { stage.querySelector(`#${id}-s-out`).textContent = Math.pow(10, +sIn.value).toFixed(2); });
    V.onRedraw([cD, cP], draw);
    compute();
  }

  V.mountAll("kernel-pca", mount);
})();
