// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

describe('OpenAPI contract', () => {
  it('contains every DocumentApiAdapter route and no mandatory security scheme', () => {
    const api = parse(readFileSync(resolve(process.cwd(), 'openapi/document-api.yaml'), 'utf8'))
    expect(api.openapi).toBe('3.1.0')
    expect(Object.keys(api.paths)).toEqual(expect.arrayContaining([
      '/documents', '/documents/import', '/documents/{documentId}', '/documents/{documentId}/state',
      '/documents/{documentId}/versions', '/documents/{documentId}/versions/{versionId}/restore',
      '/documents/{documentId}/artifacts', '/documents/{documentId}/artifacts/{artifactId}', '/folders', '/templates',
    ]))
    expect(api.security).toBeUndefined()
    expect(api.components.securitySchemes).toBeUndefined()
  })
})

