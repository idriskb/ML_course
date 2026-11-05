# Machine Learning — course website

Course notes for *Machine Learning* (Bachelor in Applied Mathematics), based on the lecture notes by
Nacho Molina, with adjustments by Idris Kouadri Boudjelthia.
This is a plain static site with no build step. It works on GitHub Pages as-is and can be opened locally.

## Structure

```
index.html                 Home: hero, how the notes work, course map
chapters/
  _template.html           Copy this to start a new chapter
  00-style-guide.html      Every component, demonstrated on real content
assets/
  css/tokens.css           Design tokens (colours, fonts)
  css/main.css             Layout, typography, components, dark theme
  js/course.js             ← course config: chapter list, KaTeX macros
  js/layout.js             Builds header/sidebar/TOC, numbering, proofs, math
  js/viz/*.js              One file per interactive visualization
```

## Preview locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Add a chapter

1. Copy `chapters/_template.html` to `chapters/02-linear-regression.html`.
2. Set `data-chapter="02-linear-regression"` on `<body>`.
3. In `assets/js/course.js`, set that chapter's `status` to `"ready"`.

The sidebar, home-page card, section numbers, theorem numbers, table of contents and prev/next links all update automatically.

## Writing cheat sheet

| What | Markup |
|---|---|
| Inline / display math | `$...$`, `$$...$$` (KaTeX; macros like `\R`, `\E`, `\norm{x}` live in `course.js`) |
| Numbered equation | `$$ ... \tag{2.1} $$` |
| Environment | `<div class="env theorem" id="thm-x" data-name="Optional name">…</div>`. Types: `definition theorem lemma proposition corollary example exercise remark` |
| Proof | `<details class="proof" data-for="thm-x"><summary>Proof</summary><div class="proof__body">…</div></details>` (add `open` to show it expanded) |
| Exercise solution | same as proof, with `class="solution"` and `solution__body` |
| Cross-reference | `<a class="ref" href="#thm-x"></a>` → "Theorem 2.3" (also works for figures and sections) |
| Step-by-step derivation | `<div class="derivation" data-title="…"><ol class="derivation__steps"><li class="step">…</li></ol></div>` |
| Callouts | `<div class="callout intuition">` / `<div class="callout pitfall">` |
| Objectives / takeaways | `<section class="box objectives">` / `<section class="box takeaways">` |
| Static figure | `<figure class="numbered" id="fig-x">…<figcaption>…</figcaption></figure>` |
| Interactive figure | `<figure class="viz" data-viz="name"><div class="viz__stage"></div><figcaption>…</figcaption></figure>` + `<script defer src="../assets/js/viz/name.js">` |
| Code | `<div class="code" data-lang="python"><pre><code>…</code></pre></div>` |

Writing `<` inside math confuses the HTML parser, so use `\lt` instead.

## Writing a new visualization

Use `assets/js/viz/gradient-descent.js` as the pattern:

- Mount on `[data-viz="name"]`.
- Read colours from CSS variables (`--viz-curve`, `--viz-path`, …) at draw time.
- Redraw on the `themechange` event and on resize.
- Use labelled native `<input>`/`<button>` controls so everything works from the keyboard.
- Give the canvas a `role="img"` and an `aria-label` describing the plot.

## Publish on GitHub Pages

1. Create a repository and push this folder.
2. Go to **Settings → Pages → Build and deployment**, set **Source: Deploy from a branch**, then choose `main` and `/ (root)`.
3. The site appears at `https://<user>.github.io/<repo>/`. All links are relative, so the sub-path works.

`.nojekyll` is included so GitHub serves files as-is.
