import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import * as ids from '../../src/system/_ids'
import classes from '../../src/system/_classes'
import components from '../../src/system/_components'
import specs from '../../src/system/_specs'
import { runRegistryAudit } from './registry-audit'

type CoverageCategory =
  | 'component_only'
  | 'composite_graph'
  | 'direct_primitive'
  | 'empty_graph'
  | 'optimized_primitive'
  | 'unimplemented'

type CoverageRecord = {
  category: CoverageCategory
  component: boolean
  exportedNames: string[]
  id: string
  name?: string
  platformSpecific: boolean
  unitCount: number
}

const idNameIndex: Record<string, string[]> = {}
for (const [exportedName, id] of Object.entries(ids) as Array<[string, string]>) {
  idNameIndex[id] = [...(idNameIndex[id] ?? []), exportedName]
}

const records: CoverageRecord[] = Object.keys(idNameIndex)
  .sort()
  .map((id) => {
    const spec = (specs as Record<string, any>)[id]
    if (!spec) {
      throw new Error(`cannot classify ${id}: spec is missing`)
    }

    const exportedNames = idNameIndex[id].sort()
    const hasClass = Object.prototype.hasOwnProperty.call(classes, id)
    const hasComponent = Object.prototype.hasOwnProperty.call(components, id)
    const unitCount = Object.keys(spec.units ?? {}).length
    const hasUnits = unitCount > 0
    const isEmptyGraph = exportedNames.includes('ID_EMPTY')
    let category: CoverageCategory

    if (hasClass && hasUnits) {
      category = 'optimized_primitive'
    } else if (hasClass) {
      category = 'direct_primitive'
    } else if (hasUnits) {
      category = 'composite_graph'
    } else if (hasComponent) {
      category = 'component_only'
    } else if (isEmptyGraph) {
      category = 'empty_graph'
    } else {
      category = 'unimplemented'
    }

    return {
      id,
      exportedNames,
      name: spec.name,
      category,
      component: hasComponent,
      platformSpecific: (spec.metadata?.tags ?? []).includes('platform'),
      unitCount,
    }
  })

const counts = records.reduce<Record<CoverageCategory, number>>(
  (result, record) => {
    result[record.category]++
    return result
  },
  {
    component_only: 0,
    composite_graph: 0,
    direct_primitive: 0,
    empty_graph: 0,
    optimized_primitive: 0,
    unimplemented: 0,
  }
)

const audit = runRegistryAudit({ includeCoverageWarnings: false })
const fatalIssues = audit.issues.filter((issue) => issue.level === 'error')
if (fatalIssues.length > 0) {
  throw new Error(fatalIssues.map((issue) => issue.message).join('\n'))
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  total: records.length,
  counts,
  platformSpecific: records.filter((record) => record.platformSpecific).length,
  unresolvedUnitReferences: audit.unresolvedUnitRefUniqueCount,
  invalidPinReferences: audit.invalidPinRefs.length,
  duplicateIds: audit.duplicateIds.length,
  records,
}

const outputDir = join(__dirname, '..', 'notes')
mkdirSync(outputDir, { recursive: true })
writeFileSync(
  join(outputDir, 'registry-coverage.json'),
  `${JSON.stringify(report, null, 2)}\n`
)

const markdown = [
  '# Registry Coverage Classification',
  '',
  `Generated: ${report.generatedAt}`,
  '',
  '| Category | Count |',
  '| --- | ---: |',
  `| Direct primitive | ${counts.direct_primitive} |`,
  `| Optimized primitive | ${counts.optimized_primitive} |`,
  `| Composite graph | ${counts.composite_graph} |`,
  `| Component only | ${counts.component_only} |`,
  `| Empty graph sentinel | ${counts.empty_graph} |`,
  `| Unimplemented | ${counts.unimplemented} |`,
  `| **Total** | **${report.total}** |`,
  '',
  `Platform-specific entries: ${report.platformSpecific}`,
  `Unresolved unit references: ${report.unresolvedUnitReferences}`,
  `Invalid pin references: ${report.invalidPinReferences}`,
  `Duplicate IDs: ${report.duplicateIds}`,
  '',
  'The JSON artifact contains the complete per-ID classification.',
]

writeFileSync(join(outputDir, 'registry-coverage.md'), `${markdown.join('\n')}\n`)
console.log(JSON.stringify({ total: report.total, counts }, null, 2))
