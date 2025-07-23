#!/usr/bin/env bash
# Combine intro and chapters into a single markdown document.
set -e
base="src/docs/compendium"
out="$base/compiled.md"
cat $base/00_intro/*.md \
    $base/01_sections/*/index.md > "$out"
echo "Compiled compendium to $out"
