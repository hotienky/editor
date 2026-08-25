/**
 * OOXML Line Breaker (UAX #14 Compliant)
 *
 * Breaks text into lines following Unicode Standard Annex #14
 * (Line Breaking Algorithm) with Word-compatible extensions.
 *
 * Reference: UAX #14 (Unicode Line Breaking Algorithm)
 * Reference: ISO/IEC 29500 §17.3.1.15 (Line Breaking Rules)
 *
 * Supports:
 * - UAX #14 break opportunity classes
 * - Word-compatible CJK breaking
 * - Non-breaking space handling
 * - Vietnamese diacritics (no break between base + combining)
 * - Punctuation rules (no break after opening, before closing)
 * - Tab stops
 * - Justification
 * - Run-aware breaking
 */

import type { TextFragment, LayoutLine } from './ooxml-layout-types'

// ─── UAX #14 Line Break Classes ──────────────────────────────────────────────

/**
 * Unicode Line Breaking Classes (UAX #14)
 * Simplified set covering most common characters.
 */
const enum LB {
  AL = 'AL',   // Alphabetic
  BA = 'BA',   // Break After (space, hyphen)
  BB = 'BB',   // Break Before
  BK = 'BK',   // Mandatory Break
  CB = 'CB',   // Contingent Break
  CL = 'CL',   // Close Punctuation
  CM = 'CM',   // Combining Mark
  CR = 'CR',   // Carriage Return
  EX = 'EX',   // Exclamation/Question (no break before)
  GL = 'GL',   // Non-breaking (glue)
  HY = 'HY',   // Hyphen
  ID = 'ID',   // Ideographic
  IN = 'IN',   // Inseparable
  IS = 'IS',   // Number Separator
  LF = 'LF',   // Line Feed
  NS = 'NS',   // Non-Starter
  NU = 'NU',   // Number
  OP = 'OP',   // Open Punctuation
  PO = 'PO',   // Postfix Numeric
  PR = 'PR',   // Prefix Numeric
  QU = 'QU',   // Quotation
  SA = 'SA',   // South Asian
  SG = 'SG',   // Surrogate
  SP = 'SP',   // Space
  SY = 'SY',   // Symbols (no break after)
  WJ = 'WJ',   // Word Joiner (non-breaking)
  ZW = 'ZW',   // Zero Width Space (break opportunity)
  ZWJ = 'ZWJ', // Zero Width Joiner
}

/**
 * UAX #14 break table: (before, after) →是否允许断行
 * true = break allowed, false = no break
 *
 * Simplified from the full UAX #14 table.
 */
const BREAK_TABLE: Record<string, Record<string, boolean>> = {
  // Mandatory breaks
  [LB.BK]: { '*': true },
  [LB.LF]: { '*': true },
  [LB.CR]: { '*': true },

  // Non-breaking
  [LB.GL]: { '*': false },

  // Space → break after
  [LB.SP]: { '*': true },

  // Zero Width Space → break opportunity
  [LB.ZW]: { '*': true },

  // Word Joiner → no break
  [LB.WJ]: { '*': false },

  // Close punctuation → no break before
  [LB.CL]: {
    [LB.AL]: false,
    [LB.ID]: false,
    [LB.NU]: false,
    '*': true,
  },

  // Exclamation/Question → no break before
  [LB.EX]: {
    [LB.AL]: false,
    [LB.ID]: false,
    '*': true,
  },

  // Open punctuation → no break after
  [LB.OP]: {
    '*': false,
  },

  // Ideographic → break after
  [LB.ID]: {
    [LB.ID]: true,
    [LB.CL]: true,
    [LB.EX]: true,
    [LB.NU]: true,
    [LB.AL]: true,
    '*': true,
  },

  // Alphabetic → no break after (word boundary)
  [LB.AL]: {
    [LB.AL]: false,
    [LB.NU]: false,
    [LB.ID]: true,
    '*': true,
  },

  // Number → no break after
  [LB.NU]: {
    [LB.NU]: false,
    [LB.AL]: false,
    [LB.IS]: false,
    [LB.SY]: false,
    '*': true,
  },

  // Number separator → no break
  [LB.IS]: {
    [LB.NU]: false,
    '*': true,
  },

  // Symbol → no break after
  [LB.SY]: {
    [LB.NU]: false,
    '*': true,
  },

  // Hyphen → no break after (unless followed by space)
  [LB.HY]: {
    [LB.SP]: true,
    '*': false,
  },

  // Break after
  [LB.BA]: {
    [LB.SP]: true,
    '*': true,
  },

  // Combining mark → no break before
  [LB.CM]: {
    '*': false,
  },

  // Prefix numeric → no break after
  [LB.PR]: {
    [LB.NU]: false,
    [LB.AL]: false,
    '*': true,
  },

  // Postfix numeric → no break before
  [LB.PO]: {
    '*': true,
  },

  // Non-starter → no break after
  [LB.NS]: {
    '*': false,
  },

  // Quotation → no break after/before
  [LB.QU]: {
    [LB.QU]: false,
    '*': true,
  },

  // Inseparable → no break
  [LB.IN]: {
    [LB.IN]: false,
    '*': true,
  },
}

