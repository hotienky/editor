import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveFonts } from "../config";
import { loadFontAssetBytes, resolveFontSources } from "./fontAssets";
import type { FontAssetLoader, KindyFontManifest } from "./customRegistry";

const encode = (value: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(value));

afterEach(() => vi.restoreAllMocks());

describe("external font assets", () => {
  it("loads multiple CDN manifests, resolves relative faces and lets inline fonts override", async () => {
    const manifest: KindyFontManifest = {
      schemaVersion: "1.0",
      baseUrl: "./files/",
      fonts: [
        {
          family: "Inter",
          faces: { regular: "Inter-Regular.ttf", bold: "Inter-Bold.ttf" },
          sizing: { ascent: 0.95, descent: 0.24 },
        },
        {
          family: "Noto Serif",
          faces: { regular: "NotoSerif-Regular.otf" },
          sizing: { ascent: 1.07, descent: 0.29 },
        },
      ],
    };
    const loader: FontAssetLoader = vi.fn(async (request) => {
      expect(request.kind).toBe("manifest");
      return encode(manifest);
    });
    const input = resolveFonts({
      baseUrl: "https://cdn.example.com/inline/v3/",
      manifests: ["https://cdn.example.com/catalogs/contracts.json"],
      loader,
      fonts: [
        {
          family: "Inter",
          faces: { regular: "BrandInter-Regular.ttf" },
          sizing: { ascent: 0.91, descent: 0.22 },
        },
      ],
    });

    const resolved = await resolveFontSources(input);

    expect(resolved.fonts).toHaveLength(2);
    expect(resolved.fonts.find((f) => f.family === "Inter")?.faces.regular).toBe(
      "https://cdn.example.com/inline/v3/BrandInter-Regular.ttf",
    );
    expect(resolved.fonts.find((f) => f.family === "Noto Serif")?.faces.regular).toBe(
      "https://cdn.example.com/catalogs/files/NotoSerif-Regular.otf",
    );
    expect(resolved.loader).toBe(loader);
    expect(resolved.manifests).toBeUndefined();
  });

  it("uses the configured loader for font bytes", async () => {
    const expected = new Uint8Array([0, 1, 2, 3]);
    const loader: FontAssetLoader = vi.fn(async () => expected);
    const bytes = await loadFontAssetBytes(
      { loader },
      { kind: "font", url: "https://secure.example.com/font.ttf", family: "Secure", style: "Regular" },
    );
    expect(bytes).toEqual(expected);
    expect(loader).toHaveBeenCalledOnce();
  });

  it("isolates a broken manifest and keeps inline fonts", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const loader: FontAssetLoader = vi.fn(async () => encode({ schemaVersion: "99", fonts: [] }));
    const resolved = await resolveFontSources(
      resolveFonts({
        manifests: ["https://cdn.example.com/broken.json"],
        loader,
        fonts: [
          {
            family: "Local Brand",
            faces: { regular: "https://app.example.com/brand.ttf" },
            sizing: { ascent: 0.9, descent: 0.2 },
          },
        ],
      }),
    );
    expect(resolved.fonts.map((f) => f.family)).toEqual(["Local Brand"]);
    expect(console.warn).toHaveBeenCalled();
  });
});

