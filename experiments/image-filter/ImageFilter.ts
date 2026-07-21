import { performance } from 'node:perf_hooks'

export interface ImageMeta {
  id: string
  tags: string[]
  root?: string
  path: string
}

export interface FilterMetrics {
  durationMs: number
  tagSetsInspected: number
  rootFiltered: number
  resultCount: number
}

export interface FilterWithMetricsResult {
  results: ImageMeta[]
  metrics: FilterMetrics
}

/**
 * Experimental high-volume image index. This module is intentionally outside
 * the production runtime kernel.
 */
export class ImageFilterStore {
  private images: Map<string, ImageMeta> = new Map()
  private tagIndex: Map<string, Set<string>> = new Map()
  private rootIndex: Map<string, Set<string>> = new Map()

  addImage(meta: ImageMeta): void {
    if (this.images.has(meta.id)) {
      this.removeImage(meta.id)
    }

    this.images.set(meta.id, meta)
    for (const tag of meta.tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set())
      }
      this.tagIndex.get(tag)!.add(meta.id)
    }
    if (meta.root) {
      if (!this.rootIndex.has(meta.root)) {
        this.rootIndex.set(meta.root, new Set())
      }
      this.rootIndex.get(meta.root)!.add(meta.id)
    }
  }

  removeImage(id: string): void {
    const meta = this.images.get(id)
    if (!meta) return
    for (const tag of meta.tags) {
      const set = this.tagIndex.get(tag)
      if (set) {
        set.delete(id)
        if (set.size === 0) this.tagIndex.delete(tag)
      }
    }
    if (meta.root) {
      const set = this.rootIndex.get(meta.root)
      if (set) {
        set.delete(id)
        if (set.size === 0) this.rootIndex.delete(meta.root)
      }
    }
    this.images.delete(id)
  }

  filter(tags: string[], root?: string): ImageMeta[] {
    const idSets: Set<string>[] = []
    for (const tag of tags) {
      const ids = this.tagIndex.get(tag)
      if (!ids) return []
      idSets.push(ids)
    }
    let resultIds: Set<string>
    if (idSets.length > 0) {
      resultIds = new Set(idSets[0])
      for (const ids of idSets.slice(1)) {
        for (const id of Array.from(resultIds)) {
          if (!ids.has(id)) resultIds.delete(id)
        }
      }
    } else {
      resultIds = new Set(this.images.keys())
    }
    if (root) {
      const rootIds = this.rootIndex.get(root)
      if (!rootIds) return []
      for (const id of Array.from(resultIds)) {
        if (!rootIds.has(id)) resultIds.delete(id)
      }
    }
    return Array.from(resultIds).map((id) => this.images.get(id)!)
  }

  filterWithMetrics(tags: string[], root?: string): FilterWithMetricsResult {
    const start = performance.now()
    const results = this.filter(tags, root)
    const durationMs = performance.now() - start

    return {
      results,
      metrics: {
        durationMs,
        tagSetsInspected: tags.length,
        rootFiltered: root ? 1 : 0,
        resultCount: results.length,
      },
    }
  }
}
