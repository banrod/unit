import * as ids from '../../src/system/_ids'
import classes from '../../src/system/_classes'
import components from '../../src/system/_components'
import specs from '../../src/system/_specs'

type IssueLevel = 'error' | 'warn'

type Issue = {
	level: IssueLevel
	message: string
}

const MAX_LIST_PREVIEW = 20

function formatList(values: string[]): string {
	if (values.length === 0) {
		return ''
	}

	const preview = values.slice(0, MAX_LIST_PREVIEW)
	const suffix = values.length > MAX_LIST_PREVIEW ? ` …(+${values.length - MAX_LIST_PREVIEW} more)` : ''
	return `${preview.join(', ')}${suffix}`
}

function main(): void {
	const strict = process.argv.includes('--strict')
	const issues: Issue[] = []

	const idValues = Object.values(ids)
	const idSet = new Set(idValues)

	if (idValues.length !== idSet.size) {
		const duplicates = idValues.filter((id, idx) => idValues.indexOf(id) !== idx)
		issues.push({
			level: 'error',
			message: `Duplicate ID values detected in _ids.ts: ${formatList(Array.from(new Set(duplicates)))}`
		})
	}

	const classIds = new Set(Object.keys(classes))
	const componentIds = new Set(Object.keys(components))

	for (const classId of classIds) {
		if (!idSet.has(classId)) {
			issues.push({
				level: 'warn',
				message: `Class ID ${classId} missing from _ids.ts exports`
			})
		}
	}

	for (const componentId of componentIds) {
		if (!idSet.has(componentId)) {
			issues.push({
				level: 'warn',
				message: `Component ID ${componentId} missing from _ids.ts exports`
			})
		}
	}

	const missingUnits: string[] = []
	const specsMissingFromIds: string[] = []

	for (const [specId, spec] of Object.entries(specs as Record<string, any>)) {
		if (!idSet.has(specId)) {
			specsMissingFromIds.push(specId)
		}

		const units = spec.units ?? {}
		for (const unit of Object.values<any>(units)) {
			const unitId: string | undefined = unit?.id
			if (!unitId) {
				continue
			}
			if (!classIds.has(unitId)) {
				missingUnits.push(unitId)
			}
		}
	}

	if (missingUnits.length > 0) {
		issues.push({
			level: 'error',
			message: `Spec units reference missing class implementations: ${formatList(
				Array.from(new Set(missingUnits))
			)}`
		})
	}

	if (specsMissingFromIds.length > 0) {
		issues.push({
			level: 'warn',
			message: `Spec IDs missing from _ids.ts exports: ${formatList(
				Array.from(new Set(specsMissingFromIds))
			)}`
		})
	}

	const errors = issues.filter((issue) => issue.level === 'error')
	const warnings = issues.filter((issue) => issue.level === 'warn')

	if (issues.length === 0) {
		console.log('Registry validation passed: no issues detected.')
		return
	}

	for (const issue of issues) {
		const prefix = issue.level === 'error' ? 'ERROR' : 'WARN'
		console.log(`${prefix}: ${issue.message}`)
	}

	console.log(`\nSummary: ${errors.length} error(s), ${warnings.length} warning(s).`)

	if (errors.length > 0 && strict) {
		process.exit(1)
	}
	if (errors.length > 0 && !strict) {
		console.log('Strict mode disabled; returning success despite errors.')
	}
}

main()
