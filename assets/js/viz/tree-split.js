/* ==========================================================================
   Interactive: choosing one split of a regression tree.
   Fuel consumption against speed (as in the k-NN chapter). A threshold t
   splits the cars into speed ≤ t and speed > t; each side is predicted by
   its mean. Left: data and the two leaf means. Right: the training sum of
   squared errors after the split, for every possible t.
   Requires common.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ;
  const XL = [15, 135];
  const f = (s) => 4 + 0.0008 * (s - 70) ** 2 + 25 / s;

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-t">Threshold t (km/h) <output id="${id}-t-out" for="${id}-t"></output></label>
          <input type="range" id="${id}-t" min="20" max="130" step="0.5" value="40">
        </div>
        <div class="viz__buttons">
          <button type="button" class="btn btn--primary" data-act="best">Best split</button>
        </div>
      </div>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">Data and the two leaf means</p>
          <canvas class="viz__canvas" data-c="fit" role="img"
            aria-label="Fuel consumption against speed, a vertical line at the threshold t, and a horizontal segment at the mean consumption on each side of it."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">Training SSE after the split, for every t</p>
          <canvas class="viz__canvas" data-c="sse" role="img"
            aria-label="The total sum of squared errors of the two-leaf tree as a function of the threshold, with a dashed line for the error with no split. The best threshold is where the curve is lowest."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-curve)">Training data / SSE after the split</span>
        <span style="--swatch: var(--viz-path)">Leaf means (the tree's prediction)</span>
        <span style="--swatch: var(--viz-axis)">No split: one mean for all (dashed)</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cF = stage.querySelector('[data-c="fit"]');
    const cS = stage.querySelector('[data-c="sse"]');
    const tIn = stage.querySelector(`#${id}-t`);
    const readout = stage.querySelector(".viz__readout");
    const r = V.rng(8);
    const data = Array.from({ length: 40 }, () => { const s = 20 + 110 * r(); return [s, f(s) + 0.5 * r.normal()]; })
      .sort((a, b) => a[0] - b[0]);
    const sideStats = (pts) => {
      if (!pts.length) return { n: 0, m: NaN, sse: 0 };
      const m = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      return { n: pts.length, m, sse: pts.reduce((s, p) => s + (p[1] - m) ** 2, 0) };
    };
    const root = sideStats(data);
    const sseAt = (t) => { const L = sideStats(data.filter((p) => p[0] <= t)), R = sideStats(data.filter((p) => p[0] > t)); return { L, R, sse: L.sse + R.sse }; };
    // candidate thresholds: midpoints between consecutive speeds
    const cands = data.slice(0, -1).map((p, i) => (p[0] + data[i + 1][0]) / 2);
    let best = cands[0]; cands.forEach((t) => { if (sseAt(t).sse < sseAt(best).sse) best = t; });
    let t = +tIn.value;

    function update() {
      const s = sseAt(t);
      tIn.value = String(t);
      stage.querySelector(`#${id}-t-out`).textContent = t.toFixed(1);
      readout.innerHTML = `<span>left: <b>${s.L.n}</b> cars, mean <b>${s.L.n ? s.L.m.toFixed(2) : "—"}</b></span>
        <span>right: <b>${s.R.n}</b> cars, mean <b>${s.R.n ? s.R.m.toFixed(2) : "—"}</b></span>
        <span>SSE <b>${s.L.sse.toFixed(2)}</b> + <b>${s.R.sse.toFixed(2)}</b> = <b>${s.sse.toFixed(2)}</b></span>
        <span>no split: <b>${root.sse.toFixed(2)}</b></span>
        <span>decrease <b>${(root.sse - s.sse).toFixed(2)}</b></span>`;
      draw();
    }

    function drawFit() {
      const c = V.canvas(cF);
      if (!c) return;
      const F = V.frame(c, { xlim: XL, ylim: [3, 9], xticks: [20, 40, 60, 80, 100, 120], yticks: [3, 4, 5, 6, 7, 8, 9],
        xlabel: "speed (km/h)", ylabel: "L / 100 km", pad: { l: 44 } });
      const { ctx, sx, sy, T } = F;
      const s = sseAt(t);
      F.clip();
      V.line(ctx, [[sx(XL[0]), sy(root.m)], [sx(XL[1]), sy(root.m)]], T.axis, 1.5, [6, 4]);
      ctx.globalAlpha = 0.07; ctx.fillStyle = T.path; ctx.fillRect(sx(t), F.pad.t, sx(XL[1]) - sx(t), c.h - F.pad.t - F.pad.b); ctx.globalAlpha = 1;
      V.line(ctx, [[sx(t), sy(3)], [sx(t), sy(9)]], T.text, 2);
      if (s.L.n) V.line(ctx, [[sx(XL[0]), sy(s.L.m)], [sx(t), sy(s.L.m)]], T.path, 3);
      if (s.R.n) V.line(ctx, [[sx(t), sy(s.R.m)], [sx(XL[1]), sy(s.R.m)]], T.path, 3);
      data.forEach(([x, y]) => {
        const m = x <= t ? s.L.m : s.R.m;
        V.line(ctx, [[sx(x), sy(y)], [sx(x), sy(m)]], T.axis, 1, [2, 2]);
      });
      data.forEach(([x, y]) => { V.dot(ctx, sx(x), sy(y), T.bg, 5.5); V.dot(ctx, sx(x), sy(y), T.curve, 4); });
      F.unclip();
    }

    function drawSse() {
      const c = V.canvas(cS);
      if (!c) return;
      const top = root.sse * 1.1;
      const F = V.frame(c, { xlim: XL, ylim: [0, top], xticks: [20, 40, 60, 80, 100, 120], yticks: V.ticks(0, top, 4),
        xlabel: "threshold t (km/h)", ylabel: "SSE", pad: { l: 44 } });
      const { ctx, sx, sy, T } = F;
      F.clip();
      V.line(ctx, [[sx(XL[0]), sy(root.sse)], [sx(XL[1]), sy(root.sse)]], T.axis, 1.5, [6, 4]);
      const pts = []; for (let u = 20; u <= 130; u += 0.25) pts.push([sx(u), sy(sseAt(u).sse)]);
      V.line(ctx, pts, T.curve, 2.5);
      V.dot(ctx, sx(best), sy(sseAt(best).sse), T.curve, 6, "ring");
      V.line(ctx, [[sx(t), sy(0)], [sx(t), sy(top)]], T.text, 1.5);
      V.dot(ctx, sx(t), sy(sseAt(t).sse), T.path, 6, "square");
      F.unclip();
    }

    function draw() { drawFit(); drawSse(); }
    tIn.addEventListener("input", () => { t = +tIn.value; update(); });
    stage.querySelector('[data-act="best"]').addEventListener("click", () => { t = best; update(); });
    V.onRedraw([cF, cS], draw);
    update();
  }

  V.mountAll("tree-split", mount);
})();
