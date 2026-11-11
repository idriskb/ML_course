/* ==========================================================================
   Interactive: activation functions and their derivatives.
   Left: σ(z). Right: σ′(z) on a common scale, with a marker at the chosen z.
   The readout reports σ(z), σ′(z) and the product of ten such derivatives,
   the factor that appears in a chain of ten layers (vanishing gradients).
   Requires common.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ;
  const ZL = [-6, 6];

  const ACT = {
    sigmoid: { name: "sigmoid", f: (z) => V.sigmoid(z), d: (z) => V.sigmoid(z) * (1 - V.sigmoid(z)), ylim: [-0.25, 1.25], yt: [0, 0.5, 1] },
    tanh: { name: "tanh", f: Math.tanh, d: (z) => 1 - Math.tanh(z) ** 2, ylim: [-1.25, 1.25], yt: [-1, 0, 1] },
    relu: { name: "ReLU", f: (z) => Math.max(0, z), d: (z) => (z > 0 ? 1 : 0), ylim: [-1.5, 6], yt: [0, 2, 4, 6] },
    leaky: { name: "leaky ReLU", f: (z, a) => (z >= 0 ? z : a * z), d: (z, a) => (z >= 0 ? 1 : a), ylim: [-1.5, 6], yt: [0, 2, 4, 6] },
    linear: { name: "identity", f: (z) => z, d: () => 1, ylim: [-6, 6], yt: [-4, 0, 4] },
  };

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-a">Activation</label>
          <select id="${id}-a">
            <option value="sigmoid">Sigmoid</option>
            <option value="tanh">Tanh</option>
            <option value="relu">ReLU</option>
            <option value="leaky">Leaky ReLU</option>
            <option value="linear">Identity (linear)</option>
          </select>
        </div>
        <div class="control">
          <label for="${id}-z">Pre-activation z <output id="${id}-z-out" for="${id}-z"></output></label>
          <input type="range" id="${id}-z" min="-6" max="6" step="0.05" value="2.5">
        </div>
        <div class="control">
          <label for="${id}-al">Leaky slope α <output id="${id}-al-out" for="${id}-al"></output></label>
          <input type="range" id="${id}-al" min="0.01" max="0.3" step="0.01" value="0.1">
        </div>
      </div>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">Activation σ(z)</p>
          <canvas class="viz__canvas" data-c="f" role="img"
            aria-label="Graph of the chosen activation function for z from minus 6 to 6, with a marker at the chosen pre-activation."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">Derivative σ′(z), same scale for every activation</p>
          <canvas class="viz__canvas" data-c="d" role="img"
            aria-label="Graph of the derivative of the chosen activation function, with a marker at the chosen pre-activation. Sigmoid derivatives never exceed one quarter; ReLU derivatives are zero or one."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-curve)">σ(z) / σ′(z)</span>
        <span style="--swatch: var(--viz-path)">Chosen z</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cF = stage.querySelector('[data-c="f"]');
    const cD = stage.querySelector('[data-c="d"]');
    const aSel = stage.querySelector(`#${id}-a`);
    const zIn = stage.querySelector(`#${id}-z`);
    const alIn = stage.querySelector(`#${id}-al`);
    const readout = stage.querySelector(".viz__readout");
    const zs = Array.from({ length: 481 }, (_, i) => ZL[0] + ((ZL[1] - ZL[0]) * i) / 480);

    const fmt = (v) => (v !== 0 && Math.abs(v) < 1e-3 ? v.toExponential(1) : v.toFixed(3));

    function update() {
      const A = ACT[aSel.value], al = +alIn.value, z = +zIn.value;
      alIn.disabled = aSel.value !== "leaky";
      stage.querySelector(`#${id}-z-out`).textContent = z.toFixed(2);
      stage.querySelector(`#${id}-al-out`).textContent = aSel.value === "leaky" ? al.toFixed(2) : "—";
      const d = A.d(z, al), maxd = Math.max(...zs.map((u) => A.d(u, al)));
      readout.innerHTML = `<span>σ(z) <b>${fmt(A.f(z, al))}</b></span>
        <span>σ′(z) <b>${fmt(d)}</b></span>
        <span>largest σ′ <b>${maxd.toFixed(2)}</b></span>
        <span>ten layers at this z: σ′(z)<sup>10</sup> = <b>${fmt(d ** 10)}</b></span>`;
      draw();
    }

    function panel(canvas, fn, ylim, yticks) {
      const c = V.canvas(canvas);
      if (!c) return;
      const F = V.frame(c, { xlim: ZL, ylim, xticks: [-6, -4, -2, 0, 2, 4, 6], yticks, xlabel: "z", pad: { l: 40 } });
      const { ctx, sx, sy, T } = F;
      F.clip();
      V.line(ctx, [[sx(ZL[0]), sy(0)], [sx(ZL[1]), sy(0)]], T.axis, 1);
      V.line(ctx, [[sx(0), sy(ylim[0])], [sx(0), sy(ylim[1])]], T.axis, 1);
      // draw piecewise: break the line at jumps (ReLU derivative)
      let prev = null, seg = [];
      zs.forEach((z) => {
        const v = fn(z);
        if (prev !== null && Math.abs(v - prev) > 0.3) { V.line(ctx, seg, T.curve, 2.5); seg = []; }
        seg.push([sx(z), sy(v)]); prev = v;
      });
      V.line(ctx, seg, T.curve, 2.5);
      const z = +zIn.value, v = fn(z);
      V.line(ctx, [[sx(z), sy(ylim[0])], [sx(z), sy(ylim[1])]], T.path, 1, [3, 3]);
      V.dot(ctx, sx(z), sy(v), T.bg, 7);
      V.dot(ctx, sx(z), sy(v), T.path, 5);
      F.unclip();
    }

    function draw() {
      const A = ACT[aSel.value], al = +alIn.value;
      panel(cF, (z) => A.f(z, al), A.ylim, A.yt);
      panel(cD, (z) => A.d(z, al), [-0.1, 1.15], [0, 0.25, 0.5, 0.75, 1]);
    }

    aSel.addEventListener("change", update);
    zIn.addEventListener("input", update);
    alIn.addEventListener("input", update);
    V.onRedraw([cF, cD], draw);
    update();
  }

  V.mountAll("nn-activations", mount);
})();
