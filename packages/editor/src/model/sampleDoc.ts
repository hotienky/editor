// Tài liệu mẫu — trạng thái mặc định khi editor chưa mở docId.
// Trình diễn đầy đủ tính năng Word (Mục lục, Trường, Điều khiển nội dung,
// Bảng phức hợp/kép + vượt trang, Hình ảnh, Danh sách, Chú thích, Bookmark,
// Ẩn, Header/Footer) để người dùng thấy kindy-editor hỗ trợ những gì.
// Xây dựng dưới dạng dữ liệu model thuần (cùng Document mà editor/exporter/collab sử dụng).

import type {
  BookmarkRange, CellBorder, CellMargin, CharStyle, Document, EquationBlock, FieldDef, FieldSpec, ImageBlock, ParaStyle, Paragraph, RowProps, Run, SdtProps, TableBlock, TableCell,
} from "@kindy/shared";
import { buildInstruction, buildTocParagraphs, DEFAULT_CHAR_STYLE, DEFAULT_PARA_STYLE, defaultStylesheet, evaluateIf, formatFieldDate } from "@kindy/shared";
import { defaultListDefinition, DEFAULT_BULLET_LIST_ID, DEFAULT_NUMBER_LIST_ID } from "@kindy/shared";
import { parseMathml } from "../mathml/parse";

const BODY: CharStyle = DEFAULT_CHAR_STYLE;
const PARA: ParaStyle = DEFAULT_PARA_STYLE;

let nextId = 0;
const id = (): string => `b${nextId++}`;
const run = (text: string, patch: Partial<CharStyle> = {}): Run => ({ text, style: { ...BODY, ...patch } });
const para = (runs: Run[], patch: Partial<ParaStyle> = {}): Paragraph => ({ kind: "paragraph", id: id(), revision: 0, runs, style: { ...PARA, ...patch } });

// --- registry mà tài liệu tham chiếu -------------------------------------------
const fields: Record<string, FieldDef> = {};
const sdts: Record<string, SdtProps> = {};
const footnotes: Record<string, Paragraph[]> = {};
const endnotes: Record<string, Paragraph[]> = {};
const bookmarks: Record<string, BookmarkRange> = {};
const tocItems: { id: string; text: string; level: number }[] = [];

let fldN = 0;
/** Trường inline: run mang fieldId + FieldDef đã đăng ký. */
const fieldRun = (spec: FieldSpec, text: string, patch: Partial<CharStyle> = {}): Run => {
  const fid = `fld${fldN++}`;
  fields[fid] = { id: fid, instruction: buildInstruction(spec), name: spec.type, kind: "builtin", spec };
  return { text, style: { ...BODY, ...patch, fieldId: fid } };
};
const pageField = (): Run => fieldRun({ type: "PAGE" }, "{page}");
const dateField = (fmt: string): Run => fieldRun({ type: "DATE", format: fmt }, formatFieldDate(new Date(), fmt));
const ifField = (a: string, op: "=" | "<>" | "<" | ">" | "<=" | ">=", b: string, t: string, f: string): Run => {
  const spec: FieldSpec = { type: "IF", operandA: a, op, operandB: b, trueRuns: [run(t)], falseRuns: [run(f)] };
  return fieldRun(spec, evaluateIf(spec).map((r) => r.text).join(""));
};

let sdtN = 0;
/** Đăng ký props điều khiển nội dung, trả về id (dùng cho lồng nhau / cấp block). */
const sdtId = (props: SdtProps): string => {
  const sid = `sdt${sdtN++}`;
  sdts[sid] = props;
  return sid;
};
/** Điều khiển nội dung inline: run mang sdtPath + SdtProps đã đăng ký. */
const sdtRun = (props: SdtProps, text: string, patch: Partial<CharStyle> = {}): Run =>
  ({ text, style: { ...BODY, ...patch, sdtPath: [sdtId(props)] } });

const heading = (text: string, level: 1 | 2 | 3): Paragraph => {
  const h = para([run(text, { bold: true, fontSizePx: level === 1 ? 24 : level === 2 ? 19 : 16, color: "#1a1a2e" })], {
    namedStyle: `Heading${level}`, outlineLevel: level - 1, spaceBeforePx: 18, spaceAfterPx: 8,
  });
  tocItems.push({ id: h.id, text, level });
  return h;
};

// --- hình ảnh ------------------------------------------------------------------
// Một tile PNG nhỏ (gradient #1a73e8 → #9c27b0), nhúng dưới dạng data URI.
// Là PNG chứ không phải SVG: pdfkit (trình xuất PDF) chỉ giải mã PNG/JPEG,
// nên SVG sẽ báo lỗi và hiển thị placeholder xám trong bản xuất.
const TILE_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAACgCAIAAAC9uXYyAAAEU0lEQVR42u3cQW7jRgBFwdY/Rq6ZS+cWzEKWLY+MWUyAAHoorwSqabLlgtEQmu/219//nHNu55zrnHPdzsfP7Xq8ONfLkXPOda7zNfhx+uPd8/Tu9XLkPv5p8Ncv/3Hwdb+FPzv9nOv7nd/HX9+OXI9Jfc3l6f5/OP23k71+e62n018ud718zudc17eJf1zuT0//ZfDLZH/8s/5HFf8nqtFMc0bzOWc005zRfDtnNNOc0XzOGc00ZzQ/lhw005zQfLvOaKY5o/m+5KCZ5ojmc67RTHNG8+18Ljlopvn9NT+WHDTTnNB8rjOaac5oflpy0Ezz+2t+/ZaDZprfWPM5ZzTTnNF8O9dopjmj+VxnNNOc0fy5l4Nmmgua799y0ExzRPO574emmeaG5u/bR2mm+c01P+/loJnmt9f860OyNNP81pq/PSRLM83vrvnrIVmaaQ5o/nhIlmaaG5o/90PTTPNpJIdGM80ZzR//oWmmORPQGs00l3Jwo5nmUg5uNNNcysGNZppLObjRTHMpBzeaaS7l4EYzzaUc3GimuZSDG800l3Jwo5nmUg5uNNNcysGNZppLObjRTHMpBzeaaS7l4EYzzaUc3GimuZSDG800l3Jwo5nmUg5uNNNcysGNZppLObjRTHMpBzeaaS7l4EYzzaUc3GimuZSDG800l3Jwo5nmUg5uNNNcysGNZppLObjRTHMpBzeaaS7l4EYzzaUc3GimuZSDG800l3Jwo5nmUg5uNNNcysGNZppLObjRTHMpBzeaaS7l4EYzzaUc3GimuZSDG800l3Jwo5nmUg5uNNNcysGNZppLObjRTHMpBzeaaS7l4EYzzaUc3GimuZSDG800l3Jwo5nmUg5uNNNcysGNZppLObjRTHMpBzeaaS7l4EYzzaUc3GimuZSDG800l3Jwo5nmUg5uNNNcysGNZppLObjRTHMpBzeaaS7l4EYzzaUc3GimuZSDG800l3Jwo5nmUg5uNNNcysGNZppLObjRTHMpBzeaaS7l4EYzzaUc3GimuZSDG800l3Jwo5nmUg5uNNNcysGNZppLObjRTHMpBzeaaS7l4EYzzaUc3GimuZSDG800l3Jwo5nmUg5uNNNcysGNZppLObjRTHMpBzeaaS7l4EYzzaUc3GimuZSDG800l3Jwo5nmUg5uNNNcysGNZppLObjRTHMpBzeaaS7l4EYzzaUc3GimuZSDG800l3Jwo5nmUg5uNNNcysGNZppLObjRTHMpBzeaaS7l4EYzzaUc3GimuZSDG800l3Jwo5nmUg5uNNNcysGNZppLObjRTHMpBzeaaS7l4EYzzaUc3GimuZSDG800l3Jwo5nmUg5uNNNcysGNZppLObjRTHMpBzeaaS7l4EYzzaUc3GimuZSDG800l3Jwo5nmUg5uNNNcysH9C3YjxNIK1Tm9AAAAAElFTkSuQmCC";
const image = (w: number, h: number, align: ImageBlock["align"], wrap?: "block" | "square"): ImageBlock => ({
  kind: "image", id: id(), revision: 0, src: TILE_PNG, widthPx: w, heightPx: h, align, ...(wrap ? { wrap } : {})
});
/** Hình ảnh cắt (OOXML a:srcRect): cùng tile, với offset cắt để chỉ hiển thị phần giữa — minh họa tính năng cắt ảnh #63. */
const croppedImage = (w: number, h: number, crop: NonNullable<ImageBlock["crop"]>): ImageBlock => ({
  kind: "image", id: id(), revision: 0, src: TILE_PNG, widthPx: w, heightPx: h, align: "left", crop
});

