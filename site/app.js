const PAGES = [
  { id: "home", title: "首页", group: "索引", file: "README.zh.md" },
  { id: "course", title: "课表", group: "索引", file: "course/README.md" },
  { id: "path", title: "学习路径", group: "索引", file: "00-学习路径.md" },
  { id: "en", title: "README (EN)", group: "索引", file: "README.md" },
  { id: "sample", title: "作业范例", group: "索引", file: "course/homework-sample.md", neighbors: false },
  { id: "architecture", title: "架构图", group: "图与对照", file: "course/architecture.md" },
  { id: "walkthrough", title: "一次请求跟读", group: "图与对照", file: "course/walkthrough.md" },
  { id: "compare", title: "vs Pi / Codex", group: "图与对照", file: "course/compare.md" },
  { id: "examples", title: "例子册", group: "图与对照", file: "course/examples.md" },
  { id: "cheatsheet", title: "速查", group: "图与对照", file: "course/cheatsheet.md" },
  { id: "mistakes", title: "易错", group: "图与对照", file: "course/mistakes.md" },
  { id: "day-01", title: "第 1 天 · 跑起来", group: "核心周", file: "course/day-01.md" },
  { id: "day-02", title: "第 2 天 · Cordis", group: "核心周", file: "course/day-02.md" },
  { id: "day-03", title: "第 3 天 · 架构", group: "核心周", file: "course/day-03.md" },
  { id: "day-04", title: "第 4 天 · session", group: "核心周", file: "course/day-04.md" },
  { id: "day-05", title: "第 5 天 · tools", group: "核心周", file: "course/day-05.md" },
  { id: "day-06", title: "第 6 天 · agent 接口", group: "核心周", file: "course/day-06.md" },
  { id: "day-06-loop", title: "第 6 天续 · loop", group: "核心周", file: "course/day-06-loop.md" },
  { id: "day-07", title: "第 7 天 · 启动", group: "核心周", file: "course/day-07.md" },
  { id: "day-08", title: "第 8 天 · seam", group: "核心周", file: "course/day-08.md" },
  { id: "day-09", title: "第 9 天 · 数据平面", group: "进阶周", file: "course/day-09.md" },
  { id: "day-10", title: "第 10 天 · 多智能体", group: "进阶周", file: "course/day-10.md" },
  { id: "day-11", title: "第 11 天 · 人机交互", group: "进阶周", file: "course/day-11.md" },
  { id: "day-12", title: "第 12 天 · 工程", group: "进阶周", file: "course/day-12.md" },
];

const LAST_KEY = "learn_dsh.page";
const DAY_PAGES = PAGES.filter((p) => p.id.startsWith("day-"));
const mdCache = new Map();

let viewingId = "home";
let slugCounts = Object.create(null);
let lastPageId = "";
let catalog = null;

