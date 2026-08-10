# Dependency Security Baseline

Status: active maintenance control for the post-consolidation kernel line.

## Audited baseline

The repository lockfile was audited with npm on Node.js 20.9 during the maintenance pass
that followed the runtime interoperability work.

Before safe remediation:

- total vulnerabilities: 22
- critical: 2
- high: 14
- moderate: 3
- low: 3

Safe, non-forced remediation updated direct dependencies within their compatible release
lines and refreshed transitive lockfile resolutions. The resulting audited state is:

- total vulnerabilities: 7
- critical: 0
- high: 7
- moderate: 0
- low: 0

The two critical transitive findings (`form-data` and `shell-quote`) were removed by the
safe lockfile remediation. Compatible direct upgrades included:

- `compression` 1.7.4 -> 1.8.1
- `express` 4.21.2 -> 4.22.2
- `ws` 8.18.1 -> 8.21.3
- `electron` 28.1.1 -> 28.3.3

No `npm audit fix --force` result was accepted.

## Residual high-severity findings

The remaining seven high-severity audit entries are development-toolchain debt. They are
rooted in two major-version migration boundaries rather than unresolved compatible fixes:

### TypeScript-ESLint migration

Direct packages currently remain at 6.20.0:

- `@typescript-eslint/eslint-plugin`
- `@typescript-eslint/parser`
- `@typescript-eslint/typescript-estree`

Their remaining transitive findings include `@typescript-eslint/type-utils`,
`@typescript-eslint/utils`, and `minimatch`. npm reports the remediation path through the
TypeScript-ESLint 8.x line, which is a major toolchain migration and must be qualified
against the repository lint configuration and TypeScript version before promotion.

### Electron migration

Electron is retained at 28.3.3 after applying the compatible 28.x remediation. npm reports
that eliminating the remaining Electron high-severity finding requires a later major
Electron line. Treat that as a platform migration requiring application/runtime
qualification, not as an automatic audit fix.

## CI policy

Pull-request CI must:

1. run `npm ci` against the committed lockfile;
2. capture the full `npm audit --json` report as an artifact;
3. fail when npm reports any critical vulnerability;
4. continue to run build, registry parity, lint, typecheck, and runtime tests.

High-severity findings are not silently accepted: the current seven are explicitly
recorded above and should decrease only through qualified toolchain migrations. Any new
critical finding is a blocking regression.

## Promotion rule

Dependency changes may be promoted when they preserve repository qualification and do not
increase the audited severity floor. Major-version security migrations should be isolated
from kernel-semantic changes so regressions can be attributed and rolled back cleanly.
