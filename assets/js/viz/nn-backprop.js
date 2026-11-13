/* ==========================================================================
   Interactive: backpropagation step by step on a 2–2–1 network
   (ReLU hidden layer, identity output, loss L = ½(ŷ − y)²), starting from the
   network of the forward-pass example in Chapter 10.
   Each click on "Next" performs one phase: forward hidden, forward output,
   loss, output δ, hidden δ, gradients, gradient-descent update.
   Requires common.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ;
  const relu = (z) => Math.max(0, z);
  const PHASES = [
    "Parameters. Press Next to run the forward pass.",
    "Forward, hidden layer: z⁽¹⁾ = W⁽¹⁾x + b⁽¹⁾, a⁽¹⁾ = ReLU(z⁽¹⁾).",
    "Forward, output: ŷ = W⁽²⁾a⁽¹⁾ + b⁽²⁾.",
    "Loss: L = ½(ŷ − y)².",
    "Backward, output: δ⁽²⁾ = ∂L/∂ŷ = ŷ − y.",
    "Backward, hidden: δ⁽¹⁾ = (W⁽²⁾ᵀδ⁽²⁾) ⊙ ReLU′(z⁽¹⁾).",
    "Gradients: ∂L/∂W⁽ℓ⁾ = δ⁽ℓ⁾a⁽ℓ⁻¹⁾ᵀ, ∂L/∂b⁽ℓ⁾ = δ⁽ℓ⁾ (shown under each weight).",
    "Update: θ ← θ − η ∇L. Press Next to run the forward pass with the new parameters.",
  ];
  const init = () => ({ W1: [[1, -1], [1, 1]], b1: [0, -1], W2: [2, -1], b2: 0.5 });

  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control">
          <label for="${id}-x1">Input x₁ <output id="${id}-x1-out" for="${id}-x1"></output></label>
          <input type="range" id="${id}-x1" min="-2" max="2" step="0.5" value="1">
        </div>
        <div class="control">
          <label for="${id}-x2">Input x₂ <output id="${id}-x2-out" for="${id}-x2"></output></label>
          <input type="range" id="${id}-x2" min="-2" max="2" step="0.5" value="2">
        </div>
        <div class="control">
          <label for="${id}-y">Target y <output id="${id}-y-out" for="${id}-y"></output></label>
          <input type="range" id="${id}-y" min="-2" max="2" step="0.5" value="1">
        </div>
        <div class="control">
          <label for="${id}-eta">Learning rate η <output id="${id}-eta-out" for="${id}-eta"></output></label>
          <input type="range" id="${id}-eta" min="0.05" max="0.5" step="0.05" value="0.1">
        </div>
        <div class="viz__buttons viz__buttons--row">
          <button type="button" class="btn btn--primary" data-act="next">Next</button>
          <button type="button" class="btn" data-act="reset">Reset</button>
        </div>
      </div>
      <canvas class="viz__canvas" data-c="net" role="img" style="height: 420px"
        aria-label="A network with two inputs, two ReLU hidden units, one output and the loss. Weights are written on the edges. During the forward pass the pre-activations and activations appear at the units; during the backward pass the deltas appear in red under the units and the gradients under the weights."></canvas>
      <div class="viz__legend">
        <span style="--swatch: var(--viz-curve)">Forward quantities (z, a, ŷ, L)</span>
        <span style="--swatch: var(--viz-path)">Backward quantities (δ, gradients)</span>
      </div>
      <p class="viz__readout" aria-live="polite"></p>`;

    const cv = stage.querySelector('[data-c="net"]');
    const inp = (k) => stage.querySelector(`#${id}-${k}`);
    const readout = stage.querySelector(".viz__readout");
    let P, phase, iter, S, losses;

    const f2 = (v) => (Math.abs(v) < 5e-3 ? "0" : (Math.round(v * 100) / 100).toString());

    function compute() {
      const x = [+inp("x1").value, +inp("x2").value], y = +inp("y").value;
      const z1 = P.W1.map((r, i) => r[0] * x[0] + r[1] * x[1] + P.b1[i]);
      const a1 = z1.map(relu);
      const yh = P.W2[0] * a1[0] + P.W2[1] * a1[1] + P.b2;
      const L = 0.5 * (yh - y) ** 2;
      const d2 = yh - y;
      const d1 = [0, 1].map((i) => P.W2[i] * d2 * (z1[i] > 0 ? 1 : 0));
      const gW2 = a1.map((a) => d2 * a), gW1 = d1.map((d) => [d * x[0], d * x[1]]);
      S = { x, y, z1, a1, yh, L, d2, d1, gW1, gb1: d1.slice(), gW2, gb2: d2 };
    }

    function reset() {
      P = init(); phase = 0; iter = 0; losses = [];
      compute(); report(); draw();
    }

    function next() {
      if (phase === 7) { phase = 1; iter++; }
      else if (phase === 6) {
        const eta = +inp("eta").value;
        P.W1 = P.W1.map((r, i) => r.map((w, j) => w - eta * S.gW1[i][j]));
        P.b1 = P.b1.map((b, i) => b - eta * S.gb1[i]);
        P.W2 = P.W2.map((w, i) => w - eta * S.gW2[i]);
        P.b2 -= eta * S.gb2;
        losses.push(S.L);
        phase = 7;
      } else phase++;
      if (phase !== 7) compute();
      report(); draw();
    }

    function report() {
      ["x1", "x2", "y", "eta"].forEach((k) => (stage.querySelector(`#${id}-${k}-out`).textContent = (+inp(k).value).toFixed(k === "eta" ? 2 : 1)));
      let extra = "";
      if (phase === 7) {
        const prev = losses[losses.length - 1];
        const x = S.x, a = P.W1.map((r, i) => relu(r[0] * x[0] + r[1] * x[1] + P.b1[i]));
        const after = 0.5 * (P.W2[0] * a[0] + P.W2[1] * a[1] + P.b2 - S.y) ** 2;
        extra = `<span>loss before <b>${prev.toFixed(3)}</b></span><span>loss after the step <b>${after.toFixed(3)}</b></span>`;
      }
      readout.innerHTML = `<span>gradient step <b>${iter + 1}</b></span><span>${PHASES[phase]}</span>${extra}`;
    }

    function draw() {
      const c = V.canvas(cv);
      if (!c) return;
      const { ctx, w, h } = c, T = V.theme();
      const R = Math.min(24, h / 14);
      const pos = {
        x: [[0.1 * w, 0.2 * h], [0.1 * w, 0.8 * h]],
        h: [[0.42 * w, 0.2 * h], [0.42 * w, 0.8 * h]],
        o: [0.72 * w, 0.5 * h],
        L: [0.91 * w, 0.5 * h],
      };
      const fwd = (p) => phase >= p, bwd = (p) => phase >= p && phase <= 6;
      const text = (s, x, y, color, size = 12, weight = 600, align = "center") => {
        ctx.fillStyle = color; ctx.font = T.font(size, weight); ctx.textAlign = align; ctx.fillText(s, x, y);
      };
      // t = position of the label along the edge (crossing edges: near the source, so labels do not collide)
      const edge = (p, q, wv, gv, label, t = 0.38) => {
        V.line(ctx, [[p[0] + R, p[1]], [q[0] - R, q[1]]], T.axis, 1.5);
        const ex = p[0] + t * (q[0] - p[0]), ey = p[1] + t * (q[1] - p[1]);
        ctx.fillStyle = T.bg; ctx.fillRect(ex - 34, ey - 15, 68, bwd(6) ? 32 : 18);
        text(`${label} = ${f2(wv)}`, ex, ey - 2, T.text, 11, 600);
        if (bwd(6)) text(`∂L: ${f2(gv)}`, ex, ey + 13, T.path, 11, 700);
      };
      // edges input → hidden, hidden → output
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++)
        edge(pos.x[j], pos.h[i], P.W1[i][j], S.gW1[i][j], `w${i + 1}${j + 1}`, i === j ? 0.62 : 0.3);
      for (let i = 0; i < 2; i++) edge(pos.h[i], pos.o, P.W2[i], S.gW2[i], `v${i + 1}`);
      V.line(ctx, [[pos.o[0] + R, pos.o[1]], [pos.L[0] - R, pos.L[1]]], T.axis, 1.5);

      const node = (p, inside, color) => {
        ctx.beginPath(); ctx.arc(p[0], p[1], R, 0, 2 * Math.PI);
        ctx.fillStyle = T.bg; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
        text(inside, p[0], p[1] + 4, T.text, 12, 700);
      };
      // inputs
      pos.x.forEach((p, j) => { node(p, f2(S.x[j]), T.axis); text(`x${j + 1}`, p[0], p[1] - R - 8, T.text, 11, 700); });
      // hidden
      pos.h.forEach((p, i) => {
        node(p, fwd(1) ? f2(S.a1[i]) : `h${i + 1}`, T.curve);
        text(`b = ${f2(P.b1[i])}`, p[0], p[1] - R - 8, T.text, 11, 500);
        if (fwd(1)) text(`z = ${f2(S.z1[i])}`, p[0], p[1] + R + 15, T.curve, 11, 700);
        if (bwd(5)) text(`δ = ${f2(S.d1[i])}`, p[0], p[1] + R + 30, T.path, 11, 700);
      });
      // output
      node(pos.o, fwd(2) ? f2(S.yh) : "ŷ", T.curve);
      text(`b = ${f2(P.b2)}`, pos.o[0], pos.o[1] - R - 8, T.text, 11, 500);
      if (bwd(4)) text(`δ = ${f2(S.d2)}`, pos.o[0], pos.o[1] + R + 30, T.path, 11, 700);
      if (bwd(6)) text(`∂L/∂b: ${f2(S.gb2)}`, pos.o[0], pos.o[1] + R + 45, T.path, 11, 700);
      pos.h.forEach((p, i) => { if (bwd(6)) text(`∂L/∂b: ${f2(S.gb1[i])}`, p[0], p[1] + R + 45, T.path, 11, 700); });
      // loss
      ctx.fillStyle = T.bg; ctx.strokeStyle = T.text; ctx.lineWidth = 1.5;
      ctx.fillRect(pos.L[0] - 34, pos.L[1] - 22, 68, 44); ctx.strokeRect(pos.L[0] - 34, pos.L[1] - 22, 68, 44);
      text(fwd(3) ? `L = ${f2(S.L)}` : "L", pos.L[0], pos.L[1] + 4, T.text, 12, 700);
      text(`y = ${f2(S.y)}`, pos.L[0], pos.L[1] + 40, T.text, 11, 500);
    }

    stage.querySelector('[data-act="next"]').addEventListener("click", next);
    stage.querySelector('[data-act="reset"]').addEventListener("click", reset);
    // changing the data recomputes the current phase (after an update, start a new forward pass)
    ["x1", "x2", "y"].forEach((k) => inp(k).addEventListener("input", () => { if (phase === 7) phase = 0; compute(); report(); draw(); }));
    inp("eta").addEventListener("input", report);
    V.onRedraw(cv, draw);
    reset();
  }

  V.mountAll("nn-backprop", mount);
})();