// --- ký hiệu (w:sym) -----------------------------------------------------------
/** Run glyph font ký hiệu (OOXML w:sym): font + mã hex, giải mã thành glyph và vẽ bằng font đó (ví dụ Wingdings). */
const symRun = (font: string, charHex: string): Run => {
  const cp = parseInt(charHex, 16);
  return { text: Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : "�", style: { ...BODY, fontFamily: `${font}, sans-serif`, fontSizePx: 18, symbol: { font, char: charHex.toUpperCase() } } };
};

// --- phương trình (MathML) -----------------------------------------------------
/** Khối phương trình hiển thị từ chuỗi MathML. Lưu dạng AST MathML, typeset bởi layout engine, round-trip sang .docx dưới dạng OMML. */
const eq = (mathml: string, align: EquationBlock["align"] = "center"): EquationBlock => ({
  kind: "equation", id: id(), revision: 0, equation: { ...parseMathml(mathml), display: true }, align,
});
/** Chú thích + nguồn MathML dạng monospace, để demo HIỆN thị MathML đằng sau kết quả render. */
const mathmlSource = (xml: string): Run => run(xml, { fontFamily: "Consolas, monospace", fontSizePx: 11, color: "#5f6368" });
/** Run phương trình INLINE: một U+FFFC mang MathML, kích thước theo text. */
const inlineEq = (xml: string): Run => ({ text: "￼", style: { ...BODY, equation: { ...parseMathml(xml), display: false } } });

// --- bảng ----------------------------------------------------------------------
const cellPara = (text: string, patch: Partial<CharStyle> = {}, runs?: Run[]): Paragraph => ({
  kind: "paragraph", id: id(), revision: 0, runs: runs ?? [run(text, { fontSizePx: 14, ...patch })], style: { ...PARA, lineHeight: 1.35, spaceAfterPx: 0 }
});
const cell = (text: string, patch: Partial<CharStyle> = {}, opts: Partial<TableCell> = {}): TableCell => ({ id: id(), blocks: [cellPara(text, patch)], ...opts });

/** Ô gộp: header 3 cột trải rộng toàn bộ, rồi ô gộp hàng. */
const mergedTable = (): TableBlock => ({
  kind: "table", id: id(), revision: 0,
  rows: [
    { cells: [cell("Header gộp trải rộng cả 3 cột", { bold: true, color: "#fff" }, { colSpan: 3, shading: "#1a73e8" })] },
    { cells: [cell("Gộp\n2 hàng", { bold: true }, { rowSpan: 2, shading: "#e8f0fe" }), cell("B1"), cell("C1")] },
    { cells: [cell("B2"), cell("C2", { color: "#188038" })] },
  ],
});

/** Căn dọc ô (w:vAlign): ô cao buộc hàng cao, các ô ngắn bên cạnh hiển thị trên/giữa/dưới. */
const vAlignTable = (): TableBlock => ({
  kind: "table", id: id(), revision: 0,
  colFractions: [0.4, 0.2, 0.2, 0.2],
  rows: [
    {
      cells: [
        cell("vAlign", { bold: true, color: "#fff" }, { shading: "#1a73e8" }),
        cell("top", { bold: true, color: "#fff" }, { shading: "#1a73e8" }),
        cell("center", { bold: true, color: "#fff" }, { shading: "#1a73e8" }),
        cell("bottom", { bold: true, color: "#fff" }, { shading: "#1a73e8" }),
      ]
    },
    {
      cells: [
        cell("Ô cao này chứa nhiều dòng text nên hàng phát triển cao hơn nhiều lần chiều cao một dòng — giúp thấy rõ vị trí dọc của các ô ngắn bên cạnh.\nDòng hai.\nDòng ba.\nDòng bốn."),
        cell("top", { color: "#188038" }, { vAlign: "top" }),
        cell("center", { color: "#188038" }, { vAlign: "center" }),
        cell("bottom", { color: "#188038" }, { vAlign: "bottom" }),
      ]
    },
  ],
});

/** Thuộc tính bảng nâng cao (#61): bảng thụt lề trái (w:tblInd), cột phải-sang-trái (w:bidiVisual), ô xoay chữ (w:textDirection), ô không xuống dòng (w:noWrap), plus caption/description. */
const advancedPropsTable = (): TableBlock => ({
  kind: "table", id: id(), revision: 0,
  colFractions: [0.4, 0.2, 0.2, 0.2],
  indentPx: 36,
  bidiVisual: true,
  overlap: "never",
  caption: "Bảng xếp hạng",
  description: "Bảng phải-sang-trái, thụt lề, minh họa thuộc tính bảng #61.",
  rows: [
    {
      cells: [
        cell("Xếp hạng", { bold: true, color: "#fff" }, { shading: "#9c27b0", textDirection: "tbRl" }),
        cell("Hạng 1", { bold: true, color: "#fff" }, { shading: "#9c27b0", noWrap: true }),
        cell("Hạng 2", { bold: true, color: "#fff" }, { shading: "#9c27b0", noWrap: true }),
        cell("Hạng 3", { bold: true, color: "#fff" }, { shading: "#9c27b0", noWrap: true }),
      ]
    },
    {
      cells: [
        cell("Điểm", { bold: true }),
        cell("980", { color: "#188038" }, { hideMark: true }),
        cell("845", { color: "#188038" }, { hideMark: true }),
        cell("712", { color: "#188038" }, { hideMark: true }),
      ]
    },
  ],
});

/** Chữ ô dọc (w:textDirection #100): header cột đầu xoay 90° — tbRl (trên→dưới, 90° thuận kim đồng hồ) và btLr (dưới→trên, 90° ngược kim đồng hồ). */
const verticalTextTable = (): TableBlock => ({
  kind: "table", id: id(), revision: 0, widthMode: "autofitContents",
  rows: [
    {
      cells: [
        cell("Trên→dưới (tbRl)", { bold: true, color: "#fff" }, { shading: "#00897b", textDirection: "tbRl" }),
        cell("Bắc"), cell("Nam"), cell("Đông"),
      ]
    },
    {
      cells: [
        cell("Dưới→trên (btLr)", { bold: true, color: "#fff" }, { shading: "#00897b", textDirection: "btLr" }),
        cell("120"), cell("96"), cell("141"),
      ]
    },
  ],
});

