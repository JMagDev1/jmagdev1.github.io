// HTML templates for generated pages. Every value that comes from project data
// goes through escapeHtml() / safeUrl() / safeAssetPath() — nothing is ever
// inserted raw. Used by the build script and by the admin panel when it
// publishes a new or edited project page.

import {
  SITE, STATUSES, escapeHtml as e, safeUrl, safeAssetPath, isExternal, dateLabel,
  typeKey, textBlocks, coverOf, milestoneProgress,
} from './util.js';

export const CSP_SITE = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self'",
  "manifest-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

export const CSP_ADMIN = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  'connect-src \'self\' https://api.github.com',
  "media-src 'self' blob:",
  "frame-src 'self'",
  "base-uri 'self'",
  "form-action 'none'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

// Simple stroke icons (24x24). Static markup, no user data.
export const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  github: '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
  file: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  prev: '<path d="m15 18-6-6 6-6"/>',
  next: '<path d="m9 18 6-6-6-6"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  timeline: '<path d="M3 12h18M7 8v8M12 6v12M17 9v6"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 10h18M3 15h18M9 4v16"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
};

export function icon(name, cls = 'icon') {
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;
}

function link(href, root) {
  // Local, relative URLs are written relative to the site root; prefix them.
  if (/^(https?:|mailto:)/i.test(href) || href.startsWith('#')) return href;
  return root + href;
}

export function renderHeader({ root = '', home = false, current = '' } = {}) {
  const h = (hash) => (home ? `#${hash}` : `${root}index.html#${hash}`);
  const cur = (name) => (current === name ? ' aria-current="page"' : '');
  return `<header class="site-header" data-header>
  <div class="container header-inner">
    <a class="brand" href="${home ? '#home' : `${root}index.html`}" data-brand>
      <span class="brand-bot" aria-hidden="true">🤖</span><span class="brand-name">Jack Maguire</span>
    </a>
    <nav class="site-nav" aria-label="Main">
      <button class="nav-toggle icon-btn" type="button" aria-expanded="false" aria-controls="nav-menu" data-nav-toggle>
        ${icon('menu')}<span class="sr-only">Menu</span>
      </button>
      <ul id="nav-menu" class="nav-menu" data-nav-menu>
        <li><a href="${h('home')}">Home</a></li>
        <li><a href="${h('about')}">About</a></li>
        <li><a href="${h('projects')}">Projects</a></li>
        <li><a href="${h('timeline')}">Timeline</a></li>
        <li><a href="${h('education')}">Education</a></li>
        <li><a href="${root}projects.html"${cur('projects')}>All projects</a></li>
      </ul>
    </nav>
    <div class="header-actions">
      <button class="icon-btn search-btn" type="button" data-palette-open aria-label="Search projects" aria-keyshortcuts="Control+K Meta+K">
        ${icon('search')}<span class="search-label">Search</span><kbd class="kbd" data-kbd>Ctrl K</kbd>
      </button>
      <button class="icon-btn" type="button" data-theme-toggle aria-label="Switch colour theme">
        ${icon('sun', 'icon icon-sun')}${icon('moon', 'icon icon-moon')}
      </button>
    </div>
  </div>
</header>`;
}

export function renderFooter({ root = '' } = {}) {
  return `<footer class="site-footer">
  <div class="container footer-inner">
    <p>&copy; <span data-year>2026</span> Jack Maguire. Crafted with passion and code.</p>
    <ul class="footer-links">
      <li><a href="${SITE.github}" target="_blank" rel="noopener noreferrer">${icon('github')}GitHub</a></li>
      <li><a href="${SITE.linkedin}" target="_blank" rel="noopener noreferrer">${icon('linkedin')}LinkedIn</a></li>
      <li><a href="${root}index.html">Portfolio</a></li>
      <li><a href="${root}projects.html">All projects</a></li>
      <li><a href="${root}admin.html" rel="nofollow">${icon('lock')}Admin</a></li>
    </ul>
  </div>
</footer>`;
}

