import * as fs from 'fs'
import * as path from 'path'

import * as ids from '../../src/system/_ids'
import classes from '../../src/system/_classes'
import components from '../../src/system/_components'
import specs from '../../src/system/_specs'

type IssueLevel = 'error' | 'warn'

type Issue = {
        level: IssueLevel
        message: string
        count?: number
}

const MAX_LIST_PREVIEW = 20

function buildIdNameIndex(): Record<string, string[]> {
        const idEntries = Object.entries(ids) as Array<[string, string]>
        const index: Record<string, string[]> = {}

        for (const [name, value] of idEntries) {
                if (!index[value]) {
                        index[value] = []
                }

                index[value].push(name)
        }

        return index
}

function describeIds(values: string[], idNameIndex: Record<string, string[]>): string[] {
        return values.map((id) => {
                const names = idNameIndex[id]
                if (!names || names.length === 0) {
                        return id
                }

                return `${names.join('|')} (${id})`
        })
}

function formatList(values: string[]): string {
        if (values.length === 0) {
                return ''
        }

        const preview = values.slice(0, MAX_LIST_PREVIEW)
        const suffix = values.length > MAX_LIST_PREVIEW ? ` …(+${values.length - MAX_LIST_PREVIEW} more)` : ''
        return `${preview.join(', ')}${suffix}`
}

function writeReport(lines: string[]): void {
        const reportPath = path.join(process.cwd(), 'workstation', 'notes', 'registry-report.md')
        fs.writeFileSync(reportPath, `${lines.join('\n')}\n`)
        console.log(`Registry data quality report written to ${reportPath}`)
}

function main(): void {
        const generatedAt = new Date().toISOString()
        const idNameIndex = buildIdNameIndex()

        const idValues = Object.values(ids)
        const idSet = new Set(idValues)

        const classIds = new Set(Object.keys(classes))
        const componentIds = new Set(Object.keys(components))

        const specEntries = Object.entries(specs as Record<string, any>)

        const duplicates = Array.from(new Set(idValues.filter((id, idx) => idValues.indexOf(id) !== idx)))
        const idsMissingClass = Array.from(idSet).filter((id) => !classIds.has(id))
        const idsMissingComponent = Array.from(idSet).filter((id) => !componentIds.has(id))

        const missingUnitClassRefs: string[] = []
        const missingUnitClasses = new Set<string>()
        const specsMissingFromIds = new Set<string>()
        let unitCount = 0

        for (const [specId, spec] of specEntries) {
                if (!idSet.has(specId)) {
                        specsMissingFromIds.add(specId)
                }

                const units = spec.units ?? {}
                const unitValues = Object.values<any>(units)
                unitCount += unitValues.length

                for (const unit of unitValues) {
                        const unitId: string | undefined = unit?.id
                        if (unitId && !classIds.has(unitId)) {
                                missingUnitClassRefs.push(unitId)
                                missingUnitClasses.add(unitId)
                        }
                }
        }

        const issues: Issue[] = []

        if (duplicates.length > 0) {
                issues.push({
                        level: 'error',
                        count: duplicates.length,
                        message: `Duplicate ID values detected: ${formatList(describeIds(duplicates, idNameIndex))}`
                })
        }

        if (idsMissingClass.length > 0) {
                issues.push({
                        level: 'warn',
                        count: idsMissingClass.length,
                        message: `IDs missing class implementations: ${formatList(describeIds(idsMissingClass, idNameIndex))}`
                })
        }

        if (idsMissingComponent.length > 0) {
                issues.push({
                        level: 'warn',
                        count: idsMissingComponent.length,
                        message: `IDs missing component implementations: ${formatList(
                                describeIds(idsMissingComponent, idNameIndex)
                        )}`
                })
        }

        if (missingUnitClasses.size > 0) {
                const missingUnitClassFrequency = Object.entries(
                        missingUnitClassRefs.reduce<Record<string, number>>((acc, id) => {
                                acc[id] = (acc[id] ?? 0) + 1
                                return acc
                        }, {})
                )
                        .sort(([, aCount], [, bCount]) => bCount - aCount)
                        .map(([id, count]) => `${describeIds([id], idNameIndex)[0]} ×${count}`)

                issues.push({
                        level: 'error',
                        count: missingUnitClasses.size,
                        message: `Specs reference unmapped class IDs: ${formatList(missingUnitClassFrequency)}`
                })
        }

        if (specsMissingFromIds.size > 0) {
                issues.push({
                        level: 'warn',
                        count: specsMissingFromIds.size,
                        message: `Spec IDs not exported from _ids.ts: ${formatList(
                                describeIds(Array.from(specsMissingFromIds), idNameIndex)
                        )}`
                })
        }

        const lines = [
                '# Registry Data Quality Report',
                '',
                `Generated: ${generatedAt}`,
                '',
                '## Counts',
                `- ID exports: ${idValues.length} (unique: ${idSet.size})`,
                `- Class implementations: ${classIds.size}`,
                `- Component implementations: ${componentIds.size}`,
                `- Specs: ${specEntries.length}`,
                `- Spec units: ${unitCount}`,
                '',
                '## Coverage Snapshots',
                `- IDs with classes: ${idValues.length - idsMissingClass.length}/${idValues.length}`,
                `- IDs with components: ${idValues.length - idsMissingComponent.length}/${idValues.length}`,
                `- Specs present in _ids.ts: ${specEntries.length - specsMissingFromIds.size}/${specEntries.length}`,
                '',
                '## Issues',
        ]

        if (issues.length === 0) {
                lines.push('- None detected.')
        } else {
                for (const issue of issues) {
                        const bullet = issue.level === 'error' ? 'ERROR' : 'WARN'
                        const countLabel = issue.count !== undefined ? ` (count: ${issue.count})` : ''
                        lines.push(`- ${bullet}${countLabel}: ${issue.message}`)
                }
        }

        writeReport(lines)
}

main()