/** Ô paragraph mang hướng cơ sở (RTL) — cho demo bidi trong bảng, text phải căn và sắp xếp lại trong cột. */
const dirCellPara = (runs: Run[], direction?: "rtl"): Paragraph => ({
  kind: "paragraph", id: id(), revision: 0, runs,
  style: { ...PARA, lineHeight: 1.35, spaceAfterPx: 0, ...(direction ? { direction } : {}) },
});
const dirCell = (runs: Run[], direction?: "rtl", opts: Partial<TableCell> = {}): TableCell =>
  ({ id: id(), blocks: [dirCellPara(runs, direction)], ...opts });

/** Bidi + CJK trong bảng: cột Ả Rập RTL, cột Nhật Bản, ô giá trị kết hợp điều khiển nội dung + trường PAGE — chứng minh hướng kết hợp với bảng, SDT, trường. */
const bidiCjkTable = (): TableBlock => ({
  kind: "table", id: id(), revision: 0,
  rows: [
    {
      cells: [
        dirCell([run("Ả Rập (RTL)", { bold: true, fontSizePx: 14, color: "#fff" })], "rtl", { shading: "#1a73e8" }),
        dirCell([run("Nhật Bản (CJK)", { bold: true, fontSizePx: 14, color: "#fff" })], undefined, { shading: "#1a73e8" }),
        dirCell([run("Điều khiển + trường", { bold: true, fontSizePx: 14, color: "#fff" })], undefined, { shading: "#1a73e8" }),
      ]
    },
    {
      cells: [
        dirCell([run("Text Ả Rập trong ô, tự căn phải.", { fontSizePx: 14 })], "rtl"),
        dirCell([run("Ô tiếng Nhật, ngắt dòng không cách, kinsoku hoạt động.", { fontSizePx: 14 })]),
        dirCell([
          sdtRun({ type: "plainText", alias: "Giá trị RTL" }, "Giá trị có thể chỉnh sửa", { fontSizePx: 14 }),
          run(" · ص ", { fontSizePx: 14 }),
          pageField(),
        ], "rtl"),
      ]
    },
  ],
});

/** Bảng đủ cao để vượt trang (phân trang cấp hàng). */
const tallTable = (): TableBlock => ({
  kind: "table", id: id(), revision: 0,
  rows: [
    { cells: [cell("#", { bold: true }), cell("Tính năng", { bold: true }), cell("Trạng thái", { bold: true })] },
    ...Array.from({ length: 22 }, (_v, i) => ({
      cells: [cell(String(i + 1)), cell(`Tính năng minh họa số ${i + 1} khiến bảng chạy vượt qua cuối trang`), cell("✓ hỗ trợ", { color: "#188038" })],
    })),
  ],
});

/** Thuộc tính hàng (w:trPr): hàng đầu đánh dấu `repeatHeader` để vẽ lại đầu mỗi trang; hàng FIXME chính xác 44px; hàng dữ liệu `cantSplit` giữ nguyên. */
const rowPropsTable = (): TableBlock => {
  const head = (text: string): TableCell => cell(text, { bold: true, color: "#fff" }, { shading: "#1a73e8" });
  const headerProps: RowProps = { repeatHeader: true };
  return {
    kind: "table", id: id(), revision: 0,
    colFractions: [0.1, 0.6, 0.3],
    rows: [
      { cells: [head("#"), head("Thuộc tính hàng"), head("Hiệu quả")], props: headerProps },
      {
        cells: [cell("0"), cell("trHeight — chính xác 44px"), cell("bắt buộc đúng 44px cao", { color: "#188038" })],
        props: { height: { value: 44, rule: "exact" } }
      },
      ...Array.from({ length: 20 }, (_v, i) => ({
        cells: [cell(String(i + 1)), cell(`cantSplit hàng dữ liệu ${i + 1} — giữ nguyên qua ngắt trang`), cell("✓", { color: "#188038" })],
        props: { cantSplit: true } as RowProps,
      })),
    ],
  };
};

/** AutoFit theo nội dung: cột được giải từ nội dung ô, bảng co lại vừa宽 trang. */
const autofitTable = (): TableBlock => ({
  kind: "table", id: id(), revision: 0, widthMode: "autofitContents",
  rows: [
    { cells: [cell("ID", { bold: true }), cell("Tên", { bold: true }), cell("Ghi chú", { bold: true })] },
    { cells: [cell("1"), cell("Ada Lovelace"), cell("lập trình viên đầu tiên")] },
    { cells: [cell("2"), cell("Grace Hopper"), cell("tiên phong biên dịch")] },
    { cells: [cell("3"), cell("Linus Torvalds"), cell("quản trị nhân")] },
  ],
});

/** Mặc định cấp bảng (#48): w:tblBorders / w:shd / w:tblCellMar lưu ở tblPr, round-trip ở cấp bảng thay vì bake vào từng ô. */
const tableDefaultsTable = (): TableBlock => {
  const rule: CellBorder = { color: "#1a73e8", widthPx: 1 };
  const fill = "#eef5ff";
  const pad: CellMargin = { top: 6, right: 10, bottom: 6, left: 10 };
  const c = (text: string, patch: Partial<CharStyle> = {}): TableCell =>
    cell(text, patch, { shading: fill, margin: { ...pad }, borders: { top: rule, right: rule, bottom: rule, left: rule } });
  return {
    kind: "table", id: id(), revision: 0,
    defaultBorders: { top: rule, right: rule, bottom: rule, left: rule, insideH: rule, insideV: rule },
    defaultShading: fill,
    defaultCellMargin: { ...pad },
    rows: [
      { cells: [c("Mặc định cấp bảng", { bold: true }), c("OOXML carrier (tblPr)", { bold: true })] },
      { cells: [c("Đường viền (ngoài + trong)"), c("w:tblBorders")] },
      { cells: [c("Nền tô bóng"), c("w:shd")] },
      { cells: [c("Khoảng cách ô / padding"), c("w:tblCellMar")] },
    ],
  };
};

// Nguồn MathML cho demo phương trình (Presentation MathML, tiêu chuẩn W3C).
const MATH_QUADRATIC =
  "<math><mi>x</mi><mo>=</mo><mfrac><mrow><mo>-</mo><mi>b</mi><mo>±</mo>" +
  "<msqrt><mrow><msup><mi>b</mi><mn>2</mn></msup><mo>-</mo><mn>4</mn><mi>a</mi><mi>c</mi></mrow></msqrt>" +
  "</mrow><mrow><mn>2</mn><mi>a</mi></mrow></mfrac></math>";
const MATH_SUM =
  "<math><munderover><mo>∑</mo><mrow><mi>n</mi><mo>=</mo><mn>1</mn></mrow><mo>∞</mo></munderover>" +
  "<mfrac><mn>1</mn><msup><mi>n</mi><mn>2</mn></msup></mfrac><mo>=</mo>" +
  "<mfrac><msup><mi>π</mi><mn>2</mn></msup><mn>6</mn></mfrac></math>";
