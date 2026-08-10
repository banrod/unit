import { GraphSpec } from '../types/GraphSpec'

export type CanonicalGraphOptions = {
  omitMetadataKeys?: Iterable<string>
  omitRootKeys?: Iterable<string>
}

const DEFAULT_METADATA_KEYS = [
  'createdAt',
  'layout',
  'position',
  'selection',
  'updatedAt',
  'viewport',
]
const DEFAULT_ROOT_KEYS = ['system']

function formatPath(path: string[]): string {
  return path.length ? path.join('.') : '<root>'
}

function assertPlainDataObject(
  value: object,
  path: string[]
): asserts value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value)

  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(
      `graph identity supports only plain JSON objects at ${formatPath(path)}`
    )
  }

  if (Object.getOwnPropertySymbols(value).length) {
    throw new TypeError(
      `graph identity does not support symbol keys at ${formatPath(path)}`
    )
  }
}

function normalize(
  value: unknown,
  metadataKeys: Set<string>,
  rootKeys: Set<string>,
  path: string[] = []
): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('graph identity does not support non-finite numbers')
    }

    return Object.is(value, -0) ? 0 : value
  }

  if (Array.isArray(value)) {
    return value.map((item, index) =>
      normalize(item, metadataKeys, rootKeys, [...path, String(index)])
    )
  }

  if (typeof value === 'object') {
    assertPlainDataObject(value, path)

    const source = value as Record<string, unknown>
    const target: Record<string, unknown> = {}
    const insideMetadata = path[path.length - 1] === 'metadata'

    for (const key of Object.keys(source).sort()) {
      if (path.length === 0 && rootKeys.has(key)) {
        continue
      }

      if (insideMetadata && metadataKeys.has(key)) {
        continue
      }

      const descriptor = Object.getOwnPropertyDescriptor(source, key)
      if (!descriptor) {
        continue
      }

      if ('get' in descriptor || 'set' in descriptor) {
        throw new TypeError(
          `graph identity does not support accessor properties at ${formatPath([
            ...path,
            key,
          ])}`
        )
      }

      const item = descriptor.value
      if (item === undefined) {
        continue
      }

      if (
        typeof item === 'function' ||
        typeof item === 'symbol' ||
        typeof item === 'bigint'
      ) {
        throw new TypeError(
          `graph identity does not support ${typeof item} values at ${formatPath([
            ...path,
            key,
          ])}`
        )
      }

      Object.defineProperty(target, key, {
        value: normalize(item, metadataKeys, rootKeys, [...path, key]),
        enumerable: true,
        configurable: true,
        writable: true,
      })
    }

    return target
  }

  throw new TypeError(
    `graph identity does not support ${typeof value} values at ${formatPath(path)}`
  )
}

export function canonicalizeGraphSpec(
  spec: GraphSpec,
  options: CanonicalGraphOptions = {}
): GraphSpec {
  const metadataKeys = new Set(options.omitMetadataKeys ?? DEFAULT_METADATA_KEYS)
  const rootKeys = new Set(options.omitRootKeys ?? DEFAULT_ROOT_KEYS)

  return normalize(spec, metadataKeys, rootKeys) as GraphSpec
}

export function canonicalGraphString(
  spec: GraphSpec,
  options: CanonicalGraphOptions = {}
): string {
  return JSON.stringify(canonicalizeGraphSpec(spec, options))
}

export async function hashGraphSpec(
  spec: GraphSpec,
  options: CanonicalGraphOptions = {}
): Promise<string> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    throw new Error('SHA-256 graph identity requires Web Crypto')
  }

  const bytes = new TextEncoder().encode(canonicalGraphString(spec, options))
  const digest = await subtle.digest('SHA-256', bytes)

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
