# ML course website: read this first

This file has the conventions for writing chapters on this site. **Use it instead of reading the code to work out the layout.**
Open existing files only to check a detail that isn't covered here. When a convention changes, update this file in the same change.

Static site, no build step. Course: Machine Learning, Bachelor in Applied Mathematics (IE), 2026–27.
Students are the readers. Preview locally with `python3 -m http.server 8000`.

---

## 1. Content rules (instructor's decisions)

- **Sources.** Each session's material is in `~/Downloads`: the instructor's slide decks (`*.pdf`, `*.pptx`, `*.key`, `*.md`),
  Molina's lecture notes (`IE_ML_*_Molina*`) and the lab notebooks. Work chapter by chapter and read only the material for
  that session. A chapter covers exactly what its session deck covers (for example, the neural-networks deck stops before
  backprop, so backprop is in ch 11). `Syllabus_ML.pdf` uses last year's numbering: follow the session numbers in
  `assets/js/course.js` instead. No `pdftotext` or numpy on the system Python: `pip3 install --target <scratchpad>/pylib pypdf numpy`
  and run with `PYTHONPATH`. Or use the Read tool on the PDF.
- **Probabilistic material** (MLE, MAP, Bayesian views, max-entropy, likelihoods) goes **only** in the final
  `<section class="extra">` ("Extra material · not examined this year"). Every chapter has one.
- **No references, citations or author names** in chapters (not even for a theorem: "universal approximation theorem", not
  a name). No biology, single-cell or transcriptomics examples.
- **Datasets.** The labs use scikit-learn's house prices (regression), breast cancer (classification), two moons (non-linear)
  and digits (PCA and clustering). Interactive figures use small, simple synthetic datasets.
- **Code snippets** use scikit-learn and, for neural networks, PyTorch (as in the labs).
- **Tone.** Rigorous maths-textbook style, short plain sentences, British spelling (regularisation, optimisation, centred).
  Cross-link earlier chapters with `<a href="07-knn.html">Chapter 7</a>`.

## 2. Proof style (instructor feedback; mandatory)

- Proofs and worked examples are written as `<p><strong>Step k: short title.</strong> …</p>` paragraphs. With 2 or more
  steps, `layout.js` reveals them one at a time automatically (in `details.proof` and in `.env.example`).
- Put every key equation on its own display line `$$…$$`. Never chain inline maths inside a dense paragraph.
- Mark cancelling terms with `\underbrace{…}_{=\ 0}` (or `\cancel{}`), label intermediate results with `\tag{1}` and refer
  back to "(1)", and end with a short "Step k: conclude."
- If a result is stated without proof, say so explicitly.

## 3. Files

```
index.html                 home page (course map built from course.js)
chapters/NN-slug.html      one page per chapter; copy chapters/_template.html
chapters/00-style-guide.html  every component in use (open only if something here is unclear)
assets/js/course.js        chapter registry (title, summary, part, sub, sessions, status) + KaTeX macros
assets/js/layout.js        header, sidebar, TOC, pager, numbering, refs, proofs, step reveal, KaTeX, analytics
assets/js/viz/common.js    window.VIZ helpers for interactive figures
assets/js/viz/<name>.js    one interactive figure per file
assets/css/tokens.css, main.css   theme (do not hard-code colours anywhere)
README.md                  course contents table: keep it in sync with course.js
```

## 4. Adding a chapter: checklist

1. Copy `chapters/_template.html` to `chapters/NN-slug.html`; set `<title>Name — Machine Learning</title>`, a
   `<meta name="description">`, and `data-chapter="NN-slug"` on `<body>`.
2. Add one `<script defer src="../assets/js/viz/X.js">` per figure, **after** `common.js`.
3. In `course.js` set the chapter's `status: "ready"` and update `title`/`summary`. Update `README.md` (and the module
   heading if it says "coming soon").
4. Need a new macro? Add it to `macros` in `course.js`.
5. Verify (§9). Do not commit unless asked.

Analytics, the sidebar, TOC, pager and the "Chapter N · Module" eyebrow are all automatic. Leave `<p class="eyebrow"></p>` empty.

## 5. Page skeleton and chapter structure

Head and body: exactly as in `_template.html` (Google Fonts Montserrat + PT Serif, KaTeX 0.16.9 from jsdelivr, `tokens.css`,
`main.css`, `course.js`, `layout.js`). Body: `#site-header`, `.layout` > `nav#sidebar` + `main#main.content` >
`article.chapter` + `nav#pager`, then `aside#toc`, `#site-footer`.

