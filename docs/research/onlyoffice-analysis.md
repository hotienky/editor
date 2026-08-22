# OnlyOffice Architecture Analysis

> Status: Completed
> Date: 2026-08-07

## Overview

OnlyOffice is an open-source office suite with document editing capabilities. It is known for its true WYSIWYG editing approach.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                           │
│  (Web Browser, Mobile App, Desktop App)                     │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway                              │
│  (SDK API, WebSocket)                                       │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                  Application Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Document   │  │ Spreadsheet │  │ Presentation│         │
│  │  Editor     │  │   Editor    │  │   Editor    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                  Core Services                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Document   │  │ Collaboration│  │   Plugin    │         │
│  │  Service    │  │   Service    │  │   Service   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Storage Layer                            │
│  (PostgreSQL, Redis, S3-compatible storage)                 │
└─────────────────────────────────────────────────────────────┘
```

### MVC Pattern

OnlyOffice uses strict MVC pattern:

- **Model**: Document data, state, business logic
- **View**: UI components (toolbar, rulers, panels)
- **Controller**: Handles user input, coordinates model/view

### Key Components

1. **Document Editor**: Rich text editing with formatting
2. **Spreadsheet Editor**: Cell-based editing with formulas
3. **Presentation Editor**: Slide-based editing
4. **PDF Editor**: PDF viewing and editing
5. **Plugin System**: Extensible via plugins and macros

## Document Model

### Native Office Open XML

OnlyOffice works natively with Office Open XML formats:

- **DOCX**: Word documents
- **XLSX**: Spreadsheets
- **PPTX**: Presentations

### Unified Document Model

```
Document
├── Sections
│   ├── Headers
│   ├── Footers
│   └── Body Content
├── Styles
│   ├── Paragraph Styles
│   ├── Character Styles
│   └── Table Styles
└── Content
    ├── Paragraphs
    ├── Tables
    ├── Images
    └── Other Objects
```

## Layout Engine

### True WYSIWYG Approach

OnlyOffice achieves true WYSIWYG through:

1. **Single Document Model**: Same model for editing, preview, and export
2. **Unified Rendering Engine**: Same engine for all modes
3. **Native Format Support**: Direct manipulation of DOCX structures
4. **HTML5 Canvas Rendering**: Platform-independent rendering

### Key Features

- **Pagination calculated during editing**: Page breaks exist while editing
- **Header/Footer support**: Real-time header/footer rendering
- **Font metric consistency**: Cross-platform font handling
- **Deterministic rendering**: Same output regardless of browser

### Architecture

```
Document Model
    ↓
Layout Engine
    ↓
Canvas Renderer
    ↓
HTML5 Canvas
```

### Rendering

- Uses JavaScript and HTML5 Canvas for rendering
- Node.js on server side
- 100% view, print, and pagination fidelity
- Platform-independent rendering

## Collaboration

### Co-editing Modes

1. **Fast Mode**: Real-time collaboration with paragraph locking
2. **Strict Mode**: Paragraph locked while being edited

### Features

- Real-time synchronization
- Comments and annotations
- Track changes
- Version history
- Built-in chat

## Strengths

1. **True WYSIWYG**: What you see is what you get
2. **Native Office formats**: Direct DOCX/XLSX/PPTX support
3. **Open source**: Transparent and extensible
4. **API-first**: Designed for embedding
5. **Cross-platform**: Works on web, mobile, desktop

## Weaknesses

1. **Complex architecture**: Large codebase
2. **Resource intensive**: Requires significant server resources
3. **Learning curve**: Complex API for developers

## Lessons Learned for UMO

1. **True WYSIWYG**: Use a unified layout engine for all modes
2. **Native formats**: Direct manipulation of document structures
3. **Canvas rendering**: Platform-independent rendering
4. **API-first design**: Design for embedding from the start
5. **Plugin system**: Extensible architecture is essential

---

## References

- [OnlyOffice Technical Architecture](https://deepwiki.com/ONLYOFFICE/web-apps/1.1-technical-architecture-and-mvc-pattern)
- [OnlyOffice GitHub](https://github.com/ONLYOFFICE/DocumentServer)
- [What is True WYSIWYG Editing?](https://www.onlyoffice.com/blog/2026/02/what-is-true-wysiwyg-editing)
