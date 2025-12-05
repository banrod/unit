export interface ImageMeta {
  id: string
  tags: string[]
  root?: string
  path: string
}

/**
 * ImageFilterStore maintains fast lookup structures for images.
 *
 * Internally, images are stored in a Map keyed by ID while tags and roots
 * maintain reverse indices using Sets. This allows tag intersections and root
 * filtering to run in linear time with respect to the number of query terms
 * rather than the total number of images.
 */
export class ImageFilterStore {
  private images: Map<string, ImageMeta> = new Map()
  private tagIndex: Map<string, Set<string>> = new Map()
  private rootIndex: Map<string, Set<string>> = new Map()

  /**
   * Add a new image to the store and index it by all tags and its root.
   */
  addImage(meta: ImageMeta): void {
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

  /**
   * Remove an image and clean up its tag/root indices.
   */
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

  /**
   * Retrieve images matching every provided tag and, optionally, a root.
   *
   * Complexity is roughly O(t) where `t` is the number of tags, regardless of
   * the total image count. Filtering by root is performed as a final pass over
   * the intersection set.
   */
  filter(tags: string[], root?: string): ImageMeta[] {
    let idSets: Set<string>[] = []
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
}
