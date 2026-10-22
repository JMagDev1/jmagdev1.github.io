// Tiny DOM helpers. Text is always set with textContent and attributes with
// setAttribute, so data can never be interpreted as HTML.

import { ICONS } from './template.js';
import { safeUrl, safeAssetPath } from './util.js';

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (key === 'href') {
      const safe = safeUrl(String(value));
      if (safe) node.setAttribute('href', safe);
    } else if (key === 'src') {
      const safe = safeAssetPath(String(value).replace(/^(\.\.\/)+/, '')) ? String(value) : null;
      if (safe) node.setAttribute('src', safe);
    } else node.setAttribute(key, value === true ? '' : String(value));
  }
  append(node, children);
  return node;
}

export function append(node, children) {
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

const iconCache = new Map();
/** Icons are static, trusted markup from ICONS (never user data). */
export function svgIcon(name, cls = 'icon') {
  if (!iconCache.has(name)) {
    const doc = new DOMParser().parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${ICONS[name] || ''}</svg>`, 'image/svg+xml');
    iconCache.set(name, doc.documentElement);
  }
  const svg = document.importNode(iconCache.get(name), true);
  svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  return svg;
}

export function clear(node) {
  while (node.firstChild) node.firstChild.remove();
  return node;
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function debounce(fn, ms = 150) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
