// ────────────────────────────────────────────────────────────
// STORAGE SERVICE  (v3)
// ────────────────────────────────────────────────────────────
// Third-pass fixes:
//   • Check base64 size BEFORE decoding (decoding a 20 MB string
//     costs memory we don't need to spend on an input we'll reject).
//   • Return error-typed failures so callers can discriminate.
//   • Defensive mime parse (some browsers leave out the type).
// ────────────────────────────────────────────────────────────

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const MAX_BASE64_CHARS = Math.ceil(MAX_INPUT_BYTES * 4 / 3) + 32;
const UPLOAD_TIMEOUT_MS = 30_000;
const ALLOWED_MIME = /^image\/(jpeg|png|webp|gif|heic|heif)$/i;
const ALLOWED_ANY_MIME = /^(image\/(jpeg|png|webp|gif|heic|heif)|audio\/(webm|ogg|mpeg|mp3|wav|aac|mp4|x-m4a))$/i;

function sanitisePath(p) {
  if (!p || typeof p !== 'string') throw new Error('invalid storage path');
  if (p.length > 512) throw new Error('storage path too long');
  // Reject obvious traversal / absolute / suspicious paths up front
  // rather than trying to clean them (defence in depth).
  if (p.includes('..') || p.startsWith('/') || p.startsWith('\\')) {
    throw new Error('invalid storage path');
  }
  if (/[\u0000-\u001f]/.test(p)) throw new Error('invalid storage path');
  // Allow only safe filename characters.
  const cleaned = p.replace(/[^a-zA-Z0-9_\-./]/g, '_');
  if (!cleaned) throw new Error('invalid storage path');
  return cleaned;
}

export async function compressImage(blob, maxWidth = 1280, quality = 0.82) {
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const ratio = Math.min(1, maxWidth / img.width);
          const w = Math.max(1, Math.round(img.width * ratio));
          const h = Math.max(1, Math.round(img.height * ratio));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(
            b => (b ? resolve(b) : reject(new Error('compression failed'))),
            'image/jpeg',
            quality
          );
        } catch (e) { reject(e); }
      };
      img.onerror = () => reject(new Error('image load failed'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function uploadImage(bucket, path, blob) {
  if (!(blob instanceof Blob)) throw new Error('upload expects a Blob');
  if (!ALLOWED_MIME.test(blob.type || 'image/jpeg')) {
    throw new Error('unsupported mime type');
  }
  if (blob.size > MAX_INPUT_BYTES) throw new Error('file too large');
  const safe = sanitisePath(path);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPLOAD_TIMEOUT_MS);

  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${safe}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': blob.type || 'image/jpeg',
        'x-upsert': 'true',
      },
      body: blob,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`upload failed (${res.status}): ${txt}`);
    }
    return getPublicUrl(bucket, safe);
  } finally {
    clearTimeout(timer);
  }
}

export function getPublicUrl(bucket, path) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${sanitisePath(path)}`;
}

/**
 * Convert a data: URL to a Blob. Size-checks the base64 payload BEFORE
 * decoding so we don't allocate memory for data we'll reject.
 */
export function dataUrlToBlob(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    throw new Error('expected a data: URL');
  }
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx < 0) throw new Error('malformed data URL');
  const header = dataUrl.slice(0, commaIdx);
  const base64 = dataUrl.slice(commaIdx + 1);
  if (base64.length > MAX_BASE64_CHARS) throw new Error('file too large');

  const mime = (header.match(/data:(.*?);/) || [])[1] || 'image/jpeg';
  if (!ALLOWED_MIME.test(mime)) throw new Error('unsupported mime type');

  try {
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    return new Blob([array], { type: mime });
  } catch {
    throw new Error('invalid base64');
  }
}

export async function uploadAny(bucket, path, input) {
  let blob;
  if (input instanceof Blob) blob = input;
  else if (typeof input === 'string' && input.startsWith('data:')) blob = dataUrlToBlob(input);
  else throw new Error('invalid image input');

  if (blob.size > MAX_INPUT_BYTES) throw new Error('file too large');
  const mime = (blob.type || '').toLowerCase();
  if (!ALLOWED_ANY_MIME.test(mime)) throw new Error('unsupported mime type');

  if (/^image\//.test(mime)) {
    const compressed = blob.size > 400_000 ? await compressImage(blob) : blob;
    return uploadImage(bucket, path, compressed);
  }

  const safe = sanitisePath(path);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${safe}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': mime,
        'x-upsert': 'true',
      },
      body: blob,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`upload failed (${res.status}): ${txt}`);
    }
    return getPublicUrl(bucket, safe);
  } finally {
    clearTimeout(timer);
  }
}
