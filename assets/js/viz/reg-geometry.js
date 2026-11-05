/* ==========================================================================
   Interactive: geometry of ridge (L2) and lasso (L1) in two dimensions.
   Minimise L(θ) = (θ − c)ᵀ A (θ − c) subject to ||θ||_q ≤ t, where c is the
   unregularised (OLS) solution. Shows loss contours, the constraint region,
   the constrained solution and its path as t varies.
   Requires common.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ;
  const ang = (25 * Math.PI) / 180, l1 = 1, l2 = 4;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  // A = R diag(l1, l2) Rᵀ
  const A = [
    [l1 * ca * ca + l2 * sa * sa, (l1 - l2) * ca * sa],
    [(l1 - l2) * ca * sa, l1 * sa * sa + l2 * ca * ca],
  ];
  const quad = (v) => v[0] * (A[0][0] * v[0] + A[0][1] * v[1]) + v[1] * (A[1][0] * v[0] + A[1][1] * v[1]);
  const loss = (th, c) => quad([th[0] - c[0], th[1] - c[1]]);

  // L2: θ(μ) = (A + μI)^{-1} A c, choose μ ≥ 0 with ||θ(μ)|| = t (bisection)
  function solveL2(c, t) {
    if (Math.hypot(c[0], c[1]) <= t) return c.slice();
    const Ac = [A[0][0] * c[0] + A[0][1] * c[1], A[1][0] * c[0] + A[1][1] * c[1]];
    const th = (mu) => {
      const a = A[0][0] + mu, b = A[0][1], d = A[1][1] + mu, det = a * d - b * b;
      return [(d * Ac[0] - b * Ac[1]) / det, (-b * Ac[0] + a * Ac[1]) / det];
    };
    if (t <= 0) return [0, 0];
    let lo = 0, hi = 1;
    while (Math.hypot(...th(hi)) > t) hi *= 2;
    for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; Math.hypot(...th(m)) > t ? (lo = m) : (hi = m); }
    return th(hi);
  }

  // L1: the minimiser lies on one of the four edges of the diamond; minimise exactly on each edge.
  function solveL1(c, t) {
    if (Math.abs(c[0]) + Math.abs(c[1]) <= t) return c.slice();
    if (t <= 0) return [0, 0];
    const vs = [[t, 0], [0, t], [-t, 0], [0, -t]];
    let best = null, bestL = Infinity;
    for (let e = 0; e < 4; e++) {
      const a = vs[e], b = vs[(e + 1) % 4];
      const u = [b[0] - a[0], b[1] - a[1]], r = [c[0] - a[0], c[1] - a[1]];
      const num = u[0] * (A[0][0] * r[0] + A[0][1] * r[1]) + u[1] * (A[1][0] * r[0] + A[1][1] * r[1]);
      const s = Math.min(1, Math.max(0, num / quad(u)));
      const p = [a[0] + s * u[0], a[1] + s * u[1]];
      if (s === 0 || s === 1) { p[0] = s === 0 ? a[0] : b[0]; p[1] = s === 0 ? a[1] : b[1]; }
      const L = loss(p, c);
      if (L < bestL) { bestL = L; best = p; }
    }
    return best;
  }

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-p">Penalty</label>
          <select id="${id}-p">
            <option value="l1">Lasso (L1): |θ₁| + |θ₂| ≤ t</option>
            <option value="l2">Ridge (L2): θ₁² + θ₂² ≤ t²</option>
          </select>
        </div>
        <div class="control">
          <label for="${id}-t">Budget t <output id="${id}-t-out" for="${id}-t"></output></label>
          <input type="range" id="${id}-t" min="0" max="3" step="0.01" value="1">
        </div>
        <div class="control">
          <label for="${id}-c1">Least-squares θ<sub>1</sub> <output id="${id}-c1-out" for="${id}-c1"></output></label>
          <input type="range" id="${id}-c1" min="-1" max="3" step="0.05" value="2.2">
        </div>
        <div class="control">
          <label for="${id}-c2">Least-squares θ<sub>2</sub> <output id="${id}-c2-out" for="${id}-c2"></output></label>
          <input type="range" id="${id}-c2" min="-1" max="3" step="0.05" value="0.6">
        </div>
      </div>
      <canvas class="viz__canvas" role="img"
        aria-label="Parameter plane with elliptical contours of the loss centred at the OLS solution, the constraint region (a diamond for lasso, a disc for ridge), the constrained solution where the smallest touching contour meets the region, and the path of solutions as the budget grows."></canvas>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-curve)">Loss contours / constraint region</span>
        <span style="--swatch: var(--viz-path)">Regularised solution and its path as t grows</span>
        <span style="--swatch: var(--viz-text)">OLS solution</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const canvas = stage.querySelector("canvas");
    const pSel = stage.querySelector(`#${id}-p`);
    const tIn = stage.querySelector(`#${id}-t`), c1 = stage.querySelector(`#${id}-c1`), c2 = stage.querySelector(`#${id}-c2`);
    const readout = stage.querySelector(".viz__readout");

    const solve = (c, t) => (pSel.value === "l1" ? solveL1(c, t) : solveL2(c, t));

    function update() {
      const c = [+c1.value, +c2.value], t = +tIn.value;
      stage.querySelector(`#${id}-t-out`).textContent = t.toFixed(2);
      stage.querySelector(`#${id}-c1-out`).textContent = c[0].toFixed(2);
      stage.querySelector(`#${id}-c2-out`).textContent = c[1].toFixed(2);
      const th = solve(c, t);
      const zeros = [0, 1].filter((j) => Math.abs(th[j]) < 1e-9 && Math.abs(c[j]) > 1e-9);
      const msg = zeros.length
        ? `<span><b>θ<sub>${zeros[0] + 1}</sub> = 0 exactly</b>: feature ${zeros[0] + 1} is removed from the model</span>`
        : `<span>no coefficient is exactly zero</span>`;
      readout.innerHTML = `<span>solution θ = (<b>${th[0].toFixed(3)}</b>, <b>${th[1].toFixed(3)}</b>)</span>${msg}`;
      draw();
    }

    function draw() {
      const c0 = V.canvas(canvas);
      if (!c0) return;
      const pad = { l: 36, r: 12, t: 12, b: 40 };
      const ylim = [-1.6, 3.2];
      const span = ((ylim[1] - ylim[0]) * (c0.w - pad.l - pad.r)) / (c0.h - pad.t - pad.b);
      const xlim = [0.8 - span / 2, 0.8 + span / 2];
      const ticks = (a, b) => { const o = []; for (let v = Math.ceil(a); v <= b; v++) o.push(v); return o; };
      const F = V.frame(c0, { xlim, ylim, xticks: ticks(xlim[0], xlim[1]), yticks: ticks(ylim[0], ylim[1]), xlabel: "θ₁", ylabel: "θ₂", pad });
      const { ctx, sx, sy, T } = F;
      const c = [+c1.value, +c2.value], t = +tIn.value, l1mode = pSel.value === "l1";
      const th = solve(c, t);
      F.clip();
      // coordinate axes
      V.line(ctx, [[sx(xlim[0]), sy(0)], [sx(xlim[1]), sy(0)]], T.axis, 1.5);
      V.line(ctx, [[sx(0), sy(ylim[0])], [sx(0), sy(ylim[1])]], T.axis, 1.5);
      // constraint region
      ctx.beginPath();
      if (l1mode) { ctx.moveTo(sx(t), sy(0)); ctx.lineTo(sx(0), sy(t)); ctx.lineTo(sx(-t), sy(0)); ctx.lineTo(sx(0), sy(-t)); ctx.closePath(); }
      else ctx.ellipse(sx(0), sy(0), sx(t) - sx(0), sy(0) - sy(t), 0, 0, 2 * Math.PI);
      ctx.globalAlpha = 0.18; ctx.fillStyle = T.curve; ctx.fill();
      ctx.globalAlpha = 1; ctx.strokeStyle = T.curve; ctx.lineWidth = 2; ctx.stroke();
      // contours
      const Ls = loss(th, c);
      const levels = [0.05, 0.2, 0.45, 0.8, 1.4, 2.2, 3.2, 4.5, 6.2].filter((v) => Math.abs(v - Ls) > 0.04);
      V.contour(F, (a, b) => loss([a, b], c), levels, T.curve, 80, 1);
      if (Ls > 1e-9) V.contour(F, (a, b) => loss([a, b], c), [Ls], T.path, 120, 2);
      // path of solutions
      const tmax = l1mode ? Math.abs(c[0]) + Math.abs(c[1]) : Math.hypot(c[0], c[1]);
      const pts = [];
      for (let k = 0; k <= 120; k++) { const s = solve(c, (tmax * k) / 120); pts.push([sx(s[0]), sy(s[1])]); }
      V.line(ctx, pts, T.path, 1.5, [4, 4]);
      V.dot(ctx, sx(c[0]), sy(c[1]), T.text, 5, "square");
      V.dot(ctx, sx(th[0]), sy(th[1]), T.bg, 8);
      V.dot(ctx, sx(th[0]), sy(th[1]), T.path, 6);
      ctx.fillStyle = T.text; ctx.font = T.font(12, 600); ctx.textAlign = "left";
      ctx.fillText("OLS", sx(c[0]) + 8, sy(c[1]) - 6);
      F.unclip();
    }

    [tIn, c1, c2].forEach((el) => el.addEventListener("input", update));
    pSel.addEventListener("change", update);
    V.onRedraw(canvas, draw);
    update();
  }

  V.mountAll("reg-geometry", mount);
})();
