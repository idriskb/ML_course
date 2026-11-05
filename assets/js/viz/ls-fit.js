/* ==========================================================================
   Interactive: fit a line by hand and compare with least squares.
   Sliders for intercept θ0 and slope θ1; residuals drawn as vertical segments.
   Usage: <figure class="viz" data-viz="ls-fit"><div class="viz__stage"></div>…</figure>
   Requires common.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ;

  function mount(fig, id) {
    const data = V.houses();
    const n = data.length;
    const best = V.ols1(data);
    const mse = (t0, t1) => data.reduce((s, [x, y]) => s + (y - t0 - t1 * x) ** 2, 0) / n;
    const bestMse = mse(best[0], best[1]);

    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-a">Intercept θ<sub>0</sub> <output id="${id}-a-out" for="${id}-a"></output></label>
          <input type="range" id="${id}-a" min="-2" max="2.5" step="0.01" value="1.5">
        </div>
        <div class="control">
          <label for="${id}-b">Slope θ<sub>1</sub> <output id="${id}-b-out" for="${id}-b"></output></label>
          <input type="range" id="${id}-b" min="-0.5" max="2.5" step="0.01" value="0.3">
        </div>
        <div class="viz__buttons">
          <button type="button" class="btn btn--primary" data-act="snap">Show least squares</button>
        </div>
      </div>
      <canvas class="viz__canvas" role="img"
        aria-label="Scatter plot of ${n} simulated houses, price against living area, with the line chosen by the sliders and its vertical residuals."></canvas>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-text)">Houses</span>
        <span style="--swatch: var(--viz-path)">Your line and residuals</span>
        <span style="--swatch: var(--viz-curve)">Least-squares line (after you press the button)</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const canvas = stage.querySelector("canvas");
    const a = stage.querySelector(`#${id}-a`), b = stage.querySelector(`#${id}-b`);
    const aOut = stage.querySelector(`#${id}-a-out`), bOut = stage.querySelector(`#${id}-b-out`);
    const readout = stage.querySelector(".viz__readout");
    let showBest = false;

    function update() {
      const t0 = +a.value, t1 = +b.value;
      aOut.textContent = t0.toFixed(2);
      bOut.textContent = t1.toFixed(2);
      const m = mse(t0, t1);
      readout.innerHTML = `<span>your MSE: <b>${m.toFixed(4)}</b></span>
        <span>least-squares MSE: <b>${showBest ? bestMse.toFixed(4) : "?"}</b></span>
        ${showBest ? `<span>θ̂ = (<b>${best[0].toFixed(3)}</b>, <b>${best[1].toFixed(3)}</b>)</span>` : ""}
        <span>ratio: <b>${showBest ? (m / bestMse).toFixed(2) + "×" : "—"}</b></span>`;
      draw();
    }

    function draw() {
      const c = V.canvas(canvas);
      if (!c) return;
      const F = V.frame(c, {
        xlim: [0.6, 3], ylim: [0, 4], xticks: [1, 1.5, 2, 2.5, 3], yticks: [0, 1, 2, 3, 4],
        xlabel: "living area (1000 sq ft)", ylabel: "price ($100k)", pad: { l: 44 },
      });
      const { ctx, sx, sy, T } = F;
      const t0 = +a.value, t1 = +b.value;
      F.clip();
      data.forEach(([x, y]) => {
        ctx.strokeStyle = T.path; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(sx(x), sy(y)); ctx.lineTo(sx(x), sy(t0 + t1 * x)); ctx.stroke();
        ctx.globalAlpha = 1;
      });
      if (showBest) V.line(ctx, [[sx(0.6), sy(best[0] + best[1] * 0.6)], [sx(3), sy(best[0] + best[1] * 3)]], T.curve, 2.5, [7, 5]);
      V.line(ctx, [[sx(0.6), sy(t0 + t1 * 0.6)], [sx(3), sy(t0 + t1 * 3)]], T.path, 2.5);
      data.forEach(([x, y]) => V.dot(ctx, sx(x), sy(y), T.text, 3.5));
      F.unclip();
    }

    a.addEventListener("input", update);
    b.addEventListener("input", update);
    stage.querySelector('[data-act="snap"]').addEventListener("click", () => {
      showBest = true;
      a.value = best[0]; b.value = best[1];
      update();
    });
    V.onRedraw(canvas, draw);
    update();
  }

  V.mountAll("ls-fit", mount);
})();
