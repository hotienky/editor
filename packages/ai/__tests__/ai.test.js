/**
 * @kindy/ai Tests
 *
 * Architecture: Test Layer — AI Package
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  AIProvider,
  AIModel,
  TextCompletion,
  GrammarCheck,
  Summarization,
  Translation,
  ContentGeneration,
} from '../src/index'

describe('AI Package', () => {
  describe('AIProvider', () => {
    it('should create AI provider instance', () => {
      const provider = new AIProvider({
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo',
      })

      expect(provider).toBeDefined()
    })

    it('should have default configuration', () => {
      const provider = new AIProvider({})

      expect(provider.getConfig()).toBeDefined()
    })
  })

  describe('AIModel', () => {
    it('should have model definitions', () => {
      expect(AIModel).toBeDefined()
    })
  })

  describe('TextCompletion', () => {
    let completion

    beforeEach(() => {
      completion = new TextCompletion({
        apiKey: 'test-key',
      })
    })

    it('should create text completion instance', () => {
      expect(completion).toBeDefined()
    })

    it('should have getSuggestions method', () => {
      expect(typeof completion.getSuggestions).toBe('function')
    })

    it('should have getInlineCompletion method', () => {
      expect(typeof completion.getInlineCompletion).toBe('function')
    })
  })

  describe('GrammarCheck', () => {
    let checker

    beforeEach(() => {
      checker = new GrammarCheck({
        apiKey: 'test-key',
      })
    })

    it('should create grammar check instance', () => {
      expect(checker).toBeDefined()
    })

    it('should have check method', () => {
      expect(typeof checker.check).toBe('function')
    })

    it('should have getSuggestions method', () => {
      expect(typeof checker.getSuggestions).toBe('function')
    })
  })

  describe('Summarization', () => {
    let summarizer

    beforeEach(() => {
      summarizer = new Summarization({
        apiKey: 'test-key',
      })
    })

    it('should create summarization instance', () => {
      expect(summarizer).toBeDefined()
    })

    it('should have summarize method', () => {
      expect(typeof summarizer.summarize).toBe('function')
    })

    it('should have getKeyPoints method', () => {
      expect(typeof summarizer.getKeyPoints).toBe('function')
    })
  })

  describe('Translation', () => {
    let translator

    beforeEach(() => {
      translator = new Translation({
        apiKey: 'test-key',
      })
    })

    it('should create translation instance', () => {
      expect(translator).toBeDefined()
    })

    it('should have translate method', () => {
      expect(typeof translator.translate).toBe('function')
    })

    it('should have detectLanguage method', () => {
      expect(typeof translator.detectLanguage).toBe('function')
    })
  })

  describe('ContentGeneration', () => {
    let generator

    beforeEach(() => {
      generator = new ContentGeneration({
        apiKey: 'test-key',
      })
    })

    it('should create content generation instance', () => {
      expect(generator).toBeDefined()
    })

    it('should have generate method', () => {
      expect(typeof generator.generate).toBe('function')
    })

    it('should have rewrite method', () => {
      expect(typeof generator.rewrite).toBe('function')
    })

    it('should have expand method', () => {
      expect(typeof generator.expand).toBe('function')
    })

    it('should have simplify method', () => {
      expect(typeof generator.simplify).toBe('function')
    })
  })
})
