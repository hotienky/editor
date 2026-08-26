// i18n resolver — resolves a BCP-47 locale string to the matching message
// catalog. Falls back to English for any unknown locale.
//
// Usage:
//   import { resolveMessages } from "./i18n";
//   const t = resolveMessages("vi");  // → Vietnamese catalog
//   const t = resolveMessages();      // → navigator.language → auto-detect

import type { EditorMessages } from "./types";
export type { EditorMessages };
export type { FontDialogMessages } from "./types";
export type { ParagraphDialogMessages } from "./types";
export type { PageLayoutMessages } from "./types";
export type { TablePropertiesMessages } from "./types";
export type { StyleManagerMessages } from "./types";
export type { TocPropertiesMessages } from "./types";
export type { SymbolPickerMessages } from "./types";

import { en } from "./en";
import { vi } from "./vi";

/** All registered locales. Add new languages here. */
const CATALOGS: Record<string, EditorMessages> = {
  en,
  vi,
};

/**
 * Resolve a BCP-47 locale string (e.g. "vi", "vi-VN", "en-US") to the
 * matching message catalog. Uses the two-letter language code only.
 * Falls back to English if the locale is not recognized.
 *
 * When `locale` is omitted the function auto-detects from `navigator.language`
 * (browser) or falls back to "en" in non-browser environments.
 */
export function resolveMessages(locale?: string): EditorMessages {
  const raw = locale ?? (typeof navigator !== "undefined" ? navigator.language : "en") ?? "en";
  // Extract the primary language subtag (first two/three lowercase letters).
  const lang = raw.split(/[-_]/)[0]!.toLowerCase();
  return CATALOGS[lang] ?? en;
}

/** Convenience: the built-in English catalog (useful as a type-safe default). */
export { en, vi, en as defaultMessages };