function pageById(id) {
  return PAGES.find((p) => p.id === id);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function parseLocation() {
  const raw = location.hash.replace(/^#\/?/, "");
  if (!raw) return { id: "home", heading: "" };
  const i = raw.indexOf("#");
  if (i < 0) return { id: raw, heading: "" };
  return { id: raw.slice(0, i) || "home", heading: raw.slice(i + 1) };
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, "")
    .replace(/ /g, "-");
}

function uniqueSlug(text) {
  const base = slugify(text) || "section";
  const n = slugCounts[base] || 0;
  slugCounts[base] = n + 1;
  return n === 0 ? base : `${base}-${n}`;
}

function compactId(value) {
  return value.replace(/-/g, "");
}

function findHeading(heading) {
  if (!heading) return null;
  let decoded = heading;
  try {
    decoded = decodeURIComponent(heading);
  } catch {
    decoded = heading;
  }
  const exact = document.getElementById(decoded) || document.getElementById(heading);
  if (exact) return exact;
  const want = compactId(decoded);
  for (const node of document.querySelectorAll("#prose h1[id], #prose h2[id], #prose h3[id], #prose h4[id]")) {
    if (compactId(node.id) === want) return node;
  }
  return null;
}

function mapHref(href) {
  if (!href) return href;
  if (/^https?:\/\//.test(href) || href.startsWith("mailto:")) return href;
  if (href.startsWith("#") && !href.startsWith("#/")) {
    return `#/${viewingId}${href}`;
  }
  const bare = href.split("#")[0].replace(/^\.\//, "").replace(/^\.\.\//, "");
  const hash = href.includes("#") ? href.slice(href.indexOf("#")) : "";
  const aliases = {
    "architecture.md": "architecture",
    "course/architecture.md": "architecture",
    "walkthrough.md": "walkthrough",
    "course/walkthrough.md": "walkthrough",
    "cheatsheet.md": "cheatsheet",
    "course/cheatsheet.md": "cheatsheet",
    "mistakes.md": "mistakes",
    "course/mistakes.md": "mistakes",
    "compare.md": "compare",
    "course/compare.md": "compare",
    "examples.md": "examples",
    "course/examples.md": "examples",
    "homework-sample.md": "sample",
    "course/homework-sample.md": "sample",
    "00-学习路径.md": "path",
    "README.zh.md": "home",
    "README.md": "en",
    "course/README.md": "course",
  };
  if (aliases[bare]) return `#/${aliases[bare]}${hash === "#" ? "" : hash}`;
  const day = bare.match(/(?:course\/)?(day-[\w-]+)\.md$/);
  if (day) return `#/${day[1]}${hash === "#" ? "" : hash}`;
  const hw = bare.match(/^(\d{2}-.+)\.md$/);
  if (hw) return `#/hw/${encodeURIComponent(hw[1])}`;
  return href;
}

function renderNav(active) {
  const nav = document.getElementById("nav");
  let html = "";
  let group = "";
  for (const page of PAGES) {
    if (page.group !== group) {
      group = page.group;
      html += `<div class="nav-group">${group}</div>`;
    }
    html += `<a class="nav${page.id === active ? " active" : ""}" href="#/${page.id}">${page.title}</a>`;
  }
  nav.innerHTML = html;
}

function collapseNavIfMobile() {
  const fold = document.querySelector(".nav-fold");
  if (fold && window.matchMedia("(max-width: 860px)").matches) {
    fold.open = false;
  }
}

function showBanner(text) {
  const banner = document.getElementById("banner");
  if (!banner) return;
  banner.hidden = !text;
  banner.textContent = text || "";
}

async function loadMarkdown(file) {
  const res = await fetch(`../${file}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${file}`);
  const text = await res.text();
  mdCache.set(file, text);
  return text;
}

function configureMarked() {
  const renderer = {
    heading({ text, tokens, depth }) {
      const html = this.parser.parseInline(tokens);
      const id = uniqueSlug(text);
      return `<h${depth} id="${id}">${html}</h${depth}>\n`;
    },
    link({ href, title, text }) {
      const mapped = mapHref(href);
      const titleAttr = title ? ` title="${title}"` : "";
      const ext = /^https?:\/\//.test(mapped) ? ` target="_blank" rel="noreferrer"` : "";
      return `<a href="${mapped}"${titleAttr}${ext}>${text}</a>`;
    },
    code({ text, lang }) {
      if (lang === "mermaid") {
        return `<pre class="mermaid">${text.replace(/</g, "&lt;")}</pre>`;
      }
      const cls = lang ? ` class="language-${lang}"` : "";
      return `<pre><code${cls}>${text.replace(/</g, "&lt;")}</code></pre>`;
    },
  };
  marked.use({ gfm: true, renderer });
}

function neighborList(page) {
  if (!page || page.neighbors === false) return [];
  if (page.id.startsWith("day-")) return DAY_PAGES;
  return PAGES.filter((p) => p.group === page.group && p.neighbors !== false);
}

function neighborHtml(page) {
  const list = neighborList(page);
  const i = list.findIndex((p) => p.id === page.id);
  if (i < 0) return "";
  const prev = list[i - 1];
  const next = list[i + 1];
  const left = prev ? `<a href="#/${prev.id}">← ${prev.title}</a>` : "<span></span>";
  const right = next ? `<a href="#/${next.id}">${next.title} →</a>` : "<span></span>";
  return `<nav class="neighbors">${left}<span class="neighbor-hint">[ / ]</span>${right}</nav>`;
}

function insertToc(prose, pageId) {
  const heads = [...prose.querySelectorAll(":scope > h2")];
  if (heads.length < 6) return;
  const nav = document.createElement("details");
  nav.className = "toc";
  if (heads.length < 12) nav.open = true;
  const links = heads
    .map((h) => {
      const raw = h.textContent.trim();
      const num = raw.match(/^\d+/)?.[0];
      const label = num || raw.slice(0, 12);
      return `<a href="#/${pageId}#${h.id}" title="${escapeHtml(raw)}">${escapeHtml(label)}</a>`;
    })
    .join("");
  nav.innerHTML = `<summary>本页章节（${heads.length}）</summary><div class="toc-links">${links}</div>`;
  const h1 = prose.querySelector(":scope > h1");
  if (h1) h1.after(nav);
  else prose.prepend(nav);
}

function enhanceCode(root) {
  for (const pre of root.querySelectorAll("pre:not(.mermaid)")) {
    if (pre.parentElement.classList.contains("code-wrap")) continue;
    const wrap = document.createElement("div");
    wrap.className = "code-wrap";
    pre.replaceWith(wrap);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy";
    btn.textContent = "复制";
    const source = pre.querySelector("code") || pre;
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(source.textContent);
        btn.textContent = "已复制";
        setTimeout(() => {
          btn.textContent = "复制";
        }, 1200);
      } catch {
        btn.textContent = "复制失败";
      }
    });
    wrap.append(btn, pre);
  }
}