// ─── Character Classification ────────────────────────────────────────────────

/** Unicode ranges for CJK characters */
const CJK_RANGES = [
  [0x4e00, 0x9fff],   // CJK Unified Ideographs
  [0x3400, 0x4dbf],   // CJK Unified Ideographs Extension A
  [0x3040, 0x309f],   // Hiragana
  [0x30a0, 0x30ff],   // Katakana
  [0x31f0, 0x31ff],   // Katakana Phonetic Extensions
  [0xf900, 0xfaff],   // CJK Compatibility Ideographs
  [0x2e80, 0x2eff],   // CJK Radicals Supplement
  [0x3000, 0x303f],   // CJK Symbols and Punctuation
  [0xff00, 0xffef],   // Fullwidth Forms
  [0xac00, 0xd7af],   // Hangul Syllables
  [0x1100, 0x11ff],   // Hangul Jamo
  [0x3200, 0x32ff],   // Enclosed CJK Letters and Months
  [0x3300, 0x33ff],   // CJK Compatibility
  [0x20000, 0x2a6df], // CJK Extension B
  [0x2a700, 0x2b73f], // CJK Extension C
  [0x2b740, 0x2b81f], // CJK Extension D
  [0x2b820, 0x2ceaf], // CJK Extension E
  [0x2ceb0, 0x2ebef], // CJK Extension F
  [0x30000, 0x3134f], // CJK Extension G
] as const

function isCJK(code: number): boolean {
  return CJK_RANGES.some(([min, max]) => code >= min && code <= max)
}

function isSpace(code: number): boolean {
  return code === 0x0020 || code === 0x00a0 || code === 0x2002 || code === 0x2003 || code === 0x2009
}

function isHyphen(code: number): boolean {
  return code === 0x002d || code === 0x2010 || code === 0x2012 || code === 0x2013 || code === 0x2014
}

/** Vietnamese combining marks (diacritics above/below) */
const VIETNAMESE_COMBINING = new Set([
  0x0300, 0x0301, 0x0302, 0x0303, 0x0304, 0x0305, 0x0306, 0x0307,
  0x0308, 0x0309, 0x030a, 0x030b, 0x030c, 0x030d, 0x030e, 0x030f,
  0x0310, 0x0311, 0x0312, 0x0313, 0x0314, 0x0315, 0x0316, 0x0317,
  0x0318, 0x0319, 0x031a, 0x031b, 0x031c, 0x031d, 0x031e, 0x031f,
  0x0320, 0x0321, 0x0322, 0x0323, 0x0324, 0x0325, 0x0326, 0x0327,
  0x0328, 0x0329, 0x032a, 0x032b, 0x032c, 0x032d, 0x032e, 0x032f,
  0x0330, 0x0331, 0x0332, 0x0333, 0x0334, 0x0335, 0x0336, 0x0337,
  0x0338, 0x0339, 0x033a, 0x033b, 0x033c, 0x033d, 0x033e, 0x033f,
  0x0340, 0x0341, 0x0342, 0x0343, 0x0344, 0x0345, 0x0346, 0x0347,
  0x0348, 0x0349, 0x034a, 0x034b, 0x034c, 0x034d, 0x034e, 0x034f,
  0x0350, 0x0351, 0x0352, 0x0353, 0x0354, 0x0355, 0x0356, 0x0357,
  0x0358, 0x0359, 0x035a, 0x035b, 0x035c, 0x035d, 0x035e, 0x035f,
  0x0360, 0x0361, 0x0362, 0x0363,
])

