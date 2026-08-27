// External font asset resolution shared by the editor and export preparation.
// This module stays browser-light: it does not parse fonts or import fontkit.

import {
  isRegistrableFontDef,
  normalizeFamily,
  type CustomFontDef,
  type FontAssetLoader,
  type FontAssetRequest,
  type FontManifestSource,
  type KindyFontManifest,
  type ResolvedFontsConfig,
} from "./customRegistry";

const ASSET_TIMEOUT_MS = 15_000;
const FONT_MAX_BYTES = 10 * 1024 * 1024;
const MANIFEST_MAX_BYTES = 1024 * 1024;

const loaderIds = new WeakMap<FontAssetLoader, number>();
let nextLoaderId = 1;

/** Stable cache namespace: two hosts using the same URL with different authenticated
 * transports must never share a cached FontFace promise. */
export function fontAssetCacheScope(cfg?: Pick<ResolvedFontsConfig, "loader">): string {
  const loader = cfg?.loader;
  if (!loader) return "fetch";
  let id = loaderIds.get(loader);
  if (!id) {
    id = nextLoaderId++;
    loaderIds.set(loader, id);
  }
  return `loader:${id}`;
}

function browserBaseUrl(): string | undefined {
  if (typeof document !== "undefined" && document.baseURI) return document.baseURI;
  if (typeof location !== "undefined" && location.href) return location.href;
  return undefined;
}

function resolveUrl(url: string, base?: string): string {
  try {
    return new URL(url, base ?? browserBaseUrl()).href;
  } catch {
    // Keep an opaque/blob/data URL or a relative URL in non-browser environments.
    // The configured loader may know how to resolve it.
    return url;
  }
}

function resolveDefUrls(def: CustomFontDef, base?: string): CustomFontDef {
  return {
    ...def,
    faces: {
      regular: resolveUrl(def.faces.regular, base),
      ...(def.faces.bold ? { bold: resolveUrl(def.faces.bold, base) } : {}),
      ...(def.faces.italic ? { italic: resolveUrl(def.faces.italic, base) } : {}),
      ...(def.faces.boldItalic ? { boldItalic: resolveUrl(def.faces.boldItalic, base) } : {}),
    },
    sizing: { ...def.sizing },
  };
}

function asBytes(value: ArrayBuffer | Uint8Array): Uint8Array {
  return value instanceof Uint8Array ? value : new Uint8Array(value);
}

/** Load one manifest/font through the host transport or standards-based fetch.
 * Timeout and byte limits apply to both paths, so a custom loader cannot
 * accidentally make the editor retain an unbounded response. */
export async function loadFontAssetBytes(
  cfg: Pick<ResolvedFontsConfig, "loader"> | undefined,
  request: FontAssetRequest,
  maxBytes = request.kind === "manifest" ? MANIFEST_MAX_BYTES : FONT_MAX_BYTES,
): Promise<Uint8Array> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ASSET_TIMEOUT_MS);
  try {
    let bytes: Uint8Array;
    if (cfg?.loader) {
      bytes = asBytes(await cfg.loader(request, controller.signal));
    } else {
      const response = await fetch(request.url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const declared = Number(response.headers.get("content-length"));
      if (Number.isFinite(declared) && declared > maxBytes) {
        throw new Error(`asset is larger than ${maxBytes} bytes`);
      }
      bytes = new Uint8Array(await response.arrayBuffer());
    }
    if (bytes.byteLength > maxBytes) throw new Error(`asset is larger than ${maxBytes} bytes`);
    return bytes;
  } finally {
    clearTimeout(timer);
  }
}

function manifestSource(value: string | FontManifestSource): FontManifestSource {
  return typeof value === "string" ? { url: value } : { ...value };
}

function parseManifest(bytes: Uint8Array, url: string): KindyFontManifest {
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    throw new Error(`invalid JSON in font manifest ${url}`, { cause: error });
  }
  if (!value || typeof value !== "object") throw new Error(`invalid font manifest ${url}`);
  const manifest = value as Partial<KindyFontManifest>;
  if (manifest.schemaVersion !== "1.0" || !Array.isArray(manifest.fonts)) {
    throw new Error(`unsupported font manifest ${url}; expected schemaVersion \"1.0\"`);
  }
  return manifest as KindyFontManifest;
}

/** Resolve inline relative URLs and merge any external catalogs. Manifests are
 * applied in declaration order; explicit inline `fonts` win on duplicate family
 * names. A broken catalog is reported and skipped without preventing the editor
 * from opening with its built-in fonts. */
export async function resolveFontSources(cfg: ResolvedFontsConfig): Promise<ResolvedFontsConfig> {
  const manifests = cfg.manifests ?? [];
  const merged = new Map<string, CustomFontDef>();

  for (const entry of manifests) {
    const source = manifestSource(entry);
    const manifestUrl = resolveUrl(source.url);
    try {
      const bytes = await loadFontAssetBytes(cfg, { kind: "manifest", url: manifestUrl });
      const manifest = parseManifest(bytes, manifestUrl);
      const manifestDirectory = resolveUrl(".", manifestUrl);
      const faceBase = source.baseUrl
        ? resolveUrl(source.baseUrl, manifestUrl)
        : manifest.baseUrl
          ? resolveUrl(manifest.baseUrl, manifestUrl)
          : manifestDirectory;
      for (const raw of manifest.fonts) {
        const def = resolveDefUrls(raw, faceBase);
        if (isRegistrableFontDef(def, true)) merged.set(normalizeFamily(def.family), def);
      }
    } catch (error) {
      console.warn(`[kindy-editor] failed to load font manifest ${manifestUrl}; skipped`, error);
    }
  }

  const inlineBase = cfg.baseUrl ? resolveUrl(cfg.baseUrl) : undefined;
  for (const raw of cfg.fonts) {
    const def = resolveDefUrls(raw, inlineBase);
    if (isRegistrableFontDef(def, true)) merged.set(normalizeFamily(def.family), def);
  }

  return {
    disableBuiltin: [...cfg.disableBuiltin],
    fonts: [...merged.values()],
    ...(cfg.loader ? { loader: cfg.loader } : {}),
  };
}
