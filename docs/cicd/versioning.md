---
sidebar_position: 2
title: Versioning
description: Give every pipeline build a real version — v1.4.2, 2026.10.3 — instead of a run number, with series, prereleases and floating tags.
---

# Versioning

A **version policy** decides the version, and so the image tag, that each pipeline build gets.
Without one, a build is tagged `run-<number>`. With one, it is tagged `v1.4.2` (semantic), `v2026.10.3`
(calendar), or whatever your template says.

Deploys are unaffected: Miabi still deploys the **exact digest** a run built. The version is a readable,
immutable label on that same artifact, shown on the run, the image, the deployment and the release.

Manage policies from the **Versioning** tab of the **Pipelines** page or of a single pipeline, from the CLI, or with
a `versioning:` block in the pipeline file.

## How a version is chosen

1. When a run is created, Miabi **reserves** its version. The run page shows it straight away, and two
   runs started at the same moment never get the same one.
2. Steps can read it as [`MIABI_VERSION`](#environment-variables), for example to bake it into the image.
3. When the run **succeeds**, the image is tagged with the version in the registry, along with any
   [floating tags](#floating-tags).
4. When the run **fails**, the version is handed back and the next run reuses it. If a newer version was
   reserved while it was building, it is skipped instead, so versions are never handed out twice.

A version that is already a tag in the registry (after a restore, or a push made outside Miabi) is
skipped, and the run moves on to the next free version. Published tags are never overwritten.

## One policy per image repository

A policy belongs to the **image repository** builds are pushed to, not to a single pipeline:

| Pipeline bound to | Policy covers |
|---|---|
| An application | the application's images, shared by **all** its pipelines |
| A repository | that pipeline's own images (`pl_<name>`) |

Two pipelines pushing to the same application therefore continue one sequence, and cannot both
build `v1.0.0`. A new pipeline that builds an image gets a policy automatically: `v1.0.0`, then a
patch bump per build. Existing pipelines keep `run-<number>` tags until you enable versioning.

## Schemes

| Scheme | Example | Moves by |
|---|---|---|
| `semver` | `v1.4.2` | a bump: patch, minor or major |
| `calver` | `v2026.10.3` | the date; the last number restarts each period |
| `run` | `run-17` | the run number (no versioning) |

Calendar formats: `YYYY.MM`, `YYYY.0M`, `YY.MM` and `YYYY.MM.DD`, each followed by a counter.

## Series

A **series** is the version line a semver policy releases on. Fixed parts never move, and each `x`
can grow:

| Series | Allowed bumps | Sequence |
|---|---|---|
| `1.x.x` | minor, patch | 1.0.0 → 1.0.1 → 1.1.0 |
| `1.4.x` | patch | 1.4.0 → 1.4.1 → 1.4.2 |
| `x.x.x` | any | free semver |

**Switching series** is how you change range. Switch `1.x.x` to `2.x.x` and the next build is `2.0.0`.
Switch back to `1.x.x` and numbering continues from the highest 1.x version ever handed out, so a
maintenance line never repeats a version.

A bump the series does not allow is refused when you ask for it explicitly ("switch the series
instead"). A policy default or a commit-derived bump is lowered to fit, so a push never fails because
of how a commit message was worded.

## Branches

By default every branch releases. To keep feature branches from using up release numbers, list your
**release branches**. Builds of other branches then become prereleases of the next version:

```text
main         → v1.4.3
feat/login   → v1.4.4-feat-login.1, v1.4.4-feat-login.2, …
```

Or set other branches to `run-tag`, so their builds keep plain `run-<number>` tags.

**Branch series** maps a branch pattern to its own series. Then `release/1.x` can keep shipping 1.x
hotfixes while `main` ships 2.x.

## Floating tags

Floating tags move to the newest version they name after each successful release build:

| Floating tag | Points at |
|---|---|
| `latest` | the newest version overall |
| `v{major}` | the newest version of each major, e.g. `v1`, `v2` |
| `v{major}.{minor}` | the newest patch of each minor |

A tag only moves forward. A `1.9.4` hotfix updates `v1` but never moves `latest` back from `2.0.0`.
A floating tag that already names an image this policy did not publish, such as a `v1` label from
before versioning was enabled, is left as it is and the run log says so.

## Overriding one run

A manual or API run can take a one-off version. Pushes and schedules always follow the policy.

- **Bump**: patch, minor or major instead of the default, within the series.
- **Exact version**: e.g. `2.0.0`. It must be on the series and greater than its latest version.
  Setting an exact version requires the **admin** role.

From the console, use **Run with version…** on the pipeline's runs page. From the CLI:

```bash
miabi pipeline run web --bump minor
miabi pipeline run web --version 2.0.0
```

## Commit-driven bumps

With **bump from commits** on, the built commit's message decides the bump, following
[Conventional Commits](https://www.conventionalcommits.org/):

| Commit | Bump |
|---|---|
| `fix: …`, `chore: …`, any other type | patch |
| `feat: …` | minor |
| `feat!: …`, or a `BREAKING CHANGE:` footer | major |

A message that is not a Conventional Commit uses the policy's default bump.

## In the pipeline file

A `versioning:` block sets the policy from `.miabi/pipeline.yaml`. Miabi still keeps the counter,
because a repository cannot hold state:

```yaml
apiVersion: miabi.io/v1
kind: Pipeline
metadata: { name: api }
on:
  push: { branches: [main, "release/*"] }
versioning:
  scheme: semver
  series: 2.x.x
  bump: patch
  template: "v{version}"
  bump_from_commits: true
  branches:
    release: [main]
    others: prerelease
    series:
      "release/1.*": 1.x.x
  floating_tags: [latest, "v{major}"]
steps:
  - name: build
    uses: build
    build-args:
      VERSION: ${MIABI_VERSION}     # expanded by Miabi before the build
  - name: deploy
    uses: deploy
```

While the block is present, it owns the settings: the console shows them read-only and points at the
file. Remove the block to manage the policy from the console again. For a pipeline read from your
repository, only the file on the application's tracked branch sets the rules, so a feature branch
cannot change how `main` is versioned.

| Field | Default | Meaning |
|---|---|---|
| `scheme` | `semver` | `semver`, `calver` or `run` |
| `template` | `v{version}` | Tag template. Must contain `{version}`; may use `{major}`, `{minor}`, `{patch}`, `{sha}` |
| `series` | `1.x.x` | Semver version line |
| `start` | first version of the series | Opening version of a series with none yet |
| `bump` | `patch` | Default bump per build |
| `calver_format` | `YYYY.MM` | Date part of a calver version |
| `branches.release` | all branches | Branches that produce real versions; `path.Match` patterns like `release/*` |
| `branches.others` | `prerelease` | `prerelease` or `run-tag` for every other branch |
| `branches.series` | — | Branch pattern → series |
| `floating_tags` | — | Tags moved to the newest version they name |
| `bump_from_commits` | `false` | Derive the bump from Conventional Commits |

## Environment variables

When a run has a version, its steps also get:

| Variable | Example |
|---|---|
| `MIABI_VERSION` | `1.4.3` or `1.4.4-feat-login.2` |
| `MIABI_IMAGE_TAG` | `v1.4.3` |
| `MIABI_VERSION_MAJOR` / `_MINOR` / `_PATCH` | `1` / `4` / `3` |
| `MIABI_VERSION_PRERELEASE` | `feat-login.2` (prereleases only) |

The same names, braced (`${MIABI_VERSION}`), are expanded in a `uses: build` step's `build-args`, so a
Dockerfile `ARG VERSION` receives the run's version. Other `${…}` references in build args are passed
on as written.

The version tag is written to the registry once the run succeeds. Within the run, refer to the image
as `$MIABI_IMAGE_DIGEST`.

## CLI

```bash
miabi versioning get web                      # the policy covering pipeline web's images
miabi versioning history web                  # versions handed out, newest first
miabi versioning set web --bump minor --release-branches main
miabi versioning switch web 2.x.x             # start the 2.x line
```

## Backup and restore

Workspace bundles carry each policy and the latest version of every series, so a restored workspace
continues its numbering instead of starting again at tags that already exist.

## Related

- [Pipelines](/docs/cicd/pipelines)
- [Container registry](/docs/registry/overview)
- [CLI](/docs/cicd/cli)
