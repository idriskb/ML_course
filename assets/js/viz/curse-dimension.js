/* ==========================================================================
   Interactive: the curse of dimensionality.
   Left: side length α^{1/p} of a cube that contains a fraction α of the unit
   cube, against the dimension p. Right: distances from a random query point
   to 500 points drawn uniformly in [0, 1]^p, divided by the largest one;
   as p grows they concentrate near 1 and "nearest" stops meaning "near".
   Requires common.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ;
  const PMAX = 100, NPTS = 500, BINS = 25;

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-a">Fraction of the data wanted α <output id="${id}-a-out" for="${id}-a"></output></label>
          <input type="range" id="${id}-a" min="0.01" max="0.3" step="0.01" value="0.01">
        </div>
        <div class="control">
          <label for="${id}-p">Dimension p <output id="${id}-p-out" for="${id}-p"></output></label>
          <input type="range" id="${id}-p" min="1" max="${PMAX}" step="1" value="2">
        </div>
      </div>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">Side of a cube holding a fraction α of the data</p>
          <canvas class="viz__canvas" data-c="side" role="img"
            aria-label="The side length alpha to the power one over p of a sub-cube holding a fraction alpha of the unit cube, plotted against the dimension p. It rises quickly towards 1."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">Distances from a query to 500 random points (÷ largest)</p>
          <canvas class="viz__canvas" data-c="hist" role="img"
            aria-label="Histogram of the distances from a random query point to 500 uniform points in the p-dimensional unit cube, divided by the largest distance. As p grows the histogram concentrates near 1, so the nearest point is almost as far as the farthest."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-path)">Side length α<sup>1/p</sup> / histogram of distances</span>
        <span style="--swatch: var(--viz-text)">Current p; nearest neighbour (dashed)</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cS = stage.querySelector('[data-c="side"]');
    const cH = stage.querySelector('[data-c="hist"]');
    const aIn = stage.querySelector(`#${id}-a`);
    const pIn = stage.querySelector(`#${id}-p`);
    const readout = stage.querySelector(".viz__readout");
    let dists;

    function simulate() {
      const p = +pIn.value, r = V.rng(5);
      const q = Array.from({ length: p }, () => r());
      dists = [];
      for (let i = 0; i < NPTS; i++) {
        let s = 0; for (let j = 0; j < p; j++) { const d = r() - q[j]; s += d * d; }
        dists.push(Math.sqrt(s));
      }
      update();
    }

    function update() {
      const a = +aIn.value, p = +pIn.value;
      stage.querySelector(`#${id}-a-out`).textContent = `${Math.round(100 * a)}%`;
      stage.querySelector(`#${id}-p-out`).textContent = p;
      const dmin = Math.min(...dists), dmax = Math.max(...dists);
      readout.innerHTML = `<span>side needed in p = ${p}: <b>${Math.pow(a, 1 / p).toFixed(3)}</b>
          (p = 1: <b>${a.toFixed(2)}</b>, p = 2: <b>${Math.sqrt(a).toFixed(2)}</b>, p = 20: <b>${Math.pow(a, 1 / 20).toFixed(2)}</b>)</span>
        <span>nearest / farthest distance <b>${(dmin / dmax).toFixed(2)}</b></span>`;
      draw();
    }

    function drawSide() {
      const c = V.canvas(cS);
      if (!c) return;
      const a = +aIn.value, p = +pIn.value;
      const F = V.frame(c, { xlim: [1, PMAX], ylim: [0, 1], xticks: [1, 20, 40, 60, 80, 100], yticks: [0, 0.25, 0.5, 0.75, 1],
        xlabel: "dimension p", ylabel: "side length", pad: { l: 44 } });
      const { ctx, sx, sy, T } = F;
      F.clip();
      const pts = []; for (let d = 1; d <= PMAX; d++) pts.push([sx(d), sy(Math.pow(a, 1 / d))]);
      V.line(ctx, pts, T.path, 2.5);
      V.line(ctx, [[sx(p), sy(0)], [sx(p), sy(1)]], T.text, 1.5, [4, 3]);
      V.dot(ctx, sx(p), sy(Math.pow(a, 1 / p)), T.path, 6, "square");
      F.unclip();
    }

    function drawHist() {
      const c = V.canvas(cH);
      if (!c) return;
      const dmax = Math.max(...dists), dmin = Math.min(...dists);
      const counts = new Array(BINS).fill(0);
      dists.forEach((d) => { counts[Math.min(BINS - 1, Math.floor((d / dmax) * BINS))]++; });
      const top = Math.max(...counts) * 1.1;
      const F = V.frame(c, { xlim: [0, 1], ylim: [0, top], xticks: [0, 0.25, 0.5, 0.75, 1], yticks: V.ticks(0, top, 4),
        xlabel: "distance ÷ largest distance", ylabel: "count", pad: { l: 44 } });
      const { ctx, sx, sy, T } = F;
      F.clip();
      ctx.fillStyle = T.path; ctx.globalAlpha = 0.75;
      counts.forEach((n, b) => ctx.fillRect(sx(b / BINS) + 1, sy(n), sx(1 / BINS) - sx(0) - 2, sy(0) - sy(n)));
      ctx.globalAlpha = 1;
      V.line(ctx, [[sx(dmin / dmax), sy(0)], [sx(dmin / dmax), sy(top)]], T.text, 2, [5, 4]);
      ctx.font = T.font(11, 600); ctx.fillStyle = T.text; ctx.textAlign = dmin / dmax > 0.5 ? "right" : "left";
      ctx.fillText("nearest", sx(dmin / dmax) + (dmin / dmax > 0.5 ? -6 : 6), sy(top) + 14);
      F.unclip();
    }

    function draw() { drawSide(); drawHist(); }
    aIn.addEventListener("input", update);
    pIn.addEventListener("input", simulate);
    V.onRedraw([cS, cH], draw);
    simulate();
  }

  V.mountAll("curse-dimension", mount);
})();
