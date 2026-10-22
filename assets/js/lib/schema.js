// Validates and normalises project records. Used by the admin panel before
// anything is committed, and by the build script, so the published data file
// can only ever contain clean, expected values.

import {
  LIMITS, STATUSES, isValidSlug, parseYM, monthIndex, safeUrl, safeAssetPath,
} from './util.js';

const str = (v, max) => (typeof v === 'string' ? v.replace(/\r\n?/g, '\n').trim().slice(0, max) : '');
const oneLine = (v, max) => str(v, max).replace(/\s+/g, ' ');

/**
 * @returns {{ project: object, errors: string[] }}
 * errors are human readable; an empty array means the project is valid.
 */
export function normalizeProject(raw, { existingSlugs = [], isNew = false } = {}) {
  const errors = [];
  const r = raw && typeof raw === 'object' ? raw : {};

  const p = {
    slug: oneLine(r.slug, 60).toLowerCase(),
    title: oneLine(r.title, LIMITS.title),
    type: oneLine(r.type, 30),
    badge: oneLine(r.badge, 30),
    tech: [],
    start: oneLine(r.start, 7),
    end: oneLine(r.end, 7),
    ongoing: Boolean(r.ongoing),
    dateLabel: oneLine(r.dateLabel, 60),
    status: oneLine(r.status, 20),
    featured: Boolean(r.featured),
    order: Number.isFinite(Number(r.order)) ? Math.max(0, Math.min(999, Math.round(Number(r.order)))) : 999,
    summary: oneLine(r.summary, LIMITS.summary),
    highlights: [],
    about: str(r.about, LIMITS.text),
    features: [],
    challenges: str(r.challenges, LIMITS.text),
    learned: str(r.learned, LIMITS.text),
    sections: [],
    milestones: [],
    media: [],
    links: [],
    updated: oneLine(r.updated, 10),
  };

  if (!p.title) errors.push('Title is required.');
  if (!isValidSlug(p.slug)) errors.push('Page address must use lowercase letters, numbers and single hyphens (e.g. "rc-car").');
  if (isNew && existingSlugs.includes(p.slug)) errors.push(`A project with the address "${p.slug}" already exists.`);
  if (!p.type) errors.push('Type is required.');
  if (!Object.hasOwn(STATUSES, p.status)) errors.push('Choose a status.');
  if (!p.summary) errors.push('Summary is required — it is shown on the project cards.');

  const s = parseYM(p.start);
  if (!s) errors.push('Start date is required (year, and optionally month).');
  if (p.ongoing) {
    p.end = '';
  } else if (p.end) {
    const e = parseYM(p.end);
    if (!e) errors.push('End date is not valid.');
    else if (s && monthIndex(e, 'end') < monthIndex(s, 'start')) errors.push('End date is before the start date.');
  } else {
    p.end = p.start;
  }

  const tech = Array.isArray(r.tech) ? r.tech : String(r.tech || '').split(',');
  p.tech = [...new Set(tech.map((t) => oneLine(t, 30)).filter(Boolean))].slice(0, LIMITS.tech);

  for (const h of (Array.isArray(r.highlights) ? r.highlights : []).slice(0, 4)) {
    const text = oneLine(h?.text, 40);
    if (text) p.highlights.push({ icon: oneLine(h?.icon, 8), text });
  }

  const features = Array.isArray(r.features) ? r.features : String(r.features || '').split('\n');
  p.features = features.map((f) => oneLine(String(f).replace(/^[-•*]\s*/, ''), 300)).filter(Boolean).slice(0, LIMITS.listItems);

  for (const sec of (Array.isArray(r.sections) ? r.sections : []).slice(0, LIMITS.sections)) {
    const heading = oneLine(sec?.heading, 80);
    const body = str(sec?.body, LIMITS.text);
    if (heading && body) p.sections.push({ heading, body });
    else if (heading || body) errors.push('Each extra section needs both a heading and some text.');
  }

  for (const m of (Array.isArray(r.milestones) ? r.milestones : []).slice(0, LIMITS.milestones)) {
    const label = oneLine(m?.label, 120);
    if (label) p.milestones.push({ label, done: Boolean(m?.done) });
  }

  for (const l of (Array.isArray(r.links) ? r.links : []).slice(0, LIMITS.links)) {
    const label = oneLine(l?.label, LIMITS.shortText);
    const url = safeUrl(oneLine(l?.url, 2048));
    if (!label && !l?.url) continue;
    if (!label) errors.push('Every link needs a label.');
    else if (!url) errors.push(`Link "${label}" must start with https:// (or be a page on this site).`);
    else p.links.push({ label, url });
  }

  for (const m of (Array.isArray(r.media) ? r.media : []).slice(0, LIMITS.media)) {
    const type = m?.type === 'video' ? 'video' : 'image';
    const src = safeAssetPath(m?.src);
    if (!src) { errors.push('A media item has an invalid file path.'); continue; }
    const item = { type, src, alt: oneLine(m?.alt, 200) };
    const thumb = safeAssetPath(m?.thumb);
    if (thumb) item.thumb = thumb;
    const poster = safeAssetPath(m?.poster);
    if (type === 'video' && poster) item.poster = poster;
    const w = Math.round(Number(m?.w)); const h = Math.round(Number(m?.h));
    if (w > 0 && h > 0 && w < 20000 && h < 20000) { item.w = w; item.h = h; }
    if (type === 'image' && !item.alt) errors.push('Every image needs a short description (alt text) for screen readers.');
    p.media.push(item);
  }

  // Drop empty optional fields to keep the data file tidy.
  for (const k of ['badge', 'dateLabel', 'about', 'challenges', 'learned', 'updated']) if (!p[k]) delete p[k];
  for (const k of ['highlights', 'features', 'sections', 'milestones', 'media', 'links', 'tech']) if (!p[k].length && k !== 'tech') delete p[k];
  if (!p.ongoing) delete p.ongoing;
  if (!p.featured) { delete p.featured; delete p.order; }

  return { project: p, errors };
}

/** Validate the whole data file. Returns { data, errors }. */
export function normalizeData(raw) {
  const errors = [];
  const projects = [];
  const seen = new Set();
  for (const item of (Array.isArray(raw?.projects) ? raw.projects : [])) {
    const { project, errors: errs } = normalizeProject(item);
    if (seen.has(project.slug)) errs.push(`Duplicate page address "${project.slug}".`);
    seen.add(project.slug);
    if (errs.length) errors.push(`${project.title || project.slug || 'Untitled'}: ${errs.join(' ')}`);
    projects.push(project);
  }
  const types = [...new Set([...(Array.isArray(raw?.types) ? raw.types : []), ...projects.map((p) => p.type)]
    .map((t) => oneLine(t, 30)).filter(Boolean))];
  const assetVersion = /^[a-z0-9]{1,16}$/.test(raw?.assetVersion || '') ? raw.assetVersion : '1';
  return { data: { version: 1, assetVersion, types, projects }, errors };
}
