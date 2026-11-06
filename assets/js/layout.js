/* ==========================================================================
   Site layout & reading components
   Builds the header, sidebar, footer, table of contents and pager from
   COURSE (course.js), then enhances the chapter content:
     - numbers sections, environments (Theorem 2.3, …) and figures
     - labels proofs, adds "expand all", wires step-by-step derivations
       and step-by-step proofs / worked examples ("Step k:" paragraphs)
     - resolves cross-references  <a class="ref" href="#thm-ols"></a>
     - renders math with KaTeX
   Every page sets  <body data-root="../" data-page="chapter" data-chapter="slug">
   ========================================================================== */
(function () {
  "use strict";

  const C = window.COURSE;
  const body = document.body;
  const ROOT = body.dataset.root || "./";
  const PAGE = body.dataset.page || "";
  const current = C.chapters.find((c) => c.slug === body.dataset.chapter);

  const svg = (path) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  const ICONS = {
    menu: svg('<path d="M4 6h16M4 12h16M4 18h16"/>'),
    close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    moon: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>')
  };

  const chapterHref = (c) => `${ROOT}chapters/${c.slug}.html`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));

  function groupByPart(chapters) {
    const parts = new Map();
    chapters.forEach((c) => {
      if (!parts.has(c.part)) parts.set(c.part, []);
      parts.get(c.part).push(c);
    });
    return [...parts];
  }
  window.COURSE.groupByPart = groupByPart;

  // Split one part's chapters into runs that share the same `sub` heading
  // (sub is "" for chapters without one).
  function groupBySub(chapters) {
    const runs = [];
    chapters.forEach((c) => {
      const sub = c.sub || "";
      if (!runs.length || runs[runs.length - 1][0] !== sub) runs.push([sub, []]);
      runs[runs.length - 1][1].push(c);
    });
    return runs;
  }

  /* ---------------- Theme ---------------- */
  function theme() {
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  }
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("ml-theme", t); } catch (e) { /* private mode */ }
    syncThemeButton();
    document.dispatchEvent(new CustomEvent("themechange", { detail: { theme: t } }));
  }
  function syncThemeButton() {
    const btn = document.querySelector(".theme-btn");
    if (!btn) return;
    const next = theme() === "dark" ? "light" : "dark";
    btn.innerHTML = theme() === "dark" ? ICONS.sun : ICONS.moon;
    btn.setAttribute("aria-label", `Switch to ${next} theme`);
    btn.title = `Switch to ${next} theme`;
  }

  /* ---------------- Header / footer ---------------- */
  function buildHeader() {
    const mount = document.getElementById("site-header");
    if (!mount) return;
    const hasSidebar = !!document.getElementById("sidebar");
    const navLink = (href, label, page) =>
      `<a href="${href}"${PAGE === page ? ' aria-current="page"' : ""}>${label}</a>`;

    mount.outerHTML = `
      <a class="skip-link" href="#main">Skip to content</a>
      <header class="site-header${hasSidebar ? "" : " site-header--simple"}">
        <div class="site-header__inner">
          ${hasSidebar ? `<button class="icon-btn menu-btn" type="button" aria-controls="sidebar" aria-expanded="false" aria-label="Open course navigation">${ICONS.menu}</button>` : ""}
          <a class="brand" href="${ROOT}index.html">
            <span class="brand__text">
              <span class="brand__course">${esc(C.title)}</span>
              <span class="brand__program">${esc(C.program)}</span>
            </span>
          </a>
          <nav class="top-nav" aria-label="Site">
            ${navLink(`${ROOT}index.html`, "Home", "home")}
            ${navLink(`${ROOT}index.html#chapters`, "Chapters", "chapter")}
          </nav>
          <button class="icon-btn theme-btn" type="button"></button>
        </div>
      </header>`;

    document.querySelector(".theme-btn").addEventListener("click", () =>
      setTheme(theme() === "dark" ? "light" : "dark"));
    syncThemeButton();
  }

  function buildFooter() {
    const mount = document.getElementById("site-footer");
    if (!mount) return;
    mount.outerHTML = `
      <footer class="site-footer">
        <div class="site-footer__inner">
          <p><strong>${esc(C.title)}</strong> · ${esc(C.program)} · ${esc(C.term)}</p>
          <p>Based on the lecture notes by ${esc(C.notesAuthor)}, with adjustments by ${esc(C.adaptedBy)}.</p>
        </div>
      </footer>`;
  }

  /* ---------------- Sidebar (chapter navigation) ---------------- */
  function buildSidebar() {
    const nav = document.getElementById("sidebar");
    if (!nav) return;
    nav.classList.add("sidebar");
    nav.setAttribute("aria-label", "Course chapters");

    let html = `
      <button class="icon-btn sidebar__close" type="button" aria-label="Close course navigation">${ICONS.close}</button>
      <a class="sidebar__home" href="${ROOT}index.html">← Course home</a>
`;

    groupByPart(C.chapters).forEach(([part, partChapters], i) => {
      html += `<p class="sidebar__part" id="sb-part-${i}">${esc(part)}</p>`;
      groupBySub(partChapters).forEach(([sub, chapters], j) => {
        const label = sub ? `sb-part-${i} sb-sub-${i}-${j}` : `sb-part-${i}`;
        if (sub) html += `<p class="sidebar__sub" id="sb-sub-${i}-${j}">${esc(sub)}</p>`;
        html += `<ol aria-labelledby="${label}">`;
        chapters.forEach((c) => {
          const inner = `<span class="sidebar__num">${esc(c.num)}</span>`;
          if (c.status === "ready") {
            const cur = current && c.slug === current.slug ? ' aria-current="page"' : "";
            html += `<li><a class="sidebar__link" href="${chapterHref(c)}"${cur}>${inner}<span>${esc(c.title)}</span></a></li>`;
          } else {
            html += `<li><span class="sidebar__link is-planned">${inner}<span>${esc(c.title)}<span class="sidebar__soon">Coming soon</span></span></span></li>`;
          }
        });
        html += "</ol>";
      });
    });
    nav.innerHTML = html;
  }

  function setupDrawer() {
    const nav = document.getElementById("sidebar");
    const btn = document.querySelector(".menu-btn");
    if (!nav || !btn) return;
    const backdrop = document.createElement("div");
    backdrop.className = "backdrop";
    body.appendChild(backdrop);
    const mobile = window.matchMedia("(max-width: 900px)");

    const open = () => {
      nav.classList.add("is-open");
      backdrop.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      (nav.querySelector("[aria-current]") || nav.querySelector("a")).focus();
    };
    const close = (returnFocus) => {
      nav.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
      if (returnFocus) btn.focus();
    };
    btn.addEventListener("click", open);
    backdrop.addEventListener("click", () => close(true));
    nav.querySelector(".sidebar__close").addEventListener("click", () => close(true));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("is-open")) close(true);
    });
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a") && mobile.matches) close(false);
    });
  }

  /* ---------------- Home page course map ---------------- */
  function buildCourseMap() {
    const mount = document.getElementById("course-map");
    if (!mount) return;
    const check = svg('<path d="M20 6L9 17l-5-5"/>');
    let html = "";
    groupByPart(C.chapters).forEach(([part, chapters], i) => {
      html += `<section class="part" aria-labelledby="part-${i}">
        <h3 class="part__title" id="part-${i}">${esc(part)} <small>${chapters.length} chapter${chapters.length > 1 ? "s" : ""}</small></h3>`;
      groupBySub(chapters).forEach(([sub, subChapters]) => {
        if (sub) html += `<h4 class="part__sub">${esc(sub)}</h4>`;
        html += '<ul class="cards">';
        subChapters.forEach((c) => {
          const ready = c.status === "ready";
          const inner = `
            <span class="card__num">CHAPTER ${esc(c.num)}</span>
            <span class="card__title">${esc(c.title)}</span>
            <span class="card__summary">${esc(c.summary || "")}</span>
            <span class="card__foot">${ready
              ? `<span class="badge">${check} Available</span>`
              : '<span class="badge badge--planned">Coming soon</span>'}</span>`;
          html += ready
            ? `<li><a class="card" href="${chapterHref(c)}">${inner}</a></li>`
            : `<li><div class="card is-planned">${inner}</div></li>`;
        });
        html += "</ul>";
      });
      html += "</section>";
    });
    mount.innerHTML = html;
  }

  /* ---------------- Chapter enhancements ---------------- */
  const usedIds = new Set();
  function slugify(text) {
    let base = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/\$[^$]*\$/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
    let id = base, k = 2;
    while (usedIds.has(id) || document.getElementById(id)) id = `${base}-${k++}`;
    usedIds.add(id);
    return id;
  }

  const contentHeadings = (root) =>
    [...root.querySelectorAll("h2, h3")].filter((h) => !h.closest(".env, .box, .callout, .chapter-head, .derivation"));

  function fillChapterHead() {
    if (!current) return;
    const eyebrow = document.querySelector(".chapter-head .eyebrow");
    if (eyebrow && !eyebrow.textContent.trim()) eyebrow.textContent = `Chapter ${current.num} · ${current.part}`;
    document.title = `${current.num}. ${current.title} — ${C.title}`;
  }

  function numberSections() {
    const article = document.querySelector("main article");
    if (!article) return;
    const numbered = article.classList.contains("chapter");
    const prefix = current ? `${current.num}.` : "";
    let h2 = 0, h3 = 0;

    contentHeadings(article).forEach((h) => {
      if (!h.id) h.id = slugify(h.textContent);
      if (numbered && !h.classList.contains("unnumbered")) {
        let num;
        if (h.tagName === "H2") { h2++; h3 = 0; num = `${prefix}${h2}`; }
        else { h3++; num = `${prefix}${h2}.${h3}`; }
        h.dataset.num = num;
        h.insertAdjacentHTML("afterbegin", `<span class="secnum">${num}</span>`);
      }
      h.insertAdjacentHTML("beforeend", `<a class="anchor" href="#${h.id}" aria-label="Link to this section">#</a>`);
    });
  }

  const ENV_LABELS = {
    definition: "Definition", theorem: "Theorem", lemma: "Lemma", proposition: "Proposition",
    corollary: "Corollary", example: "Example", exercise: "Exercise", remark: "Remark"
  };
  const UNNUMBERED = new Set(["remark"]);

  function numberEnvironments() {
    const article = document.querySelector("article.chapter");
    if (!article) return;
    const prefix = current ? `${current.num}.` : "";
    let n = 0;

    article.querySelectorAll(".env").forEach((env) => {
      const type = Object.keys(ENV_LABELS).find((t) => env.classList.contains(t));
      if (!type) return;
      const label = UNNUMBERED.has(type) ? ENV_LABELS[type] : `${ENV_LABELS[type]} ${prefix}${++n}`;
      env.dataset.label = label;

      const head = document.createElement("p");
      head.className = "env__head";
      const lab = document.createElement("span");
      lab.className = "env__label";
      lab.textContent = label;
      head.appendChild(lab);
      if (env.dataset.name) {
        const name = document.createElement("span");
        name.className = "env__name";
        name.textContent = ` (${env.dataset.name})`;
        head.appendChild(name);
      }
      env.prepend(head);
      env.setAttribute("role", "group");
      env.setAttribute("aria-label", label);
    });

    let f = 0;
    article.querySelectorAll("figure.numbered, figure.viz").forEach((fig) => {
      const label = `Figure ${prefix}${++f}`;
      fig.dataset.label = label;
      const cap = fig.querySelector("figcaption");
      if (cap) cap.insertAdjacentHTML("afterbegin", `<span class="fig__label">${label}.</span> `);
    });
  }

  function setupProofs() {
    document.querySelectorAll("details.proof, details.solution").forEach((d) => {
      const summary = d.querySelector(":scope > summary");
      if (!summary) return;
      const target = d.dataset.for && document.getElementById(d.dataset.for);
      if (target && target.dataset.label) {
        summary.textContent = `${d.classList.contains("proof") ? "Proof" : "Solution"} of ${target.dataset.label}`;
      }
      summary.insertAdjacentHTML("beforeend", '<span class="summary__hint">Show</span>');
      const prev = d.previousElementSibling;
      if (!prev || !prev.classList.contains("env")) d.classList.add("standalone");
    });
  }

  function setupDerivations() {
    document.querySelectorAll(".derivation").forEach((d) => {
      if (d.dataset.title) {
        d.insertAdjacentHTML("afterbegin", `<p class="derivation__title">${esc(d.dataset.title)}</p>`);
      }
      const steps = [...d.querySelectorAll(".step")];
      if (steps.length < 2) return;

      const controls = document.createElement("div");
      controls.className = "derivation__controls";
      controls.innerHTML = `
        <button type="button" class="btn btn--primary btn--small" data-act="next">Next step</button>
        <button type="button" class="btn btn--small" data-act="all">Show all</button>
        <button type="button" class="btn btn--small" data-act="reset">Start over</button>
        <span class="derivation__progress" aria-live="polite"></span>`;
      d.appendChild(controls);

      const btn = (act) => controls.querySelector(`[data-act="${act}"]`);
      const progress = controls.querySelector(".derivation__progress");
      let shown = 1;

      function update() {
        steps.forEach((s, k) => { s.hidden = k >= shown; });
        const done = shown === steps.length;
        progress.textContent = `Step ${shown} of ${steps.length}`;
        btn("next").disabled = done;
        btn("all").disabled = done;
        btn("reset").disabled = shown === 1;
      }
      function reveal(to) {
        for (let k = shown; k < to; k++) steps[k].classList.add("is-new");
        shown = to;
        update();
        if (shown === steps.length) btn("reset").focus();
      }
      btn("next").addEventListener("click", () => reveal(shown + 1));
      btn("all").addEventListener("click", () => reveal(steps.length));
      btn("reset").addEventListener("click", () => {
        steps.forEach((s) => s.classList.remove("is-new"));
        shown = 1;
        update();
        btn("next").focus();
      });
      update();
    });
  }

  // Proofs and worked examples written as "Step 1: …", "Step 2: …" paragraphs are
  // revealed one step at a time (Next step / Show all / Start over). Text after a
  // step paragraph belongs to that step; text before the first step is always shown.
  function setupSteppedProofs() {
    const isStep = (el) => {
      if (el.tagName !== "P") return false;
      const s = el.firstElementChild;
      return !!s && s.tagName === "STRONG" && /^Step\b/.test(s.textContent.trim()) &&
        el.textContent.trim().startsWith(s.textContent.trim());
    };
    const containers = [
      ...document.querySelectorAll("details.proof > .proof__body, details.solution > .solution__body"),
      ...document.querySelectorAll(".env.example"),
    ];
    containers.forEach((box) => {
      const kids = [...box.children];
      const first = kids.findIndex(isStep);
      if (first < 0 || kids.filter(isStep).length < 2) return;

      // group the children into steps
      const steps = [];
      kids.slice(first).forEach((el) => {
        if (isStep(el) || !steps.length) {
          const wrap = document.createElement("div");
          wrap.className = "pstep";
          el.before(wrap);
          steps.push(wrap);
        }
        steps[steps.length - 1].appendChild(el);
      });

      const controls = document.createElement("div");
      controls.className = "derivation__controls pstep__controls";
      controls.innerHTML = `
        <button type="button" class="btn btn--primary btn--small" data-act="next">Next step</button>
        <button type="button" class="btn btn--small" data-act="all">Show all</button>
        <button type="button" class="btn btn--small" data-act="reset">Start over</button>
        <span class="derivation__progress" aria-live="polite"></span>`;
      box.appendChild(controls);
      const btn = (act) => controls.querySelector(`[data-act="${act}"]`);
      const progress = controls.querySelector(".derivation__progress");
      let shown = 1;

      function update() {
        steps.forEach((s, k) => { s.hidden = k >= shown; });
        const done = shown === steps.length;
        box.classList.toggle("is-partial", !done);
        progress.textContent = `Step ${shown} of ${steps.length}`;
        btn("next").disabled = done;
        btn("all").disabled = done;
        btn("reset").disabled = shown === 1;
      }
      function reveal(to, focus = true) {
        for (let k = shown; k < to; k++) steps[k].classList.add("is-new");
        shown = to;
        update();
        if (focus && shown === steps.length) btn("reset").focus();
      }
      btn("next").addEventListener("click", () => reveal(shown + 1));
      btn("all").addEventListener("click", () => reveal(steps.length));
      btn("reset").addEventListener("click", () => {
        steps.forEach((s) => s.classList.remove("is-new"));
        shown = 1;
        update();
        btn("next").focus();
      });
      // used by "Expand all proofs" and printing
      box.revealAllSteps = () => reveal(steps.length, false);
      update();
    });
  }

  function resolveRefs() {
    document.querySelectorAll("a.ref").forEach((a) => {
      if (a.textContent.trim()) return;
      const t = document.getElementById((a.getAttribute("href") || "").slice(1));
      if (!t) { a.textContent = "??"; return; }
      a.textContent = t.dataset.label || (t.dataset.num ? `Section ${t.dataset.num}` : t.textContent);
    });
  }

  function buildToc() {
    const toc = document.getElementById("toc");
    const article = document.querySelector("main article");
    if (!toc) return;
    const heads = article ? contentHeadings(article) : [];
    if (!heads.length) { toc.remove(); return; }

    toc.classList.add("toc");
    toc.setAttribute("aria-label", "On this page");
    let html = '<p class="toc__title">On this page</p><ol>';
    heads.forEach((h) => {
      const clone = h.cloneNode(true);
      clone.querySelectorAll(".anchor").forEach((a) => a.remove());
      html += `<li${h.tagName === "H3" ? ' class="toc__sub"' : ""}><a href="#${h.id}">${clone.innerHTML}</a></li>`;
    });
    html += "</ol>";

    const proofs = article.querySelectorAll("details.proof");
    if (proofs.length) {
      html += `<div class="toc__tools"><button type="button" class="btn btn--small" data-proofs>Expand all proofs</button></div>`;
    }
    toc.innerHTML = html;

    const toggle = toc.querySelector("[data-proofs]");
    if (toggle) {
      toggle.addEventListener("click", () => {
        const openAll = [...proofs].some((p) => !p.open);
        proofs.forEach((p) => {
          p.open = openAll;
          const body = p.querySelector(".proof__body");
          if (openAll && body && body.revealAllSteps) body.revealAllSteps();
        });
        toggle.textContent = openAll ? "Collapse all proofs" : "Expand all proofs";
      });
    }

    // Scroll-spy: highlight the last heading above the top of the viewport.
    const links = [...toc.querySelectorAll("ol a")];
    let ticking = false;
    function spy() {
      ticking = false;
      let idx = 0;
      heads.forEach((h, i) => { if (h.getBoundingClientRect().top < 140) idx = i; });
      links.forEach((l, i) => l.classList.toggle("is-active", i === idx));
    }
    window.addEventListener("scroll", () => {
      if (!ticking) { ticking = true; requestAnimationFrame(spy); }
    }, { passive: true });
    spy();
  }

  function buildPager() {
    const mount = document.getElementById("pager");
    if (!mount || !current) return;
    const ready = C.chapters.filter((c) => c.status === "ready");
    const i = ready.indexOf(current);
    const prev = ready[i - 1], next = ready[i + 1];
    mount.classList.add("pager");
    mount.setAttribute("aria-label", "Chapter navigation");
    mount.innerHTML =
      (prev ? `<a class="pager__prev" href="${chapterHref(prev)}"><span class="pager__dir">← Previous</span><span class="pager__title">${esc(prev.num)}. ${esc(prev.title)}</span></a>` : "") +
      (next ? `<a class="pager__next" href="${chapterHref(next)}"><span class="pager__dir">Next →</span><span class="pager__title">${esc(next.num)}. ${esc(next.title)}</span></a>` : "");
    if (!prev && !next) mount.remove();
  }

  function setupCodeBlocks() {
    document.querySelectorAll(".code").forEach((block) => {
      const pre = block.querySelector("pre");
      if (!pre) return;
      if (block.dataset.lang) {
        block.insertAdjacentHTML("afterbegin", `<span class="code__lang">${esc(block.dataset.lang)}</span>`);
      }
      if (!navigator.clipboard) return;
      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "btn btn--small code__copy";
      copy.textContent = "Copy";
      copy.setAttribute("aria-label", "Copy code to clipboard");
      copy.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(pre.innerText); copy.textContent = "Copied ✓"; }
        catch (e) { copy.textContent = "Copy failed"; }
        setTimeout(() => { copy.textContent = "Copy"; }, 2000);
      });
      block.appendChild(copy);
    });
  }

  function renderMath() {
    if (typeof window.renderMathInElement !== "function") return;
    window.renderMathInElement(body, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false },
        { left: "$", right: "$", display: false }
      ],
      macros: C.macros,
      throwOnError: false,
      ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "option"]
    });
  }

  // Open every proof/solution for printing, restore afterwards.
  function setupPrint() {
    let closed = [];
    window.addEventListener("beforeprint", () => {
      closed = [...document.querySelectorAll("details:not([open])")];
      document.querySelectorAll(".is-partial").forEach((b) => b.revealAllSteps && b.revealAllSteps());
      closed.forEach((d) => { d.open = true; });
    });
    window.addEventListener("afterprint", () => closed.forEach((d) => { d.open = false; }));
  }

  /* ---------------- Init ---------------- */
  buildHeader();
  buildSidebar();
  buildFooter();
  setupDrawer();
  buildCourseMap();
  fillChapterHead();
  numberSections();
  numberEnvironments();
  setupProofs();
  setupDerivations();
  setupSteppedProofs();
  resolveRefs();
  buildToc();
  buildPager();
  setupCodeBlocks();
  setupPrint();
  renderMath();
  setupAnalytics();

  /* ---- Analytics (GoatCounter: cookieless, no consent banner needed) ----
     Set GOATCOUNTER_CODE to the code chosen at goatcounter.com signup
     (the "xxx" in xxx.goatcounter.com). Only counts visits on the live
     site, never on localhost / file:// previews. */
  function setupAnalytics() {
    const GOATCOUNTER_CODE = "mlcourse";
    if (!GOATCOUNTER_CODE || !location.hostname.endsWith("github.io")) return;
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://gc.zgo.at/count.js";
    s.dataset.goatcounter = `https://${GOATCOUNTER_CODE}.goatcounter.com/count`;
    document.head.appendChild(s);
  }
})();
