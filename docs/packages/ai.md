# @umo/ai

AI platform for document intelligence.

## Installation

```bash
npm install @umo/ai
```

## Quick Start

```javascript
import {
  AIProvider,
  TextCompletion,
  GrammarCheck,
  Summarization,
  Translation,
  ContentGeneration,
} from '@umo/ai'

// Create AI provider
const provider = new AIProvider({
  apiKey: 'your-api-key',
  model: 'gpt-3.5-turbo',
})

// Text completion
const completion = new TextCompletion(provider)
const suggestions = await completion.getSuggestions('Write a paragraph about...')

// Grammar check
const grammar = new GrammarCheck(provider)
const issues = await grammar.check('This are wrong.')

// Summarization
const summarizer = new Summarization(provider)
const summary = await summarizer.summarize(longText)

// Translation
const translator = new Translation(provider)
const translated = await translator.translate(text, 'en', 'vi')

// Content generation
const generator = new ContentGeneration(provider)
const content = await generator.generate('Write a blog post about...')
```

## API Reference

### `AIProvider`

Main AI provider class.

```javascript
const provider = new AIProvider({
  apiKey: 'your-api-key',
  model: 'gpt-3.5-turbo',
  baseUrl: 'https://api.openai.com/v1',
})
```

### `TextCompletion`

Provides text completion suggestions.

#### `getSuggestions(prompt, options)`

Gets completion suggestions.

**Options:**
- `maxTokens` (Number): Maximum tokens to generate
- `temperature` (Number): Creativity (0-1)

#### `getInlineCompletion(text, position)`

Gets inline completion for text at position.

### `GrammarCheck`

Checks grammar and spelling.

#### `check(text)`

Checks text for issues.

**Returns:** Array of issues

```javascript
[
  {
    message: 'Subject-verb agreement',
    offset: 0,
    length: 8,
    suggestions: ['This is', 'These are'],
  },
]
```

#### `suggest(text, issue)`

Gets suggestions for fixing an issue.

### `Summarization`

Summarizes long text.

#### `summarize(text, options)`

Summarizes text.

**Options:**
- `maxLength` (Number): Maximum summary length
- `style` (String): 'brief' or 'detailed'

#### `extractKeyPoints(text)`

Extracts key points from text.

### `Translation`

Translates text between languages.

#### `translate(text, from, to)`

Translates text.

**Languages:** 'en', 'vi', 'ja', 'ko', 'zh', etc.

#### `detectLanguage(text)`

Detects text language.

### `ContentGeneration`

Generates content.

#### `generate(prompt, options)`

Generates content from prompt.

#### `rewrite(text, style)`

Rewrites text in a different style.

**Styles:** 'formal', 'casual', 'technical', 'simple'

#### `expand(text)`

Expands text with more details.

#### `compress(text)`

Compresses text to shorter version.

## AI Models

```javascript
import { AIModel } from '@umo/ai'

AIModel.GPT_3_5_TURBO  // gpt-3.5-turbo
AIModel.GPT_4          // gpt-4
AIModel.GPT_4_TURBO    // gpt-4-turbo
```

## Usage Example

```javascript
// Grammar check while typing
editor.on('change', async (text) => {
  const issues = await grammar.check(text)

  // Highlight issues
  issues.forEach((issue) => {
    editor.highlight(issue.offset, issue.length, 'grammar-error')
  })
})

// Auto-complete suggestions
editor.on('requestSuggestions', async (text, position) => {
  const suggestions = await completion.getInlineCompletion(text, position)
  editor.showSuggestions(suggestions)
})
```
