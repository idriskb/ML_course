/* ==========================================================================
   Interactive: gradient descent on a 1-D non-convex function
   Usage:  <figure class="viz" data-viz="gradient-descent">
             <div class="viz__stage"></div>
             <figcaption>…</figcaption>
           </figure>
   Pattern for new visualizations: one file per viz, mount on [data-viz=…],
   read colours from CSS variables, redraw on "themechange" and resize.
   ========================================================================== */
(function () {
  "use strict";

  const f = (x) => x ** 4 / 4 - x ** 2 + 0.3 * x;
  const df = (x) => x ** 3 - 2 * x + 0.3;
  const X = [-2.5, 2.5];
  const Y = [-1.8, 4.6];
  const MAX_STEPS = 60;

  const WARN_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18v.01"/></svg>';

  let instance = 0;

  function mount(fig) {
    const id = `gd-${++instance}`;
    const stage = fig.querySelector(".viz__stage") || fig;

    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-lr">Learning rate η <output id="${id}-lr-out" for="${id}-lr"></output></label>
          <input type="range" id="${id}-lr" min="0.01" max="1.2" step="0.01" value="0.10">
        </div>
        <div class="control">
          <label for="${id}-x0">Starting point x₀ <output id="${id}-x0-out" for="${id}-x0"></output></label>
          <input type="range" id="${id}-x0" min="-2.4" max="2.4" step="0.05" value="2.2">
        </div>
        <div class="viz__buttons">
          <button type="button" class="btn btn--primary" data-act="step">Step</button>
          <button type="button" class="btn" data-act="run">Run</button>
          <button type="button" class="btn" data-act="reset">Reset</button>
        </div>
      </div>
      <canvas class="viz__canvas" role="img"
        aria-label="Plot of the loss f(x) = x⁴/4 − x² + 0.3x on the interval from −2.5 to 2.5, with the gradient-descent iterates drawn as connected dots on the curve."></canvas>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-curve)">Loss f(x)</span>
        <span style="--swatch: var(--viz-path)">Iterates x₀, x₁, …</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const canvas = stage.querySelector("canvas");
    const lr = stage.querySelector(`#${id}-lr`);
    const x0 = stage.querySelector(`#${id}-x0`);
    const lrOut = stage.querySelector(`#${id}-lr-out`);
    const x0Out = stage.querySelector(`#${id}-x0-out`);
    const readout = stage.querySelector(".viz__readout");
    const runBtn = stage.querySelector('[data-act="run"]');
    const stepBtn = stage.querySelector('[data-act="step"]');

    let path = [];
    let timer = null;
    let diverged = false;

    function reset() {
      stop();
      path = [parseFloat(x0.value)];
      diverged = false;
      lrOut.textContent = parseFloat(lr.value).toFixed(2);
      x0Out.textContent = parseFloat(x0.value).toFixed(2);
      update();
    }

    function step() {
      if (diverged || path.length > MAX_STEPS) return false;
      const x = path[path.length - 1];
      const next = x - parseFloat(lr.value) * df(x);
      path.push(next);
      if (!isFinite(next) || Math.abs(next) > 6) diverged = true;
      update();
      return !diverged && path.length <= MAX_STEPS;
    }

    function run() {
      if (timer) { stop(); return; }
      runBtn.textContent = "Pause";
      timer = setInterval(() => { if (!step()) stop(); }, 220);
    }
    function stop() {
      clearInterval(timer);
      timer = null;
      runBtn.textContent = "Run";
    }

    function update() {
      const k = path.length - 1;
      const x = path[k];
      stepBtn.disabled = diverged || k >= MAX_STEPS;
      if (diverged) {
        readout.innerHTML = `<span class="viz__status">${WARN_ICON} Diverged after ${k} steps</span>
          <span>The step size is too large for this curvature — try a smaller η.</span>`;
      } else {
        readout.innerHTML = `<span>step k = <b>${k}</b></span>
          <span>x<sub>k</sub> = <b>${x.toFixed(4)}</b></span>
          <span>f(x<sub>k</sub>) = <b>${f(x).toFixed(4)}</b></span>
          <span>|f′(x<sub>k</sub>)| = <b>${Math.abs(df(x)).toExponential(2)}</b></span>`;
      }
      draw();
    }

    function draw() {
      const css = getComputedStyle(document.documentElement);
      const col = (name) => css.getPropertyValue(name).trim();
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const pad = { l: 36, r: 12, t: 12, b: 26 };
      const sx = (x) => pad.l + ((x - X[0]) / (X[1] - X[0])) * (w - pad.l - pad.r);
      const sy = (y) => pad.t + ((Y[1] - y) / (Y[1] - Y[0])) * (h - pad.t - pad.b);
      const font = `500 12px ${css.getPropertyValue("--font-ui") || "sans-serif"}`;

      // grid + axes
      ctx.lineWidth = 1;
      ctx.font = font;
      ctx.fillStyle = col("--viz-text");
      ctx.textAlign = "center";
      for (let gx = -2; gx <= 2; gx++) {
        ctx.strokeStyle = col("--viz-grid");
        ctx.beginPath(); ctx.moveTo(sx(gx), pad.t); ctx.lineTo(sx(gx), h - pad.b); ctx.stroke();
        ctx.fillText(String(gx), sx(gx), h - 8);
      }
      ctx.textAlign = "right";
      for (let gy = -1; gy <= 4; gy++) {
        ctx.strokeStyle = col("--viz-grid");
        ctx.beginPath(); ctx.moveTo(pad.l, sy(gy)); ctx.lineTo(w - pad.r, sy(gy)); ctx.stroke();
        ctx.fillText(String(gy), pad.l - 8, sy(gy) + 4);
      }
      ctx.strokeStyle = col("--viz-axis");
      ctx.beginPath(); ctx.moveTo(pad.l, sy(0)); ctx.lineTo(w - pad.r, sy(0)); ctx.stroke();

      // curve
      ctx.save();
      ctx.beginPath();
      ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);
      ctx.clip();
      ctx.strokeStyle = col("--viz-curve");
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i <= 400; i++) {
        const x = X[0] + (i / 400) * (X[1] - X[0]);
        i ? ctx.lineTo(sx(x), sy(f(x))) : ctx.moveTo(sx(x), sy(f(x)));
      }
      ctx.stroke();

      // iterates
      const pts = path.filter(isFinite).map((x) => [sx(x), sy(f(x))]);
      ctx.strokeStyle = col("--viz-path");
      ctx.fillStyle = col("--viz-path");
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.stroke();
      pts.forEach(([px, py], i) => {
        const last = i === pts.length - 1;
        ctx.beginPath();
        ctx.arc(px, py, last ? 6 : 3.5, 0, 2 * Math.PI);
        if (last) { ctx.lineWidth = 2.5; ctx.stroke(); } else ctx.fill();
      });
      ctx.restore();
    }

    lr.addEventListener("input", reset);
    x0.addEventListener("input", reset);
    stepBtn.addEventListener("click", step);
    runBtn.addEventListener("click", run);
    stage.querySelector('[data-act="reset"]').addEventListener("click", reset);
    document.addEventListener("themechange", draw);
    if ("ResizeObserver" in window) new ResizeObserver(draw).observe(canvas);
    else window.addEventListener("resize", draw);

    reset();
  }

  document.querySelectorAll('[data-viz="gradient-descent"]').forEach(mount);
})();