/**
 * Classify a character for UAX #14 line breaking.
 */
function getLineBreakClass(code: number): LB {
  // Mandatory breaks
  if (code === 0x000a) return LB.LF   // Line Feed
  if (code === 0x000d) return LB.CR   // Carriage Return

  // Non-breaking / Word Joiner
  if (code === 0x2060 || code === 0xfeff) return LB.WJ

  // Zero Width Space
  if (code === 0x200b) return LB.ZW

  // Space
  if (code === 0x0020 || code === 0x00a0 || code === 0x2002 ||
      code === 0x2003 || code === 0x2009 || code === 0x202f ||
      code === 0x205f || code === 0x3000) return LB.SP

  // Combining marks (including Vietnamese diacritics)
  if (VIETNAMESE_COMBINING.has(code) ||
      (code >= 0x0300 && code <= 0x036f) ||
      (code >= 0x1ab0 && code <= 0x1aff) ||
      (code >= 0x1dc0 && code <= 0x1dff) ||
      (code >= 0x20d0 && code <= 0x20ff) ||
      (code >= 0xfe20 && code <= 0xfe2f)) return LB.CM

  // Hyphens
  if (code === 0x002d || code === 0x2010 || code === 0x2012 ||
      code === 0x2013 || code === 0x2014 || code === 0x2015) return LB.HY

  // Soft hyphen (break opportunity if needed)
  if (code === 0x00ad) return LB.HY

  // Open punctuation
  if (code === 0x0028 || code === 0x003c || code === 0x005b ||
      code === 0x007b || code === 0x201a || code === 0x201e ||
      code === 0x2045 || code === 0x207d || code === 0x208d ||
      code === 0x2329 || code === 0x2768 || code === 0x276a ||
      code === 0x276c || code === 0x276e || code === 0x2770 ||
      code === 0x2772 || code === 0x2774 || code === 0x27c5 ||
      code === 0x27e6 || code === 0x27e8 || code === 0x27ea ||
      code === 0x2983 || code === 0x2985 || code === 0x2987 ||
      code === 0x2989 || code === 0x298b || code === 0x298d ||
      code === 0x298f || code === 0x2991 || code === 0x2993 ||
      code === 0x2995 || code === 0x2997 || code === 0x29d8 ||
      code === 0x29da || code === 0x29fc || code === 0x3008 ||
      code === 0x300a || code === 0x300c || code === 0x300e ||
      code === 0x3010 || code === 0x3014 || code === 0x3016 ||
      code === 0x3018 || code === 0x301a || code === 0x301c ||
      code === 0x301d || code === 0x301f || code === 0xfd3f ||
      code === 0xfe17 || code === 0xfe35 || code === 0xfe37 ||
      code === 0xfe39 || code === 0xfe3b || code === 0xfe3d ||
      code === 0xfe3f || code === 0xfe41 || code === 0xfe43 ||
      code === 0xfe47 || code === 0xfe59 || code === 0xfe5b ||
      code === 0xfe5d || code === 0xff08 || code === 0xff3b ||
      code === 0xff5b) return LB.OP

  // Close punctuation
  if (code === 0x0029 || code === 0x003e || code === 0x005d ||
      code === 0x007d || code === 0x2046 || code === 0x207e ||
      code === 0x208e || code === 0x232a || code === 0x2769 ||
      code === 0x276b || code === 0x276d || code === 0x276f ||
      code === 0x2771 || code === 0x2773 || code === 0x2775 ||
      code === 0x27c6 || code === 0x27e7 || code === 0x27e9 ||
      code === 0x27eb || code === 0x2984 || code === 0x2986 ||
      code === 0x2988 || code === 0x298a || code === 0x298c ||
      code === 0x298e || code === 0x2990 || code === 0x2992 ||
      code === 0x2994 || code === 0x2996 || code === 0x2998 ||
      code === 0x29d9 || code === 0x29db || code === 0x29fd ||
      code === 0x3009 || code === 0x300b || code === 0x300d ||
      code === 0x300f || code === 0x3011 || code === 0x3015 ||
      code === 0x3017 || code === 0x3019 || code === 0x301b ||
      code === 0x301e || code === 0x3020 || code === 0xfd3e ||
      code === 0xfe18 || code === 0xfe36 || code === 0xfe38 ||
      code === 0xfe3a || code === 0xfe3c || code === 0xfe3e ||
      code === 0xfe40 || code === 0xfe42 || code === 0xfe44 ||
      code === 0xfe48 || code === 0xfe5a || code === 0xfe5c ||
      code === 0xfe5e || code === 0xff09 || code === 0xff3d ||
      code === 0xff5d) return LB.CL

  // Exclamation / Question (no break before)
  if (code === 0x0021 || code === 0x003f || code === 0x00a1 ||
      code === 0x00bf || code === 0x203c || code === 0x203d ||
      code === 0x2048 || code === 0x2049) return LB.EX

  // CJK Ideographic
  if (CJK_RANGES.some(([min, max]) => code >= min && code <= max)) return LB.ID

  // Numbers
  if ((code >= 0x0030 && code <= 0x0039) || // 0-9
      (code >= 0x0660 && code <= 0x0669) || // Arabic-Indic
      (code >= 0x06f0 && code <= 0x06f9) || // Extended Arabic-Indic
      (code >= 0x0966 && code <= 0x096f) || // Devanagari
      (code >= 0x09e6 && code <= 0x09ef) || // Bengali
      (code >= 0x0a66 && code <= 0x0a6f) || // Gurmukhi
      (code >= 0x0ae6 && code <= 0x0aef) || // Gujarati
      (code >= 0x0b66 && code <= 0x0b6f) || // Oriya
      (code >= 0x0be6 && code <= 0x0bef) || // Tamil
      (code >= 0x0c66 && code <= 0x0c6f) || // Telugu
      (code >= 0x0ce6 && code <= 0x0cef) || // Kannada
      (code >= 0x0d66 && code <= 0x0d6f) || // Malayalam
      (code >= 0x0de6 && code <= 0x0def) || // Sinhala
      (code >= 0x0e50 && code <= 0x0e59) || // Thai
      (code >= 0x0ed0 && code <= 0x0ed9) || // Lao
      (code >= 0x1040 && code <= 0x1049) || // Myanmar
      (code >= 0x1090 && code <= 0x1099) || // Ethiopic
      (code >= 0x17e0 && code <= 0x17e9) || // Khmer
      (code >= 0x1810 && code <= 0x1819) || // Mongolian
      (code >= 0x1946 && code <= 0x194f) || // Limbu
      (code >= 0x19d0 && code <= 0x19d9) || // Tai Tham
      (code >= 0x1a80 && code <= 0x1a89) || // Tai Tham Hora
      (code >= 0x1a90 && code <= 0x1a99) || // Tai Tham Song
      (code >= 0x2070 && code <= 0x2079) || // Superscripts
      (code >= 0x2080 && code <= 0x2089) || // Subscripts
      (code >= 0x2460 && code <= 0x249b) || // Enclosed alphanumerics
      (code >= 0x24ea && code <= 0x24ff) || // Enclosed numbers
      (code >= 0x2776 && code <= 0x2793) || // Dingbats numbers
      (code >= 0x3021 && code <= 0x3029) || // Ideographic number
      (code >= 0x3038 && code <= 0x303a) || // Ideographic number
      (code >= 0xff10 && code <= 0xff19))    // Fullwidth digits
    return LB.NU

  // Prefix numeric (currency, etc.)
  if (code === 0x0024 || code === 0x00a2 || code === 0x00a3 ||
      code === 0x00a4 || code === 0x00a5 || code === 0x058f ||
      code === 0x060b || code === 0x09f3 || code === 0x0af1 ||
      code === 0x0bf9 || code === 0x0e3f || code === 0x17db ||
      code === 0x20a0 || code === 0x20a1 || code === 0x20a2 ||
      code === 0x20a3 || code === 0x20a4 || code === 0x20a5 ||
      code === 0x20a6 || code === 0x20a7 || code === 0x20a8 ||
      code === 0x20a9 || code === 0x20aa || code === 0x20ab ||
      code === 0x20ac || code === 0x20ad || code === 0x20ae ||
      code === 0x20af || code === 0x20b0 || code === 0x20b1 ||
      code === 0x20b2 || code === 0x20b3 || code === 0x20b4 ||
      code === 0x20b5 || code === 0x20b6 || code === 0x20b7 ||
      code === 0x20b8 || code === 0x20b9 || code === 0x20ba ||
      code === 0x20bb || code === 0x20bc || code === 0x20bd ||
      code === 0x20be || code === 0x20bf || code === 0xfdfc ||
      code === 0xfe69 || code === 0xff04 || code === 0xffe0 ||
      code === 0xffe1 || code === 0xffe5 || code === 0xffe6)
    return LB.PR

  // Postfix numeric (degree, percent)
  if (code === 0x0025 || code === 0x2030 || code === 0x2031 ||
      code === 0x20b5 || code === 0x2212 || code === 0x2213 ||
      code === 0xfe6a || code === 0xff05)
    return LB.PO

  // Inseparable (em dash, en dash)
  if (code === 0x2014 || code === 0x2015 || code === 0x2025 ||
      code === 0x2026) return LB.IN

  // Quotation
  if (code === 0x0022 || code === 0x0027 || code === 0x2018 ||
      code === 0x2019 || code === 0x201c || code === 0x201d ||
      code === 0x201f || code === 0x2039 || code === 0x203a ||
      code === 0x275b || code === 0x275c || code === 0x275d ||
      code === 0x275e || code === 0x2760 || code === 0x2761 ||
      code === 0x2762 || code === 0x2763 || code === 0x2764 ||
      code === 0x2765 || code === 0x2766 || code === 0x2767 ||
      code === 0x2776 || code === 0x2777 || code === 0x2778 ||
      code === 0x2779 || code === 0x277a || code === 0x277b ||
      code === 0x277c || code === 0x277d || code === 0x277e ||
      code === 0x277f || code === 0x2780 || code === 0x2781 ||
      code === 0x2782 || code === 0x2783 || code === 0x2784 ||
      code === 0x2785 || code === 0x2786 || code === 0x2787 ||
      code === 0x2788 || code === 0x2789 || code === 0x278a ||
      code === 0x278b || code === 0x278c || code === 0x278d ||
      code === 0x278e || code === 0x278f || code === 0x2790 ||
      code === 0x2791 || code === 0x2792 || code === 0x2793 ||
      code === 0x2794 || code === 0x2795 || code === 0x2796 ||
      code === 0x2797 || code === 0x2798 || code === 0x2799 ||
      code === 0x279a || code === 0x279b || code === 0x279c ||
      code === 0x279d || code === 0x279e || code === 0x279f ||
      code === 0x27a0 || code === 0x27a1 || code === 0x27a2 ||
      code === 0x27a3 || code === 0x27a4 || code === 0x27a5 ||
      code === 0x27a6 || code === 0x27a7 || code === 0x27a8 ||
      code === 0x27a9 || code === 0x27aa || code === 0x27ab ||
      code === 0x27ac || code === 0x27ad || code === 0x27ae ||
      code === 0x27af || code === 0x27b1 || code === 0x27b2 ||
      code === 0x27b3 || code === 0x27b4 || code === 0x27b5 ||
      code === 0x27b6 || code === 0x27b7 || code === 0x27b8 ||
      code === 0x27b9 || code === 0x27ba || code === 0x27bb ||
      code === 0x27bc || code === 0x27bd || code === 0x27be ||
      code === 0x27bf)
    return LB.QU

  // Non-starter (some CJK punctuation)
  if (code === 0x3001 || code === 0x3002 || code === 0x3005 ||
      code === 0x3006 || code === 0x3007 || code === 0x303c ||
      code === 0x303d || code === 0x303e || code === 0x303f ||
      code === 0xff01 || code === 0xff0c || code === 0xff0e ||
      code === 0xff1a || code === 0xff1b || code === 0xff1f)
    return LB.NS

  // Symbols
  if ((code >= 0x0021 && code <= 0x002f) || // ! " # $ % & ' ( ) * + , - . /
      (code >= 0x003a && code <= 0x0040) || // : ; < = > ? @
      (code >= 0x005b && code <= 0x005e) || // [ \ ] ^ _
      (code >= 0x007b && code <= 0x007e) || // { | } ~
      (code >= 0x2190 && code <= 0x21ff) || // Arrows
      (code >= 0x2200 && code <= 0x22ff) || // Mathematical
      (code >= 0x2300 && code <= 0x23ff) || // Miscellaneous Technical
      (code >= 0x2500 && code <= 0x257f) || // Box Drawing
      (code >= 0x2580 && code <= 0x259f) || // Block Elements
      (code >= 0x25a0 && code <= 0x25ff) || // Geometric Shapes
      (code >= 0x2600 && code <= 0x26ff) || // Miscellaneous Symbols
      (code >= 0x2700 && code <= 0x27bf) || // Dingbats
      (code >= 0x2e00 && code <= 0x2e7f) || // Supplemental Punctuation
      (code >= 0x3000 && code <= 0x303f) || // CJK Symbols
      (code >= 0xfe30 && code <= 0xfe4f) || // CJK Compatibility Forms
      (code >= 0xfe50 && code <= 0xfe6f) || // Small Form Variants
      (code >= 0xff00 && code <= 0xff0f) || // Fullwidth forms
      (code >= 0xff1a && code <= 0xff20) || // Fullwidth forms
      (code >= 0xff3b && code <= 0xff40) || // Fullwidth forms
      (code >= 0xff5b && code <= 0xff65))    // Fullwidth forms
    return LB.AL

  // Default: Alphabetic
  return LB.AL
}

