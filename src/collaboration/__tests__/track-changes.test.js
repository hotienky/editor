import { describe, expect, it } from 'vitest'
import TrackChanges, { collectTrackChanges, generateId } from '../track-changes'

describe('TrackChanges', () => {
  it('generates unique track change IDs', () => {
    const id1 = generateId()
    const id2 = generateId()
    expect(id1).toMatch(/^tc-\d+-[a-z0-9]+$/)
    expect(id1).not.toBe(id2)
  })

  it('collects tracked changes from document node tree', () => {
    const mockState = {
      doc: {
        descendants: (cb) => {
          cb(
            {
              text: 'Nội dung mới',
              nodeSize: 12,
              marks: [{ type: { name: 'trackChange' }, attrs: { id: 'tc-1', type: 'insert', author: 'Nguyễn A', timestamp: 123456 } }],
            },
            10,
          )
          cb(
            {
              text: 'Nội dung cũ',
              nodeSize: 11,
              marks: [{ type: 'trackChange', attrs: { id: 'tc-2', type: 'delete', author: 'Trần B', timestamp: 123457 } }],
            },
            25,
          )
        },
      },
    }

    const changes = collectTrackChanges(mockState)
    expect(changes).toHaveLength(2)
    expect(changes[0]).toEqual({
      id: 'tc-1',
      type: 'insert',
      author: 'Nguyễn A',
      timestamp: 123456,
      text: 'Nội dung mới',
      from: 10,
      to: 22,
    })
    expect(changes[1]).toEqual({
      id: 'tc-2',
      type: 'delete',
      author: 'Trần B',
      timestamp: 123457,
      text: 'Nội dung cũ',
      from: 25,
      to: 36,
    })
  })

  it('handles empty state safely', () => {
    expect(collectTrackChanges(null)).toEqual([])
    expect(collectTrackChanges({})).toEqual([])
  })
})
