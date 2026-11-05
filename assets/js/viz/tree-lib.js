/* ==========================================================================
   Minimal CART decision trees for the figures (2 classes or regression).
   Rows are arrays [x_1, …, x_p, y]. Greedy binary splits x_j ≤ t with t at
   midpoints between consecutive distinct values.
     VIZ.Tree.fit(rows, { task: "clf"|"reg", criterion: "gini"|"entropy",
                          maxDepth, minLeaf, mtry, rng })
     VIZ.Tree.predict(node, x, depthCap)  → P(y = 1) (clf) or mean (reg)
     VIZ.Tree.leaves(node, depthCap), VIZ.Tree.rules(node, depthCap, names)
   Requires common.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ;

  const IMP = {
    gini: (p) => 2 * p * (1 - p),
    entropy: (p) => (p <= 0 || p >= 1 ? 0 : -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p))),
  };

  function fit(rows, opt) {
    const o = Object.assign({ task: "clf", criterion: "gini", maxDepth: 30, minLeaf: 1, mtry: null, rng: null }, opt);
    const p = rows[0].length - 1;
    const yv = (r) => r[p];

    function stats(idx) {
      let s = 0, s2 = 0;
      idx.forEach((i) => { const y = yv(rows[i]); s += y; s2 += y * y; });
      const n = idx.length, m = s / n;
      return { n, mean: m, sse: s2 - n * m * m };
    }
    // impurity × n (so that children are compared by weighted sums)
    function cost(n, s, s2) {
      if (!n) return 0;
      if (o.task === "reg") return s2 - (s * s) / n;
      return n * IMP[o.criterion](s / n);
    }

    function grow(idx, depth) {
      const st = stats(idx);
      const node = { n: st.n, value: st.mean, depth, sse: st.sse };
      const pure = o.task === "clf" ? st.mean === 0 || st.mean === 1 : st.sse < 1e-12;
      if (depth >= o.maxDepth || idx.length < 2 * o.minLeaf || pure) return node;
      let feats = Array.from({ length: p }, (_, j) => j);
      if (o.mtry && o.mtry < p) { // random subset of features (random forests)
        for (let a = p - 1; a > 0; a--) { const b = Math.floor(o.rng() * (a + 1)); [feats[a], feats[b]] = [feats[b], feats[a]]; }
        feats = feats.slice(0, o.mtry);
      }
      let tot = 0, tot2 = 0; idx.forEach((i) => { const y = yv(rows[i]); tot += y; tot2 += y * y; });
      const parent = cost(idx.length, tot, tot2);
      let best = null;
      feats.forEach((j) => {
        const srt = idx.slice().sort((a, b) => rows[a][j] - rows[b][j]);
        let ls = 0, ls2 = 0;
        for (let k = 0; k < srt.length - 1; k++) {
          const y = yv(rows[srt[k]]); ls += y; ls2 += y * y;
          const nl = k + 1, nr = srt.length - nl;
          if (nl < o.minLeaf || nr < o.minLeaf) continue;
          const a = rows[srt[k]][j], b = rows[srt[k + 1]][j];
          if (a === b) continue;
          const c = cost(nl, ls, ls2) + cost(nr, tot - ls, tot2 - ls2);
          if (!best || c < best.c - 1e-12) best = { c, j, t: (a + b) / 2 };
        }
      });
      if (!best || parent - best.c <= 1e-12) return node;
      node.j = best.j; node.t = best.t; node.gain = parent - best.c;
      node.left = grow(idx.filter((i) => rows[i][best.j] <= best.t), depth + 1);
      node.right = grow(idx.filter((i) => rows[i][best.j] > best.t), depth + 1);
      return node;
    }
    return grow(rows.map((_, i) => i), 0);
  }

  const isLeaf = (nd, cap) => !nd.left || nd.depth >= cap;
  function predict(nd, x, cap = Infinity) {
    while (!isLeaf(nd, cap)) nd = x[nd.j] <= nd.t ? nd.left : nd.right;
    return nd.value;
  }
  function leaves(nd, cap = Infinity) { return isLeaf(nd, cap) ? 1 : leaves(nd.left, cap) + leaves(nd.right, cap); }
  function rules(nd, cap = Infinity, names = ["x₁", "x₂"], fmt = (v) => v.toFixed(2), path = []) {
    if (isLeaf(nd, cap)) return [{ conds: path, value: nd.value, n: nd.n }];
    return rules(nd.left, cap, names, fmt, path.concat(`${names[nd.j]} ≤ ${fmt(nd.t)}`))
      .concat(rules(nd.right, cap, names, fmt, path.concat(`${names[nd.j]} > ${fmt(nd.t)}`)));
  }
  // bootstrap sample of indices → { rows, oob:Set of left-out indices }
  function bootstrap(rows, r) {
    const n = rows.length, inBag = new Array(n).fill(false), out = [];
    for (let i = 0; i < n; i++) { const k = Math.floor(r() * n); inBag[k] = true; out.push(rows[k]); }
    const oob = []; inBag.forEach((b, i) => { if (!b) oob.push(i); });
    return { rows: out, oob };
  }

  V.Tree = { fit, predict, leaves, rules, bootstrap, IMP };
})();
