# ADR-002: Layout Engine Approach

## Status

Proposed

## Date

2026-08-07

## Context

We need a layout engine to handle pagination, header/footer, and page layout. The options are:

1. Use browser's built-in pagination (`@page` CSS)
2. Build a custom layout engine
3. Use an existing library (e.g., WeasyPrint, Puppeteer)

## Decision

Build a custom layout engine that:

- Uses Canvas API for text measurement
- Computes layout in JavaScript (can run in Web Worker)
- Generates a Layout Tree (not DOM-dependent)
- Supports incremental updates (cache)

## Consequences

### Positive

- Full control over layout algorithm
- Can optimize for our specific use case
- Can run headless (no DOM dependency)
- Can be tested independently
- Can be reused across frameworks (React, Vue, etc.)

### Negative

- Complex to implement (especially line breaking, table layout)
- Need to handle CJK text, hyphenation, etc.
- Need to maintain our own layout code

## Alternatives

- **Browser pagination**: Limited control, no header/footer, no section breaks
- **WeasyPrint**: Python-based, not suitable for browser
- **Puppeteer**: Too heavy, requires headless Chrome

## References

- Google Docs uses a custom layout engine
- Word uses a custom layout engine
- OnlyOffice uses a custom layout engine
