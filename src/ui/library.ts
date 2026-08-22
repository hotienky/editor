export type KindyLibraryDensity = 'compact' | 'comfortable'

export interface KindyLibraryUiOptions {
  density: KindyLibraryDensity
  explorerWidth: string
  versionsWidth: string
  showTopbar: boolean
  showExplorer: boolean
  showVersions: boolean
}

export interface KindyLibraryMessages {
  documents: string
  newDocument: string
  importDocx: string
  search: string
  clearSearch: string
  loading: string
  empty: string
  emptyDescription: string
  untitled: string
  chooseTemplate: string
  useTemplate: string
  allFolders: string
  compatibilityConfirm: string
  versions: string
  noVersions: string
  preview: string
  restore: string
  restoring: string
  refresh: string
  close: string
  openDocuments: string
  openVersions: string
  selectDocument: string
  selectDocumentDescription: string
  saving: string
  saved: string
  unsaved: string
  readOnly: string
  currentVersion: string
  previewingVersion: string
  backToCurrent: string
  save: string
  downloadDocx: string
  print: string
  retry: string
  loadFailed: string
}

export const DEFAULT_LIBRARY_UI: KindyLibraryUiOptions = Object.freeze({
  density: 'comfortable',
  explorerWidth: '300px',
  versionsWidth: '288px',
  showTopbar: true,
  showExplorer: true,
  showVersions: true,
})

export const VI_LIBRARY_MESSAGES: KindyLibraryMessages = Object.freeze({
  documents: 'Tài liệu',
  newDocument: 'Tạo mới',
  importDocx: 'Import DOCX',
  search: 'Tìm tài liệu…',
  clearSearch: 'Xóa tìm kiếm',
  loading: 'Đang tải…',
  empty: 'Chưa có tài liệu',
  emptyDescription: 'Tạo tài liệu mới hoặc import một file DOCX để bắt đầu.',
  untitled: 'Tài liệu chưa đặt tên',
  chooseTemplate: 'Chọn mẫu DOCX…',
  useTemplate: 'Dùng mẫu',
  allFolders: 'Tất cả thư mục',
  compatibilityConfirm: 'DOCX có tính năng ngoài compatibility profile. Tiếp tục import best-effort?',
  versions: 'Phiên bản',
  noVersions: 'Chưa có phiên bản',
  preview: 'Xem',
  restore: 'Khôi phục',
  restoring: 'Đang khôi phục…',
  refresh: 'Làm mới',
  close: 'Đóng',
  openDocuments: 'Mở danh sách tài liệu',
  openVersions: 'Mở lịch sử phiên bản',
  selectDocument: 'Chọn một tài liệu để bắt đầu',
  selectDocumentDescription: 'Bạn có thể tạo tài liệu trống, dùng mẫu hoặc import DOCX từ máy tính.',
  saving: 'Đang lưu…',
  saved: 'Đã lưu',
  unsaved: 'Có thay đổi chưa lưu',
  readOnly: 'Chỉ đọc',
  currentVersion: 'Bản hiện hành',
  previewingVersion: 'Đang xem phiên bản',
  backToCurrent: 'Quay lại bản hiện hành',
  save: 'Lưu',
  downloadDocx: 'Tải DOCX',
  print: 'In / PDF',
  retry: 'Thử lại',
  loadFailed: 'Không thể tải dữ liệu.',
})

export const EN_LIBRARY_MESSAGES: KindyLibraryMessages = Object.freeze({
  documents: 'Documents',
  newDocument: 'New document',
  importDocx: 'Import DOCX',
  search: 'Search documents…',
  clearSearch: 'Clear search',
  loading: 'Loading…',
  empty: 'No documents yet',
  emptyDescription: 'Create a document or import a DOCX file to get started.',
  untitled: 'Untitled document',
  chooseTemplate: 'Choose a DOCX template…',
  useTemplate: 'Use template',
  allFolders: 'All folders',
  compatibilityConfirm: 'This DOCX contains features outside the compatibility profile. Continue with best-effort import?',
  versions: 'Versions',
  noVersions: 'No versions yet',
  preview: 'Preview',
  restore: 'Restore',
  restoring: 'Restoring…',
  refresh: 'Refresh',
  close: 'Close',
  openDocuments: 'Open documents',
  openVersions: 'Open version history',
  selectDocument: 'Select a document to get started',
  selectDocumentDescription: 'Create a blank document, use a template, or import a DOCX file.',
  saving: 'Saving…',
  saved: 'Saved',
  unsaved: 'Unsaved changes',
  readOnly: 'Read only',
  currentVersion: 'Current version',
  previewingVersion: 'Previewing version',
  backToCurrent: 'Back to current version',
  save: 'Save',
  downloadDocx: 'Download DOCX',
  print: 'Print / PDF',
  retry: 'Retry',
  loadFailed: 'Unable to load data.',
})

export const DEFAULT_LIBRARY_THEME = Object.freeze({
  '--kindy-library-bg': '#eef2f7',
  '--kindy-library-surface': '#ffffff',
  '--kindy-library-sidebar-bg': '#ffffff',
  '--kindy-library-text': '#172033',
  '--kindy-library-muted': '#64748b',
  '--kindy-library-border': '#dbe3ec',
  '--kindy-library-selection': '#e6f4ff',
  '--kindy-library-selection-text': '#075985',
  '--kindy-library-primary': '#087fb9',
  '--kindy-library-primary-hover': '#0369a1',
  '--kindy-library-danger': '#b42318',
  '--kindy-library-radius': '10px',
  '--kindy-library-shadow': '0 18px 48px rgb(15 23 42 / 14%)',
})

export function resolveLibraryMessages(locale = 'vi-VN', overrides: Partial<KindyLibraryMessages> = {}): KindyLibraryMessages {
  const base = locale.toLowerCase().startsWith('vi') ? VI_LIBRARY_MESSAGES : EN_LIBRARY_MESSAGES
  return { ...base, ...overrides }
}

export function createLibraryTheme(overrides: Record<string, string> = {}) {
  return { ...DEFAULT_LIBRARY_THEME, ...overrides }
}

export function resolveLibraryUi(options: Partial<KindyLibraryUiOptions> = {}): KindyLibraryUiOptions {
  return { ...DEFAULT_LIBRARY_UI, ...options }
}