/** Full HTML document. `main` is trusted template output. */
export function renderDocument({
  root = '', title, description = '', path = '', page = '', slug = '', ogImage = '',
  scripts = [], styles = ['assets/css/site.css'], main = '', header = true, footer = true,
  csp = CSP_SITE, robots = '', v = '1', home = false, current = '', ogType = 'website',
}) {
  const canonical = `${SITE.origin}/${path}`;
  const og = ogImage ? `${SITE.origin}/${ogImage}` : `${SITE.origin}/assets/img/og-image.png`;
  return `<!doctype html>
<html lang="en-GB" data-root="${e(root)}" data-page="${e(page)}"${slug ? ` data-slug="${e(slug)}"` : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${e(csp)}">
<meta name="referrer" content="strict-origin-when-cross-origin">
${robots ? `<meta name="robots" content="${e(robots)}">\n` : ''}<title>${e(title)}</title>
<meta name="description" content="${e(description)}">
<link rel="canonical" href="${e(canonical)}">
<meta property="og:type" content="${e(ogType)}">
<meta property="og:site_name" content="Jack Maguire">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(description)}">
<meta property="og:url" content="${e(canonical)}">
<meta property="og:image" content="${e(og)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0b0d1a" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#f5f6fc" media="(prefers-color-scheme: light)">
<link rel="icon" type="image/png" href="${root}assets/img/favicon.png">
<link rel="preload" href="${root}assets/fonts/poppins-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${root}assets/fonts/poppins-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
${styles.map((s) => `<link rel="stylesheet" href="${root}${s}?v=${e(v)}">`).join('\n')}
<script src="${root}assets/js/theme-init.js?v=${e(v)}"></script>
${scripts.map((s) => `<script type="module" src="${root}${s}?v=${e(v)}"></script>`).join('\n')}
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
${header ? renderHeader({ root, home, current }) : ''}
<main id="main" tabindex="-1">
${main}
</main>
${footer ? renderFooter({ root }) : ''}
</body>
</html>
`;
}

function blocksHtml(text) {
  return textBlocks(text).map((b) => (b.type === 'p'
    ? `<p>${e(b.text)}</p>`
    : `<ul class="bullets">${b.items.map((i) => `<li>${e(i)}</li>`).join('')}</ul>`)).join('\n');
}

function statusPill(status) {
  const label = STATUSES[status] || STATUSES.completed;
  return `<span class="status status--${e(status)}">${e(label)}</span>`;
}

export function typePill(type) {
  return `<span class="type-pill" data-type="${e(typeKey(type))}">${e(type)}</span>`;
}

function mediaHtml(p, root) {
  const media = (p.media || []).filter((m) => safeAssetPath(m.src));
  if (!media.length) {
    return `<div class="gallery gallery--empty"><div class="cover-art" data-type="${e(typeKey(p.type))}" aria-hidden="true"><span>${e(p.title.slice(0, 1))}</span></div></div>`;
  }
  const first = media[0];
  const stage = first.type === 'video'
    ? `<video class="gallery-media" controls preload="metadata" playsinline${first.poster ? ` poster="${root}${e(first.poster)}"` : ''}${first.w ? ` width="${first.w}" height="${first.h}"` : ''}><source src="${root}${e(first.src)}" type="video/mp4">Your browser can't play this video.</video>`
    : `<button class="gallery-zoom" type="button" data-gallery-open aria-label="Open full-screen gallery"><img class="gallery-media" src="${root}${e(first.src)}" alt="${e(first.alt)}"${first.w ? ` width="${first.w}" height="${first.h}"` : ''} decoding="async" fetchpriority="high"></button>`;
  const thumbs = media.length > 1 ? `<ul class="gallery-thumbs" role="list" aria-label="All images">
${media.map((m, i) => {
    const t = m.type === 'video' ? (m.poster || '') : (m.thumb || m.src);
    const label = m.type === 'video' ? `Play video${m.alt ? `: ${m.alt}` : ''}` : `View image ${i + 1}${m.alt ? `: ${m.alt}` : ''}`;
    return `<li><a class="thumb${i === 0 ? ' is-active' : ''}" href="${root}${e(m.src)}" data-index="${i}" aria-label="${e(label)}">${t ? `<img src="${root}${e(t)}" alt="" loading="lazy" decoding="async" width="160" height="100">` : ''}${m.type === 'video' ? `<span class="thumb-play">${icon('play')}</span>` : ''}</a></li>`;
  }).join('\n')}
</ul>` : '';
  const data = media.map((m) => ({ type: m.type, src: m.src, alt: m.alt || '', poster: m.poster || '', w: m.w || 0, h: m.h || 0 }));
  return `<section class="gallery" aria-label="Gallery" data-gallery>
  <figure class="gallery-stage">
    <div class="gallery-slot" data-gallery-slot>${stage}</div>
    ${media.length > 1 ? `<figcaption class="gallery-count" data-gallery-count>1 / ${media.length}</figcaption>` : ''}
  </figure>
  ${thumbs}
  <script type="application/json" data-gallery-items>${jsonForScript(data)}</script>
</section>`;
}

