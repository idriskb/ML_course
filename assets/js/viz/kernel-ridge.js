/* ==========================================================================
   Interactive: kernel ridge regression in one dimension.
   Fuel consumption against speed (speed standardised inside the model).
   ŷ(x) = Σ α_i k(x_i, x), α = (K + λI)^{-1} y (on centred outputs).
   Left: data, fit, optionally the weighted kernel functions α_i k(x_i, ·).
   Right: training and test MSE against λ for the current kernel.
   Requires common.js and kernel-lib.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ, Kn = V.Kern;
  const XL = [15, 135], MU = 75, SD = 32, N = 40;
  const f = (s) => 4 + 0.0008 * (s - 70) ** 2 + 25 / s;
  const sample = (n, seed) => { const r = V.rng(seed); return Array.from({ length: n }, () => { const s = 20 + 110 * r(); return [s, f(s) + 0.5 * r.normal()]; }); };
  const LGRID = Array.from({ length: 61 }, (_, i) => -5 + i * 0.1); // log10 λ from -5 to 1

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-k">Kernel</label>
          <select id="${id}-k">
            <option value="rbf">Gaussian (RBF)</option>
            <option value="poly2">Polynomial, degree 2</option>
            <option value="poly5">Polynomial, degree 5</option>
            <option value="linear">Linear</option>
          </select>
        </div>
        <div class="control">
          <label for="${id}-s">RBF width σ (km/h) <output id="${id}-s-out" for="${id}-s"></output></label>
          <input type="range" id="${id}-s" min="0.3" max="2" step="0.02" value="1.2">
        </div>
        <div class="control">
          <label for="${id}-l">Regularisation λ <output id="${id}-l-out" for="${id}-l"></output></label>
          <input type="range" id="${id}-l" min="-5" max="1" step="0.1" value="-1">
        </div>
        <div class="control control--check">
          <label><input type="checkbox" id="${id}-bumps"> <span>Show the weighted kernels α<sub>i</sub> k(x<sub>i</sub>, ·)</span></label>
        </div>
      </div>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">Kernel ridge fit</p>
          <canvas class="viz__canvas" data-c="fit" role="img"
            aria-label="Fuel consumption against speed with the kernel ridge regression fit, and optionally the weighted kernel functions centred at each training point whose sum is the fit."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">Mean squared error against λ</p>
          <canvas class="viz__canvas" data-c="err" role="img"
            aria-label="Training and test mean squared error as a function of the regularisation parameter lambda on a logarithmic axis. Training error increases with lambda; test error is U-shaped."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-curve)">Training data / training MSE</span>
        <span style="--swatch: var(--viz-path)">Fit / test MSE</span>
        <span style="--swatch: var(--viz-axis)">Weighted kernels (thin)</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cF = stage.querySelector('[data-c="fit"]');
    const cE = stage.querySelector('[data-c="err"]');
    const kSel = stage.querySelector(`#${id}-k`);
    const sIn = stage.querySelector(`#${id}-s`);
    const lIn = stage.querySelector(`#${id}-l`);
    const bBox = stage.querySelector(`#${id}-bumps`);
    const readout = stage.querySelector(".viz__readout");
    const train = sample(N, 8), test = sample(300, 99);
    const z = (s) => [(s - MU) / SD];
    const ybar = train.reduce((s, p) => s + p[1], 0) / N;
    const yc = train.map((p) => p[1] - ybar);
    let kfun, eig, curves;

    const sigmaKm = () => Math.pow(10, +sIn.value);
    function kernel() {
      const v = kSel.value;
      if (v === "rbf") return Kn.make("rbf", { sigma: sigmaKm() / SD });
      if (v === "linear") return Kn.make("linear");
      return Kn.make("poly", { degree: v === "poly2" ? 2 : 5 });
    }
    // α = U diag(1/(μ+λ)) Uᵀ y
    function alpha(lam) {
      const c = eig.vectors.map((u, j) => V.dotp(u, yc) / (eig.values[j] + lam));
      return train.map((_, i) => eig.vectors.reduce((s, u, j) => s + u[i] * c[j], 0));
    }
    const predict = (a, s) => { const q = z(s); return ybar + train.reduce((acc, p, i) => acc + a[i] * kfun(z(p[0]), q), 0); };

    function prepare() {
      const isRbf = kSel.value === "rbf";
      sIn.disabled = !isRbf;
      stage.querySelector(`#${id}-s-out`).textContent = isRbf ? sigmaKm().toFixed(1) : "—";
      kfun = kernel();
      const K = Kn.matrix(kfun, train.map((p) => z(p[0])), train.map((p) => z(p[0])));
      eig = V.eigSym(K);
      curves = LGRID.map((L) => {
        const a = alpha(Math.pow(10, L));
        const mse = (set) => set.reduce((s, p) => s + (p[1] - predict(a, p[0])) ** 2, 0) / set.length;
        return { tr: mse(train), te: mse(test) };
      });
      update();
    }

    function update() {
      const lam = Math.pow(10, +lIn.value);
      stage.querySelector(`#${id}-l-out`).textContent = lam < 0.01 ? lam.toExponential(0) : lam.toPrecision(2);
      const i = Math.round((+lIn.value + 5) / 0.1);
      const df = eig.values.reduce((s, m) => s + m / (m + lam), 0);
      let best = 0; curves.forEach((c, j) => { if (c.te < curves[best].te) best = j; });
      readout.innerHTML = `<span>training MSE <b>${curves[i].tr.toFixed(3)}</b></span>
        <span>test MSE <b>${curves[i].te.toFixed(3)}</b></span>
        <span>effective number of parameters <b>${df.toFixed(1)}</b> (of ${N})</span>
        <span>best λ for this kernel: <b>${Math.pow(10, LGRID[best]).toExponential(0)}</b> (test MSE ${curves[best].te.toFixed(3)})</span>`;
      draw();
    }

    function drawFit() {
      const c = V.canvas(cF);
      if (!c) return;
      const a = alpha(Math.pow(10, +lIn.value));
      const F = V.frame(c, { xlim: XL, ylim: [1, 9], xticks: [20, 40, 60, 80, 100, 120], yticks: [2, 4, 6, 8],
        xlabel: "speed (km/h)", ylabel: "L / 100 km", pad: { l: 44 } });
      const { ctx, sx, sy, T } = F;
      F.clip();
      const xs = Array.from({ length: 361 }, (_, i) => XL[0] + ((XL[1] - XL[0]) * i) / 360);
      if (bBox.checked) {
        train.forEach((p, i) => {
          const q = z(p[0]);
          V.line(ctx, xs.map((s) => [sx(s), sy(2 + a[i] * kfun(q, z(s)))]), T.axis, 1);
        });
        V.line(ctx, [[sx(XL[0]), sy(2)], [sx(XL[1]), sy(2)]], T.axis, 1, [2, 3]);
      }
      train.forEach(([x, y]) => { V.dot(ctx, sx(x), sy(y), T.bg, 5.5); V.dot(ctx, sx(x), sy(y), T.curve, 4); });
      V.line(ctx, xs.map((s) => [sx(s), sy(predict(a, s))]), T.path, 2.5);
      F.unclip();
    }

    function drawErr() {
      const c = V.canvas(cE);
      if (!c) return;
      const top = 1.2;
      const F = V.frame(c, { xlim: [-5, 1], ylim: [0, top], xticks: [-5, -4, -3, -2, -1, 0, 1], yticks: [0, 0.25, 0.5, 0.75, 1],
        fmtX: (v) => `1e${v}`, xlabel: "λ (log scale)   ← more flexible | smoother →", ylabel: "MSE", pad: { l: 44 } });
      const { ctx, sx, sy, T } = F;
      F.clip();
      V.line(ctx, [[sx(-5), sy(0.25)], [sx(1), sy(0.25)]], T.axis, 1, [2, 4]);
      V.line(ctx, curves.map((v, j) => [sx(LGRID[j]), sy(Math.min(top, v.tr))]), T.curve, 2.5);
      V.line(ctx, curves.map((v, j) => [sx(LGRID[j]), sy(Math.min(top, v.te))]), T.path, 2.5);
      const L = +lIn.value;
      V.line(ctx, [[sx(L), sy(0)], [sx(L), sy(top)]], T.text, 1.5);
      F.unclip();
    }

    function draw() { drawFit(); drawErr(); }
    [kSel].forEach((e) => e.addEventListener("change", prepare));
    sIn.addEventListener("input", prepare);
    lIn.addEventListener("input", update);
    bBox.addEventListener("change", draw);
    V.onRedraw([cF, cE], draw);
    prepare();
  }

  V.mountAll("kernel-ridge", mount);
})();
