// Admin panel: sign in with a GitHub token, edit projects, publish.
// Everything runs in the browser; publishing is a single commit to the repo,
// which GitHub Pages then deploys.

import {
  STATUSES, DEFAULT_TYPES, LIMITS, slugify, dateLabel, compareNewest, typeKey, safeAssetPath,
} from '../lib/util.js';
import { normalizeProject, normalizeData } from '../lib/schema.js';
import { renderProjectPage, renderSitemap } from '../lib/template.js';
import { el, svgIcon, clear } from '../lib/dom.js';
import * as gh from './github.js';
import { processImage, dataUrlToBlob } from './images.js';
import { buildEditor } from './editor.js';

const $ = (sel, root = document) => root.querySelector(sel);
const clone = (v) => JSON.parse(JSON.stringify(v));
const IDLE_MS = 30 * 60 * 1000;
const WARN_MS = 2 * 60 * 1000; // warn this long before locking (WCAG 2.2.1)

/* ---------- Clickjacking guard ----------
 * If this page is embedded in a frame (for example by another page on the
 * same github.io origin), refuse to run at all: no sign-in form, no data. */
const FRAMED = (() => { try { return window.top !== window.self; } catch { return true; } })();

/* ---------- Old admin cleanup ----------
 * The previous admin stored a plain-text password in localStorage, readable by
 * every page on jmagdev1.github.io. Remove it. */
function legacyProjects() {
  try { localStorage.removeItem('adminPassword'); } catch { /* ignore */ }
  try { sessionStorage.removeItem('adminLoggedIn'); } catch { /* ignore */ }
  try {
    const list = JSON.parse(localStorage.getItem('customProjects') || '[]');
    return Array.isArray(list) ? list.filter((x) => x && typeof x === 'object' && typeof x.name === 'string') : [];
  } catch { return []; }
}

/* ---------- State ---------- */
const S = {
  mode: 'signin', // 'signin' | 'live'
  locked: false,
  user: null,
  head: null,
  dataSha: null,
  original: null,
  data: null,
  files: new Map(), // path -> { base64, url, size }
  rebuildAll: false,
  log: new Map(), // slug -> { action, title }
  legacy: legacyProjects(),
  legacyImported: false,
  idleTimer: 0,
  warnTimer: 0,
  busy: false,
};

const views = {
  signin: $('[data-admin-view="signin"]'),
  dashboard: $('[data-admin-view="dashboard"]'),
  editor: $('[data-admin-view="editor"]'),
};
function show(name) {
  if (FRAMED && name !== 'signin') name = 'signin';
  for (const [k, v] of Object.entries(views)) v.hidden = k !== name;
  $('[data-session]').hidden = name === 'signin';
  window.scrollTo(0, 0);
  const h = views[name].querySelector('h1');
  if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
}

/* ---------- Toast + confirm ---------- */
let toastTimer;
function toast(message, { link } = {}) {
  const t = $('[data-toast]');
  clear(t).append(message);
  if (link) t.append(' ', el('a', { href: link.href, target: '_blank', rel: 'noopener noreferrer' }, [link.text, el('span', { class: 'sr-only', text: ' (opens in a new tab)' })]));
  t.classList.add('is-visible');
  clearTimeout(toastTimer);
  // Long enough to read, and paused while the pointer or keyboard focus is on it.
  const hideLater = () => { clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('is-visible'), link ? 15000 : 8000); };
  t.onmouseenter = () => clearTimeout(toastTimer);
  t.onfocusin = () => clearTimeout(toastTimer);
  t.onmouseleave = hideLater;
  t.onfocusout = hideLater;
  hideLater();
}

