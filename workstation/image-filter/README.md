# Image Filtering Prototype

This module demonstrates a dynamic, rooted filtering system capable of indexing and querying 100,000+ images in real time. Images are indexed by tags and optional hierarchical "roots" so that large collections can be segmented quickly based on the current use context.

Features include:
- add/remove images with arbitrary tags
- filter by one or more tags
- root-based segmentation to keep queries scalable

The design aims to support algorithmic segmentation for massive image sets where filter conditions may change on the fly.
