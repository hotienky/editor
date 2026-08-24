# Google Docs Architecture Analysis

> Status: Completed
> Date: 2026-08-07

## Overview

Google Docs is a web-based word processor that allows real-time collaboration. It is one of the most sophisticated distributed systems for document editing.

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
│  (Load Balancer, Authentication, Rate Limiting)             │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                  Application Services                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Document   │  │ Collaboration│  │  Presence   │         │
│  │  Service    │  │   Service    │  │  Service    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Storage Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Bigtable  │  │   Spanner   │  │  Colossus   │         │
│  │  (Content) │  │  (Metadata) │  │  (Files)    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Document Service**: Handles CRUD operations, document metadata
2. **Collaboration Service**: Manages real-time sync via Operational Transformation (OT)
3. **Presence Service**: Tracks user cursors, selections, awareness
4. **Permission Service**: Role-based access control (owner, editor, commenter, viewer)
5. **Version History Service**: Stores snapshots and operation logs

## Document Model

### Structure

Google Docs uses a custom document model that is NOT HTML-based:

- **Document**: Root container
- **Block elements**: Paragraphs, headings, lists, tables, images
- **Inline elements**: Text with formatting marks
- **Styles**: Paragraph and character styles

### Storage Strategy

- **Snapshot + Operation Log**: Snapshots at regular intervals, operations stored in between
- **Bigtable**: High-throughput storage for document content and operation logs
- **Spanner**: Globally consistent storage for metadata
- **Colossus**: Distributed file system for large binary attachments

## Layout Engine

### Key Insights

1. **HTML/DOM-based approximation**: During editing, layout is approximated using HTML/CSS
2. **Different rendering for export**: Export uses a separate rendering engine
3. **Pagination calculated at export time**: Page breaks don't exist during editing
4. **Browser-dependent rendering**: Layout varies by browser

### Limitations

- Not true WYSIWYG (What You See Is What You Get)
- Layout drift between editing and export
- No real-time pagination

## Collaboration

### Operational Transformation (OT)

Google Docs uses OT for conflict resolution:

- Centralized transformation server per document
- Linear operation history with revision numbers
- Server as single source of truth
- Operations are transformed against each other

### Real-time Sync

- WebSocket connections for persistent bidirectional communication
- Publish-subscribe model for document updates
- Throttled presence updates (max 10/second per user)
- Delta updates for efficiency

## Strengths

1. **Scalability**: Handles millions of concurrent users
2. **Real-time collaboration**: Sub-second latency for changes
3. **Offline support**: Works offline with automatic sync
4. **Version history**: Complete audit trail with point-in-time recovery
5. **Cross-platform**: Works on web, mobile, desktop

## Weaknesses

1. **Not true WYSIWYG**: Layout differs between editing and export
2. **Limited pagination**: No real-time page breaks
3. **Browser-dependent**: Rendering varies by browser
4. **No native DOCX support**: Requires conversion

## Lessons Learned for Kindy

1. **Document Model**: Use AST-based model, not HTML
2. **Collaboration**: Consider CRDT (Yjs) instead of OT for better offline support
3. **Storage**: Snapshot + Operation Log pattern is proven
4. **Presence**: Throttled updates are essential for performance
5. **Layout**: Need a unified layout engine for true WYSIWYG

---

## References

- [Google Docs API Documentation](https://developers.google.com/workspace/docs/api/concepts/structure)
- [Google Docs System Design Guide](https://www.systemdesignhandbook.com/guides/google-docs-system-design)
- [Engineering Google Docs: A Deep Dive](https://bhagwatimalav.substack.com/p/engineering-google-docs-a-deep-dive)
