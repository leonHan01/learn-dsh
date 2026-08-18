const PAGES = [
  { id: "home", title: "首页", group: "入门", file: "README.zh.md" },
  { id: "en", title: "README (EN)", group: "入门", file: "README.md" },
  { id: "path", title: "学习路径", group: "入门", file: "00-学习路径.md" },
  { id: "course", title: "课表", group: "入门", file: "course/README.md" },
  { id: "architecture", title: "架构图", group: "入门", file: "course/architecture.md" },
  { id: "walkthrough", title: "一次请求跟读", group: "入门", file: "course/walkthrough.md" },
  { id: "cheatsheet", title: "速查", group: "入门", file: "course/cheatsheet.md" },
  { id: "mistakes", title: "易错", group: "入门", file: "course/mistakes.md" },
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

const FILE_TO_ID = Object.fromEntries(PAGES.map((p) => [p.file, p.id]));

function pageById(id) {
  return PAGES.find((p) => p.id === id) || PAGES[0];
}

function mapHref(href) {
  if (!href) return href;
  if (/^https?:\/\//.test(href) || href.startsWith("mailto:")) return href;
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

function currentId() {
  const raw = location.hash.replace(/^#\/?/, "");
  if (raw.startsWith("hw/")) return raw;
  return raw || "home";
}

async function loadMarkdown(file) {
  const res = await fetch(`../${file}`);
  if (!res.ok) throw new Error(`${res.status} ${file}`);
  return res.text();
}

function configureMarked() {
  const renderer = {
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

async function render() {
  const id = currentId();
  const status = document.getElementById("status");
  const prose = document.getElementById("prose");
  const search = document.getElementById("search").value.trim().toLowerCase();

  if (id.startsWith("hw/")) {
    const name = decodeURIComponent(id.slice(3));
    renderNav("");
    status.textContent = name + ".md";
    try {
      const md = await loadMarkdown(`${name}.md`);
      prose.innerHTML = marked.parse(md);
    } catch (err) {
      prose.innerHTML = `<p class="error">打不开作业 ${name}.md：${err.message}</p>`;
    }
    return;
  }

  const page = pageById(id);
  renderNav(page.id);
  status.textContent = page.file;
  document.title = `${page.title} · learn_dsh`;

  try {
    const md = await loadMarkdown(page.file);
    prose.innerHTML = marked.parse(md) + neighborHtml(page.id);
    if (search) highlight(prose, search);
    if (window.mermaid) {
      await mermaid.run({ querySelector: "#prose .mermaid" });
    }
    const heading = location.hash.split("#")[2];
    if (heading) {
      const el = document.getElementById(heading) || document.getElementById(decodeURIComponent(heading));
      el?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  } catch (err) {
    prose.innerHTML = `<p class="error">加载失败：${err.message}。请确认从仓库根启动了站点（learn/site/serve.sh）。</p>`;
  }
}

function highlight(root, q) {
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
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

function neighborHtml(id) {
  const i = PAGES.findIndex((p) => p.id === id);
  if (i < 0) return "";
  const prev = PAGES[i - 1];
  const next = PAGES[i + 1];
  const left = prev ? `<a href="#/${prev.id}">← ${prev.title}</a>` : "<span></span>";
  const right = next ? `<a href="#/${next.id}">${next.title} →</a>` : "<span></span>";
  return `<nav class="neighbors">${left}${right}</nav>`;
}

function boot() {
  configureMarked();
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
  document.getElementById("search").addEventListener("input", () => {
    clearTimeout(window.__q);
    window.__q = setTimeout(render, 160);
  });
  addEventListener("hashchange", render);
  render();
}

boot();