function confirmDialog({ title, text, ok = 'OK', danger = false, typed = '' }) {
  const d = $('[data-confirm]');
  $('[data-confirm-title]').textContent = title;
  $('[data-confirm-text]').textContent = text;
  const okBtn = $('[data-confirm-ok]');
  const cancel = $('[data-confirm-cancel]');
  const typedWrap = $('[data-confirm-typed]');
  const input = $('[data-confirm-input]');
  okBtn.textContent = ok;
  okBtn.classList.toggle('btn-danger', danger);
  okBtn.classList.toggle('btn-primary', !danger);
  typedWrap.hidden = !typed;
  input.value = '';
  $('[data-confirm-typed-label]').textContent = typed ? `Type "${typed}" to confirm` : '';
  okBtn.disabled = Boolean(typed);
  const onInput = () => { okBtn.disabled = input.value.trim() !== typed; };
  input.addEventListener('input', onInput);
  return new Promise((resolve) => {
    const done = (v) => {
      input.removeEventListener('input', onInput);
      okBtn.onclick = null; cancel.onclick = null;
      d.close();
      resolve(v);
    };
    okBtn.onclick = () => done(true);
    cancel.onclick = () => done(false);
    d.oncancel = (e) => { e.preventDefault(); done(false); };
    d.showModal();
    (typed ? input : cancel).focus();
  });
}

/* ---------- Helpers ---------- */
const today = () => new Date().toISOString().slice(0, 10);
const hasChanges = () => S.log.size > 0 || S.rebuildAll;
const findProject = (slug, data = S.data) => data?.projects.find((p) => p.slug === slug);

function markChanged(slug, action, title) {
  const prev = S.log.get(slug);
  const inOriginal = Boolean(findProject(slug, S.original));
  if (action === 'deleted' && !inOriginal) S.log.delete(slug); // created and deleted before publishing
  else if (prev?.action === 'added' && action === 'updated') S.log.set(slug, { action: 'added', title });
  else S.log.set(slug, { action, title });
  // If an edit brought the project back to exactly what is published, drop it.
  if (action === 'updated' && inOriginal && JSON.stringify(findProject(slug)) === JSON.stringify(findProject(slug, S.original))) S.log.delete(slug);
}

/** Pending image files registered by the editor. */
function registerFile(path, encoded) {
  const url = URL.createObjectURL(encoded.blob);
  S.files.set(path, { base64: encoded.base64, url, size: encoded.size });
  return url;
}
function fileUrl(path) { return S.files.get(path)?.url || null; }

/* ---------- Sign in ---------- */
function initSignin() {
  const form = $('[data-signin-form]');
  const err = $('[data-signin-error]');
  const submit = $('[data-signin-submit]');
  if (FRAMED) {
    form.elements.token.disabled = true;
    submit.disabled = true;
    form.hidden = true;
    $('[data-frame-notice]').hidden = false;
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (FRAMED || S.busy) return;
    err.textContent = '';
    const token = form.elements.token.value.trim();
    form.elements.token.value = '';
    const kind = gh.tokenKind(token);
    if (kind === 'invalid') { err.textContent = "That doesn't look like a GitHub token. Fine-grained tokens start with github_pat_."; return; }
    if (kind === 'classic') { err.textContent = 'Please use a fine-grained token limited to the jmagdev1.github.io repository. Classic tokens can access all of your repositories, so they are refused here.'; return; }
    S.busy = true;
    submit.disabled = true;
    submit.textContent = 'Checking…';
    gh.setToken(token);
    try {
      const user = await gh.verify();
      if (S.locked && S.user && S.user.login !== user.login) throw new Error('Sign in with the same account to continue.');
      S.user = user;
      if (S.locked) {
        S.locked = false;
        $('[data-signin-locked]').hidden = true;
        startIdle();
        show('dashboard');
        renderDashboard();
        return;
      }
      await loadLive();
    } catch (error) {
      gh.clearToken();
      err.textContent = error.message || 'Sign in failed.';
    } finally {
      S.busy = false;
      submit.disabled = false;
      submit.textContent = 'Sign in';
    }
  });
}

async function loadLive() {
  const head = await gh.getHead();
  const file = await gh.getTextFile('data/projects.json', head);
  if (!file) throw new Error('data/projects.json was not found in the repository.');
  let raw;
  try { raw = JSON.parse(file.text); } catch { throw new Error('data/projects.json is not valid JSON. Fix it on GitHub first.'); }
  const { data, errors } = normalizeData(raw);
  S.mode = 'live';
  S.head = head;
  S.dataSha = file.sha;
  S.original = clone(data);
  S.data = clone(data);
  showDataWarnings(errors);
  startIdle();
  show('dashboard');
  renderDashboard();
}

