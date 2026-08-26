import { KindyEditor } from "kindy-editor";

// 1. Khởi tạo KindyEditor
const container = document.getElementById("editor-container") as HTMLElement;

const editor = new KindyEditor({
  container,
  user: {
    id: "demo-user",
    firstName: "Nguyễn",
    lastName: "Văn A",
  },
  language: "vi", // Hỗ trợ "vi" hoặc "en"
  mode: "edit",   // "edit" | "suggest" | "view"
  develop: true,  // Bật tab Developer để debug cấu trúc tài liệu
});

// 2. Lắng nghe và hiển thị Public Events
const eventsLog = document.getElementById("events-log") as HTMLElement;
const eventCountEl = document.getElementById("event-count") as HTMLElement;
let eventCount = 0;

const logEvent = (type: string, data: unknown) => {
  eventCount++;
  eventCountEl.textContent = String(eventCount);

  const entry = document.createElement("div");
  entry.className = "log-entry";

  const time = new Date().toLocaleTimeString();
  entry.innerHTML = `
    <div class="log-time">${time}</div>
    <div class="log-type">${type}</div>
    <div class="log-payload">${JSON.stringify(data)}</div>
  `;

  eventsLog.prepend(entry);
};

// Đăng ký nhận toàn bộ event từ EventHub của editor
editor.events.on("*", (event) => {
  logEvent(event.type, event.data);
});

// 3. Tương tác từ Header Controls
const langSelect = document.getElementById("lang-select") as HTMLSelectElement;
langSelect.addEventListener("change", () => {
  const lang = langSelect.value as "vi" | "en";
  editor.setLanguage(lang);
  logEvent("app.language_changed", { language: lang });
});

const modeSelect = document.getElementById("mode-select") as HTMLSelectElement;
modeSelect.addEventListener("change", () => {
  const mode = modeSelect.value as "edit" | "suggest" | "view";
  editor.setMode(mode);
  logEvent("app.mode_changed", { mode });
});

const btnExportPdf = document.getElementById("btn-export-pdf") as HTMLButtonElement;
btnExportPdf.addEventListener("click", async () => {
  try {
    const blob = await editor.exportPdf();
    downloadBlob(blob, "document.pdf");
  } catch (err) {
    console.error("Export PDF failed:", err);
  }
});

const btnExportDocx = document.getElementById("btn-export-docx") as HTMLButtonElement;
btnExportDocx.addEventListener("click", async () => {
  try {
    const blob = await editor.exportDocx();
    downloadBlob(blob, "document.docx");
  } catch (err) {
    console.error("Export DOCX failed:", err);
  }
});

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Bật / tắt bảng Logs Event
const btnToggleLog = document.getElementById("btn-toggle-log") as HTMLButtonElement;
const eventsPanel = document.getElementById("events-panel") as HTMLElement;
btnToggleLog.addEventListener("click", () => {
  eventsPanel.classList.toggle("hidden");
});

const btnClearLog = document.getElementById("btn-clear-log") as HTMLButtonElement;
btnClearLog.addEventListener("click", () => {
  eventsLog.innerHTML = "";
  eventCount = 0;
  eventCountEl.textContent = "0";
});
