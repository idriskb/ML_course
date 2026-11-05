/* ==========================================================================
   Kernel functions and kernel matrices for the figures.
     VIZ.Kern.make(type, { sigma, degree }) → k(a, b) for arrays a, b
       type: "linear" | "poly" | "rbf"
     VIZ.Kern.matrix(k, A, B) → [[k(A_i, B_j)]]
     VIZ.Kern.center(K)       → doubly centred kernel matrix
   Requires common.js.
   ========================================================================== */
(function () {
  "use strict";
  const V = window.VIZ;
  const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
  const d2 = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2; return s; };

  function make(type, o = {}) {
    if (type === "linear") return (a, b) => dot(a, b);
    if (type === "poly") { const d = o.degree || 3; return (a, b) => Math.pow(1 + dot(a, b), d); }
    const s2 = 2 * (o.sigma || 1) ** 2;
    return (a, b) => Math.exp(-d2(a, b) / s2);
  }
  const matrix = (k, A, B) => A.map((a) => B.map((b) => k(a, b)));
  function center(K) {
    const n = K.length;
    const row = K.map((r) => r.reduce((s, v) => s + v, 0) / n);
    const all = row.reduce((s, v) => s + v, 0) / n;
    return K.map((r, i) => r.map((v, j) => v - row[i] - row[j] + all));
  }
  V.Kern = { make, matrix, center, dot, d2 };
})();
