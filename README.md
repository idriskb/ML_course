# Machine Learning

Course notes for **Machine Learning**, Bachelor in Applied Mathematics, academic year 2026–27.
Based on the lecture notes by Nacho Molina, with adjustments by Idris Kouadri Boudjelthia.

## About the course

This course covers the mathematics behind learning from data. Each method is introduced as a mathematical
object: we state the model and the objective it minimises, derive the algorithm that solves it, and prove its
main properties. We then look at how it behaves on real data.

The notes are written like a mathematics text. Definitions, theorems and examples are numbered, and every proof
is complete. Proofs are collapsed by default and open one step at a time, so you can try each argument yourself
before reading it. Interactive figures sit next to the formal statements: move a slider, run an algorithm step
by step, and watch the mathematics respond.

## Contents

| # | Chapter | Sessions | Topics |
|---|---|---|---|
| 0 | How to read these notes | | Notation, conventions, and how the notes are organised |
| | **Module 1 · Foundations: linear models** | | |
| | *Supervised* | | |
| 1 | Introduction & the learning problem | 1 | Paradigms of ML; data, models, loss and risk; overfitting and capacity |
| 2 | Linear regression | 2–3 | Least squares, normal equations and their geometry; gradient descent, SGD; regression metrics |
| 3 | Model performance & regularization | 4 | Train/validation/test, bias–variance trade-off, ridge and lasso, cross-validation |
| 4 | Logistic regression | 6–7 | Sigmoid model, decision boundaries, cross-entropy, softmax; ROC and AUC |
| | *Unsupervised* | | |
| 5 | Dimensionality reduction: PCA | 9 | Variance maximisation, eigen-decomposition and SVD, explained variance |
| 6 | Clustering: k-means | 10 | The k-means objective, Lloyd's algorithm, k-means++, choosing k |
| | **Module 2 · Nonlinear & non-parametric methods** | | |
| 7 | k-nearest neighbours | 14 | Distance-based prediction, model complexity, the curse of dimensionality |
| 8 | Tree-based methods | 16–17 | Decision trees, splitting and pruning; bagging, random forests, gradient boosting |
| 9 | Kernel methods | 19–20 | Feature maps, dual ridge regression, the kernel trick, kernel PCA |
| | **Module 3 · Neural networks** | | |
| 10 | Neural networks | 22 | Neurons and layers, activation functions, output layers and softmax, universal approximation, depth |
| 11 | Backpropagation & training neural networks | 23 | Backpropagation; optimisation and regularization for networks with many parameters |
| 12 | Autoencoders | 24 | Learning compressed representations without labels; the link with PCA |

Module 1 builds the core ideas on linear models: a fixed set of parameters fitted by minimising a loss.
Module 2 drops that assumption and lets the model's complexity grow with the data. Module 3 returns to
parametric models, now non-linear and with very many parameters. Each module includes unsupervised
methods: PCA and k-means, kernel PCA, and autoencoders.

Chapters are released over the term.

## Background

You should be comfortable with:

- **Linear algebra:** matrices, rank, eigenvalues and eigenvectors, orthogonal projections.
- **Multivariable calculus:** gradients, Hessians, minimising a function of several variables.
- **Basic probability and statistics:** expectation, variance, covariance.
- **Python:** enough to read and run short NumPy and scikit-learn snippets.

## Datasets

The labs use standard scikit-learn datasets, one for each type of problem:

- **House prices** (regression)
- **Breast cancer, malignant vs benign** (binary classification)
- **Two moons** (non-linear classification and clustering)
- **Handwritten digits** (PCA and clustering)

The interactive figures use small synthetic datasets, so each idea can be seen clearly.

## Extra material

Some chapters end with a section marked *Extra material · not examined this year*. It contains the
probabilistic interpretations of the methods (maximum likelihood, Bayesian views). This material is optional.

## Reading the notes

The notes are a static website. Open the published site, or run it locally from this folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Each chapter page has a table of contents, an "Expand all proofs" button, and a light/dark theme toggle. When you
print a page, every proof and step is shown in full.
