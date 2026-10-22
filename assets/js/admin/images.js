// Image uploads for the admin panel. Every image is checked by its real file
// signature (not just its name), then redrawn on a canvas and re-encoded.
// Redrawing resizes it for the web AND strips all metadata — including GPS
// location that phones embed in photos. SVG is not accepted (it can carry
// scripts).

import { bytesToBase64 } from './github.js';

export const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_PIXELS = 60e6;

function sniff(bytes) {
  const b = bytes;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'image/gif';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return null;
}

async function encode(source, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const w = Math.max(1, Math.round(source.width * scale));
  const h = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);
  let blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', quality));
  let ext = 'webp';
  // Older Safari can't encode WebP and silently returns PNG: use JPEG instead.
  if (!blob || blob.type !== 'image/webp') {
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#0b0d1a';
    ctx.fillRect(0, 0, w, h);
    blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality + 0.05));
    ext = 'jpg';
  }
  if (!blob) throw new Error('This browser could not process the image.');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return { blob, base64: bytesToBase64(bytes), w, h, ext, size: bytes.length };
}

/**
 * @param {File|Blob} file
 * @returns {Promise<{ large, thumb, name }>} encoded versions ready to commit
 */
export async function processImage(file) {
  if (file.size > MAX_INPUT_BYTES) throw new Error(`"${file.name || 'Image'}" is larger than 20 MB.`);
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const type = sniff(head);
  if (!type) throw new Error(`"${file.name || 'File'}" isn't a PNG, JPEG, WebP or GIF image.`);
  let bitmap;
  try {
    bitmap = await createImageBitmap(new Blob([file], { type }), { imageOrientation: 'from-image' });
  } catch {
    throw new Error(`"${file.name || 'Image'}" couldn't be read. It may be damaged.`);
  }
  if (bitmap.width * bitmap.height > MAX_PIXELS) { bitmap.close?.(); throw new Error('That image is too large (over 60 megapixels).'); }
  try {
    const large = await encode(bitmap, 1600, 0.8);
    const thumb = await encode(bitmap, 720, 0.72);
    return { large, thumb, name: file.name || 'image' };
  } finally {
    bitmap.close?.();
  }
}

export async function dataUrlToBlob(dataUrl) {
  const m = /^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(String(dataUrl));
  if (!m) return null;
  const bin = atob(m[2].replace(/\s+/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: m[1] });
}
