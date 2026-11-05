/* ==========================================================================
   Interactive: the best centre of one cluster is its mean.
   Drag the candidate centre μ (or use the arrow keys). Left: the points, μ,
   the mean x̄ and the squared distances. Right: the cost
   Σ‖xᵢ − μ‖² = Σ‖xᵢ − x̄‖² + n‖x̄ − μ‖² as a stacked bar.
   Requires common.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ;
  const LIM = [-3, 3];

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="viz__buttons viz__buttons--row">
          <button type="button" class="btn btn--primary" data-act="mean">Move μ to the mean</button>
          <button type="button" class="btn" data-act="away">Move μ away</button>
        </div>
      </div>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">Drag μ (or focus the plot and use the arrow keys)</p>
          <canvas class="viz__canvas" data-c="pts" role="img" tabindex="0"
            aria-label="Eight points of one cluster, a movable candidate centre mu joined to every point, and the mean of the points marked by a ring. Use the arrow keys to move mu."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">Cost of the centre μ</p>
          <canvas class="viz__canvas" data-c="bar" role="img"
            aria-label="A stacked bar: the part of the cost that does not depend on mu, and the extra part n times the squared distance between mu and the mean."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-curve)">Points / fixed part Σ‖x<sub>i</sub> − x̄‖²</span>
        <span style="--swatch: var(--viz-path)">Candidate centre μ / extra part n‖x̄ − μ‖²</span>
        <span style="--swatch: var(--viz-text)">Mean x̄ (ring)</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cP = stage.querySelector('[data-c="pts"]');
    const cB = stage.querySelector('[data-c="bar"]');
    const readout = stage.querySelector(".viz__readout");
    const X = V.blobs([[0.3, 0.2]], [[0.8, 0.7]], [8], 14).map(([x, y]) => [x, y]);
    const n = X.length;
    const mean = [X.reduce((s, x) => s + x[0], 0) / n, X.reduce((s, x) => s + x[1], 0) / n];
    const within = X.reduce((s, x) => s + V.KM.d2(x, mean), 0);
    let mu = [-2, 1.8], F = null, dragging = false;
    const clamp = (v) => Math.max(LIM[0], Math.min(LIM[1], v));

    function update() {
      const total = X.reduce((s, x) => s + V.KM.d2(x, mu), 0), extra = n * V.KM.d2(mean, mu);
      readout.innerHTML = `<span>μ = (<b>${mu[0].toFixed(2)}</b>, <b>${mu[1].toFixed(2)}</b>)</span>
        <span>Σ‖x<sub>i</sub> − μ‖² = <b>${total.toFixed(2)}</b></span>
        <span>= <b>${within.toFixed(2)}</b> + <b>${extra.toFixed(2)}</b></span>
        <span>${extra < 0.005 ? "<b>minimum reached: μ is the mean</b>" : "move μ towards the ring to shrink the extra part"}</span>`;
      draw();
    }

    function drawPts() {
      const c = V.canvas(cP);
      if (!c) return;
      const pad = { l: 36, r: 12, t: 12, b: 30 };
      const { xlim, ylim } = V.equalLims(c, pad, [[LIM[0], LIM[0]], [LIM[1], LIM[1]]], 0);
      F = V.frame(c, { xlim, ylim, xticks: V.ticks(xlim[0], xlim[1], 6), yticks: V.ticks(ylim[0], ylim[1], 5), pad });
      const { ctx, sx, sy, T } = F;
      F.clip();
      X.forEach((x) => V.line(ctx, [[sx(x[0]), sy(x[1])], [sx(mu[0]), sy(mu[1])]], T.path, 1.2, [4, 3]));
      X.forEach((x) => { V.dot(ctx, sx(x[0]), sy(x[1]), T.bg, 6.5); V.dot(ctx, sx(x[0]), sy(x[1]), T.curve, 5); });
      ctx.lineWidth = 2.5; V.dot(ctx, sx(mean[0]), sy(mean[1]), T.text, 9, "ring");
      ctx.font = T.font(12, 700); ctx.fillStyle = T.text; ctx.textAlign = "left";
      ctx.fillText("mean", sx(mean[0]) + 12, sy(mean[1]) + 16);
      V.dot(ctx, sx(mu[0]), sy(mu[1]), T.bg, 10);
      V.dot(ctx, sx(mu[0]), sy(mu[1]), T.path, 8, "square");
      ctx.fillStyle = T.path; ctx.fillText("μ", sx(mu[0]) + 11, sy(mu[1]) - 8);
      F.unclip();
    }

    function drawBar() {
      const c = V.canvas(cB);
      if (!c) return;
      const extra = n * V.KM.d2(mean, mu);
      const top = Math.max(4 * within, within + extra) * 1.1; // rescales while dragging
      const G = V.frame(c, { xlim: [0, 1], ylim: [0, top], xticks: [], yticks: V.ticks(0, top, 5), ylabel: "Σ‖xᵢ − μ‖²", pad: { l: 52, b: 26 } });
      const { ctx, sx, sy, T } = G;
      G.clip();
      const x0 = sx(0.1), w = sx(0.45) - x0;
      ctx.fillStyle = T.curve; ctx.fillRect(x0, sy(within), w, sy(0) - sy(within));
      ctx.globalAlpha = 0.85; ctx.fillStyle = T.path;
      ctx.fillRect(x0, sy(Math.min(top, within + extra)), w, sy(within) - sy(Math.min(top, within + extra)));
      ctx.globalAlpha = 1;
      ctx.font = T.font(12, 600); ctx.textAlign = "left"; ctx.fillStyle = T.text;
      ctx.fillText("fixed: Σ‖xᵢ − x̄‖²", sx(0.49), sy(within / 2) + 4);
      if (extra > top * 0.04) ctx.fillText("extra: n‖x̄ − μ‖²", sx(0.49), sy(within + Math.min(extra, top - within) / 2) + 4);
      G.unclip();
    }

    function draw() { drawPts(); drawBar(); }

    function setFromEvent(e) {
      if (!F) return;
      const r = cP.getBoundingClientRect();
      mu = [clamp(F.ix(e.clientX - r.left)), clamp(F.iy(e.clientY - r.top))];
      update();
    }
    cP.addEventListener("pointerdown", (e) => { dragging = true; cP.setPointerCapture(e.pointerId); setFromEvent(e); });
    cP.addEventListener("pointermove", (e) => { if (dragging) setFromEvent(e); });
    cP.addEventListener("pointerup", () => { dragging = false; });
    cP.style.touchAction = "none"; cP.style.cursor = "crosshair";
    cP.addEventListener("keydown", (e) => {
      const d = { ArrowLeft: [-0.1, 0], ArrowRight: [0.1, 0], ArrowUp: [0, 0.1], ArrowDown: [0, -0.1] }[e.key];
      if (!d) return;
      e.preventDefault(); mu = [clamp(mu[0] + d[0]), clamp(mu[1] + d[1])]; update();
    });
    stage.querySelector('[data-act="mean"]').addEventListener("click", () => { mu = mean.slice(); update(); });
    stage.querySelector('[data-act="away"]').addEventListener("click", () => { mu = [-2, 1.8]; update(); });
    V.onRedraw([cP, cB], draw);
    update();
  }

  V.mountAll("centroid-mean", mount);
})();