function clearMarks(root) {
  for (const mark of [...root.querySelectorAll("mark")]) {
    mark.replaceWith(document.createTextNode(mark.textContent));
  }
  root.normalize();
}

function highlight(root, q) {
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (node.parentElement.closest("mark, .mermaid, .toc, .neighbors, .copy")) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walk.nextNode()) nodes.push(walk.currentNode);
  for (const node of nodes) {
    const i = node.nodeValue.toLowerCase().indexOf(q);
    if (i < 0) continue;
    const span = document.createElement("mark");
    const after = node.splitText(i);
    after.splitText(q.length);
    span.textContent = after.nodeValue;
    after.parentNode.replaceChild(span, after);
  }
}

function query() {
  return document.getElementById("search").value.trim().toLowerCase();
}

function updateHits(currentId) {
  const box = document.getElementById("hits");
  if (!box) return;
  const q = query();
  if (!q || !catalog) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }
  const hits = catalog.filter(
    (row) => row.id !== currentId && (row.title.toLowerCase().includes(q) || row.text.includes(q)),
  );
  if (!hits.length) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }
  box.hidden = false;
  const shown = hits.slice(0, 8);
  box.innerHTML =
    `<span class="hits-label">其他页 ${hits.length}</span>` +
    shown.map((row) => `<a href="#/${row.id}">${row.title}</a>`).join("") +
    (hits.length > 8 ? `<span class="hits-more">…</span>` : "");
}

function applySearch(currentId) {
  const prose = document.getElementById("prose");
  const q = query();
  clearMarks(prose);
  if (q) highlight(prose, q);
  updateHits(currentId);
}

async function buildCatalog() {
  if (catalog) return;
  catalog = await Promise.all(
    PAGES.map(async (p) => ({
      id: p.id,
      title: p.title,
      text: (await loadMarkdown(p.file)).toLowerCase(),
    })),
  );
  const loc = parseLocation();
  const page = pageById(loc.id);
  updateHits(loc.id.startsWith("hw/") || !page ? "" : page.id);
}

function remember(id) {
  if (!id || id.startsWith("hw/") || !pageById(id)) return;
  try {
    localStorage.setItem(LAST_KEY, id);
  } catch {
    /* private mode */
  }
}

