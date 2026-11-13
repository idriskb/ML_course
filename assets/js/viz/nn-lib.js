/* ==========================================================================
   Small fully connected networks for the interactive figures  (VIZ.NN)
   net = VIZ.NN.create([2, 32, 1], ["relu", "id"], seed)
     acts[l] is the activation of layer l+1: "relu" | "tanh" | "sigmoid" | "id"
   VIZ.NN.predict(net, x)               → output vector (no dropout)
   VIZ.NN.step(net, X, Y, opt)          → one full-batch Adam step, returns loss
     opt: { loss: "bce" | "mse", lr, wd (L2 weight decay on weights only),
            drop (dropout probability on hidden units), rng, state }
     "bce": single output logit, labels 0/1 (sigmoid inside the loss)
     "mse": mean over points of the squared Euclidean error
   VIZ.NN.loss(net, X, Y, kind)         → loss without dropout
   Requires common.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ;
  const ACT = {
    relu: [(z) => (z > 0 ? z : 0), (z) => (z > 0 ? 1 : 0)],
    tanh: [Math.tanh, (z) => { const t = Math.tanh(z); return 1 - t * t; }],
    sigmoid: [V.sigmoid, (z) => { const s = V.sigmoid(z); return s * (1 - s); }],
    id: [(z) => z, () => 1],
  };

  function create(sizes, acts, seed = 1) {
    const r = V.rng(seed), W = [], b = [];
    for (let l = 1; l < sizes.length; l++) {
      const n0 = sizes[l - 1], s = Math.sqrt((acts[l - 1] === "relu" ? 2 : 1) / n0);
      W.push(Array.from({ length: sizes[l] }, () => Array.from({ length: n0 }, () => s * r.normal())));
      b.push(new Array(sizes[l]).fill(0));
    }
    return { sizes, acts, W, b };
  }

  // forward pass for one input; keeps z, a and dropout masks for backprop
  function forward(net, x, drop, r) {
    const L = net.W.length, zs = [], as = [x], masks = [];
    for (let l = 0; l < L; l++) {
      const Wl = net.W[l], bl = net.b[l], a = as[l], f = ACT[net.acts[l]][0];
      const z = Wl.map((row, i) => { let s = bl[i]; for (let j = 0; j < row.length; j++) s += row[j] * a[j]; return s; });
      let out = z.map(f), m = null;
      if (drop > 0 && l < L - 1) {
        m = out.map(() => (r() > drop ? 1 / (1 - drop) : 0));
        out = out.map((v, i) => v * m[i]);
      }
      zs.push(z); as.push(out); masks.push(m);
    }
    return { zs, as, masks };
  }

  const predict = (net, x) => forward(net, x, 0).as[net.W.length];

  function lossOf(out, y, kind) {
    if (kind === "bce") {
      const p = V.sigmoid(out[0]);
      return -(y[0] ? Math.log(Math.max(p, 1e-12)) : Math.log(Math.max(1 - p, 1e-12)));
    }
    return out.reduce((s, v, i) => s + (v - y[i]) ** 2, 0);
  }

  function loss(net, X, Y, kind) {
    return X.reduce((s, x, i) => s + lossOf(predict(net, x), Y[i], kind), 0) / X.length;
  }

  // backpropagation: accumulate the gradients of one example into G (scaled by w)
  function backward(net, cache, dOut, G) {
    const L = net.W.length;
    let d = dOut;
    for (let l = L - 1; l >= 0; l--) {
      if (l < L - 1) {
        const df = ACT[net.acts[l]][1], m = cache.masks[l];
        d = d.map((v, i) => v * (m ? m[i] : 1) * df(cache.zs[l][i]));
      }
      const a = cache.as[l], gW = G.W[l], gb = G.b[l];
      for (let i = 0; i < d.length; i++) {
        if (d[i] === 0) continue;
        gb[i] += d[i];
        const row = gW[i];
        for (let j = 0; j < a.length; j++) row[j] += d[i] * a[j];
      }
      if (l > 0) {
        const Wl = net.W[l], nd = new Array(a.length).fill(0);
        for (let i = 0; i < d.length; i++) { if (d[i] === 0) continue; const row = Wl[i]; for (let j = 0; j < a.length; j++) nd[j] += row[j] * d[i]; }
        d = nd;
      }
    }
  }

  const zerosLike = (net) => ({ W: net.W.map((M) => M.map((r) => new Array(r.length).fill(0))), b: net.b.map((v) => new Array(v.length).fill(0)) });

  function step(net, X, Y, opt) {
    const kind = opt.loss, n = X.length, G = zerosLike(net), r = opt.rng || Math.random;
    let total = 0;
    for (let i = 0; i < n; i++) {
      const cache = forward(net, X[i], opt.drop || 0, r);
      const out = cache.as[net.W.length];
      total += lossOf(out, Y[i], kind);
      const dOut = kind === "bce" ? [(V.sigmoid(out[0]) - Y[i][0]) / n] : out.map((v, k) => (2 * (v - Y[i][k])) / n);
      backward(net, cache, dOut, G);
    }
    // Adam step; the L2 penalty (weight decay) is added to the gradient of the weights
    const st = opt.state || (opt.state = { m: zerosLike(net), s: zerosLike(net), t: 0 });
    st.t++;
    const b1 = 0.9, b2 = 0.999, c1 = 1 - b1 ** st.t, c2 = 1 - b2 ** st.t, lr = opt.lr, wd = opt.wd || 0;
    const upd = (P, g, m, s, decay) => {
      for (let i = 0; i < P.length; i++) {
        const gi = g[i] + decay * P[i];
        m[i] = b1 * m[i] + (1 - b1) * gi;
        s[i] = b2 * s[i] + (1 - b2) * gi * gi;
        P[i] -= (lr * m[i] / c1) / (Math.sqrt(s[i] / c2) + 1e-8);
      }
    };
    net.W.forEach((M, l) => M.forEach((row, i) => upd(row, G.W[l][i], st.m.W[l][i], st.s.W[l][i], wd)));
    net.b.forEach((v, l) => upd(v, G.b[l], st.m.b[l], st.s.b[l], 0));
    return total / n;
  }

  V.NN = { create, forward, predict, loss, step, ACT };
})();
