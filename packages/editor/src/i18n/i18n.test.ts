import { describe, it, expect } from "vitest";
import { resolveMessages, en, vi, defaultMessages } from "./index";

describe("i18n resolution and catalogs", () => {
  it("defaults to English when locale is undefined or invalid", () => {
    expect(resolveMessages()).toBe(en);
    expect(resolveMessages("unknown-locale")).toBe(en);
    expect(defaultMessages).toBe(en);
  });

  it("resolves Vietnamese for 'vi' or 'vi-VN'", () => {
    expect(resolveMessages("vi")).toBe(vi);
    expect(resolveMessages("vi-VN")).toBe(vi);
  });

  it("resolves English for 'en' or 'en-US'", () => {
    expect(resolveMessages("en")).toBe(en);
    expect(resolveMessages("en-US")).toBe(en);
  });

  it("ensures Vietnamese and English catalogs have identical top-level structure", () => {
    const enKeys = Object.keys(en).sort();
    const viKeys = Object.keys(vi).sort();
    expect(viKeys).toEqual(enKeys);

    for (const key of enKeys) {
      const enVal = (en as Record<string, unknown>)[key];
      const viVal = (vi as Record<string, unknown>)[key];
      if (typeof enVal === "object" && enVal !== null) {
        expect(typeof viVal).toBe("object");
        expect(Object.keys(viVal as object).sort()).toEqual(Object.keys(enVal as object).sort());
      }
    }
  });

  it("verifies sample translations in Vietnamese", () => {
    expect(vi.ribbon.file).toBe("Tệp");
    expect(vi.ribbon.home).toBe("Trang chủ");
    expect(vi.ribbon.insert).toBe("Chèn");
    expect(vi.ribbon.layout).toBe("Bố cục");
    expect(vi.ribbon.table).toBe("Bảng");
    expect(vi.ribbon.view).toBe("Xem");
    expect(vi.fontDialog.title).toBe("Phông chữ");
    expect(vi.common.cancel).toBe("Hủy");
    expect(vi.common.apply).toBe("Áp dụng");
  });
});