/**
 * Determine if a line break is allowed between two characters.
 */
function canBreakBetween(classBefore: LB, classAfter: LB): boolean {
  const rules = BREAK_TABLE[classBefore]
  if (!rules) return true
  if ('*' in rules) return rules['*']
  return rules[classAfter] ?? true
}

// ─── Fragment Stream ──────────────────────────────────────────────────────────

/** A single character with its run index and width */
interface CharInfo {
  char: string
  code: number
  width: number
  runIndex: number
  charIndex: number
  lbClass: LB
}

/** Flatten fragments into a character stream */
function flattenFragments(fragments: TextFragment[]): CharInfo[] {
  const chars: CharInfo[] = []
  for (let ri = 0; ri < fragments.length; ri++) {
    const frag = fragments[ri]
    if (frag.kind === 'tab') {
      chars.push({
        char: '\t',
        code: 9,
        width: frag.width,
        runIndex: ri,
        charIndex: 0,
        lbClass: LB.BA,
      })
    } else if (frag.kind === 'footnoteRef' || frag.kind === 'endnoteRef') {
      chars.push({
        char: '\u200B',
        code: 0x200B,
        width: frag.width,
        runIndex: ri,
        charIndex: 0,
        lbClass: LB.GL,
      })
    } else if (frag.text.length > 0) {
      const str = frag.text
      let totalWeight = 0
      const weights = new Float32Array(str.length)
      const narrow = new Set(['i','j','l','I','1','!','.',',',':',';','|','/','(',')','[',']','{','}'])
      const wide = new Set(['m','w','M','W','_','@','%','&'])

      for (let ci = 0; ci < str.length; ci++) {
        const c = str[ci]
        const code = c.charCodeAt(0)
        let w = 1.0
        if (code === 32) w = 0.55
        else if (narrow.has(c)) w = 0.45
        else if (wide.has(c)) w = 1.55
        else if (code >= 65 && code <= 90) w = 1.25
        else if (CJK_RANGES.some(([min, max]) => code >= min && code <= max)) w = 1.8
        weights[ci] = w
        totalWeight += w
      }
      const unitWidth = totalWeight > 0 ? frag.width / totalWeight : frag.width / str.length

      for (let ci = 0; ci < str.length; ci++) {
        const char = str[ci]
        const code = char.charCodeAt(0)
        chars.push({
          char,
          code,
          width: Math.round(weights[ci] * unitWidth),
          runIndex: ri,
          charIndex: ci,
          lbClass: getLineBreakClass(code),
        })
      }
    }
  }
  return chars
}

