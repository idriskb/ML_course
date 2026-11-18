/* ==========================================================================
   Interactive: one-dimensional codes for curved two-dimensional data.
   Left: PCA with k = 1 (a straight line; points projected onto it).
   Right: a 2–16–1–16–2 tanh autoencoder; the decoder traces a curve
   h(z) as the code z varies, and each point is reconstructed on that curve.
   Requires common.js and nn-lib.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ, NN = V.NN;
  const N = 120, MAX_STEPS = 3000, PER_FRAME = 30, LR = 0.01;

  function dataset(kind) {
    const r = V.rng(5), pts = [];
    for (let i = 0; i < N; i++) {
      if (kind === "arc") { const t = 1.5 * Math.PI * r(); pts.push([Math.cos(t) + 0.06 * r.normal(), Math.sin(t) + 0.06 * r.normal()]); }
      else { const x = -1.5 + 3 * r(); pts.push([x + 0.05 * r.normal(), 0.6 * Math.sin(2.5 * x) + 0.05 * r.normal()]); }
    }
    const m = [0, 1].map((j) => pts.reduce((s, p) => s + p[j], 0) / N);
    return pts.map((p) => [p[0] - m[0], p[1] - m[1]]);
  }

  function pca1(X) {
    const S = [[0, 0], [0, 0]];
    X.forEach(([a, b]) => { S[0][0] += a * a / N; S[0][1] += a * b / N; S[1][1] += b * b / N; });
    S[1][0] = S[0][1];
    const { values, vectors } = V.eigSym(S);
    const u = vectors[0];
    return { u, rec: X.map((x) => { const z = V.dotp(u, x); return [z * u[0], z * u[1]]; }), err: values[1] };
  }

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-d">Data</label>
          <select id="${id}-d">
            <option value="arc">Three-quarters of a circle</option>
            <option value="wave">A wave</option>
          </select>
        </div>
        <div class="control control--check">
          <label><input type="checkbox" id="${id}-r" checked> <span>Show each point's reconstruction error</span></label>
        </div>
        <div class="viz__buttons viz__buttons--row">
          <button type="button" class="btn btn--primary" data-act="train">Train</button>
          <button type="button" class="btn" data-act="reset">New initialisation</button>
        </div>
      </div>
      <div class="viz__grid2">
        <div>
          <p class="viz__panel-title">PCA, k = 1: the best line</p>
          <canvas class="viz__canvas" data-c="pca" role="img"
            aria-label="Curved data with the first principal direction drawn as a line and each point projected onto it."></canvas>
        </div>
        <div>
          <p class="viz__panel-title">Autoencoder, code of size 1: a learned curve</p>
          <canvas class="viz__canvas" data-c="ae" role="img"
            aria-label="The same data with the curve traced by the autoencoder's decoder and each point mapped to its reconstruction on that curve."></canvas>
        </div>
      </div>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-curve)">Data x<sub>i</sub></span>
        <span style="--swatch: var(--viz-path)">Line or curve of possible reconstructions</span>
        <span style="--swatch: var(--viz-axis)">Reconstruction errors x<sub>i</sub> − x̂<sub>i</sub></span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cP = stage.querySelector('[data-c="pca"]'), cA = stage.querySelector('[data-c="ae"]');
    const dSel = stage.querySelector(`#${id}-d`), rBox = stage.querySelector(`#${id}-r`);
    const trainBtn = stage.querySelector('[data-act="train"]'), readout = stage.querySelector(".viz__readout");
    let seed = 3, X, pca, net, opt, step, err, running = false, raf = 0;

    function init() {
      X = dataset(dSel.value); pca = pca1(X);
      net = NN.create([2, 16, 1, 16, 2], ["tanh", "id", "tanh", "id"], seed);
      opt = { loss: "mse", lr: LR }; step = 0; err = NN.loss(net, X, X, "mse");
    }

    function report() {
      readout.innerHTML = `<span>step <b>${step}</b> / ${MAX_STEPS}</span>
        <span>PCA error <b>${pca.err.toFixed(4)}</b></span>
        <span>autoencoder error <b>${err.toFixed(4)}</b></span>
        <span>(average of ‖x<sub>i</sub> − x̂<sub>i</sub>‖²)</span>`;
      trainBtn.textContent = running ? "Pause" : step >= MAX_STEPS ? "Trained" : step > 0 ? "Continue" : "Train";
      trainBtn.disabled = !running && step >= MAX_STEPS;
    }

    function frame() {
      for (let k = 0; k < PER_FRAME && step < MAX_STEPS; k++) { err = NN.step(net, X, X, opt); step++; }
      if (step >= MAX_STEPS) { running = false; err = NN.loss(net, X, X, "mse"); }
      report(); draw();
      if (running) raf = requestAnimationFrame(frame);
    }
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    const restart = () => { stop(); init(); report(); draw(); };

    function panel(canvas, rec, curve) {
      const c = V.canvas(canvas);
      if (!c) return;
      const pad = { l: 36, r: 12, t: 12, b: 30 };
      const lim = V.equalLims(c, pad, [[-1.7, -1.7], [1.7, 1.7]], 0);
      const F = V.frame(c, { xlim: lim.xlim, ylim: lim.ylim, xticks: V.ticks(lim.xlim[0], lim.xlim[1], 6), yticks: V.ticks(lim.ylim[0], lim.ylim[1], 5), pad });
      const { ctx, sx, sy, T } = F;
      F.clip();
      if (rBox.checked) X.forEach((x, i) => V.line(ctx, [[sx(x[0]), sy(x[1])], [sx(rec[i][0]), sy(rec[i][1])]], T.axis, 1));
      X.forEach(([a, b]) => { V.dot(ctx, sx(a), sy(b), T.bg, 4.5); V.dot(ctx, sx(a), sy(b), T.curve, 3.2); });
      // the line/curve of reconstructions goes last: once trained it runs through the points and would be hidden under them
      V.line(ctx, curve.map(([a, b]) => [sx(a), sy(b)]), T.path, 2.5);
      F.unclip();
    }

    function draw() {
      const u = pca.u;
      panel(cP, pca.rec, [[-4 * u[0], -4 * u[1]], [4 * u[0], 4 * u[1]]]);
      // decoder curve: sweep the code over the range used by the data
      const L = net.W.length, codes = X.map((x) => NN.forward(net, x, 0).as[2][0]);
      const lo = Math.min(...codes), hi = Math.max(...codes);
      const dec = { sizes: net.sizes.slice(2), acts: net.acts.slice(2), W: net.W.slice(2, L), b: net.b.slice(2, L) };
      const curve = Array.from({ length: 201 }, (_, i) => NN.predict(dec, [lo + ((hi - lo) * i) / 200]));
      panel(cA, X.map((x) => NN.predict(net, x)), curve);
    }

    trainBtn.addEventListener("click", () => {
      if (running) { stop(); report(); return; }
      if (step >= MAX_STEPS) return;
      running = true; raf = requestAnimationFrame(frame); report();
    });
    stage.querySelector('[data-act="reset"]').addEventListener("click", () => { seed++; restart(); });
    dSel.addEventListener("change", restart);
    rBox.addEventListener("change", draw);
    V.onRedraw([cP, cA], draw);
    restart();
  }

  V.mountAll("ae-curve", mount);
})();
