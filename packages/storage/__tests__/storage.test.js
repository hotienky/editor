/**
 * @kindy/storage Tests
 *
 * Architecture: Test Layer — Storage Package
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  SnapshotStorage,
  OperationStorage,
  VersionStorage,
  LocalStorageAdapter,
} from '../src/index'

describe('Storage Package', () => {
  describe('SnapshotStorage', () => {
    let storage
    let adapter

    beforeEach(() => {
      adapter = new LocalStorageAdapter()
      adapter.clear()
      storage = new SnapshotStorage(adapter)
    })

    it('should create snapshot storage instance', () => {
      expect(storage).toBeDefined()
    })

    it('should save snapshot', () => {
      const result = storage.create('doc-1', { type: 'doc', content: [] })

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
    })

    it('should get snapshot by id', () => {
      const snapshot = storage.create('doc-1', { type: 'doc', content: [] })

      const retrieved = storage.get(snapshot.id)

      expect(retrieved).toBeDefined()
      expect(retrieved.id).toBe(snapshot.id)
    })

    it('should get all snapshots', () => {
      storage.create('doc-1', { type: 'doc', content: [] })
      storage.create('doc-1', { type: 'doc', content: [] })

      const snapshots = storage.getAll('doc-1')

      expect(snapshots).toHaveLength(2)
    })
  })

  describe('OperationStorage', () => {
    let storage
    let adapter

    beforeEach(() => {
      adapter = new LocalStorageAdapter()
      adapter.clear()
      storage = new OperationStorage(adapter)
    })

    it('should create operation storage instance', () => {
      expect(storage).toBeDefined()
    })

    it('should save operation', () => {
      const result = storage.add('doc-1', {
        type: 'insert',
        position: 0,
        data: { text: 'Hello' },
      })

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
    })

    it('should get operations by document', () => {
      storage.add('doc-1', {
        type: 'insert',
        position: 0,
      })

      storage.add('doc-1', {
        type: 'delete',
        position: 5,
      })

      const operations = storage.getAll('doc-1')

      expect(operations).toHaveLength(2)
    })
  })

  describe('VersionStorage', () => {
    let storage

    beforeEach(() => {
      const adapter = new LocalStorageAdapter()
      adapter.clear()
      storage = new VersionStorage(
        adapter,
        new SnapshotStorage(new LocalStorageAdapter()),
      )
    })

    it('should create version storage instance', () => {
      expect(storage).toBeDefined()
    })

    it('should save version', () => {
      const result = storage.create('doc-1', 'v1', 'Initial version')

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
    })

    it('should get versions by document', () => {
      storage.create('doc-1', 'v1', 'Version 1')
      storage.create('doc-1', 'v2', 'Version 2')

      const versions = storage.getAll('doc-1')

      expect(versions).toHaveLength(2)
    })
  })

  describe('LocalStorageAdapter', () => {
    let adapter

    beforeEach(() => {
      adapter = new LocalStorageAdapter()
    })

    it('should create adapter instance', () => {
      expect(adapter).toBeDefined()
    })

    it('should save and get documents', () => {
      adapter.saveDocument({ id: 'doc-1', content: 'test' })

      const result = adapter.getDocument('doc-1')

      expect(result).toEqual({ id: 'doc-1', content: 'test' })
    })

    it('should delete documents', () => {
      adapter.saveDocument({ id: 'doc-1', content: 'test' })

      adapter.deleteDocument('doc-1')

      const result = adapter.getDocument('doc-1')

      expect(result).toBeNull()
    })

    it('should clear all data', () => {
      adapter.saveDocument({ id: 'doc-1', content: 'test1' })
      adapter.saveDocument({ id: 'doc-2', content: 'test2' })

      adapter.clear()

      const result1 = adapter.getDocument('doc-1')
      const result2 = adapter.getDocument('doc-2')

      expect(result1).toBeNull()
      expect(result2).toBeNull()
    })
  })
})