const MATH_INTEGRAL =
  "<math><munderover><mo>∫</mo><mrow><mo>-</mo><mi>∞</mi></mrow><mo>∞</mo></munderover>" +
  "<msup><mi>e</mi><mrow><mo>-</mo><msup><mi>x</mi><mn>2</mn></msup></mrow></msup>" +
  "<mspace width=\"0.2em\"/><mi>d</mi><mi>x</mi><mo>=</mo><msqrt><mi>π</mi></msqrt></math>";
const MATH_EULER =
  "<math><msup><mi>e</mi><mrow><mi>i</mi><mi>π</mi></mrow></msup><mo>+</mo><mn>1</mn><mo>=</mo><mn>0</mn></math>";
const MATH_MATRIX =
  "<math><mfenced open=\"[\" close=\"]\"><mtable>" +
  "<mtr><mtd><mn>1</mn></mtd><mtd><mn>0</mn></mtd></mtr>" +
  "<mtr><mtd><mn>0</mn></mtd><mtd><mn>1</mn></mtd></mtr></mtable></mfenced></math>";

const LOREM = "Trình soạn thảo canvas kindy-editor hỗ trợ đầy đủ tính năng Word: phân trang chính xác cấp dòng, bảng gộp ô, điều khiển nội dung, trường, danh sách nhiều cấp, chú thích末note, MathML, chữ Ả Rập/Do Thái, chữ CJK, và nhiều tính năng khác. ";

