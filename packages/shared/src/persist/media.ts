// Content-addressed media.
//
// An image's runtime `src` is a session-local `blob:` URL — it dies when the tab
// closes and means nothing to another client or the server, so it can't be
// persisted or replicated. Instead we address image bytes by their content
// hash (`mediaId = sha256(bytes)`): identical images dedupe automatically, the
// id is stable across sessions/machines, and a snapshot or op only ever carries
// the id. The bytes live once in a MediaStore (in-memory on the client, Postgres
// on the server) and are resolved back to a blob URL on load.

/** A stored image: its content address, MIME type, and raw bytes. */
export interface MediaBlob {
  mediaId: string;
  mime: string;
  bytes: Uint8Array;
}

/** Keyed store of media blobs. Implementations may be sync (in-memory) or async
 *  (network/db) — callers should await every result to work with both. */
export interface MediaStore {
  has(mediaId: string): boolean | Promise<boolean>;
  get(mediaId: string): MediaBlob | undefined | Promise<MediaBlob | undefined>;
  put(blob: MediaBlob): void | Promise<void>;
}

// Web Crypto is present in browsers and in Node >= 20 as `globalThis.crypto`.
// shared/ carries no DOM lib, so declare the one method we use; this binding is
// module-scoped and does not clash with the DOM's `crypto` in frontend code.
declare const crypto: {
  subtle: { digest(algorithm: string, data: Uint8Array): Promise<ArrayBuffer> };
};

/** The content address of some bytes: lowercase hex SHA-256. Both the client and
 *  the server hash with this exact algorithm so addresses agree. */
export async function mediaIdForBytes(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const view = new Uint8Array(digest);
  let hex = "";
  for (const b of view) hex += b.toString(16).padStart(2, "0");
  return hex;
}

/** An in-memory MediaStore. The frontend's default store for a session; also
 *  used by tests. */
export class MemoryMediaStore implements MediaStore {
  private readonly map = new Map<string, MediaBlob>();
  has(mediaId: string): boolean {
    return this.map.has(mediaId);
  }
  get(mediaId: string): MediaBlob | undefined {
    return this.map.get(mediaId);
  }
  put(blob: MediaBlob): void {
    this.map.set(blob.mediaId, blob);
  }
  /** Every stored id — used to bundle a doc's media for transport. */
  ids(): string[] {
    return [...this.map.keys()];
  }
}

/** Convert raw bytes to a standard base64 string. Safe for large buffers. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  const chunkSize = 0x8000;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

/** Convert a base64 string to Uint8Array bytes. */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Parse a data URL (e.g. data:image/png;base64,...) into MIME type and raw bytes. */
export function dataUrlToMedia(dataUrl: string): { mime: string; bytes: Uint8Array } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match || !match[1] || !match[2]) return null;
  return {
    mime: match[1],
    bytes: base64ToBytes(match[2]),
  };
}

/** Format a MIME type and bytes into a standard data: URL. */
export function mediaToDataUrl(mime: string, bytes: Uint8Array): string {
  return `data:${mime};base64,${bytesToBase64(bytes)}`;
}
