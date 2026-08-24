/**
 * @kindy/react Tests
 *
 * Architecture: Test Layer — React Adapter Package
 */

import { describe, it, expect, beforeEach } from 'vitest'

describe('React Adapter Package', () => {
  describe('Module Structure', () => {
    it('should have index.js', async () => {
      const fs = await import('fs')
      const path = await import('path')
      const indexPath = path.default.join(__dirname, '../src/index.js')
      expect(fs.default.existsSync(indexPath)).toBe(true)
    })

    it('should have EditorProvider component', async () => {
      const fs = await import('fs')
      const path = await import('path')
      const componentPath = path.default.join(__dirname, '../src/components/EditorProvider.js')
      expect(fs.default.existsSync(componentPath)).toBe(true)
    })

    it('should have KindyEditor component', async () => {
      const fs = await import('fs')
      const path = await import('path')
      const componentPath = path.default.join(__dirname, '../src/components/KindyEditor.js')
      expect(fs.default.existsSync(componentPath)).toBe(true)
    })

    it('should have Toolbar component', async () => {
      const fs = await import('fs')
      const path = await import('path')
      const componentPath = path.default.join(__dirname, '../src/components/Toolbar.js')
      expect(fs.default.existsSync(componentPath)).toBe(true)
    })

    it('should have Menu component', async () => {
      const fs = await import('fs')
      const path = await import('path')
      const componentPath = path.default.join(__dirname, '../src/components/Menu.js')
      expect(fs.default.existsSync(componentPath)).toBe(true)
    })

    it('should have ViewportContainer component', async () => {
      const fs = await import('fs')
      const path = await import('path')
      const componentPath = path.default.join(__dirname, '../src/components/ViewportContainer.js')
      expect(fs.default.existsSync(componentPath)).toBe(true)
    })

    it('should have useDocument hook', async () => {
      const fs = await import('fs')
      const path = await import('path')
      const hookPath = path.default.join(__dirname, '../src/hooks/useDocument.js')
      expect(fs.default.existsSync(hookPath)).toBe(true)
    })

    it('should have useLayout hook', async () => {
      const fs = await import('fs')
      const path = await import('path')
      const hookPath = path.default.join(__dirname, '../src/hooks/useLayout.js')
      expect(fs.default.existsSync(hookPath)).toBe(true)
    })

    it('should have useSelection hook', async () => {
      const fs = await import('fs')
      const path = await import('path')
      const hookPath = path.default.join(__dirname, '../src/hooks/useSelection.js')
      expect(fs.default.existsSync(hookPath)).toBe(true)
    })

    it('should have useCollaboration hook', async () => {
      const fs = await import('fs')
      const path = await import('path')
      const hookPath = path.default.join(__dirname, '../src/hooks/useCollaboration.js')
      expect(fs.default.existsSync(hookPath)).toBe(true)
    })

    it('should have usePlugin hook', async () => {
      const fs = await import('fs')
      const path = await import('path')
      const hookPath = path.default.join(__dirname, '../src/hooks/usePlugin.js')
      expect(fs.default.existsSync(hookPath)).toBe(true)
    })
  })
})
