/* ==========================================================================
   Small 2-D datasets for the clustering figures. Rows are [x, y, label]
   (the label is the "true" group, never shown to k-means).
   "digits" needs digits-data.js: the 150 handwritten digits projected on
   their first two principal components (as in the PCA chapter), rescaled.
   Requires common.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ;
  const cache = {};

  function digitsPCA() {
    const D = window.VIZ_DIGITS;
    if (!D) return [];
    const P = 64, n = D.labels.length;
    const X = Array.from({ length: n }, (_, i) => Array.from({ length: P }, (_, j) => D.pixels.charCodeAt(i * P + j) - 97));
    const m = Array.from({ length: P }, (_, j) => X.reduce((s, r) => s + r[j], 0) / n);
    const Xc = X.map((r) => r.map((v, j) => v - m[j]));
    const S = Array.from({ length: P }, (_, a) => Array.from({ length: P }, (_, b) => Xc.reduce((s, r) => s + r[a] * r[b], 0) / n));
    const { vectors } = V.eigSym(S);
    const lab = { 0: 0, 3: 1, 4: 2 };
    return Xc.map((r, i) => [V.dotp(vectors[0], r) / 10, V.dotp(vectors[1], r) / 10, lab[D.labels[i]]]);
  }

  const MAKERS = {
    customers: () => V.blobs([[-1.8, -1], [1.8, -1.1], [0, 1.6]], [[0.55, 0.55], [0.55, 0.55], [0.55, 0.55]], [40, 40, 40], 21),
    five: () => {
      const c = [[-2, -1.5], [2, -1.5], [0, 0.2], [-2.2, 1.9], [2.2, 1.9]];
      return V.blobs(c, c.map(() => [0.4, 0.4]), c.map(() => 24), 31);
    },
    elongated: () => V.blobs([[0, 0.75], [0, -0.75]], [[1.7, 0.22], [1.7, 0.22]], [60, 60], 5),
    unequal: () => V.blobs([[-1.1, 0], [1.9, 0.4]], [[1.0, 1.0], [0.25, 0.25]], [100, 20], 9),
    moons: () => V.moons(140, 0.08, 3).map(([x, y, l]) => [1.6 * (x - 0.5), 1.6 * (y - 0.25), l]),
    digits: digitsPCA,
  };

  V.CLUSTER_DATA = {
    names: {
      customers: "Customers: three groups",
      five: "Five groups",
      elongated: "Two elongated groups",
      unequal: "A large and a small group",
      moons: "Two moons",
      digits: "Digits (PC 1 and PC 2 scores)",
    },
    axes: {
      customers: ["income (standardised)", "spending (standardised)"],
      digits: ["score on PC 1 (÷10)", "score on PC 2 (÷10)"],
    },
    get: (name) => (cache[name] = cache[name] || MAKERS[name]()),
  };
})();
