// Minimal GitHub REST client for the admin panel.
//
// Security notes
// - The token lives only in this module's closure (never on window, never in
//   localStorage/sessionStorage/cookies), so other scripts on this origin and
//   other tabs can't read it. Closing or reloading the tab forgets it.
// - Requests only ever go to https://api.github.com (also enforced by the
//   page's Content-Security-Policy connect-src).
// - Commits are atomic (Git Data API) and never forced: if the branch moved
//   since we read it, the update is rejected instead of overwriting work.

import { SITE } from '../lib/util.js';

const API = 'https://api.github.com';
let token = null;

export class GitHubError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

export function tokenKind(value) {
  if (/^github_pat_[A-Za-z0-9_]{22,251}$/.test(value)) return 'fine-grained';
  if (/^gh[pousr]_[A-Za-z0-9]{30,251}$/.test(value)) return 'classic';
  return 'invalid';
}

export function setToken(value) { token = value; }
export function clearToken() { token = null; }
export function hasToken() { return Boolean(token); }

const encPath = (p) => p.split('/').map(encodeURIComponent).join('/');
const repoBase = `/repos/${encodeURIComponent(SITE.owner)}/${encodeURIComponent(SITE.repo)}`;

async function api(method, path, body) {
  if (!token) throw new GitHubError('You are signed out. Sign in again to continue.', 401);
  let res;
  try {
    res = await fetch(API + path, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      redirect: 'error',
    });
  } catch {
    throw new GitHubError('Could not reach GitHub. Check your internet connection and try again.', 0);
  }
  if (res.status === 204) return null;
  let json = null;
  try { json = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const msg = json?.message || res.statusText;
    if (res.status === 401) throw new GitHubError('GitHub rejected the token (it may have expired or been revoked).', 401);
    if (res.status === 403 && /rate limit/i.test(msg)) throw new GitHubError('GitHub rate limit reached. Wait a few minutes and try again.', 403);
    if (res.status === 403) throw new GitHubError('This token is not allowed to do that. It needs "Contents: Read and write" on this repository.', 403);
    if (res.status === 404) throw new GitHubError('Not found. Make sure the token has access to the jmagdev1.github.io repository.', 404);
    if (res.status === 409) throw new GitHubError('The repository is empty or busy. Try again in a moment.', 409);
    throw new GitHubError(`GitHub error (${res.status}): ${msg}`, res.status);
  }
  return json;
}

/** Confirms the token belongs to the site owner and can see the repository. */
export async function verify() {
  const user = await api('GET', '/user');
  if (!user || String(user.login).toLowerCase() !== SITE.owner.toLowerCase()) {
    throw new GitHubError(`This token belongs to "${user?.login}", not ${SITE.owner}.`, 403);
  }
  const repo = await api('GET', repoBase);
  return { login: user.login, name: user.name || user.login, avatar: user.avatar_url, defaultBranch: repo.default_branch || SITE.branch };
}

export async function getHead(branch = SITE.branch) {
  const ref = await api('GET', `${repoBase}/git/ref/heads/${encodeURIComponent(branch)}`);
  return ref.object.sha;
}

export function base64ToBytes(b64) {
  const bin = atob(String(b64).replace(/\s+/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function bytesToBase64(bytes) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  return btoa(bin);
}

export const textToBase64 = (text) => bytesToBase64(new TextEncoder().encode(text));

/** Read a text file at a commit. Returns { text, sha } or null if missing. */
export async function getTextFile(path, ref) {
  try {
    const file = await api('GET', `${repoBase}/contents/${encPath(path)}?ref=${encodeURIComponent(ref)}`);
    if (!file || file.type !== 'file') return null;
    if (file.encoding === 'base64' && file.content) {
      return { text: new TextDecoder('utf-8', { fatal: true }).decode(base64ToBytes(file.content)), sha: file.sha };
    }
    // Files over 1 MB come without content; fetch the blob instead.
    const blob = await api('GET', `${repoBase}/git/blobs/${encodeURIComponent(file.sha)}`);
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(base64ToBytes(blob.content)), sha: file.sha };
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

/**
 * Create one commit containing every change.
 * @param {{ path: string, base64?: string, delete?: boolean }[]} files
 * @param {string} message
 * @param {string} parentSha - head we expect to build on
 * @param {(done: number, total: number) => void} onProgress
 * @returns {{ sha: string, url: string, blobs: Map<string,string> }}
 */
export async function commitFiles(files, message, parentSha, onProgress = () => {}) {
  const parent = await api('GET', `${repoBase}/git/commits/${encodeURIComponent(parentSha)}`);
  const tree = [];
  const blobs = new Map();
  const uploads = files.filter((f) => !f.delete);
  let done = 0;
  const total = uploads.length + 2;
  // Upload blobs with limited concurrency to stay polite with the API.
  const queue = [...uploads];
  const worker = async () => {
    while (queue.length) {
      const f = queue.shift();
      const blob = await api('POST', `${repoBase}/git/blobs`, { content: f.base64, encoding: 'base64' });
      blobs.set(f.path, blob.sha);
      tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
      onProgress(++done, total);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  for (const f of files.filter((x) => x.delete)) tree.push({ path: f.path, mode: '100644', type: 'blob', sha: null });

  const newTree = await api('POST', `${repoBase}/git/trees`, { base_tree: parent.tree.sha, tree });
  const commit = await api('POST', `${repoBase}/git/commits`, { message, tree: newTree.sha, parents: [parentSha] });
  onProgress(++done, total);
  await api('PATCH', `${repoBase}/git/refs/heads/${encodeURIComponent(SITE.branch)}`, { sha: commit.sha, force: false });
  onProgress(++done, total);
  return { sha: commit.sha, url: commit.html_url, blobs };
}

/** Existing paths under a folder at a commit (used to clean up deleted projects). */
export async function listFolder(path, ref) {
  try {
    const items = await api('GET', `${repoBase}/contents/${encPath(path)}?ref=${encodeURIComponent(ref)}`);
    return Array.isArray(items) ? items.filter((i) => i.type === 'file').map((i) => i.path) : [];
  } catch (err) {
    if (err.status === 404) return [];
    throw err;
  }
}