// ─── Break Opportunity (UAX #14) ─────────────────────────────────────────────

interface BreakOpportunity {
  index: number
  type: 'space' | 'hyphen' | 'cjk' | 'zeroWidth' | 'uax14'
  width: number
}

/**
 * Find all break opportunities using UAX #14 rules.
 */
function findBreakOpportunities(chars: CharInfo[]): BreakOpportunity[] {
  const opportunities: BreakOpportunity[] = []

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]

    // Explicit break characters
    if (c.lbClass === LB.SP) {
      opportunities.push({ index: i + 1, type: 'space', width: c.width })
    } else if (c.lbClass === LB.HY) {
      opportunities.push({ index: i + 1, type: 'hyphen', width: c.width })
    } else if (c.lbClass === LB.ZW) {
      opportunities.push({ index: i + 1, type: 'zeroWidth', width: 0 })
    } else if (c.lbClass === LB.ID && i < chars.length - 1) {
      // CJK break after each ideographic character
      opportunities.push({ index: i + 1, type: 'cjk', width: 0 })
    }
  }

  // Apply UAX #14 prohibition rules
  // Remove break opportunities that are prohibited
  const filtered: BreakOpportunity[] = []
  for (const opp of opportunities) {
    if (opp.index > 0 && opp.index < chars.length) {
      const classBefore = chars[opp.index - 1].lbClass
      const classAfter = chars[opp.index].lbClass

      // Non-breaking (GL, WJ) → no break
      if (classBefore === LB.GL || classBefore === LB.WJ ||
          classAfter === LB.GL || classAfter === LB.WJ) {
        continue
      }

      // Combining mark → no break before
      if (classAfter === LB.CM) {
        continue
      }

      // Close punctuation → no break before (unless next is space)
      if (classBefore === LB.CL && classAfter !== LB.SP) {
        continue
      }

      // Open punctuation → no break after
      if (classBefore === LB.OP) {
        continue
      }

      // Inseparable → no break
      if (classBefore === LB.IN) {
        continue
      }

      // Number separator → no break
      if (classBefore === LB.IS) {
        continue
      }

      // Symbol → no break after
      if (classBefore === LB.SY) {
        continue
      }
    }
    filtered.push(opp)
  }

  return filtered
}

