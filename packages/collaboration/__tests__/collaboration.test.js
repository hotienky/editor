/**
 * @kindy/collaboration Tests
 *
 * Architecture: Test Layer — Collaboration Package
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CollaborationProtocol, PresenceManager, VersionHistory, TrackChanges } from '../src/index'

describe('Collaboration Package', () => {
  describe('CollaborationProtocol', () => {
    it('should export CollaborationProtocol', () => {
      expect(CollaborationProtocol).toBeDefined()
    })
  })

  describe('PresenceManager', () => {
    it('should export PresenceManager', () => {
      expect(PresenceManager).toBeDefined()
    })

    it('should create presence manager instance with collaboration', () => {
      const mockCollaboration = {
        getAwarenessStates: () => [],
        getClientID: () => 1,
        setAwarenessUser: () => {},
        setAwarenessState: () => {},
        onChange: () => () => {},
      }
      const manager = new PresenceManager(mockCollaboration)

      expect(manager).toBeDefined()
    })
  })

  describe('VersionHistory', () => {
    it('should export VersionHistory', () => {
      expect(VersionHistory).toBeDefined()
    })
  })

  describe('TrackChanges', () => {
    it('should export TrackChanges', () => {
      expect(TrackChanges).toBeDefined()
    })
  })
})
