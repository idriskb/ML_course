/* ==========================================================================
   Shared helpers for interactive figures  (window.VIZ)
   Load before any viz that uses it:
     <script defer src="../assets/js/viz/common.js"></script>
     <script defer src="../assets/js/viz/my-viz.js"></script>
   ========================================================================== */
(function () {
  "use strict";

  const VIZ = {};

  /* ---------- theme ---------- */
  VIZ.theme = function () {
    const css = getComputedStyle(document.documentElement);
    const col = (name) => css.getPropertyValue(name).trim();
    const fontFamily = css.getPropertyValue("--font-ui").trim() || "sans-serif";
    return {
      col,
      curve: col("--viz-curve"),
      path: col("--viz-path"),
      grid: col("--viz-grid"),
      axis: col("--viz-axis"),
      text: col("--viz-text"),
      bg: col("--bg-soft"),
      clusters: [1, 2, 3, 4, 5, 6].map((k) => col(`--viz-c${k}`)),
      font: (size = 12, weight = 500) => `${weight} ${size}px ${fontFamily}`,
    };
  };

  /* ---------- canvas with device-pixel-ratio scaling ---------- */
  VIZ.canvas = function (canvas) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return null;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  };

  /* ---------- axes frame: returns scales and a clip helper ----------
     opts: { xlim:[a,b], ylim:[a,b], logy, xticks:[], yticks:[], xlabel, ylabel,
             pad:{l,r,t,b}, fmtX, fmtY } */
  VIZ.frame = function (c, opts) {
    const { ctx, w, h } = c;
    const T = VIZ.theme();
    const pad = Object.assign({ l: 44, r: 12, t: 12, b: opts.xlabel ? 40 : 26 }, opts.pad || {});
    const [x0, x1] = opts.xlim, [y0, y1] = opts.ylim;
    const ty = opts.logy ? (v) => Math.log10(Math.max(v, 1e-300)) : (v) => v;
    const Y0 = ty(y0), Y1 = ty(y1);
    const sx = (x) => pad.l + ((x - x0) / (x1 - x0)) * (w - pad.l - pad.r);
    const sy = (y) => pad.t + ((Y1 - ty(y)) / (Y1 - Y0)) * (h - pad.t - pad.b);
    const ix = (px) => x0 + ((px - pad.l) / (w - pad.l - pad.r)) * (x1 - x0);
    const iy = (py) => y1 - ((py - pad.t) / (h - pad.t - pad.b)) * (y1 - y0);

    ctx.lineWidth = 1;
    ctx.font = T.font(12);
    ctx.fillStyle = T.text;
    const fmtX = opts.fmtX || ((v) => String(v));
    const fmtY = opts.fmtY || ((v) => String(v));
    ctx.textAlign = "center";
    (opts.xticks || []).forEach((v) => {
      ctx.strokeStyle = T.grid;
      ctx.beginPath(); ctx.moveTo(sx(v), pad.t); ctx.lineTo(sx(v), h - pad.b); ctx.stroke();
      ctx.fillText(fmtX(v), sx(v), h - pad.b + 16);
    });
    ctx.textAlign = "right";
    (opts.yticks || []).forEach((v) => {
      ctx.strokeStyle = T.grid;
      ctx.beginPath(); ctx.moveTo(pad.l, sy(v)); ctx.lineTo(w - pad.r, sy(v)); ctx.stroke();
      ctx.fillText(fmtY(v), pad.l - 6, sy(v) + 4);
    });
    ctx.strokeStyle = T.axis;
    ctx.strokeRect(pad.l + 0.5, pad.t + 0.5, w - pad.l - pad.r - 1, h - pad.t - pad.b - 1);
    if (opts.xlabel) {
      ctx.textAlign = "center";
      ctx.font = T.font(12, 600);
      ctx.fillText(opts.xlabel, pad.l + (w - pad.l - pad.r) / 2, h - 6);
    }
    if (opts.ylabel) {
      ctx.save();
      ctx.translate(12, pad.t + (h - pad.t - pad.b) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.font = T.font(12, 600);
      ctx.fillText(opts.ylabel, 0, 0);
      ctx.restore();
    }
    const clip = () => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);
      ctx.clip();
    };
    const unclip = () => ctx.restore();
    return { sx, sy, ix, iy, pad, clip, unclip, T, ctx, w, h };
  };

  /* ---------- drawing primitives ---------- */
  VIZ.line = function (ctx, pts, color, width = 2, dash) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    let pen = false;
    pts.forEach(([x, y]) => {
      if (!isFinite(x) || !isFinite(y)) { pen = false; return; }
      pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      pen = true;
    });
    ctx.stroke();
    ctx.setLineDash([]);
  };

  // shape: "circle" (filled), "ring" (hollow), "square", "triangle"
  VIZ.dot = function (ctx, x, y, color, r = 4, shape = "circle") {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.75;
    ctx.beginPath();
    if (shape === "square") { ctx.rect(x - r, y - r, 2 * r, 2 * r); ctx.fill(); return; }
    if (shape === "triangle") {
      ctx.moveTo(x, y - r * 1.2); ctx.lineTo(x + r * 1.1, y + r * 0.8); ctx.lineTo(x - r * 1.1, y + r * 0.8);
      ctx.closePath(); ctx.fill(); return;
    }
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    shape === "ring" ? ctx.stroke() : ctx.fill();
  };

  /* ---------- random numbers (seeded, reproducible) ---------- */
  VIZ.rng = function (seed = 1) {
    let a = seed >>> 0;
    const u = () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    u.normal = () => {
      let s = 0, v = 0;
      while (s === 0) s = u();
      while (v === 0) v = u();
      return Math.sqrt(-2 * Math.log(s)) * Math.cos(2 * Math.PI * v);
    };
    return u;
  };

  /* ---------- linear algebra ---------- */
  // Least squares min ||A x - b||² via Householder QR (A: array of rows, m ≥ n).
  VIZ.lstsq = function (A, b) {
    const m = A.length, n = A[0].length;
    const R = A.map((r) => r.slice());
    const y = b.slice();
    for (let k = 0; k < n; k++) {
      let norm = 0;
      for (let i = k; i < m; i++) norm += R[i][k] ** 2;
      norm = Math.sqrt(norm);
      if (norm === 0) continue;
      const alpha = R[k][k] > 0 ? -norm : norm;
      const v = new Array(m).fill(0);
      for (let i = k; i < m; i++) v[i] = R[i][k];
      v[k] -= alpha;
      let vv = 0;
      for (let i = k; i < m; i++) vv += v[i] ** 2;
      if (vv === 0) continue;
      for (let j = k; j < n; j++) {
        let s = 0;
        for (let i = k; i < m; i++) s += v[i] * R[i][j];
        s = (2 * s) / vv;
        for (let i = k; i < m; i++) R[i][j] -= s * v[i];
      }
      let s = 0;
      for (let i = k; i < m; i++) s += v[i] * y[i];
      s = (2 * s) / vv;
      for (let i = k; i < m; i++) y[i] -= s * v[i];
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let s = y[i];
      for (let j = i + 1; j < n; j++) s -= R[i][j] * x[j];
      x[i] = Math.abs(R[i][i]) > 1e-12 ? s / R[i][i] : 0;
    }
    return x;
  };

  // Ridge regression: min (1/n)||y − Φθ||² + λ Σ_{j ≥ from} θ_j²  (intercept θ_0 unpenalised by default)
  VIZ.ridge = function (Phi, y, lam, from = 1) {
    const n = Phi.length, k = Phi[0].length;
    if (!(lam > 0)) return VIZ.lstsq(Phi, y);
    const A = Phi.map((r) => r.slice()), b = y.slice();
    const s = Math.sqrt(n * lam);
    for (let j = from; j < k; j++) {
      const row = new Array(k).fill(0);
      row[j] = s;
      A.push(row);
      b.push(0);
    }
    return VIZ.lstsq(A, b);
  };

  VIZ.dotp = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

  // Legendre polynomials P_0..P_d at t ∈ [-1, 1] (well-conditioned polynomial basis).
  VIZ.legendre = function (t, d) {
    const P = [1];
    if (d >= 1) P.push(t);
    for (let k = 1; k < d; k++) P.push(((2 * k + 1) * t * P[k] - k * P[k - 1]) / (k + 1));
    return P;
  };

  /* ---------- contour lines (marching squares) ----------
     F: frame from VIZ.frame; fn(x, y) → value; levels: array; N: grid size */
  VIZ.contour = function (F, fn, levels, color, N = 70, width = 1) {
    const { ctx, ix, iy, pad, w, h } = F;
    const X0 = ix(pad.l), X1 = ix(w - pad.r), Y0 = iy(h - pad.b), Y1 = iy(pad.t);
    const xs = [], ys = [], v = [];
    for (let i = 0; i <= N; i++) xs.push(X0 + ((X1 - X0) * i) / N);
    for (let j = 0; j <= N; j++) ys.push(Y0 + ((Y1 - Y0) * j) / N);
    for (let i = 0; i <= N; i++) { v.push([]); for (let j = 0; j <= N; j++) v[i].push(fn(xs[i], ys[j])); }
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    levels.forEach((L) => {
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const c = [[xs[i], ys[j], v[i][j]], [xs[i + 1], ys[j], v[i + 1][j]],
                   [xs[i + 1], ys[j + 1], v[i + 1][j + 1]], [xs[i], ys[j + 1], v[i][j + 1]]];
        const pts = [];
        for (let e = 0; e < 4; e++) {
          const p = c[e], q = c[(e + 1) % 4];
          if ((p[2] - L) * (q[2] - L) < 0) {
            const t = (L - p[2]) / (q[2] - p[2]);
            pts.push([F.sx(p[0] + t * (q[0] - p[0])), F.sy(p[1] + t * (q[1] - p[1]))]);
          }
        }
        for (let k = 0; k + 1 < pts.length; k += 2) {
          ctx.moveTo(pts[k][0], pts[k][1]); ctx.lineTo(pts[k + 1][0], pts[k + 1][1]);
        }
      }
    });
    ctx.stroke();
  };

  /* ---------- datasets ---------- */
  // Simulated houses shaped like the Ames data of Lab 1:
  // area in 1000 sq ft, price in $100k; price ≈ 0.2 + 1.0·area + noise.
  VIZ.houses = function (n = 40, seed = 2024) {
    const r = VIZ.rng(seed);
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = 0.8 + 2 * r();
      out.push([a, 0.2 + 1.0 * a + 0.3 * r.normal()]);
    }
    return out;
  };

  // Two standardised "tumour" features (think: mean radius, mean texture), label 1 = malignant.
  // separable = true moves the classes apart so that a line separates them perfectly.
  VIZ.tumours = function (n = 60, seed = 11, separable = false) {
    const r = VIZ.rng(seed);
    const d = separable ? 1.6 : 0.9;
    const out = [];
    for (let i = 0; i < n; i++) {
      const y = i % 2;
      const s = y ? 1 : -1;
      let a = s * d + 0.75 * r.normal(), b = s * d * 0.6 + 0.75 * r.normal();
      if (separable && s * (a + 0.6 * b) < 0.5) { a += s * 1.2; b += s * 0.7; }
      out.push([a, b, y]);
    }
    return out;
  };

  VIZ.sigmoid = (z) => (z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)));

  // Ordinary least squares for y ≈ θ0 + θ1 x  → [θ0, θ1]
  VIZ.ols1 = function (data) {
    const n = data.length;
    let mx = 0, my = 0;
    data.forEach(([x, y]) => { mx += x / n; my += y / n; });
    let sxy = 0, sxx = 0;
    data.forEach(([x, y]) => { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; });
    const b = sxy / sxx;
    return [my - b * mx, b];
  };

  /* ---------- symmetric eigen-decomposition (cyclic Jacobi) ----------
     A: symmetric p×p (array of rows). Returns { values, vectors } with values in
     decreasing order and vectors[j] the unit eigenvector for values[j]. */
  VIZ.eigSym = function (A, sweeps = 60) {
    const p = A.length;
    const a = A.map((r) => r.slice());
    const v = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => (i === j ? 1 : 0)));
    for (let s = 0; s < sweeps; s++) {
      let off = 0;
      for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) off += a[i][j] * a[i][j];
      if (off < 1e-20) break;
      for (let i = 0; i < p; i++) {
        for (let j = i + 1; j < p; j++) {
          if (Math.abs(a[i][j]) < 1e-14) continue;
          const th = (a[j][j] - a[i][i]) / (2 * a[i][j]);
          const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
          const c = 1 / Math.sqrt(t * t + 1), sn = t * c;
          for (let k = 0; k < p; k++) { // columns i, j
            const x = a[k][i], y = a[k][j];
            a[k][i] = c * x - sn * y; a[k][j] = sn * x + c * y;
          }
          for (let k = 0; k < p; k++) { // rows i, j
            const x = a[i][k], y = a[j][k];
            a[i][k] = c * x - sn * y; a[j][k] = sn * x + c * y;
          }
          for (let k = 0; k < p; k++) {
            const x = v[k][i], y = v[k][j];
            v[k][i] = c * x - sn * y; v[k][j] = sn * x + c * y;
          }
        }
      }
    }
    const order = Array.from({ length: p }, (_, i) => i).sort((i, j) => a[j][j] - a[i][i]);
    return {
      values: order.map((i) => Math.max(a[i][i], 0)),
      vectors: order.map((i) => v.map((row) => row[i])),
    };
  };

  /* ---------- axis helpers ---------- */
  // "nice" tick values covering [lo, hi], about n of them
  VIZ.ticks = function (lo, hi, n = 5) {
    const raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  };
  // x/y limits with equal scale on both axes, containing all points (rows [x, y, …])
  VIZ.equalLims = function (c, pad, pts, margin = 0.08) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const hx = ((x1 - x0) / 2) * (1 + 2 * margin) + 1e-6, hy = ((y1 - y0) / 2) * (1 + 2 * margin) + 1e-6;
    const W = c.w - pad.l - pad.r, H = c.h - pad.t - pad.b, k = Math.min(W / (2 * hx), H / (2 * hy));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    return { xlim: [cx - W / (2 * k), cx + W / (2 * k)], ylim: [cy - H / (2 * k), cy + H / (2 * k)] };
  };

  /* ---------- clustering data and k-means helpers ---------- */
  VIZ.SHAPES = ["circle", "triangle", "square", "ring", "triangle", "circle"];

  // Gaussian blobs: centres [[x, y], …], sds [[sx, sy], …], sizes [n, …] → rows [x, y, label]
  VIZ.blobs = function (centres, sds, sizes, seed = 7) {
    const r = VIZ.rng(seed), out = [];
    centres.forEach(([cx, cy], k) => {
      for (let i = 0; i < sizes[k]; i++) out.push([cx + sds[k][0] * r.normal(), cy + sds[k][1] * r.normal(), k]);
    });
    return out;
  };

  // scikit-learn style "two moons": rows [x, y, label]
  VIZ.moons = function (n = 120, noise = 0.08, seed = 3) {
    const r = VIZ.rng(seed), out = [], h = Math.floor(n / 2);
    for (let i = 0; i < n; i++) {
      const lab = i < h ? 0 : 1, t = Math.PI * ((i % h) / (h - 1));
      const x = lab ? 1 - Math.cos(t) : Math.cos(t), y = lab ? 0.5 - Math.sin(t) : Math.sin(t);
      out.push([x + noise * r.normal(), y + noise * r.normal(), lab]);
    }
    return out;
  };

  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  VIZ.KM = {
    d2,
    // index of the nearest centre
    nearest: (x, mus) => { let best = 0, bd = Infinity; mus.forEach((m, k) => { const d = d2(x, m); if (d < bd) { bd = d; best = k; } }); return best; },
    assign: (X, mus) => X.map((x) => VIZ.KM.nearest(x, mus)),
    // centroid update; an empty cluster keeps its old centre
    update: (X, lab, mus) => mus.map((m, k) => {
      let sx = 0, sy = 0, c = 0;
      X.forEach((x, i) => { if (lab[i] === k) { sx += x[0]; sy += x[1]; c++; } });
      return c ? [sx / c, sy / c] : m.slice();
    }),
    wcss: (X, lab, mus) => X.reduce((s, x, i) => s + d2(x, mus[lab[i]]), 0),
    initRandom: (X, K, r) => {
      const idx = []; while (idx.length < K) { const i = Math.floor(r() * X.length); if (!idx.includes(i)) idx.push(i); }
      return idx.map((i) => X[i].slice(0, 2));
    },
    // k-means++: next centre drawn with probability ∝ squared distance to the nearest chosen centre
    initPlusPlus: (X, K, r) => {
      const mus = [X[Math.floor(r() * X.length)].slice(0, 2)];
      while (mus.length < K) {
        const w = X.map((x) => Math.min(...mus.map((m) => d2(x, m))));
        let u = r() * w.reduce((a, b) => a + b, 0), i = 0;
        while (i < X.length - 1 && u > w[i]) { u -= w[i]; i++; }
        mus.push(X[i].slice(0, 2));
      }
      return mus;
    },
    // full Lloyd run from given centres → { lab, mus, J, iters }
    run: (X, mus, maxIt = 100) => {
      let lab = VIZ.KM.assign(X, mus), it = 0;
      for (; it < maxIt; it++) {
        mus = VIZ.KM.update(X, lab, mus);
        const nl = VIZ.KM.assign(X, mus);
        if (nl.every((v, i) => v === lab[i])) { lab = nl; break; }
        lab = nl;
      }
      return { lab, mus, J: VIZ.KM.wcss(X, lab, mus), iters: it + 1 };
    },
    // best of several k-means++ restarts
    best: (X, K, restarts, r) => {
      let best = null;
      for (let s = 0; s < restarts; s++) { const res = VIZ.KM.run(X, VIZ.KM.initPlusPlus(X, K, r)); if (!best || res.J < best.J) best = res; }
      return best;
    },
    // mean silhouette (Euclidean distances)
    silhouette: (X, lab, K) => {
      const n = X.length; let tot = 0;
      for (let i = 0; i < n; i++) {
        const sum = new Array(K).fill(0), cnt = new Array(K).fill(0);
        for (let j = 0; j < n; j++) if (j !== i) { sum[lab[j]] += Math.sqrt(d2(X[i], X[j])); cnt[lab[j]]++; }
        const own = lab[i];
        if (!cnt[own]) continue; // singleton: s = 0
        const a = sum[own] / cnt[own];
        let b = Infinity; for (let k = 0; k < K; k++) if (k !== own && cnt[k]) b = Math.min(b, sum[k] / cnt[k]);
        if (isFinite(b)) tot += (b - a) / Math.max(a, b);
      }
      return tot / n;
    },
  };

  /* ---------- mounting & redraw ---------- */
  VIZ.mountAll = function (name, mount) {
    document.querySelectorAll(`[data-viz="${name}"]`).forEach((fig, i) => mount(fig, `${name}-${i + 1}`));
  };

  // Call draw() now and whenever the theme or the canvas size changes.
  VIZ.onRedraw = function (canvases, draw) {
    document.addEventListener("themechange", draw);
    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(() => draw());
      [].concat(canvases).forEach((c) => ro.observe(c));
    } else {
      window.addEventListener("resize", draw);
    }
  };

  VIZ.WARN_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18v.01"/></svg>';

  window.VIZ = VIZ;
})();
