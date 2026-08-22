# ADR-003: Render Strategy

## Status

Proposed

## Date

2026-08-07

## Context

We need to render the document in the browser. The options are:

1. Render all pages at once
2. Render only visible pages (virtual scrolling)
3. Use Canvas/WebGL for rendering

## Decision

Use a hybrid approach:

- **Default**: Render pages as DOM elements (HTML/CSS)
- **Virtual scrolling**: Only render visible pages + buffer
- **Print/Export**: Render all pages to iframe

## Consequences

### Positive

- DOM rendering is familiar and easy to style
- Virtual scrolling handles large documents
- Iframe for print ensures accurate output
- Can later add Canvas rendering if needed

### Negative

- DOM rendering has performance limits (1000+ pages)
- Virtual scrolling adds complexity
- Need to sync between editor state and rendered pages

## Alternatives

- **Canvas rendering**: Better performance, but harder to style and interact with
- **WebGL**: Best performance, but too complex for text rendering

## References

- Google Docs uses Canvas for rendering
- Word Online uses DOM with virtual scrolling
- OnlyOffice uses Canvas