Order inside `article.chapter`:
1. `header.chapter-head`: `p.eyebrow` (empty), `h1`, `p.lede` (3–6 sentences; link to the previous chapter's idea).
2. `section.box.objectives` (target-icon SVG in `h2.box__title#obj-title`), 5–6 bullet points.
3. `<!-- ===== -->` then `h2` sections with `h3` subsections. Each needs an `id`; numbering (10.3.1) is automatic. Put
   `class="unnumbered"` on a heading to skip numbering.
4. A "Strengths, limitations and connections" `h2` (bullet list, then a **Connections.** paragraph leading into the next chapter).
5. `h2#exercises` with `div.env.exercise` items (8–10; usually no solutions).
6. `section.box.takeaways` (check-icon SVG, `h2.box__title#take-title`).
7. `section.extra` (see below), last.

Copy the icon SVGs from an existing chapter (e.g. `09-kernels.html`): objectives = three concentric circles, takeaways =
check mark `M20 6L9 17l-5-5`, extra = plus `M12 5v14M5 12h14`.

```html
<section class="extra" aria-labelledby="extra-x">
  <p class="extra__tag"><svg …plus…></svg> Extra material · not examined this year</p>
  <h2 id="extra-x">Probabilistic view: …</h2>
  <p class="extra__intro">…</p>
  … envs, proofs, one exercise …
</section>
```

## 6. Components

**Environments** (numbered automatically, "Theorem 10.3"; `remark` is unnumbered):
`definition | theorem | lemma | proposition | corollary | example | exercise | remark`
```html
<div class="env theorem" id="thm-x" data-name="Optional name"><p>Statement.</p></div>
<details class="proof" data-for="thm-x"><summary>Proof</summary>
  <div class="proof__body"><p><strong>Step 1: ….</strong> … $$…$$</p> …</div></details>
<details class="solution" data-for="exo-x"><summary>Solution</summary><div class="solution__body">…</div></details>
```
Id prefixes: `def-`, `thm-`, `lem-`, `prop-`, `cor-`, `ex-`, `exo-`, `rem-`, `fig-`.

**Cross-references**: `<a class="ref" href="#thm-x"></a>` fills in "Theorem 10.3", "Figure 10.2" or "Section 10.6" (for a
heading id) automatically.

**Derivation revealed line by line**:
```html
<div class="derivation" data-title="Title"><ol class="derivation__steps">
  <li class="step"><p class="step__why">Why.</p>$$a = b$$</li> …</ol></div>
```

**Callouts**: `div.callout.intuition` or `div.callout.pitfall`, each containing `svg.callout__icon` + `p.callout__title` +
`div.callout__body` (copy the markup from `00-style-guide.html`).

**Tables**: always wrap them: `<div class="table-wrap"><table><thead>…<th scope="col">…</thead><tbody>…<th scope="row">…`.

**Code**: `<div class="code" data-lang="python">` followed, on a new line with no indent, by `<pre><code>…</code></pre></div>`.

**Maths**: `$…$` inline, `$$…$$` display, KaTeX. Macros: `\R \N \E \P \Var \Cov \argmin \argmax \norm{x} \inner{a}{b} \T`
(transpose, `^{\top}`), `\bx \by \bw \bX \bv \bu \bz \bW \ba \bb \bh \tr \hatw`. Vectors are bold (`\mathbf`), $N$ = number of
training points, $p$ = number of features. Use `\cancel{}` for cancellations; it works.

## 7. Static diagrams (inline SVG, theme-aware)

```html
<figure class="numbered diagram" id="fig-x">            <!-- add diagram--narrow for small ones -->
  <svg viewBox="0 0 640 H" role="img" aria-label="Full description of the picture.">…</svg>
  <figcaption>Sentence describing it.</figcaption>
</figure>
```
Use **only** these classes, never hex colours: `d-ink` (text-colour stroke), `d-muted` (light stroke: grid, edges),
`d-text` (13px text fill), `d-label` (12px muted bold text), `d-a` / `d-b` (fill in series colours: green / red),
`d-a-stroke` / `d-b-stroke`, `d-panel` (soft background + border: nodes, panels). SVG text can't render KaTeX: use Unicode
(x₁, W⁽¹⁾, ℝ⁴, σ, ŷ, θ). For arrows use a `<marker>` whose path has `class="d-text"`, with an id that is unique on the page.
**Generate coordinates with a small Python script** in the scratchpad (exact positions; keep curves inside panel bounds by
filtering points), then paste the output in.

## 8. Interactive figures (`assets/js/viz/<name>.js`)

Markup in the chapter:
```html
<figure class="viz viz--wide" data-viz="name" id="fig-name">
  <div class="viz__stage"></div>
  <figcaption>What is shown. <strong>Try:</strong> (1) …; (2) …; (3) ….</figcaption>
</figure>
```
Module skeleton (copy this; see `kernel-ridge.js`, `nn-universal.js` and `nn-moons.js` for complete examples):
```js
(function () {
  "use strict";
  const V = window.VIZ;
  function mount(fig, id) {
    const stage = fig.querySelector(".viz__stage") || fig;
    stage.innerHTML = `
      <div class="viz__controls">
        <div class="control"><label for="${id}-a">Label</label><select id="${id}-a">…</select></div>
        <div class="control"><label for="${id}-s">Name <output id="${id}-s-out" for="${id}-s"></output></label>
          <input type="range" id="${id}-s" min=".." max=".." step=".." value=".."></div>
        <div class="control control--check"><label><input type="checkbox" id="${id}-c"> <span>Text</span></label></div>
        <div class="viz__buttons viz__buttons--row">
          <button type="button" class="btn btn--primary" data-act="run">Run</button>
          <button type="button" class="btn" data-act="reset">Reset</button></div>
      </div>
      <div class="viz__grid2">            <!-- two panels; or a single canvas -->
        <div><p class="viz__panel-title">Title</p>
          <canvas class="viz__canvas" data-c="left" role="img" aria-label="…"></canvas></div>
        <div>…</div>
      </div>
      <div class="viz__legend"><span style="--swatch: var(--viz-curve)">…</span><span style="--swatch: var(--viz-path)">…</span></div>
      <p class="viz__readout" aria-live="polite"></p>`;
    // readout: <span>label <b>value</b></span> …
    function draw() { const c = V.canvas(canvas); if (!c) return;
      const F = V.frame(c, { xlim, ylim, xticks, yticks, xlabel, ylabel, logy, fmtX, fmtY, pad: { l: 40 } });
      const { ctx, sx, sy, ix, iy, T } = F; F.clip(); …; F.unclip(); }
    V.onRedraw([canvas1, canvas2], draw);   // redraws on theme change / resize
    update();
  }
  V.mountAll("name", mount);
})();
```
`VIZ` API (common.js):
- **Theme**: `T.curve` (green, series 1/target/class 0), `T.path` (red, series 2/fit/class 1), `T.axis` (grey, thin
  helper lines), `T.text`, `T.grid`, `T.bg`, `T.clusters[0..5]`, `T.font(size, weight)`.
- **Drawing**: `V.line(ctx, [[px,py],…], color, width, dash)`; `V.dot(ctx, px, py, color, r, "circle|ring|square|triangle")`.
  For a halo, draw the dot with `T.bg` at r+1.5 first. Class 0 is drawn as circles, class 1 as triangles.
  `V.contour(F, fn, levels, color)`.
- **Axes**: `V.ticks(lo, hi, n)`, `V.equalLims(c, pad, pts)` (equal aspect).
- **Data**: `V.rng(seed)` (+ `.normal()`), `V.moons(n, noise, seed)` (rows `[x, y, label]`; the usual train/test split is
  `moons(150, .2, 3)` / `moons(400, .2, 41)`), `V.blobs`, `V.houses`, `V.tumours`.
- **Maths**: `V.sigmoid`, `V.ols1`, `V.lstsq`, `V.ridge`, `V.eigSym`, `V.dotp`, `V.legendre`, `V.KM.*` (k-means).
- **Probability-map shading** (two-moons classifiers): fill 5px cells with `globalAlpha = .08 + |p − .5|·.5`, coloured
  `T.path` or `T.curve`. Mark the boundary with 3px `T.text` dots wherever the sign changes. Copy from `nn-moons.js`.
- **Animation**: `requestAnimationFrame` loop, N steps per frame, with Train/Pause and Reset buttons.
- **Disabled inputs**: when a control doesn't apply, set `input.disabled = true` and show "—" in its `<output>`.

Prefer 2–3 figures per chapter: one for intuition about the core object, one showing the main theorem, one applying the
method to a lab-style dataset (usually two moons). Check the numerics in Python before writing the caption's claims.

## 9. Verification (cheap and quick)

```bash
python3 -m http.server 8765 &          # from repo root
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CH" --headless=new --disable-gpu --user-data-dir=<scratch>/chrome --virtual-time-budget=8000 \
  --dump-dom http://localhost:8765/chapters/NN-slug.html > <scratch>/dom.html
grep -c katex-error <scratch>/dom.html   # must be 0; also check that no <a class="ref"> is left empty
```
Screenshots: headless Chrome **ignores scroll and hash**. To screenshot one figure, write a temporary
`chapters/_preview.html` copy that injects CSS hiding everything except `#<id>`
(`article.chapter>*:not(#id){display:none}`, hide header/sidebar/toc, `.layout{display:block}`, `main.content{width:900px}`),
then `--screenshot=<scratch>/x.png --window-size=1000,900 "…/_preview.html?t=fig-x"`. **Delete the preview file afterwards**
and `pkill -f "http.server 8765"`.
