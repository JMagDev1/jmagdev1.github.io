// Shared helpers. Pure functions only: this module is used by the public
// site, the admin panel and the Node build script, so it must not touch the
// DOM at import time.

export const SITE = Object.freeze({
  name: 'Jack Maguire',
  owner: 'JMagDev1',
  repo: 'jmagdev1.github.io',
  branch: 'main',
  origin: 'https://jmagdev1.github.io',
  github: 'https://github.com/JMagDev1',
  linkedin: 'https://www.linkedin.com/in/maguire-jack',
  codingSince: 2021,
});

export const STATUSES = Object.freeze({
  completed: 'Completed',
  'in-progress': 'In progress',
  ongoing: 'Ongoing',
});

export const DEFAULT_TYPES = Object.freeze(['Coding', 'Manufacturing', 'Robotics', 'Electronics']);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));

export const LIMITS = Object.freeze({
  title: 90,
  summary: 420,
  text: 4000,
  shortText: 60,
  listItems: 20,
  sections: 8,
  links: 8,
  media: 24,
  milestones: 16,
  tech: 12,
});

/** Escape text for safe use inside HTML text and double/single-quoted attributes. */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"'`]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;',
  })[c]);
}

/**
 * Return the URL if it is safe to put in an href, otherwise null.
 * Allowed: https:, http:, mailto: and plain relative paths.
 * Rejects javascript:, data:, protocol-relative (//host) URLs and anything
 * containing whitespace or control characters (browsers strip those, which is
 * a classic way to smuggle "java\tscript:").
 */
export function safeUrl(url, { allowRelative = true } = {}) {
  if (typeof url !== 'string') return null;
  const u = url.trim();
  if (!u || u.length > 2048) return null;
  if (/[\u0000-\u0020\u007F-\u009F\u2028\u2029\\]/.test(u)) return null;
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(u);
  if (scheme) {
    const s = scheme[1].toLowerCase();
    if (s === 'https' || s === 'http') {
      try { new URL(u); } catch { return null; }
      return u;
    }
    if (s === 'mailto') return u;
    return null;
  }
  if (!allowRelative || u.startsWith('//')) return null;
  return u;
}

/** Local asset paths only, e.g. "assets/projects/x/1.webp". No "..", no schemes. */
export function safeAssetPath(path) {
  if (typeof path !== 'string') return null;
  if (!/^assets\/[A-Za-z0-9._\/-]+$/.test(path)) return null;
  if (path.split('/').some((seg) => seg === '..' || seg === '.' || seg === '')) return null;
  return path;
}

/** Absolute URLs open in a new tab (that includes my other sites on github.io). */
export function isExternal(url) {
  return /^https?:\/\//i.test(url || '');
}

export function slugify(text) {
  return String(text || '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

export function isValidSlug(slug) {
  return typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 60;
}

/* ---------- Dates ----------
 * Project dates are stored as "YYYY" or "YYYY-MM". A project can be ongoing
 * (no end). Year-only dates are treated as the whole year for filtering. */

export function parseYM(value) {
  const m = /^(\d{4})(?:-(0[1-9]|1[0-2]))?$/.exec(String(value || ''));
  if (!m) return null;
  return { y: Number(m[1]), m: m[2] ? Number(m[2]) : null };
}

/** Months since year 0. edge "start" => first month of a year-only date, "end" => last. */
export function monthIndex(ym, edge = 'start') {
  if (!ym) return null;
  const month = ym.m ?? (edge === 'end' ? 12 : 1);
  return ym.y * 12 + (month - 1);
}

export function nowYM(now = new Date()) {
  return { y: now.getFullYear(), m: now.getMonth() + 1 };
}

/** {start, end} as month indexes; ongoing projects end "now". */
export function projectSpan(p, now = new Date()) {
  const s = parseYM(p.start);
  const e = p.ongoing ? nowYM(now) : (parseYM(p.end) || s);
  const start = monthIndex(s, 'start');
  let end = monthIndex(e, 'end');
  if (start == null) return null;
  if (end == null || end < start) end = start;
  return { start, end, approx: !s.m };
}

export function projectYears(p, now = new Date()) {
  const span = projectSpan(p, now);
  if (!span) return null;
  return { from: Math.floor(span.start / 12), to: Math.floor(span.end / 12) };
}

function fmtYM(ym, short = false) {
  if (!ym) return '';
  if (!ym.m) return String(ym.y);
  return `${(short ? MONTHS_SHORT : MONTHS)[ym.m - 1]} ${ym.y}`;
}

/** Human date for a project. A hand-written dateLabel always wins. */
export function dateLabel(p) {
  if (p.dateLabel && String(p.dateLabel).trim()) return String(p.dateLabel).trim();
  const s = parseYM(p.start);
  if (!s) return '';
  if (p.ongoing) return `${fmtYM(s)} – Present`;
  const e = parseYM(p.end);
  if (!e || (e.y === s.y && e.m === s.m)) return fmtYM(s);
  if (e.y === s.y && s.m && e.m) return `${MONTHS[s.m - 1]} – ${MONTHS[e.m - 1]} ${s.y}`;
  return `${fmtYM(s)} – ${fmtYM(e)}`;
}

/** Sort key: newest first by start, then by end. */
export function compareNewest(a, b) {
  const sa = projectSpan(a); const sb = projectSpan(b);
  return (sb?.start ?? 0) - (sa?.start ?? 0) || (sb?.end ?? 0) - (sa?.end ?? 0) || a.title.localeCompare(b.title);
}

export function typeKey(type) {
  return slugify(type) || 'other';
}

/** Split body text into blocks: paragraphs and "- " bullet lists. */
export function textBlocks(text) {
  const blocks = [];
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  let para = [];
  let list = null;
  const flushPara = () => { if (para.length) { blocks.push({ type: 'p', text: para.join(' ') }); para = []; } };
  const flushList = () => { if (list) { blocks.push({ type: 'ul', items: list }); list = null; } };
  for (const raw of lines) {
    const line = raw.trim();
    const bullet = /^[-•*]\s+(.+)$/.exec(line);
    if (!line) { flushPara(); flushList(); continue; }
    if (bullet) { flushPara(); (list ||= []).push(bullet[1]); continue; }
    flushList();
    para.push(line);
  }
  flushPara(); flushList();
  return blocks;
}

export function coverOf(p) {
  return (p.media || []).find((m) => m.type === 'image') || null;
}

export function milestoneProgress(p) {
  const ms = p.milestones || [];
  if (!ms.length) return null;
  const done = ms.filter((m) => m.done).length;
  return { done, total: ms.length, pct: Math.round((done / ms.length) * 100) };
}
