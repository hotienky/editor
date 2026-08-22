# Header and Footer Feature

## Overview

This feature adds the ability to add header and footer text to pages in the editor, similar to Microsoft Word and other document editors.

## Features

### Header Configuration

Headers can be:
- **Enabled/Disabled**: Toggle visibility of the header area
- **Text Content**: Enter custom text for the header
- **Font Styling**: Customize font family, size, weight, and color
- **Alignment**: Left, center, or right alignment
- **Position**: Height from top margin

### Footer Configuration

Footers can be:
- **Enabled/Disabled**: Toggle visibility of the footer area
- **Text Content**: Enter custom text for the footer
- **Font Styling**: Customize font family, size, weight, and color
- **Alignment**: Left, center, or right alignment
- **Position**: Height from bottom margin

## Usage

1. **Toggle Header/Footer**: Use the header/footer buttons in the page toolbar to show/hide the header and footer areas.

2. **Edit Content**: Click on the header or footer content area to edit the text directly in the document.

3. **Configure Styling**: Use the page settings panel to customize appearance.

## Configuration

### Default Options

The header and footer are configured with default values:
- Font family: Arial
- Font size: 12px
- Font color: #333 (dark gray)
- Font weight: normal
- Default alignment: center

### Schema Definition

Both header and footer have the same configuration schema with the following fields:
- `enable`: boolean (default: true)
- `text`: string (default: empty)
- `fontColor`: string (default: '#333')
- `fontSize`: number (default: 12)
- `fontFamily`: string (default: 'Arial')
- `fontWeight`: string (default: 'normal')
- `align`: string - 'left', 'center', or 'right' (default: 'center')
- `marginTop` (header) / `marginBottom` (footer): number (default: 0.5)

## Implementation Details

### Tiptap Extensions

The feature includes two Tiptap extensions:
- `header`: For inserting header content
- `footer`: For inserting footer content

Both extensions are keyboard shortcuts:
- Header: Mod+Shift+H
- Footer: Mod+Shift+F

### Vue Components

1. **Header Component** (`src/components/menus/toolbar/page/header.vue`): Toggle button
2. **Footer Component** (`src/components/menus/toolbar/page/footer.vue`): Toggle button

### Page Component

The main page component (`src/components/container/page.vue`) handles:
- Displaying header and footer based on configuration
- Applying styling from the page configuration
- Handling click-to-edit functionality

### Toolbar Integration

Both header and footer buttons are integrated into:
- Classic toolbar mode
- Ribbon toolbar mode
- Page menu

## Styling

The header and footer elements have the following CSS classes:
- `kindy-page-node-header`: Container for the header
- `kindy-page-node-header-content`: Editable content area
- `kindy-page-node-footer`: Container for the footer
- `kindy-page-node-footer-content`: Editable content area

## Future Enhancements

Potential future improvements:
- Multiple header/footer styles (different layouts)
- Dynamic content (page numbers, dates, etc.)
- Advanced formatting options (bold, italic, underline)
- Template support for standard headers/footers
- Print-specific header/footer options

## Testing

Unit tests should verify:
- Header/footer toggle functionality
- Configuration validation
- Styling application
- Editing behavior

## Migration

This feature is backward compatible:
- Existing documents without header/footer will continue to work
- New documents will have header and footer enabled by default
- Configuration is optional and will use defaults when not specified

## Notes

- The header and footer are rendered as separate block elements within the page
- They are positioned outside the main content area but within the page margins
- Click-to-edit functionality is only available when the header/footer is enabled
- The content is saved as part of the document's content