// ─── Line Breaking Algorithm ──────────────────────────────────────────────────

export interface LineBreakInput {
  /** Text fragments to break */
  fragments: TextFragment[]
  /** Available width in twips */
  availableWidth: number
  /** Whether to apply justification (jc='both') */
  justify?: boolean
}

export interface LineBreakResult {
  /** Lines produced */
  lines: LayoutLine[]
  /** Total width of all content in twips */
  totalWidth: number
}

/**
 * Break fragments into lines that fit within availableWidth.
 * Uses UAX #14 line breaking algorithm.
 */
export function breakIntoLines(input: LineBreakInput): LineBreakResult {
  const { fragments, availableWidth, justify = false } = input

  if (fragments.length === 0) {
    return { lines: [], totalWidth: 0 }
  }

  // Handle single empty fragment
  if (fragments.length === 1 && fragments[0].text === '' && !fragments[0].kind) {
    return {
      lines: [{
        fragments: [{ ...fragments[0], width: 0, widthPx: 0 }],
        width: 0,
        height: 0,
        ascent: 0,
        descent: 0,
        leading: 0,
        justified: false,
        justifyGap: 0,
      }],
      totalWidth: 0,
    }
  }

  // Split on explicit breaks (page, column, line)
  const segments: TextFragment[][] = []
  let currentSeg: TextFragment[] = []
  for (const frag of fragments) {
    if (frag.kind === 'break') {
      segments.push(currentSeg)
      currentSeg = []
    } else if (frag.kind === 'tab') {
      currentSeg.push(frag)
    } else {
      currentSeg.push(frag)
    }
  }
  segments.push(currentSeg)

  const allLines: LayoutLine[] = []
  let totalWidth = 0

  for (const seg of segments) {
    if (seg.length === 0) {
      const metrics = getLineMetrics(fragments)
      allLines.push({
        fragments: [],
        width: 0,
        height: metrics.height,
        ascent: metrics.ascent,
        descent: metrics.descent,
        leading: metrics.leading,
        justified: false,
        justifyGap: 0,
      })
      continue
    }

    const chars = flattenFragments(seg)
    const breakOps = findBreakOpportunities(chars)

    let pos = 0
    while (pos < chars.length) {
      let breakPos = -1
      let breakType: BreakOpportunity['type'] = 'cjk'
      let lineWidth = 0

      let testWidth = 0
      let lastBreakPos = pos
      let lastBreakWidth = 0
      let lastBreakType: BreakOpportunity['type'] = 'cjk'

      for (let i = pos; i < chars.length; i++) {
        testWidth += chars[i].width

        const breakAt = breakOps.find((b) => b.index === i + 1)
        if (breakAt) {
          lastBreakPos = i + 1
          lastBreakWidth = testWidth
          lastBreakType = breakAt.type
        }

        if (testWidth > availableWidth) {
          if (lastBreakPos > pos) {
            breakPos = lastBreakPos
            breakType = lastBreakType
            lineWidth = lastBreakWidth
            break
          }
          breakPos = i + 1
          breakType = 'cjk'
          lineWidth = testWidth
          break
        }
      }

      if (breakPos === -1) {
        breakPos = chars.length
        lineWidth = testWidth
      }

      const lineChars = chars.slice(pos, breakPos)
      const lineFragments = buildLineFragments(lineChars, seg)

      const metrics = getLineMetrics(fragments)
      const isLastLine = breakPos >= chars.length
      const shouldJustify = justify && !isLastLine && lineWidth < availableWidth

      let justifyGap = 0
      if (shouldJustify) {
        const spaceCount = lineChars.filter((c) => c.lbClass === LB.SP).length
        if (spaceCount > 0) {
          justifyGap = Math.round((availableWidth - lineWidth) / spaceCount)
        }
      }

      allLines.push({
        fragments: lineFragments,
        width: lineWidth,
        height: metrics.height,
        ascent: metrics.ascent,
        descent: metrics.descent,
        leading: metrics.leading,
        justified: shouldJustify,
        justifyGap,
      })

      totalWidth += lineWidth
      pos = breakPos
    }
  }

  return { lines: allLines, totalWidth }
}