export function sampleDoc(): Document {
  // Nội dung chú thích cuối trang được đánh dấu bởi run bên dưới.
  footnotes["fn1"] = [para([run("Chú thích cuối trang được sắp xếp ở cuối trang, với đường kẻ phân cách — giống hệt Word.", { fontSizePx: 12 })], { spaceAfterPx: 0 })];
  // Nội dung chú thích末note — thu thập ở cuối tài liệu.
  endnotes["en1"] = [para([run("Chú thích末note được thu thập ở cuối cùng tài liệu, dưới đường phân cách riêng — vị trí \"cuối tài liệu\" của Word.", { fontSizePx: 12 })], { spaceAfterPx: 0 })];

  // --- nội dung thân (heading tự đăng ký cho mục lục) -------------------------
  const fieldsHeading = heading("Trường", 1);
  const fieldsPara = para([
    run("Trường là đối tượng cơ bản bạn có thể chèn và sửa (chuột phải → Chèn trường). Hôm nay là "),
    dateField("d MMMM, yyyy"),
    run(", đây là trang "),
    pageField(),
    run(". Trường điều kiện (IF) có thể phân nhánh: "),
    ifField("2", ">", "1", "điều kiện đúng", "không đúng"),
    run(". Mỗi trường được hiển thị viền giống điều khiển nội dung và tính lại khi Cập nhật trường."),
  ]);

  const ccHeading = heading("Điều khiển nội dung", 1);
  const ccPara = para([
    run("Mỗi loại điều khiển nội dung Word đều round-trip: "),
    sdtRun({ type: "richText", alias: "Rich text" }, "văn bản phong phú"),
    run(", "),
    sdtRun({ type: "plainText", alias: "Plain text" }, "văn bản thuần"),
    run(", danh sách thả "),
    sdtRun({ type: "dropDown", alias: "Lựa chọn", listItems: [{ display: "Một", value: "1" }, { display: "Hai", value: "2" }] }, "Một"),
    run(", hộp tổ hợp "),
    sdtRun({ type: "comboBox", alias: "Tổ hợp", listItems: [{ display: "Alpha", value: "a" }, { display: "Beta", value: "b" }, { display: "Gamma", value: "g" }] }, "Alpha"),
    run(", chọn ngày "),
    sdtRun({ type: "date", alias: "Chọn ngày", dateFormat: "d/M/yyyy" }, "16/6/2026"),
    run(", và ô "),
    sdtRun({ type: "checkbox", checked: true }, "☒"),
    run("."),
  ]);

  // Điều khiển lồng nhau: điều khiển ngoài bao điều khiển trong (run chia sẻ path tiền tố).
  const ccOuter = sdtId({ type: "richText", alias: "Điều khiển ngoài" });
  const ccInner = sdtId({ type: "richText", alias: "Điều khiển trong" });
  const ccNestedPara = para([
    run("Điều khiển cũng có thể lồng nhau: ở đây một "),
    run("điều khiển ngoài bao ", { sdtPath: [ccOuter] }),
    run("điều khiển trong", { sdtPath: [ccOuter, ccInner] }),
    run(" và text phía sau", { sdtPath: [ccOuter] }),
    run("."),
  ]);

  const ccSection = sdtId({ type: "richText", alias: "Phần (điều khiển cấp block)" });
  const ccFee = sdtId({ type: "richText", alias: "Phí thẩm định" });
  const ccSectionIntro: Paragraph = {
    ...para([run("Điều khiển cấp block có thể bao whole paragraph và bảng — paragraph này và bảng bên dưới là một điều khiển, với điều khiển trong bao quanh giá trị:")], { spaceAfterPx: 6 }),
    sdtPath: [ccSection],
  };
  const ccSectionTable: TableBlock = {
    kind: "table", id: id(), revision: 0, sdtPath: [ccSection],
    rows: [
      { cells: [cell("Trường", { bold: true }), cell("Giá trị", { bold: true })] },
      {
        cells: [
          cell("Phí thẩm định", {}),
          { id: id(), blocks: [cellPara("", {}, [run("$200.00", { fontSizePx: 14, sdtPath: [ccFee] })])] },
        ],
      },
    ],
  };

  const tablesHeading = heading("Bảng", 1);
  const fieldInCellTable: TableBlock = {
    kind: "table", id: id(), revision: 0,
    rows: [
      { cells: [cell("Chỉ số", { bold: true }), cell("Giá trị", { bold: true })] },
      { cells: [cell("Ngày render", {}), { id: id(), blocks: [cellPara("", {}, [dateField("yyyy-MM-dd")])] }] },
      { cells: [cell("Trang", {}), { id: id(), blocks: [cellPara("", {}, [run("tr. ", { fontSizePx: 14 }), pageField()])] }] },
    ],
  };

  const richHeading = heading("Văn bản phong phú, danh sách & hình ảnh", 1);

  const bodyBlocks: (Paragraph | TableBlock | ImageBlock | EquationBlock)[] = [
    fieldsHeading,
    fieldsPara,
    para([
      run("Chú thích末note", { bold: true }), run(" cũng được hỗ trợ"),
      run("1", { footnoteRef: "fn1", verticalAlign: "super", fontSizePx: 11 }),
      run(". Cùng với "), run("metadata ẩn", { hidden: true }), run("text đã bookmark", {}),
      run(" và định dạng inline: "),
      run("đậm", { bold: true }), run(", "), run("nghiêng", { italic: true }), run(", "),
      run("gạch chân", { underline: true }), run(", "), run("gạch ngang", { strikethrough: true }), run(", "),
      run("đánh dấu", { highlightColor: "#fff3a3" }), run(", "), run("x", {}), run("2", { verticalAlign: "super", fontSizePx: 11 }),
      run(", và một "), run("siêu liên kết", { color: "#0b57d0", underline: true }), run("."),
    ]),
    // Kiểu gạch chân + màu sắc (w:u val + color) — đôi/chấm/gạch/ngọn/sắc.
    para([
      run("Gạch chân mang "), run("kiểu", { italic: true }), run(" và tùy chọn "), run("màu", { italic: true }), run(": "),
      run("đôi", { underline: true, underlineStyle: "double" }), run(", "),
      run("chấm", { underline: true, underlineStyle: "dotted" }), run(", "),
      run("gạch", { underline: true, underlineStyle: "dash" }), run(", "),
      run("chấm-gạch", { underline: true, underlineStyle: "dotDash" }), run(", "),
      run("sắc", { underline: true, underlineStyle: "thick" }), run(", "),
      run("đỏ sóng", { underline: true, underlineStyle: "wave", underlineColor: "#d93025" }), run(", và "),
      run("xanh đôi", { underline: true, underlineStyle: "double", underlineColor: "#1a73e8" }),
      run(" — mỗi kiểu round-trip qua w:u của Word (kiểu + màu)."),
    ]),
    // Hiệu ứng run nhỏ (w:rPr extras): dstrike, position, w:w scaling, kern, emphasis, outline/shadow/emboss/imprint, run border (w:bdr), fitText.
    para([
      run("Hiệu ứng run nhỏ: "),
      run("gạch kép", { doubleStrikethrough: true }), run(", "),
      run("nâng", { positionPx: 4 }), run(" và "), run("hạ", { positionPx: -4 }), run(" text, "),
      run("rộng", { widthScalePct: 180 }), run(" và "), run("hẹp", { widthScalePct: 66 }), run(" co giãn, "),
      run("kern", { kerningMinPx: 12 }), run(", "),
      run("emphasis", { emphasisMark: "dot" }), run(", "),
      run("outline", { outline: true }), run(", "), run("shadow", { shadow: true }), run(", "),
      run("emboss", { emboss: true }), run(", "), run("imprint", { imprint: true }), run(", "),
      run("viền run", { runBorder: { color: "#1a73e8", widthPx: 1 } }), run(", và "),
      run("fitText", { fitTextPx: 60 }),
      run(" — tất cả round-trip qua w:rPr của Word."),
    ]),
    // Biến đổi chữ hoa/thường (w:caps / w:smallCaps): text model giữ nguyên, chỉ glyph render uppercase.
    para([
      run("Biến đổi chữ: "),
      run("CHỮ HOA", { caps: true }), run(" (w:caps) và "),
      run("Chữ Thu Nhỏ", { smallCaps: true }), run(" (w:smallCaps) — cả hai render CHỮ HOA, "),
      run("trong khi text gốc giữ đúng như ban đầu."),
    ], { spaceBeforePx: 4 }),

    ccHeading,
    ccPara,
    ccNestedPara,
    ccSectionIntro,
    ccSectionTable,

    tablesHeading,
    para([run("Ô gộp (gộp cột và gộp hàng), tô bóng và đường viền:")], { spaceAfterPx: 6 }),
    mergedTable(),
    para([run("Căn dọc ô (w:vAlign) — nhãn ngắn ngồi trên, giữa và dưới trong hàng cao:")], { spaceBeforePx: 10, spaceAfterPx: 6 }),
    vAlignTable(),
    para([run("Thuộc tính bảng nâng cao (w:tblInd thụt lề, w:bidiVisual cột phải-sang-trái, w:textDirection / w:noWrap ô, plus caption/description alt text):")], { spaceBeforePx: 10, spaceAfterPx: 6 }),
    advancedPropsTable(),
    para([run("Chữ ô dọc (w:textDirection) — header cột đầu xoay 90°: tbRl (trên→dưới, thuận kim đồng hồ) và btLr (dưới→trên, ngược kim đồng hồ). AutoFit giữ cột xoay hẹp trong khi hàng cao lên:")], { spaceBeforePx: 10, spaceAfterPx: 6 }),
    verticalTextTable(),
    para([run("Trường cũng hoạt động trong ô bảng:")], { spaceBeforePx: 10, spaceAfterPx: 6 }),
    fieldInCellTable,
    para([run("Và bảng đủ cao để phân trang — hàng ngắt sạch:")], { spaceBeforePx: 10, spaceAfterPx: 6 }),
    tallTable(),
    para([run("Thuộc tính hàng (w:trPr) — hàng header lặp lại (vẽ lại đầu mỗi trang), hàng chiều cao chính xác, và hàng dữ liệu cantSplit giữ nguyên:")], { spaceBeforePx: 10, spaceAfterPx: 6 }),
    rowPropsTable(),
    para([run("AutoFit theo nội dung — cột được giải từ nội dung ô nên bảng co lại vừa (Table → AutoFit, hoặc kéo viền để cố định):")], { spaceBeforePx: 10, spaceAfterPx: 6 }),
    autofitTable(),
    para([run("Mặc định cấp bảng — đường viền, nền tô bóng và padding ô set một lần ở cấp bảng (w:tblBorders / w:shd / w:tblCellMar) và round-trip ở cấp đó thay vì bake vào mỗi ô:")], { spaceBeforePx: 10, spaceAfterPx: 6 }),
    tableDefaultsTable(),

    richHeading,
    para([run("Hình ảnh inline block:")], { spaceAfterPx: 6 }),
    image(360, 110, "center", "block"),
    para([
      run("Hình ảnh lồng chữ (square) nổi lên và text bọc quanh. " + LOREM.repeat(3)),
    ]),
    image(150, 110, "left", "square"),
    para([run("Danh sách đánh số đa cấp:")], { spaceBeforePx: 8, spaceAfterPx: 4 }),
    para([run("Model — thao tác khả nghịch")], { list: { listId: DEFAULT_NUMBER_LIST_ID, level: 0 }, spaceAfterPx: 2 }),
    para([run("Layout — phân trang pretext")], { list: { listId: DEFAULT_NUMBER_LIST_ID, level: 0 }, spaceAfterPx: 2 }),
    para([run("cache dòng key theo (revision, width)")], { list: { listId: DEFAULT_NUMBER_LIST_ID, level: 1 }, spaceAfterPx: 2 }),
    para([run("Paint — một fillText mỗi fragment")], { list: { listId: DEFAULT_NUMBER_LIST_ID, level: 0 }, spaceAfterPx: 2 }),
    para([run("Danh sách bullet:")], { spaceBeforePx: 8, spaceAfterPx: 4 }),
    para([run("marker chỉ là paint")], { list: { listId: DEFAULT_BULLET_LIST_ID, level: 0 }, spaceAfterPx: 2 }),
    para([run("nên cache sống sót qua tái đánh số")], { list: { listId: DEFAULT_BULLET_LIST_ID, level: 1 }, spaceAfterPx: 2 }),
    para([run("Paragraph justified đa trangminh họa phân trang cấp dòng. " + LOREM.repeat(12))], { align: "justify" }),

    // --- Viền paragraph & tô bóng (w:pBdr / paragraph w:shd) -------------------
    heading("Viền paragraph & tô bóng", 1),
    para([run("Cả paragraph có thể mang viền và nền tô — w:pBdr và paragraph w:shd của Word. Hộp viền ôm paragraph giữa hai thụt lề và round-trip sang .docx và PDF.")], {
      spaceBeforePx: 6,
      borders: {
        top: { color: "#1a73e8", widthPx: 1 },
        bottom: { color: "#1a73e8", widthPx: 1 },
        left: { color: "#1a73e8", widthPx: 1 },
        right: { color: "#1a73e8", widthPx: 1 },
      },
      shading: "#eef4ff",
    }),
    para([run("Viền và tô bóng độc lập: paragraph thụt lề này kết hợp nền tô ấm với một đường đôi dày bên trái — mỗi cạnh hộp được cấu hình riêng.")], {
      spaceBeforePx: 6,
      indentLeftPx: 24,
      indentRightPx: 24,
      shading: "#fff3e0",
      borders: { left: { color: "#e8710a", widthPx: 3, style: "double" } },
    }),
    // --- Khoảng cách ngữ cảnh: cùng kiểu sits tight (w:contextualSpacing) ---
    para([run("Khoảng cách ngữ cảnh — mỗi dòng thơ bên dưới mang khoảng cách sau 12px, nhưng w:contextualSpacing thu hẹp khoảng cách giữa các paragraph cùng kiểu (mặc định danh sách của Word); chỉ outer edges giữ khoảng cách:")], { spaceBeforePx: 10, spaceAfterPx: 4 }),
    para([run("Hoa hồng đỏ,")], { contextualSpacing: true, spaceAfterPx: 12 }),
    para([run("hoaiolet xanh,")], { contextualSpacing: true, spaceAfterPx: 12 }),
    para([run("khoảng cách ngữ cảnh giữ các dòng này chặt,")], { contextualSpacing: true, spaceAfterPx: 12 }),
    para([run("giống như paragraph danh sách của Word.")], { contextualSpacing: true, spaceAfterPx: 12 }),

    // --- Thuộc tính paragraph nhỏ (#62) ----------------------------------------
    heading("Thuộc tính paragraph nhỏ", 1),
    para([run("Các thiết lập w:pPr ít dùng hơn cũng round-trip. Paragraph này TẮT kiểm soát góa/mồ côi (w:widowControl), loại khỏi đánh số dòng (w:suppressLineNumbers), và mang thụt lề đối xứng (w:mirrorIndents) plus điều chỉnh thụt phải (w:adjustRightInd) — mỗi cái được bảo quản qua lưu .docx và mở lại.")], {
      spaceBeforePx: 6,
      widowControl: false,
      suppressLineNumbers: true,
      mirrorIndents: true,
      adjustRightInd: true,
    }),
    para([run("Và với khoảng cách dòng thêm, căn "), run("dưới", { bold: true }), run(" dọc (w:textAlignment) đẩy text xuống mép dưới mỗi hộp dòng cao — đặt thành top, center hoặc baseline để di chuyển vị trí glyph.")], {
      spaceBeforePx: 6,
      lineHeight: 2,
      textAlignment: "bottom",
    }),

    // --- OOXML round-trip linh tinh (#63): ký hiệu, cắt ảnh, tab stop ---------
    heading("OOXML linh tinh — ký hiệu, cắt ảnh & tab stop", 1),
    para([
      run("Glyph font ký hiệu ("),
      run("w:sym", { fontFamily: "Consolas, monospace", fontSizePx: 13 }),
      run(" của Word) mang font và mã, nên sống sót qua round-trip thay vì thành ký tự lạ: "),
      symRun("Wingdings", "F04A"), run("  "), symRun("Wingdings", "F0FC"), run("  "), symRun("Wingdings", "F0E0"),
      run("  "), symRun("Webdings", "F069"),
      run(" — mỗi cái là glyph từ font ký hiệu, không phải text."),
    ], { spaceAfterPx: 8 }),
    para([run("Cắt ảnh (a:srcRect) cắt nguồn thành cửa sổ — đây tile gốc hiển thị nguyên, rồi cắt giữa:")], { spaceAfterPx: 6 }),
    image(150, 110, "left", "block"),
    croppedImage(150, 110, { left: 0.25, top: 0.2, right: 0.25, bottom: 0.2 }),
    para([
      run("Tab stop tôn khoảng cách mặc định của tài liệu (w:defaultTabStop): cột\txếp hàng\ttại\tmỗi tab mặc định."),
    ], { spaceBeforePx: 8 }),
    // --- Run-level typography: tracking, theme tints & script fonts ------------
    heading("Run-level typography — tracking, theme tints & font script", 1),
    para([run("Các chi tiết run-level này sống sót qua round-trip .docx đầy đủ (import → edit → export), khớp với những gì Word lưu trên mỗi run.")], { spaceAfterPx: 8 }),

    para([run("Tracking ký tự", { bold: true, color: "#1a1a2e" })], { spaceBeforePx: 6, spaceAfterPx: 2 }),
    para([
      run("Tracking (OOXML w:spacing) mở rộng hoặc thu hẹp khoảng cách chữ: "),
      run("r  Ř  Ň  g  g  i  n  g", { letterSpacingPx: 3 }),
      run(" tracking bình thường, và "),
      run("thu hẹp", { letterSpacingPx: -0.5 }),
      run(" — mỗi giá trị import lại chính xác."),
    ]),

    para([run("Theme tint & shade", { bold: true, color: "#1a1a2e" })], { spaceBeforePx: 8, spaceAfterPx: 2 }),
    para([
      run("Khi import, màu theme có tint hoặc shade (w:themeTint / w:themeShade) giải thành sắc thực tế sáng/tối hơn thay vì phẳng thành màu cơ sở. Đây là các sắc thực tế của accent blue Office "),
      run("#4472C4", { color: "#4472c4", bold: true }),
      run(" — "),
      run("60% tint", { color: "#8faadc", bold: true }),
      run(" sáng hơn và "),
      run("50% shade", { color: "#223962", bold: true }),
      run(" tối hơn. (Model lưu màu cụ thể nên việc giải import được covered bởi round-trip test.)"),
    ]),

    para([run("Font slot complex-script & Đông Á", { bold: true, color: "#1a1a2e" })], { spaceBeforePx: 8, spaceAfterPx: 2 }),
    para([
      run("Run bảo quản font complex-script (w:cs) và Đông Á (w:eastAsia): cụm Ả Rập "),
      run("Xin chào", { fontFamilyComplexScript: "Scheherazade New, serif" }),
      run(" mang font complex-script và cụm Nhật "),
      run("Nhật Bản", { fontFamilyEastAsia: "Yu Mincho, serif" }),
      run(" font Đông Á — cả hai round-trip độc lập với font Latin."),
    ]),

    // --- Text quốc tế: CJK + hai chiều (RTL) ----------------------------------
    heading("Text quốc tế — CJK & hai chiều", 1),
    para([run("Chữ Đông Á và phải-sang-trái được sắp xếp như Word — đo trên canvas, với ngắt dòng Unicode và thuật toán hai chiều (UAX #9), không phải contenteditable của trình duyệt.")], { spaceAfterPx: 8 }),

    para([run("Nhật Bản — ngắt dòng CJK & kinsoku", { bold: true, color: "#1a1a2e" })], { spaceBeforePx: 6, spaceAfterPx: 2 }),
    para([run("Nhật Bảnの文章は単語の間にスペースを入れません。それでもエンジンは文字単位で行を折り返し、句読点が行頭に来ないように禁則処理（kinsoku）を行います。「角括弧」のような約物も正しく扱われ、長い段落でもページをまたいで自然に流れます。")]),

    para([run("Ả Rập — phải-sang-trái", { bold: true, color: "#1a1a2e" })], { spaceBeforePx: 8, spaceAfterPx: 2 }),
    para([run("Tiếng Ả Rập viết từ phải sang trái. Trình soạn thảo sắp xếp lại text theo thuật toán hai chiều Unicode, căn paragraph phải tự động, và đặt con trỏ đúng vị trí khi nhập và chọn.")], { direction: "rtl" }),

    para([run("Do Thái — phải-sang-trái", { bold: true, color: "#1a1a2e" })], { spaceBeforePx: 8, spaceAfterPx: 2 }),
    para([run("Tiếng Do Thái viết từ phải sang trái. Trình soạn thảo sắp xếp lại chuỗi hình ảnh, căn paragraph phải mặc định, và hỗ trợ phân trang đa trang.")], { direction: "rtl" }),

    para([run("Bidi lồng nhau — số & Latin trong RTL", { bold: true, color: "#1a1a2e" })], { spaceBeforePx: 8, spaceAfterPx: 2 }),
    para([run("Sản phẩm «kindy-editor» có giá 1.299.000 VNĐ từ năm 2026 — số và chữ Latin giữ đúng thứ tự trái→phải trong text Ả Rập.")], { direction: "rtl" }),
    para([
      run("Và ngược lại, trong dòng trái→phải này: cụm Do Thái nhúng "),
      run("Chào thế giới"),
      run(" và cụm Ả Rập "),
      run("Xin chào بالعالم"),
      run(" mỗi cái tự sắp xếp lại trong khi tiếng Anh vẫn đọc trái→phải — con trỏ, vùng chọn và phím mũi tên theo thứ tự hình ảnh."),
    ]),

    para([run("Bảng, điều khiển nội dung & trường — trong CJK / RTL", { bold: true, color: "#1a1a2e" })], { spaceBeforePx: 10, spaceAfterPx: 4 }),
    para([run("Hướng kết hợp với mọi tính năng khác. Bảng này trộn cột Ả Rập phải-sang-trái với cột Nhật, và ô cuối chứa điều khiển nội dung cộng trường PAGE sống:")], { spaceAfterPx: 6 }),
    bidiCjkTable(),

    para([run("Điều khiển nội dung có giá trị phải-sang-trái: "), sdtRun({ type: "richText", alias: "Rich text RTL" }, "Văn bản phong phú có thể chỉnh sửa"), run(" — và một cái tiếng Nhật: "), sdtRun({ type: "richText", alias: "Nhật Bản" }, "Text có thể chỉnh sửa"), run(".")], { spaceBeforePx: 10 }),

    para([
      run("Và trường động trong paragraph Ả Rập: đây là trang số "),
      pageField(),
      run(", tạo ngày "),
      dateField("yyyy-MM-dd"),
      run(" — tự động tính lại khi cập nhật."),
    ], { direction: "rtl" }),

    para([run("Danh sách RTL & justified", { bold: true, color: "#1a1a2e" })], { spaceBeforePx: 10, spaceAfterPx: 4 }),
    para([run("Danh sách bullet tiếng Ả Rập, dấu treo bên phải")], { direction: "rtl", list: { listId: DEFAULT_BULLET_LIST_ID, level: 0 }, spaceAfterPx: 2 }),
    para([run("Phần tử thứ hai trong danh sách")], { direction: "rtl", list: { listId: DEFAULT_BULLET_LIST_ID, level: 0 }, spaceAfterPx: 2 }),
    para([run("Cấp lồng trong danh sách")], { direction: "rtl", list: { listId: DEFAULT_BULLET_LIST_ID, level: 1 }, spaceAfterPx: 2 }),
    para([run("Paragraph tiếng Ả Rập justified trải dài nhiều dòng: khoảng cách giữa các từ được phân phối đều để mỗi dòng đầy từ cạnh đến cạnh, với sắp xếp lại hình ảnh của từ và số — giống hệt Word với text hai chiều. ".repeat(3))], { direction: "rtl", align: "justify", spaceBeforePx: 6 }),

    // --- Toán học: phương trình MathML ----------------------------------------
    heading("Toán học — Phương trình MathML", 1),
    para([
      run("Phương trình là đối tượng cơ bản. Chúng được lưu dưới dạng "),
      run("MathML", { bold: true }),
      run(" (tiêu chuẩn W3C), typeset bởi chính layout engine phân trang các trang này — phân số, căn, chỉ số, giới hạn tổng/tích phân và ma trận đều được đo trên canvas — và round-trip qua "),
      run(".docx", { fontFamily: "Consolas, monospace", fontSizePx: 14 }),
      run(" dưới dạng "),
      run("OMML", { bold: true }),
      run(", định dạng toán mà chính Word dùng. Chúng được typeset bằng font STIX Two Math (glyph toán thật, dấu ngoặc mở rộng và toán tử lớn), và bạn có thể nhập bằng "),
      run("LaTeX", { bold: true }),
      run(" — Chèn → Phương trình, ví dụ "),
      run("\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}", { fontFamily: "Consolas, monospace", fontSizePx: 13 }),
      run(". Một số phương trình hiển thị, render sống bên dưới:"),
    ], { spaceAfterPx: 10 }),

    para([
      run("Phương trình cũng "),
      run("inline", { italic: true }),
      run(" trong câu và ngồi trên baseline text — ví dụ đẳng thức Pythagorean "),
      inlineEq("<math><msup><mi>a</mi><mn>2</mn></msup><mo>+</mo><msup><mi>b</mi><mn>2</mn></msup><mo>=</mo><msup><mi>c</mi><mn>2</mn></msup></math>"),
      run(", hoặc phân số nhanh "),
      inlineEq("<math><mfrac><mn>1</mn><mn>2</mn></mfrac></math>"),
      run(" — chuột phải vào bất kỳ cái nào để sửa (bằng LaTeX hoặc MathML)."),
    ], { spaceBeforePx: 6, spaceAfterPx: 8 }),

    para([run("Công thức bậc hai — căn lồng, phân số và toán ±. Nguồn MathML hiển thị bên dưới kết quả render:", { color: "#3c4043" })], { spaceBeforePx: 6, spaceAfterPx: 6 }),
    eq(MATH_QUADRATIC),
    para([mathmlSource(MATH_QUADRATIC)], { spaceBeforePx: 2, spaceAfterPx: 10 }),

    para([run("Tổng hội tụ, với giới hạn trên và dưới dấu tổng (Bài toán Basel):", { color: "#c4043" })], { spaceBeforePx: 6, spaceAfterPx: 6 }),
    eq(MATH_SUM),

    para([run("Tích phân Gauss — chỉ số trên/dưới dấu tích phân và mũ lồng:", { color: "#3c4043" })], { spaceBeforePx: 10, spaceAfterPx: 6 }),
    eq(MATH_INTEGRAL),

    para([run("Đẳng thức Euler — phương trình đẹp nhất toán học:", { color: "#3c4043" })], { spaceBeforePx: 10, spaceAfterPx: 6 }),
    eq(MATH_EULER),

    para([run("Ma trận có dấu ngoặc, sắp xếp dạng lưới (đơn vị 2×2):", { color: "#3c4043" })], { spaceBeforePx: 10, spaceAfterPx: 6 }),
    eq(MATH_MATRIX),

    // Chú thích末note (w:endnoteReference) — marker trỏ vào Document.endnotes;
    // nội dung nằm cuối cùng tài liệu dưới đường phân cách.
    para([
      run("Chú thích末note", { bold: true }), run(" cũng round-trip"),
      run("1", { endnoteRef: "en1", verticalAlign: "super", fontSizePx: 11 }),
      run(" — giống chú thích末note, nhưng ở cuối tài liệu."),
    ], { spaceBeforePx: 6 }),
    // --- Khoảng cách dòng cố định (w:lineRule exact/atLeast) -----------------
    heading("Khoảng cách dòng cố định", 1),
    para([
      run("Khoảng cách dòng thường là "),
      run("hệ số", { bold: true }),
      run(" của cỡ chữ (đơn, 1.5×, đôi). Word cũng hỗ trợ "),
      run("cố định", { bold: true }),
      run(" khoảng cách điểm qua "),
      run("w:lineRule", { fontFamily: "Consolas, monospace", fontSizePx: 14 }),
      run(": "),
      run("exact", { fontFamily: "Consolas, monospace", fontSizePx: 14 }),
      run(" ghim mỗi dòng vào chiều cao tính bằng điểm (glyph cao hơn bị cắt), trong khi "),
      run("atLeast", { fontFamily: "Consolas, monospace", fontSizePx: 14 }),
      run(" đặt sàn tăng cho dòng cao hơn. Cả hai round-trip qua .docx và lái phân trang."),
    ], { spaceAfterPx: 8 }),
    para([run("Paragraph này dùng khoảng cách dòng CHÍNH XÁC 28px — mỗi hộp dòng đúng 28px cao bất kể text. Word lưu thành w:spacing w:line=\"420\" w:lineRule=\"exact\". Lưu ý các dòng ngồi chặt ở khoảng cách đều dù run này đủ dài để xuống dòng qua nhiều trang.".repeat(1))],
      { lineRule: "exact", lineHeightPx: 28, spaceAfterPx: 8 }),
    para([
      run("Paragraph này dùng khoảng cách dòng ÍT NHẤT 24px — dòng ít nhất 24px cao nhưng dòng có glyph lớn hơn, "),
      run("như từ 30px này", { fontSizePx: 30 }),
      run(", phát triển để vừa. Word lưu thành w:spacing w:line=\"360\" w:lineRule=\"atLeast\"."),
    ], { lineRule: "atLeast", lineHeightPx: 24, spaceAfterPx: 10 }),
    // --- Ngắt phần & đánh số dòng (w:sectPr/w:type, w:lnNumType) -------------
    heading("Ngắt phần & đánh số dòng", 1),
    // Paragraph này KẾT THÚC luồng chính thành phần riêng; phần (đánh số dòng)
    // tiếp theo. Ngắt Next Page đơn giản — hình học kế thừa từ thân.
    para([run("Các phần Word có thể buộc trang đầu tiên vào số trang lẻ hoặc chẵn, và in số bên cạnh mỗi dòng trong lề. Phần tiếp theo minh họa cả hai: nó bắt đầu trên trang lẻ (trang điền trống được chèn khi số trang hiện tại là chẵn) và đánh số mỗi dòng qua w:lnNumType.")], {
      spaceAfterPx: 6,
      sectionBreak: { type: "nextPage", props: {} },
    }),

    heading("Phần có đánh số dòng, bắt đầu trên trang lẻ", 2),
    para([run("Mỗi dòng bên dưới mang số dòng nhỏ trong lề. Đếm lại từ đầu mỗi trang (mặc định Word), và các số round-trip sang .docx và PDF. Paragraph justified đa dòng này giúp thấy rõ đánh số từng dòng: " + LOREM.repeat(6))], { align: "justify", spaceAfterPx: 6 }),
    // Paragraph này KẾT THÚC phần đánh số dòng: w:type là oddPage và
    // sectPr mang w:lnNumType đánh số mỗi dòng của phần này.
    para([run("Đánh số dòng là thuộc tính từng phần — dòng dưới cùng bên dưới thuộc phần cuối (không đánh số), nên các dòng của nó không được đánh số.")], {
      sectionBreak: { type: "oddPage", props: { lineNumbering: { countBy: 1, restart: "newPage" } } },
    }),

    para([run("— giới thiệu kindy-editor —", { italic: true, color: "#5f6368" })], { align: "center", spaceBeforePx: 20 }),
  ];

  // Bookmark literal "text đã bookmark" trong paragraph footnotes/formatting
  // (bodyBlocks[2]); nó nằm ở offset 51..66 của paragraph text
  // ("Chú thích末note" + " cũng được hỗ trợ" + "1" + ". Cùng với " + "metadata ẩn").
  bookmarks["sample"] = { start: { blockId: bodyBlocks[2]!.id, offset: 51 }, end: { blockId: bodyBlocks[2]!.id, offset: 66 } };

  // --- Mục lục (tạo từ các heading đã đăng ký) --------------------------------
  const tocHostDoc: Document = { section: { pageWidthPx: 816, pageHeightPx: 1056, marginPx: { top: 96, right: 96, bottom: 96, left: 96 } }, blocks: bodyBlocks };
  const tocEntries = buildTocParagraphs(tocHostDoc, { title: null, maxLevel: 3, leader: "dot" });

  const blocks: Document["blocks"] = [
    para([run("kindy-editor", { fontFamily: "Arial, sans-serif", fontSizePx: 32, bold: true, color: "#1a1a2e" })], { align: "center", spaceAfterPx: 4, namedStyle: "Title" }),
    para([run("Trình soạn thảo Word chính xác, vẽ bằng canvas — giới thiệu tính năng", { italic: true, color: "#5f6368" })], { align: "center", spaceAfterPx: 24, namedStyle: "Subtitle" }),
    para([run("Mục lục", { bold: true, fontSizePx: 20, color: "#1a1a2e" })], { spaceAfterPx: 8 }),
    ...tocEntries,
    ...bodyBlocks,
  ];

  const doc: Document = {
    stylesheet: defaultStylesheet(),
    lists: { [DEFAULT_BULLET_LIST_ID]: defaultListDefinition("bullet"), [DEFAULT_NUMBER_LIST_ID]: defaultListDefinition("decimal") },
    section: {
      pageWidthPx: 816, pageHeightPx: 1056, marginPx: { top: 96, right: 96, bottom: 96, left: 96 },
      header: [para([run("kindy-editor", { fontFamily: "Arial, sans-serif", fontSizePx: 11, bold: true, color: "#5f6368" }), run("  ·  giới thiệu tính năng", { fontFamily: "Arial, sans-serif", fontSizePx: 11, color: "#9aa0a6" })], { spaceAfterPx: 0 })],
      footer: [para([run("Trang {page} / {pages}", { fontFamily: "Arial, sans-serif", fontSizePx: 11, color: "#9aa0a6" })], { align: "center", spaceAfterPx: 0 })],
    },
    blocks,
    fields,
    sdts,
    footnotes,
    endnotes,
    bookmarks,
    tocInstruction: ' TOC \\o "1-3" \\h \\z ',
    // Khoảng cách tab mặc định cấp tài liệu (w:defaultTabStop) — 0.75in thay vì
    // fallback 0.5in của engine, nên demo tab stop ở trên tôn khoảng cách đó (#63).
    defaultTabStopPx: 72,
  };
  return doc;
}