function renderContinue(currentId) {
  const el = document.getElementById("continue");
  if (!el) return;
  let last = "";
  try {
    last = localStorage.getItem(LAST_KEY) || "";
  } catch {
    last = "";
  }
  const page = pageById(last);
  if (!page || last === currentId) {
    el.hidden = true;
    el.removeAttribute("href");
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.href = `#/${last}`;
  el.textContent = `继续：${page.title}`;
}

async function render() {
  const { id, heading } = parseLocation();
  const status = document.getElementById("status");
  const prose = document.getElementById("prose");
  const pageChanged = id !== lastPageId;

  if (id.startsWith("hw/")) {
    const name = decodeURIComponent(id.slice(3));
    viewingId = id;
    lastPageId = id;
    renderNav("");
    renderContinue("");
    status.textContent = name + ".md";
    try {
      slugCounts = Object.create(null);
      const md = await loadMarkdown(`${name}.md`);
      prose.innerHTML = marked.parse(md);
      enhanceCode(prose);
      applySearch("");
    } catch (err) {
      prose.innerHTML = `<p class="error">打不开作业 ${name}.md：${err.message}</p>`;
    }
    if (pageChanged) collapseNavIfMobile();
    return;
  }

  const page = pageById(id);
  if (!page) {
    viewingId = "home";
    lastPageId = id;
    renderNav("");
    renderContinue("");
    status.textContent = "未找到";
    document.title = "未找到 · learn_dsh";
    prose.innerHTML = `<p class="error">没有这一页：<code>${escapeHtml(id)}</code>。<a href="#/home">回首页</a> · <a href="#/day-01">第 1 天</a></p>`;
    if (pageChanged) collapseNavIfMobile();
    return;
  }

  viewingId = page.id;
  renderNav(page.id);
  renderContinue(page.id);
  status.textContent = page.file;
  document.title = `${page.title} · learn_dsh`;
  remember(page.id);

  try {
    slugCounts = Object.create(null);
    const md = await loadMarkdown(page.file);
    if (catalog) {
      const row = catalog.find((r) => r.id === page.id);
      if (row) row.text = md.toLowerCase();
    }
    prose.innerHTML = marked.parse(md) + neighborHtml(page);
    insertToc(prose, page.id);
    enhanceCode(prose);
    if (window.mermaid) {
      await mermaid.run({ querySelector: "#prose .mermaid" });
    }
    applySearch(page.id);
    const el = findHeading(heading);
    if (el) el.scrollIntoView();
    else if (pageChanged) window.scrollTo(0, 0);
  } catch (err) {
    prose.innerHTML = `<p class="error">加载失败：${err.message}。请确认从仓库根启动了站点（learn/site/serve.sh）。</p>`;
  }
  lastPageId = id;
  if (pageChanged) collapseNavIfMobile();
}

function goNeighbor(dir) {
  const { id } = parseLocation();
  if (id.startsWith("hw/")) return;
  const page = pageById(id);
  if (!page) return;
  const list = neighborList(page);
  const i = list.findIndex((p) => p.id === page.id);
  const dest = list[i + dir];
  if (dest) location.hash = `#/${dest.id}`;
}

function boot() {
  if (!window.marked) {
    showBanner("Marked 没从 jsDelivr 加载。检查网络，或直接打开仓库里的 .md。");
    return;
  }
  if (!window.mermaid) {
    showBanner("Mermaid 没加载，图会显示为代码块。没外网时直接读 .md。");
  }
  configureMarked();
  if (window.mermaid) {
    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      securityLevel: "loose",
      themeVariables: {
        fontFamily: "Iowan Old Style, Palatino, Songti SC, serif",
        primaryColor: "#f3e4d6",
        primaryTextColor: "#1c1915",
        lineColor: "#8a3d1b",
        secondaryColor: "#fffdf8",
        tertiaryColor: "#f6f4ef",
      },
    });
  }
  document.getElementById("search").addEventListener("input", () => {
    clearTimeout(window.__q);
    window.__q = setTimeout(() => {
      const { id } = parseLocation();
      const page = pageById(id);
      applySearch(id.startsWith("hw/") || !page ? "" : page.id);
    }, 160);
  });
  addEventListener("hashchange", render);
  addEventListener("keydown", (e) => {
    if (e.isComposing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest("input, textarea, select")) return;
    if (e.key === "[") goNeighbor(-1);
    if (e.key === "]") goNeighbor(1);
  });
  render().then(() => {
    buildCatalog().catch(() => {});
  });
}

boot();