function getLineMetrics(fragments: TextFragment[]): { height: number; ascent: number; descent: number; leading: number } {
  let maxAscent = 0
  let maxDescent = 0
  let maxLeading = 0
  for (const f of fragments) {
    if (f.sz > 0) {
      const sizePt = f.sz * 0.5
      const lineH = Math.round(sizePt * 20 * 1.15)
      const a = Math.round(lineH * 0.8)
      const d = Math.round(lineH * 0.2)
      const l = Math.round(lineH * 0.15)
      if (a > maxAscent) maxAscent = a
      if (d > maxDescent) maxDescent = d
      if (l > maxLeading) maxLeading = l
    }
  }
  return {
    height: maxAscent + maxDescent + maxLeading,
    ascent: maxAscent,
    descent: maxDescent,
    leading: maxLeading,
  }
}

/**
 * Build line fragments from a character range.
 */
function buildLineFragments(lineChars: CharInfo[], originalFragments: TextFragment[]): TextFragment[] {
  if (lineChars.length === 0) return []

  const result: TextFragment[] = []
  let currentRunIndex = lineChars[0].runIndex
  let currentText = ''
  let currentWidth = 0

  for (const c of lineChars) {
    if (c.runIndex !== currentRunIndex) {
      if (currentText.length > 0) {
        const orig = originalFragments[currentRunIndex]
        result.push({
          ...orig,
          text: currentText,
          width: currentWidth,
          widthPx: currentWidth / (20 / (96 / 72)),
        })
      }
      currentRunIndex = c.runIndex
      currentText = ''
      currentWidth = 0
    }
    currentText += c.char
    currentWidth += c.width
  }

  if (currentText.length > 0) {
    const orig = originalFragments[currentRunIndex]
    result.push({
      ...orig,
      text: currentText,
      width: currentWidth,
      widthPx: currentWidth / (20 / (96 / 72)),
    })
  }

  return result
}



export { isCJK, isSpace, isHyphen, flattenFragments, getLineBreakClass, canBreakBetween }