/** JSON safe to embed in a <script type="application/json"> block. */
export function jsonForScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

function milestonesHtml(p) {
  const prog = milestoneProgress(p);
  if (!prog) return '';
  return `<section class="project-section build-log" aria-labelledby="build-log">
  <div class="build-log-head">
    <h2 id="build-log">Build progress</h2>
    <div class="progress-ring" role="img" aria-label="${prog.done} of ${prog.total} milestones done">
      <svg viewBox="0 0 44 44" aria-hidden="true" focusable="false"><circle class="ring-track" cx="22" cy="22" r="18" pathLength="100"/><circle class="ring-fill" cx="22" cy="22" r="18" pathLength="100" stroke-dasharray="${prog.pct} 100"/></svg>
      <span>${prog.pct}%</span>
    </div>
  </div>
  <ol class="milestones">
${p.milestones.map((m, i) => `    <li class="milestone${m.done ? ' is-done' : ''}${i === p.milestones.findIndex((x) => !x.done) ? ' is-next' : ''}"><span class="milestone-dot" aria-hidden="true">${m.done ? icon('check') : ''}</span><span>${e(m.label)}</span><span class="sr-only">${m.done ? '(done)' : '(to do)'}</span></li>`).join('\n')}
  </ol>
</section>`;
}

function sectionHtml(id, heading, inner) {
  if (!inner) return '';
  return `<section class="project-section" aria-labelledby="${id}">
  <h2 id="${id}">${e(heading)}</h2>
  ${inner}
</section>`;
}

function linksHtml(p, root) {
  const items = (p.links || []).map((l) => {
    const url = safeUrl(l.url);
    if (!url) return '';
    const ext = isExternal(url);
    const pdf = /\.pdf$/i.test(url);
    const href = link(url, root);
    return `<li><a class="aside-link" href="${e(href)}"${ext || pdf ? ' target="_blank" rel="noopener noreferrer"' : ''}>${icon(pdf ? 'file' : ext ? 'external' : 'arrow')}<span>${e(l.label)}</span>${ext ? '<span class="sr-only"> (opens in a new tab)</span>' : ''}</a></li>`;
  }).join('\n');
  return `<div class="aside-card">
  <h2 class="aside-title">Project links</h2>
  <ul class="aside-links">
${items}
    <li><a class="aside-link" href="${root}projects.html">${icon('back')}<span>Back to all projects</span></a></li>
  </ul>
</div>`;
}

