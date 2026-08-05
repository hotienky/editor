# @kindy/editor

A powerful document editor based on Vue3 and Tiptap3.

Forked from [Umo Editor](https://github.com/umodoc/editor) and customized for personal use.

## Features

- Vue3 + Tiptap3 based rich text editor
- Pagination mode similar to Microsoft Word
- Markdown syntax support
- Rich text editing with various node types
- Page style settings and customization
- Document export and printing
- Dark mode support
- Multi-language support
- Custom extensions support

## Installation

```bash
npm install @kindy/editor
```

## Usage

```vue
<template>
  <UmoEditor v-bind="options" />
</template>

<script setup>
import { UmoEditor } from '@kindy/editor'
import '@kindy/editor/style'

const options = {
  // your options here
}
</script>
```

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## License

MIT License - See [LICENSE](./LICENSE) for details.

## Credits

Based on [Umo Editor](https://github.com/umodoc/editor) by umodoc team.

## Repository

GitHub: https://github.com/hotienky/editor
