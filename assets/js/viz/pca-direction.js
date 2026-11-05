/* ==========================================================================
   Interactive: PCA in two dimensions on the house-price data.
   Rotate a unit direction u through the origin. Left: the data, the line
   spanned by u, and each point's orthogonal projection. Right: the captured
   part (1/n)Σ(uᵀxᵢ)² and the lost part (1/n)Σ‖xᵢ − x̂ᵢ‖² as functions of the
   angle; they always add up to the same total.
   Options: centre the data or not, and the units of the features.
   Requires common.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ;
  const RAD = Math.PI / 180;

  // "nice" tick values covering [lo, hi]
  function ticks(lo, hi, n) {
    const raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-ang">Direction angle <output id="${id}-ang-out" for="${id}-ang"></output></label>
          <input type="range" id="${id}-ang" min="0" max="180" step="1" value="10">
        </div>
        <div class="control">
          <label for="${id}-units">Units</label>
          <select id="${id}-units">
            <option value="k">Area in 1000 sq ft</option>
            <option value="h">Area in 100 sq ft</option>
            <option value="std">Both standardised</option>
          </select>
        </div>
        <div class="control control--check">
          <label><input type="checkbox" id="${id}-centre" checked> Centre the data first</label>
        </div>
        <div class="viz__buttons">
          <button type="button" class="btn btn--primary" data-act="pc1">Best direction</button>
        </div>
      </div>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">Data and the line spanned by u</p>
          <canvas class="viz__canvas" data-c="data" role="img"
            aria-label="Scatter plot of houses (area against price) with a line through the origin in the chosen direction, and a short segment from each house to its orthogonal projection on the line."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">Captured and lost spread against the angle</p>
          <canvas class="viz__canvas" data-c="curve" role="img"
            aria-label="Two curves against the direction angle: the mean squared projection, which is maximal at the first principal direction, and the mean squared reconstruction error, which is minimal at the same angle. Their sum is constant."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-curve)">Houses / captured (1/n)Σ(u<sup>⊤</sup>x<sub>i</sub>)²</span>
        <span style="--swatch: var(--viz-path)">Line spanned by u, projections / lost (1/n)Σ‖x<sub>i</sub> − x̂<sub>i</sub>‖²</span>
        <span style="--swatch: var(--viz-axis)">Origin axes / total (constant)</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cD = stage.querySelector('[data-c="data"]');
    const cC = stage.querySelector('[data-c="curve"]');
    const angIn = stage.querySelector(`#${id}-ang`);
    const unitsSel = stage.querySelector(`#${id}-units`);
    const centreBox = stage.querySelector(`#${id}-centre`);
    const readout = stage.querySelector(".viz__readout");
    // 40 houses: area in 1000 sq ft, price in $100k. Price rises with area, but the
    // cloud's long axis does not point at the origin, so centring visibly matters.
    const houses = (() => {
      const r = V.rng(2024);
      return Array.from({ length: 40 }, () => { const a = 0.8 + 2 * r(); return [a, 1.2 + 0.5 * a + 0.18 * r.normal()]; });
    })();
    let X, S, tr, best, ang = +angIn.value;

    function prepare() {
      const u = unitsSel.value;
      let pts = houses.map(([a, p]) => [u === "h" ? 10 * a : a, p]);
      const n = pts.length;
      const m = [0, 1].map((j) => pts.reduce((s, r) => s + r[j], 0) / n);
      if (u === "std") {
        const sd = [0, 1].map((j) => Math.sqrt(pts.reduce((s, r) => s + (r[j] - m[j]) ** 2, 0) / n));
        pts = pts.map((r) => [(r[0] - m[0]) / sd[0], (r[1] - m[1]) / sd[1]]);
        if (!centreBox.checked) pts = pts.map((r, i) => [r[0] + m[0] / sd[0], r[1] + m[1] / sd[1]]);
      } else if (centreBox.checked) {
        pts = pts.map((r) => [r[0] - m[0], r[1] - m[1]]);
      }
      X = pts;
      // second-moment matrix (1/n) XᵀX: the covariance when the data are centred
      const s11 = X.reduce((s, r) => s + r[0] * r[0], 0) / n;
      const s22 = X.reduce((s, r) => s + r[1] * r[1], 0) / n;
      const s12 = X.reduce((s, r) => s + r[0] * r[1], 0) / n;
      S = [[s11, s12], [s12, s22]];
      tr = s11 + s22;
      best = ((0.5 * Math.atan2(2 * s12, s11 - s22)) / RAD + 180) % 180;
      update();
    }

    const captured = (a) => {
      const c = Math.cos(a * RAD), s = Math.sin(a * RAD);
      return c * c * S[0][0] + 2 * c * s * S[0][1] + s * s * S[1][1];
    };

    function update() {
      const cap = captured(ang), lost = tr - cap;
      const c = Math.cos(ang * RAD), s = Math.sin(ang * RAD);
      stage.querySelector(`#${id}-ang-out`).textContent = `${ang.toFixed(1)}°`;
      const atBest = Math.abs(((ang - best + 90) % 180 + 180) % 180 - 90) < 0.05;
      readout.innerHTML = `<span>u = (<b>${c.toFixed(3)}</b>, <b>${s.toFixed(3)}</b>)</span>
        <span>captured <b>${cap.toFixed(3)}</b></span>
        <span>lost <b>${lost.toFixed(3)}</b></span>
        <span>total <b>${tr.toFixed(3)}</b></span>
        <span>fraction captured <b>${((100 * cap) / tr).toFixed(1)}%</b></span>
        <span>best angle <b>${best.toFixed(1)}°</b>${atBest ? " (you are on it)" : ""}</span>`;
      draw();
    }

    function drawData() {
      const c = V.canvas(cD);
      if (!c) return;
      const pad = { l: 44, r: 12, t: 12, b: 40 };
      // equal aspect ratio, so that right angles look right
      const xs = X.map((r) => r[0]).concat([0]), ys = X.map((r) => r[1]).concat([0]);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const hx = (Math.max(...xs) - Math.min(...xs)) / 2 * 1.12 + 0.1, hy = (Math.max(...ys) - Math.min(...ys)) / 2 * 1.12 + 0.1;
      const W = c.w - pad.l - pad.r, H = c.h - pad.t - pad.b;
      const k = Math.min(W / (2 * hx), H / (2 * hy));
      const xlim = [cx - W / (2 * k), cx + W / (2 * k)], ylim = [cy - H / (2 * k), cy + H / (2 * k)];
      const u = unitsSel.value;
      const F = V.frame(c, {
        xlim, ylim, xticks: ticks(xlim[0], xlim[1], 6), yticks: ticks(ylim[0], ylim[1], 5), pad,
        xlabel: u === "std" ? "area (standardised)" : u === "h" ? "area (100 sq ft)" : "area (1000 sq ft)",
        ylabel: u === "std" ? "price (standardised)" : "price ($100k)",
      });
      const { ctx, sx, sy, T } = F;
      F.clip();
      V.line(ctx, [[sx(xlim[0]), sy(0)], [sx(xlim[1]), sy(0)]], T.axis, 1);
      V.line(ctx, [[sx(0), sy(ylim[0])], [sx(0), sy(ylim[1])]], T.axis, 1);
      const cs = Math.cos(ang * RAD), sn = Math.sin(ang * RAD), L = 4 * (hx + hy + Math.abs(cx) + Math.abs(cy));
      X.forEach(([a, b]) => {
        const z = cs * a + sn * b;
        V.line(ctx, [[sx(a), sy(b)], [sx(z * cs), sy(z * sn)]], T.path, 1, [3, 3]);
      });
      V.line(ctx, [[sx(-L * cs), sy(-L * sn)], [sx(L * cs), sy(L * sn)]], T.path, 2.5);
      X.forEach(([a, b]) => {
        const z = cs * a + sn * b;
        V.dot(ctx, sx(z * cs), sy(z * sn), T.path, 3);
      });
      X.forEach(([a, b]) => { V.dot(ctx, sx(a), sy(b), T.bg, 5.5); V.dot(ctx, sx(a), sy(b), T.curve, 4); });
      // unit vector u as an arrow from the origin
      const ax = sx(0), ay = sy(0), len = 46, ex = ax + len * cs, ey = ay - len * sn;
      ctx.strokeStyle = T.text; ctx.fillStyle = T.text; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.stroke();
      const h = 9, a0 = Math.atan2(ey - ay, ex - ax);
      ctx.beginPath(); ctx.moveTo(ex, ey);
      ctx.lineTo(ex - h * Math.cos(a0 - 0.4), ey - h * Math.sin(a0 - 0.4));
      ctx.lineTo(ex - h * Math.cos(a0 + 0.4), ey - h * Math.sin(a0 + 0.4));
      ctx.closePath(); ctx.fill();
      ctx.font = T.font(13, 700); ctx.textAlign = "left";
      ctx.fillText("u", ex + 6, ey - 4);
      F.unclip();
    }

    function drawCurve() {
      const c = V.canvas(cC);
      if (!c) return;
      const top = tr * 1.12;
      const F = V.frame(c, { xlim: [0, 180], ylim: [0, top], xticks: [0, 45, 90, 135, 180], yticks: ticks(0, top, 4),
        fmtX: (v) => v + "°", xlabel: "angle of u", pad: { l: 52 } });
      const { ctx, sx, sy, T } = F;
      F.clip();
      V.line(ctx, [[sx(0), sy(tr)], [sx(180), sy(tr)]], T.axis, 1.5, [6, 4]);
      const capPts = [], lostPts = [];
      for (let a = 0; a <= 180; a += 1) { const v = captured(a); capPts.push([sx(a), sy(v)]); lostPts.push([sx(a), sy(tr - v)]); }
      V.line(ctx, capPts, T.curve, 2.5);
      V.line(ctx, lostPts, T.path, 2.5, [8, 4]);
      V.line(ctx, [[sx(best), sy(0)], [sx(best), sy(top)]], T.axis, 1, [2, 3]);
      V.line(ctx, [[sx(ang), sy(0)], [sx(ang), sy(top)]], T.text, 1.5);
      V.dot(ctx, sx(ang), sy(captured(ang)), T.curve, 6);
      V.dot(ctx, sx(ang), sy(tr - captured(ang)), T.path, 6, "square");
      ctx.font = T.font(12, 600); ctx.fillStyle = T.text; ctx.textAlign = "left";
      ctx.fillText("total", sx(2), sy(tr) - 6);
      F.unclip();
    }

    function draw() { drawData(); drawCurve(); }

    angIn.addEventListener("input", () => { ang = +angIn.value; update(); });
    unitsSel.addEventListener("change", prepare);
    centreBox.addEventListener("change", prepare);
    stage.querySelector('[data-act="pc1"]').addEventListener("click", () => {
      ang = best; angIn.value = String(Math.round(best)); update();
    });
    V.onRedraw([cD, cC], draw);
    prepare();
  }

  V.mountAll("pca-direction", mount);
})();
