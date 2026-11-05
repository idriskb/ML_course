/* ==========================================================================
   Course configuration — the single source of truth for the site.
   Navigation, the home-page course map, chapter numbering and prev/next
   links are all generated from this file.

   To add a chapter:
     1. copy chapters/_template.html to chapters/<slug>.html
     2. add an entry below with the same slug and status: "ready"
   ========================================================================== */
window.COURSE = {
  title: "Machine Learning",
  program: "Bachelor in Applied Mathematics",
  term: "Academic year 2026–27",
  // Credits, shown in the footer of every page and on the home page.
  notesAuthor: "Nacho Molina",
  adaptedBy: "Idris Kouadri Boudjelthia",

  // Chapters are grouped by `part` in the order they appear here.
  // status: "ready" (linked) | "planned" (shown as "Coming soon")
  // `sessions` = course sessions covered by the chapter.
  chapters: [
    { num: "0", slug: "00-style-guide", part: "Front matter", status: "ready",
      title: "How to read these notes",
      summary: "Notation, conventions, and a tour of every building block used in the course." },

    { num: "1", slug: "01-learning-problem", part: "Module 1 · Supervised foundations", status: "ready", sessions: "1",
      title: "Introduction & the learning problem",
      summary: "What machine learning is, its main paradigms, and the formal set-up: data, models, loss, risk. Overfitting and capacity." },
    { num: "2", slug: "02-linear-regression", part: "Module 1 · Supervised foundations", status: "ready", sessions: "2–3",
      title: "Linear regression",
      summary: "Least squares, normal equations and their geometry; gradient descent, SGD and regression metrics." },
    { num: "3", slug: "03-regularization", part: "Module 1 · Supervised foundations", status: "ready", sessions: "4",
      title: "Model performance & regularization",
      summary: "Train/validation/test, the bias–variance trade-off, ridge and lasso, cross-validation." },
    { num: "4", slug: "04-logistic-regression", part: "Module 1 · Supervised foundations", status: "ready", sessions: "6–7",
      title: "Logistic regression",
      summary: "The sigmoid model, decision boundaries, cross-entropy, softmax, and classification metrics (ROC, AUC)." },

    { num: "5", slug: "05-pca", part: "Module 2 · Unsupervised learning", status: "ready", sessions: "9",
      title: "Dimensionality reduction: PCA",
      summary: "Variance maximisation, the eigen-decomposition and SVD, explained variance." },
    { num: "6", slug: "06-kmeans", part: "Module 2 · Unsupervised learning", status: "ready", sessions: "10",
      title: "Clustering: k-means",
      summary: "The k-means objective, Lloyd's algorithm, k-means++, choosing k." },

    { num: "7", slug: "07-knn", part: "Module 3 · Nonlinear & non-parametric models", status: "ready", sessions: "14",
      title: "k-nearest neighbours",
      summary: "Distance-based prediction for regression and classification; model complexity and the curse of dimensionality." },
    { num: "8", slug: "08-trees", part: "Module 3 · Nonlinear & non-parametric models", status: "ready", sessions: "16–17",
      title: "Tree-based methods",
      summary: "Decision trees, splitting criteria and pruning; bagging, random forests and gradient boosting." },
    { num: "9", slug: "09-kernels", part: "Module 3 · Nonlinear & non-parametric models", status: "ready", sessions: "19–20",
      title: "Kernel methods",
      summary: "Feature maps, the dual of ridge regression, the kernel trick, kernel PCA." },
    { num: "10", slug: "10-neural-networks", part: "Module 3 · Nonlinear & non-parametric models", status: "planned", sessions: "22–24",
      title: "Neural networks",
      summary: "Feedforward networks, universal approximation, backpropagation, training and regularization, autoencoders." }
  ],

  // KaTeX macros available on every page: write \R, \E, \argmin, ... in math.
  macros: {
    "\\R": "\\mathbb{R}",
    "\\N": "\\mathbb{N}",
    "\\E": "\\mathbb{E}",
    "\\P": "\\mathbb{P}",
    "\\Var": "\\operatorname{Var}",
    "\\Cov": "\\operatorname{Cov}",
    "\\argmin": "\\operatorname*{arg\\,min}",
    "\\argmax": "\\operatorname*{arg\\,max}",
    "\\norm": "\\lVert #1 \\rVert",
    "\\inner": "\\left\\langle #1, #2 \\right\\rangle",
    "\\T": "^{\\top}",
    "\\bx": "\\mathbf{x}",
    "\\by": "\\mathbf{y}",
    "\\bw": "\\mathbf{w}",
    "\\bX": "\\mathbf{X}",
    "\\bv": "\\mathbf{v}",
    "\\bu": "\\mathbf{u}",
    "\\bz": "\\mathbf{z}",
    "\\tr": "\\operatorname{tr}",
    "\\hatw": "\\hat{\\mathbf{w}}"
  }
};
