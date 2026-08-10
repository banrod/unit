# Kernel Release Administration

## Baseline tag

The consolidated `main` merge commit is:

`1e6aaaf6e1660af11eb1ffbaab6f1f24a9caf35a`

Canonical tag target:

`unit-kernel-v0.1.0`

Current repository state: **TAG_PENDING_ADMINISTRATION**. The canonical tag is not yet
present in the repository. Do not substitute a branch name, later hardening commit, or
merge commit for this recovery boundary.

Create the annotated tag as a repository-administration operation:

```sh
git tag -a unit-kernel-v0.1.0 1e6aaaf6e1660af11eb1ffbaab6f1f24a9caf35a \
  -m "Canonical post-consolidation Unit kernel baseline"
git push origin unit-kernel-v0.1.0
```

After creation, verify all of the following before marking the release boundary complete:

```sh
git rev-parse unit-kernel-v0.1.0^{}
git show --no-patch --format='%H %D' unit-kernel-v0.1.0^{}
git ls-remote --tags origin unit-kernel-v0.1.0
```

The resolved commit must be exactly:

`1e6aaaf6e1660af11eb1ffbaab6f1f24a9caf35a`

The tag deliberately targets the consolidation baseline rather than subsequent hardening
and interoperability commits, preserving an exact recovery boundary.

## Branch protection

Configure `main` to require pull requests and the following checks before merge:

- `test`
- `Workstation Validation`

Recommended settings:

- require branches to be up to date before merging;
- require all review conversations to be resolved;
- prevent force pushes and deletion;
- include administrators unless emergency ownership policy requires otherwise;
- do not permit bypass by automation that also authors the change.

Repository rules and tag creation are administrative operations and are intentionally not
implemented through source-controlled workflow self-mutation.