/** Inner <main> markup for a project page. Exported for the admin preview. */
export function renderProjectMain(p, { root = '../' } = {}) {
  const tech = (p.tech || []).length ? p.tech.join(', ') : 'N/A';
  const when = dateLabel(p);
  const highlights = (p.highlights || []).length
    ? `<ul class="highlights">${p.highlights.map((h) => `<li>${h.icon ? `<span aria-hidden="true">${e(h.icon)}</span> ` : ''}${e(h.text)}</li>`).join('')}</ul>` : '';
  const features = (p.features || []).length
    ? `<ul class="feature-list">${p.features.map((f) => `<li>${e(f)}</li>`).join('')}</ul>` : '';
  const extra = (p.sections || []).map((s, i) => sectionHtml(`extra-${i + 1}`, s.heading, blocksHtml(s.body))).join('\n');

  return `<article class="project-page" data-type="${e(typeKey(p.type))}">
  <div class="container">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <ol>
        <li><a href="${root}index.html">Home</a></li>
        <li><a href="${root}projects.html">Projects</a></li>
        <li aria-current="page">${e(p.title)}</li>
      </ol>
    </nav>
    <header class="project-hero">
      <p class="project-tags">${typePill(p.type)} ${statusPill(p.status)} <span class="project-date">${e(when)}</span></p>
      <h1>${e(p.title)}</h1>
      <p class="lede">${e(p.summary)}</p>
      ${highlights}
    </header>
    <div class="project-layout">
      <div class="project-main">
        ${mediaHtml(p, root)}
        ${milestonesHtml(p)}
        ${sectionHtml('about-project', 'About This Project', blocksHtml(p.about || ''))}
        ${sectionHtml('key-features', 'Key Features', features)}
        ${sectionHtml('challenges', 'Challenges & Solutions', blocksHtml(p.challenges || ''))}
        ${sectionHtml('learned', 'What I Learned', blocksHtml(p.learned || ''))}
        ${extra}
      </div>
      <aside class="project-aside" aria-label="Project details">
        <div class="aside-card">
          <h2 class="aside-title">Project details</h2>
          <dl class="spec-list">
            <div><dt>Date</dt><dd>${e(when)}</dd></div>
            <div><dt>Type</dt><dd>${e(p.type)}</dd></div>
            <div><dt>Tech stack</dt><dd>${e(tech)}</dd></div>
            <div><dt>Status</dt><dd>${statusPill(p.status)}</dd></div>
          </dl>
        </div>
        ${linksHtml(p, root)}
      </aside>
    </div>
    <nav class="project-pager" aria-label="More projects" data-pager hidden></nav>
    <section class="related" aria-labelledby="related-title" data-related hidden>
      <h2 id="related-title" class="section-title-sm">More ${e(p.type.toLowerCase())} projects</h2>
      <div class="card-grid card-grid--compact" data-related-grid></div>
    </section>
  </div>
</article>`;
}

export function renderProjectPage(p, { v = '1' } = {}) {
  const cover = coverOf(p);
  return renderDocument({
    root: '../',
    title: `${p.title} · Jack Maguire`,
    description: p.summary,
    path: `projects/${p.slug}.html`,
    page: 'project',
    slug: p.slug,
    ogImage: cover ? cover.src : '',
    ogType: 'article',
    scripts: ['assets/js/project.js'],
    main: renderProjectMain(p, { root: '../' }),
    v,
  });
}

/** Small page that forwards an old URL to its new home. */
export function renderRedirect(target, title, { depth = 1 } = {}) {
  const prefix = '../'.repeat(depth);
  const href = prefix + target;
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${e(href)}">
<link rel="canonical" href="${e(`${SITE.origin}/${target}`)}">
<title>${e(title)} has moved</title>
</head>
<body>
<p>This page has moved: <a href="${e(href)}">${e(title)}</a>.</p>
</body>
</html>
`;
}

export function renderSitemap(projects, today) {
  const urls = ['', 'projects.html', ...projects.map((p) => `projects/${p.slug}.html`)];
  const lastmod = (u) => {
    const p = projects.find((x) => `projects/${x.slug}.html` === u);
    return (p && p.updated) || today;
  };
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${e(`${SITE.origin}/${u}`)}</loc><lastmod>${e(lastmod(u))}</lastmod></url>`).join('\n')}
</urlset>
`;
}