function showDataWarnings(errors) {
  const box = $('[data-data-warnings]');
  box.hidden = !errors.length;
  clear(box);
  if (errors.length) box.append(el('strong', { text: 'Some project data needs attention: ' }), el('ul', {}, errors.map((e) => el('li', { text: e }))));
}

function signOut({ keepState = false } = {}) {
  gh.clearToken();
  clearTimeout(S.idleTimer);
  clearTimeout(S.warnTimer);
  hideIdleWarning();
  if (!keepState) {
    for (const f of S.files.values()) URL.revokeObjectURL(f.url);
    Object.assign(S, { mode: 'signin', user: null, head: null, dataSha: null, original: null, data: null, files: new Map(), rebuildAll: false, log: new Map(), locked: false });
  }
  show('signin');
}

/* Lock after inactivity: forget the token but keep unpublished work.
 * Two minutes before that, a warning offers a one-click "Stay signed in". */
function hideIdleWarning() {
  const w = $('[data-idle-warning]');
  if (w && !w.hidden) w.hidden = true;
}
function startIdle() {
  clearTimeout(S.idleTimer);
  clearTimeout(S.warnTimer);
  hideIdleWarning();
  if (S.mode !== 'live') return;
  S.warnTimer = setTimeout(() => {
    const w = $('[data-idle-warning]');
    if (!w) return;
    w.hidden = false;
  }, IDLE_MS - WARN_MS);
  S.idleTimer = setTimeout(() => {
    hideIdleWarning();
    S.locked = true;
    gh.clearToken();
    $('[data-signin-locked]').hidden = false;
    show('signin');
  }, IDLE_MS);
}
$('[data-idle-stay]')?.addEventListener('click', () => startIdle());
['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, () => { if (S.mode === 'live' && !S.locked) startIdle(); }, { passive: true }));

/* ---------- Dashboard ---------- */
function renderDashboard() {
  const sub = $('[data-dash-sub]');
  sub.textContent = `${S.data.projects.length} projects · signed in as ${S.user.login}`;
  $('[data-user]').textContent = `Signed in as ${S.user.login}`;
  renderRows();
  renderPending();
  renderLegacy();
}

function renderRows() {
  const tbody = $('[data-dash-rows]');
  const q = $('[data-dash-search]').value.trim().toLowerCase();
  clear(tbody);
  const list = [...S.data.projects].sort(compareNewest).filter((p) => !q || `${p.title} ${p.type} ${(p.tech || []).join(' ')}`.toLowerCase().includes(q));
  for (const p of list) {
    const change = S.log.get(p.slug);
    const featured = el('input', { type: 'checkbox', 'aria-label': `Show ${p.title} on the home page` });
    featured.checked = Boolean(p.featured);
    featured.addEventListener('change', () => {
      const proj = findProject(p.slug);
      if (featured.checked) {
        proj.featured = true;
        proj.order = Math.max(-1, ...S.data.projects.filter((x) => x.featured && x.slug !== p.slug).map((x) => x.order ?? 0)) + 1;
      } else { delete proj.featured; delete proj.order; }
      markChanged(p.slug, 'updated', p.title);
      renderPending();
      renderRows();
    });
    const live = S.mode === 'live' && findProject(p.slug, S.original);
    tbody.append(el('tr', {}, [
      el('td', {}, [
        el('strong', { text: p.title }),
        change ? el('span', { class: `change-badge change-badge--${change.action}`, text: change.action === 'added' ? 'New' : 'Edited' }) : null,
        el('div', { class: 'muted small', text: `projects/${p.slug}.html` }),
      ]),
      el('td', {}, [el('span', { class: 'type-pill', 'data-type': typeKey(p.type), text: p.type })]),
      el('td', { class: 'muted', text: dateLabel(p) }),
      el('td', {}, [el('span', { class: `status status--${p.status}`, text: STATUSES[p.status] })]),
      el('td', {}, [el('label', { class: 'switch' }, [featured, el('span', { class: 'switch-ui', 'aria-hidden': 'true' })])]),
      el('td', {}, [el('div', { class: 'row-actions' }, [
        el('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => openEditor(p.slug), text: 'Edit', 'aria-label': `Edit ${p.title}` }),
        live ? el('a', { class: 'btn btn-ghost btn-sm', href: `projects/${p.slug}.html`, target: '_blank', rel: 'noopener', 'aria-label': `View ${p.title} on the site (opens in a new tab)` }, ['View', svgIcon('external')]) : null,
      ])]),
    ]));
  }
  if (!list.length) tbody.append(el('tr', {}, [el('td', { colspan: '6', class: 'muted', text: 'No projects match.' })]));
}

function defaultMessage() {
  const parts = { added: [], updated: [], deleted: [] };
  for (const { action, title } of S.log.values()) parts[action].push(title);
  const out = [];
  if (parts.added.length) out.push(`Add ${parts.added.join(', ')}`);
  if (parts.updated.length) out.push(`Update ${parts.updated.join(', ')}`);
  if (parts.deleted.length) out.push(`Remove ${parts.deleted.join(', ')}`);
  if (S.rebuildAll) out.push('Rebuild project pages');
  return `${out.join('; ')}`.slice(0, 190) || 'Update portfolio';
}

function renderPending() {
  const box = $('[data-pending]');
  box.hidden = !hasChanges();
  if (box.hidden) return;
  const list = $('[data-pending-list]');
  clear(list);
  for (const [slug, { action, title }] of S.log) {
    list.append(el('li', {}, [
      el('span', { class: `change-badge change-badge--${action}`, text: action === 'added' ? 'New' : action === 'deleted' ? 'Delete' : 'Edit' }),
      el('span', { text: title }),
      action !== 'deleted' ? el('button', { class: 'link-btn', type: 'button', onclick: () => openEditor(slug), text: 'Open' }) : null,
      el('button', { class: 'link-btn', type: 'button', onclick: () => discard(slug), text: 'Undo' }),
    ]));
  }
  if (S.rebuildAll) list.append(el('li', {}, [el('span', { class: 'change-badge', text: 'Rebuild' }), el('span', { text: 'Regenerate every project page' }), el('button', { class: 'link-btn', type: 'button', onclick: () => { S.rebuildAll = false; renderPending(); }, text: 'Undo' })]));
  const msg = $('[data-commit-message]');
  msg.placeholder = defaultMessage();
  const publish = $('[data-publish]');
  publish.disabled = S.mode !== 'live' || S.busy;
  publish.textContent = 'Publish to website';
}

function discard(slug) {
  const orig = findProject(slug, S.original);
  const i = S.data.projects.findIndex((p) => p.slug === slug);
  if (orig) { if (i === -1) S.data.projects.push(clone(orig)); else S.data.projects[i] = clone(orig); } else if (i !== -1) S.data.projects.splice(i, 1);
  S.log.delete(slug);
  renderDashboard();
}

async function discardAll() {
  if (!(await confirmDialog({ title: 'Discard all changes?', text: 'Everything you have not published will be lost.', ok: 'Discard', danger: true }))) return;
  S.data = clone(S.original);
  S.log.clear();
  S.rebuildAll = false;
  renderDashboard();
}

/* ---------- Legacy (old admin) projects ---------- */
function renderLegacy() {
  const box = $('[data-legacy]');
  box.hidden = !S.legacy.length || S.legacyImported;
  if (box.hidden) return;
  clear(box).append(
    el('p', { text: `This browser still has ${S.legacy.length} project${S.legacy.length === 1 ? '' : 's'} saved by the old admin panel (they were only ever stored in this browser, not on the website).` }),
    el('div', { class: 'row-actions' }, [
      el('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: importLegacy, text: 'Import them as new projects' }),
      el('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: deleteLegacy, text: 'Delete them from this browser' }),
    ]),
  );
}

async function importLegacy() {
  const taken = new Set(S.data.projects.map((p) => p.slug));
  let imported = 0;
  for (const old of S.legacy) {
    let slug = slugify(old.name) || 'project';
    for (let n = 2; taken.has(slug); n++) slug = `${slugify(old.name) || 'project'}-${n}`;
    const year = /(\d{4})/.exec(String(old.year || ''))?.[1] || String(new Date().getFullYear());
    const raw = {
      slug, title: old.name, type: typeof old.type === 'string' && old.type !== 'N/A' ? old.type : 'Coding',
      tech: String(old.language || '').split(/,|&/).map((t) => t.trim()).filter((t) => t && t !== 'N/A'),
      start: year, end: year, dateLabel: old.year && old.year !== 'N/A' ? String(old.year) : '',
      status: /progress/i.test(old.status || '') ? 'in-progress' : 'completed',
      summary: String(old.description || old.name).slice(0, LIMITS.summary),
      about: String(old.description || ''), challenges: String(old.challenges || ''), learned: String(old.learnings || ''),
      media: [],
    };
    let n = 1;
    for (const img of (Array.isArray(old.images) ? old.images : []).slice(0, 10)) {
      const blob = await dataUrlToBlob(img);
      if (!blob) continue;
      try {
        const enc = await processImage(blob);
        const stamp = Date.now().toString(36);
        const src = `assets/projects/${slug}/${stamp}-${n}.${enc.large.ext}`;
        const thumb = `assets/projects/${slug}/${stamp}-${n}-thumb.${enc.thumb.ext}`;
        registerFile(src, enc.large); registerFile(thumb, enc.thumb);
        raw.media.push({ type: 'image', src, thumb, alt: `${old.name} image ${n}`, w: enc.large.w, h: enc.large.h });
        n++;
      } catch { /* skip unreadable image */ }
    }
    const { project, errors } = normalizeProject(raw, { existingSlugs: [...taken], isNew: true });
    if (errors.length) continue;
    taken.add(slug);
    S.data.projects.push(project);
    markChanged(slug, 'added', project.title);
    imported++;
  }
  S.legacyImported = true;
  renderDashboard();
  toast(`Imported ${imported} project${imported === 1 ? '' : 's'}. Check them, then publish.`);
}

async function deleteLegacy() {
  if (!(await confirmDialog({ title: 'Delete old browser-only projects?', text: 'They will be removed from this browser. This cannot be undone.', ok: 'Delete', danger: true }))) return;
  try { localStorage.removeItem('customProjects'); } catch { /* ignore */ }
  S.legacy = [];
  renderLegacy();
}

/* ---------- Editor ---------- */
let editor;
function openEditor(slug) {
  const existing = slug ? findProject(slug) : null;
  editor = buildEditor({
    form: $('[data-editor-form]'),
    errorsBox: $('[data-editor-errors]'),
    titleEl: $('[data-editor-title]'),
    preview: $('[data-preview]'),
    project: existing ? clone(existing) : null,
    published: Boolean(existing && findProject(slug, S.original)),
    types: [...new Set([...DEFAULT_TYPES, ...S.data.types, ...S.data.projects.map((p) => p.type)])],
    otherSlugs: S.data.projects.filter((p) => p.slug !== slug).map((p) => p.slug),
    assetVersion: S.data.assetVersion,
    registerFile,
    fileUrl,
    onSave: (project) => {
      const i = S.data.projects.findIndex((p) => p.slug === (slug || project.slug));
      // An unpublished project may have been given a new address: move its change entry.
      if (slug && slug !== project.slug) S.log.delete(slug);
      project.updated = today();
      if (i === -1) S.data.projects.push(project); else S.data.projects[i] = project;
      if (!S.data.types.includes(project.type)) S.data.types.push(project.type);
      markChanged(project.slug, slug && findProject(slug, S.original) ? 'updated' : 'added', project.title);
      show('dashboard');
      renderDashboard();
      toast(`Saved "${project.title}". Publish when you're ready to put it live.`);
    },
    onDelete: async () => {
      if (!existing) { show('dashboard'); return; }
      const ok = await confirmDialog({ title: `Delete "${existing.title}"?`, text: 'The project page and its images will be removed from the website when you publish.', ok: 'Delete project', danger: true, typed: existing.slug });
      if (!ok) return;
      S.data.projects = S.data.projects.filter((p) => p.slug !== existing.slug);
      markChanged(existing.slug, 'deleted', existing.title);
      show('dashboard');
      renderDashboard();
    },
    onCancel: async (dirty) => {
      if (dirty && !(await confirmDialog({ title: 'Leave without saving?', text: 'Your edits to this project will be lost.', ok: 'Leave', danger: true }))) return;
      show('dashboard');
      renderDashboard();
    },
  });
  show('editor');
}

/* ---------- Publish ---------- */
function mediaPaths(p) {
  return (p.media || []).flatMap((m) => [m.src, m.thumb, m.poster]).filter((x) => safeAssetPath(x));
}

async function buildChangeSet(headSha) {
  const files = new Map(); // path -> { path, base64 } | { path, delete: true }
  const put = (path, text) => files.set(path, { path, base64: gh.textToBase64(text) });
  const del = (path) => { if (!files.has(path)) files.set(path, { path, delete: true }); };
  const v = S.data.assetVersion;

  const { data, errors } = normalizeData(S.data);
  if (errors.length) throw new Error(`Fix these first: ${errors.join(' ')}`);
  data.projects.sort(compareNewest);

  for (const p of data.projects) {
    const before = findProject(p.slug, S.original);
    if (S.rebuildAll || !before || JSON.stringify(before) !== JSON.stringify(p)) put(`projects/${p.slug}.html`, renderProjectPage(p, { v }));
  }
  const referenced = new Set(data.projects.flatMap(mediaPaths));
  for (const path of referenced) {
    const f = S.files.get(path);
    if (f) files.set(path, { path, base64: f.base64 });
  }
  for (const before of S.original.projects) {
    const now = data.projects.find((p) => p.slug === before.slug);
    if (!now) {
      del(`projects/${before.slug}.html`);
      for (const path of mediaPaths(before)) if (!referenced.has(path)) del(path);
      // Also catch any stray files left in the project's image folder.
      if ((before.media || []).length) for (const path of await gh.listFolder(`assets/projects/${before.slug}`, headSha)) if (!referenced.has(path)) del(path);
    } else {
      for (const path of mediaPaths(before)) if (!referenced.has(path) && path.startsWith('assets/projects/')) del(path);
    }
  }
  const dataText = `${JSON.stringify(data, null, 2)}\n`;
  put('data/projects.json', dataText);
  put('sitemap.xml', renderSitemap(data.projects, today()));
  return { files: [...files.values()], data, dataText };
}

async function publish() {
  if (S.mode !== 'live' || S.busy || !hasChanges()) return;
  if (!gh.hasToken()) { S.locked = true; show('signin'); return; }
  const status = $('[data-publish-status]');
  const bar = $('[data-publish-progress]');
  const btn = $('[data-publish]');
  S.busy = true;
  btn.disabled = true;
  bar.hidden = false;
  bar.firstElementChild.style.width = '4%';
  status.textContent = 'Checking for changes made elsewhere…';
  try {
    const head = await gh.getHead();
    if (head !== S.head) {
      const file = await gh.getTextFile('data/projects.json', head);
      if (!file || file.sha !== S.dataSha) {
        throw new Error('The project data was changed somewhere else since you signed in, so publishing was stopped to avoid overwriting it. Download a backup of your changes (Maintenance → Download backup), then reload this page and sign in again.');
      }
    }
    status.textContent = 'Preparing files…';
    const { files, data, dataText } = await buildChangeSet(head);
    const changedSlugs = [...S.log].filter(([, v]) => v.action !== 'deleted').map(([slug]) => slug);
    const message = ($('[data-commit-message]').value.trim() || defaultMessage()).slice(0, 200);
    status.textContent = `Uploading ${files.filter((f) => !f.delete).length} file(s)…`;
    const result = await gh.commitFiles(files, `${message}\n\nPublished from the portfolio admin panel.`, head, (done, total) => {
      bar.firstElementChild.style.width = `${Math.round((done / total) * 100)}%`;
    });
    S.head = result.sha;
    S.dataSha = result.blobs.get('data/projects.json');
    S.original = clone(data);
    S.data = clone(data);
    for (const f of S.files.values()) URL.revokeObjectURL(f.url);
    S.files.clear();
    S.log.clear();
    S.rebuildAll = false;
    if (S.legacyImported) { try { localStorage.removeItem('customProjects'); } catch { /* ignore */ } S.legacy = []; }
    $('[data-commit-message]').value = '';
    status.textContent = '';
    renderDashboard();
    toast('Published! GitHub Pages will update the live site in about a minute.', { link: { href: result.url, text: 'View the commit on GitHub' } });
    watchDeploy(dataText, changedSlugs[0]);
  } catch (err) {
    status.textContent = err.status === 422
      ? 'Someone else updated the site at the same moment, so nothing was changed. Press Publish again.'
      : (err.message || 'Publishing failed. Nothing was changed.');
  } finally {
    S.busy = false;
    bar.hidden = true;
    renderPending();
  }
}

/* ---------- Confirm the change is live for everyone ----------
 * After a commit, GitHub Pages rebuilds the public site. Poll the public data
 * file until it matches what was just published, then say so. */
let deployTimer;
function watchDeploy(expected, slug) {
  const box = $('[data-live-status]');
  clearTimeout(deployTimer);
  const started = Date.now();
  const set = (text, state, link) => {
    box.hidden = false;
    box.dataset.state = state;
    clear(box).append(el('span', { text }));
    if (link) box.append(' ', el('a', { href: link, target: '_blank', rel: 'noopener', text: 'View it' }));
  };
  set('Deploying to jmagdev1.github.io… this usually takes about a minute.', 'pending');
  const check = async () => {
    try {
      const res = await fetch(`data/projects.json?check=${Date.now()}`, { cache: 'no-store' });
      if (res.ok && (await res.text()) === expected) {
        set('Live! Your changes are now public on jmagdev1.github.io.', 'live', slug ? `projects/${slug}.html` : 'index.html');
        return;
      }
    } catch { /* keep waiting */ }
    if (Date.now() - started > 6 * 60 * 1000) {
      set('Still deploying. GitHub can take a few minutes when it is busy. Your commit is saved, so check the site again shortly.', 'slow');
      return;
    }
    deployTimer = setTimeout(check, 8000);
  };
  deployTimer = setTimeout(check, 8000);
}

/* ---------- Maintenance ---------- */
function exportBackup() {
  const blob = new Blob([`${JSON.stringify(S.data, null, 2)}\n`], { type: 'application/json' });
  const a = el('a', { download: `portfolio-backup-${today()}.json` });
  a.href = URL.createObjectURL(blob);
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* ---------- Boot ---------- */
initSignin();
$('[data-signout]').addEventListener('click', async () => {
  if (hasChanges() && !(await confirmDialog({ title: 'Sign out?', text: 'You have unpublished changes. They will be lost.', ok: 'Sign out', danger: true }))) return;
  signOut();
});
$('[data-new]').addEventListener('click', () => openEditor(null));
$('[data-dash-search]').addEventListener('input', renderRows);
$('[data-discard-all]').addEventListener('click', discardAll);
$('[data-publish]').addEventListener('click', publish);
$('[data-rebuild]').addEventListener('click', () => { S.rebuildAll = true; renderPending(); toast('All project pages will be rebuilt when you publish.'); });
$('[data-export]').addEventListener('click', exportBackup);
window.addEventListener('beforeunload', (e) => { if (S.data && hasChanges()) { e.preventDefault(); e.returnValue = ''; } });
show('signin');
