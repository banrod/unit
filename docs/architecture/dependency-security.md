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
lines and refreshed transitive lockfile resolutions. That first maintenance pass reduced
the audited state to seven high-severity findings with no critical, moderate, or low
findings.

The TypeScript-ESLint follow-on migration then qualified the lint toolchain on its supported
ESLint 8 floor and reduced the current audited state to:

- total vulnerabilities: 1
- critical: 0
- high: 1
- moderate: 0
- low: 0

No `npm audit fix --force`, `--force`, or `--legacy-peer-deps` result was accepted.

## Qualified TypeScript-ESLint migration

The following development-toolchain migration is qualified as one compatibility unit:

- `@typescript-eslint/eslint-plugin` 6.20.0 -> 8.66.0
- `@typescript-eslint/parser` 6.20.0 -> 8.66.0
- `@typescript-eslint/typescript-estree` 6.20.0 -> 8.66.0
- `eslint` 8.5.0 -> 8.57.1
- `eslint-plugin-unused-imports` 3.0.0 -> 4.4.1
- removed unused `typescript-eslint` 0.0.1-alpha.0 meta-package

The v8 recommended preset changes several rule identities and introduces additional
recommended rules compared with v6.20.0. This repository explicitly keeps the following
v8-only or replacement rules disabled so the dependency-security migration does not change
the pre-existing lint policy or require kernel/runtime source rewrites:

- `@typescript-eslint/no-empty-object-type`
- `@typescript-eslint/no-require-imports`
- `@typescript-eslint/no-unsafe-function-type`
- `@typescript-eslint/no-unused-expressions`
- `@typescript-eslint/no-wrapper-object-types`
- `@typescript-eslint/prefer-namespace-keyword`

## Residual high-severity finding

### Electron migration

Electron is retained at 28.3.3 after applying the compatible 28.x remediation. npm reports
that eliminating the remaining Electron high-severity finding requires a later major
Electron line. Treat that as a platform migration requiring application/runtime
qualification, not as an automatic audit fix.

The Electron finding is the sole currently recorded high-severity dependency finding.

## CI policy

Pull-request CI must:

1. run `npm ci` against the committed lockfile;
2. capture the full `npm audit --json` report as an artifact;
3. fail when npm reports any critical vulnerability;
4. continue to run build, registry parity, lint, typecheck, and runtime tests.

High-severity findings are not silently accepted: the current Electron finding is explicitly
recorded above and should be removed only through a qualified platform migration. Any new
critical finding is a blocking regression.

## Promotion rule

Dependency changes may be promoted when they preserve repository qualification and do not
increase the audited severity floor. Major-version security migrations should be isolated
from kernel-semantic changes so regressions can be attributed and rolled back cleanly.
