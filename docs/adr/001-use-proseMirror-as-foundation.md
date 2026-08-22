# ADR-001: Use ProseMirror as Foundation

## Status

Proposed

## Date

2026-08-07

## Context

We need to choose a foundation for our document model and editing engine. The options are:

1. Build from scratch
2. Use ProseMirror/Tiptap
3. Use Lexical
4. Use Slate

## Decision

Use ProseMirror as the foundation for our document model and editing engine, with Tiptap as the Vue/React integration layer.

## Consequences

### Positive

- ProseMirror has a mature document model (AST)
- Transaction-based editing (no direct DOM manipulation)
- Extensible via plugins
- Battle-tested in production (Google Docs-like editors)
- Good TypeScript support via Tiptap

### Negative

- Learning curve for ProseMirror concepts
- Need to bridge between ProseMirror schema and our schema
- Some ProseMirror limitations (e.g., no built-in pagination)

## Alternatives

- **Lexical**: Newer, less mature, but good React integration
- **Slate**: More flexible but less structured, more bugs
- **From scratch**: Too much work, reinventing the wheel

## References

- https://prosemirror.net/
- https://tiptap.dev/
