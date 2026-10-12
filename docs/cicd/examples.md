---
sidebar_position: 7
title: Examples
description: Complete, deployable example apps in Node.js, Go, Python, PHP, Laravel, Java and Spring Boot, with the pipelines and GitOps manifests that ship them.
---

# Examples

[`miabi-io/examples`](https://github.com/miabi-io/examples) is a set of small, real applications
with everything Miabi needs to ship them: a Dockerfile, tests, a `.miabi/pipeline.yaml`, and
`miabi.io/v1` manifests for GitOps. Each app builds, passes its own tests, answers a health check,
and shuts down cleanly when Miabi replaces a release. Copy the one closest to your stack and
change the code.

## The apps

| Example | Stack | Port | Shows |
|---|---|---|---|
| [`node`](https://github.com/miabi-io/examples/tree/main/node) | Node.js 22, Express | 3000 | Tests with `node:test`, calling another app by name |
| [`go`](https://github.com/miabi-io/examples/tree/main/go) | Go, [Okapi](https://github.com/jkaninda/okapi), distroless | 8080 | Multi-arch builds, version stamping, a container with no capabilities |
| [`python`](https://github.com/miabi-io/examples/tree/main/python) | Python 3.13, FastAPI | 8000 | A managed Postgres database wired in through `DB_URL` |
| [`php`](https://github.com/miabi-io/examples/tree/main/php) | PHP 8.4 on `jkaninda/nginx-php-fpm` | 80 | Plain PHP, plus a managed Redis visit counter |
| [`laravel`](https://github.com/miabi-io/examples/tree/main/laravel) | Laravel 13 on `jkaninda/nginx-php-fpm` | 80 | Postgres, Redis, a queue worker, migrations as a Job, a CronJob |
| [`java`](https://github.com/miabi-io/examples/tree/main/java) | Java 25, JDK `HttpServer`, distroless | 8080 | No framework, a `jlink` runtime of about 40 MB, no capabilities |
| [`spring-boot`](https://github.com/miabi-io/examples/tree/main/spring-boot) | Java 25, Spring Boot 4 | 8080 | Postgres with Flyway, JVM sizing from the memory limit, graceful shutdown |

Every app answers on the same routes, so you can check any of them the same way: `/` names the
version and the container that served it, `/healthz` (`/up` for Laravel) is the health check, and
`/api/info` returns the same details as JSON.

Alongside the apps:

- [`gitops/`](https://github.com/miabi-io/examples/tree/main/gitops) holds one folder per
  [Git source](/docs/cicd/gitops): each app on its own, a multi-app `Project` with a custom domain
  and a rate-limited route, and the same app as `staging` and `production`.
- [`pipelines/`](https://github.com/miabi-io/examples/tree/main/pipelines) holds
  [pipeline](/docs/cicd/pipelines) specs that build straight from the monorepo, a build-only image,
  a release with a Trivy scan and a Slack notice, and two [GitHub Actions](/docs/cicd/github-actions)
  workflows.

## Three ways to deploy one

**Apply a manifest.** The images are published to `ghcr.io/miabi-io/examples/<name>`, so a
manifest from `gitops/` deploys as-is. Only images are pulled, so no build runner is needed:

```bash
git clone https://github.com/miabi-io/examples && cd examples
miabi login
miabi apply -f gitops/python/app.yaml --dry-run   # print the plan
miabi apply -f gitops/python/app.yaml             # Postgres + the app, wired together
```

**Reconcile from Git.** Register `https://github.com/miabi-io/examples` under **Git repositories**
(it is public, so no token is needed), then create a Git source with the path set to one folder,
such as `gitops/laravel`. Miabi keeps the workspace matching that folder: a commit is a change, a
revert is a rollback. Fork the repository to change anything.

**Build from source.** Copy an example folder into its own repository and create an app from it.
Miabi finds `.miabi/pipeline.yaml` and [offers to adopt it](/docs/cicd/pipelines#pipelines-from-your-repository):
from then on every deploy runs the tests, builds the image on your [runner](/docs/cicd/runners),
and rolls it out. To build from the monorepo instead, bind a spec from `pipelines/monorepo` to the
app; its `context` points the build at one directory.

## Wiring without credentials

The manifests never write a secret into Git. Connection strings come from interpolation and are
stored encrypted:

```yaml
env:
  DB_URL: "{{ .databases.python-example-db.uri }}"   # resolved at apply time
  APP_KEY: "{{ .secrets.laravel-app-key }}"           # a Secret with generate: true
secretEnv: [DB_URL, APP_KEY]
```

See the [manifest reference](/docs/cicd/manifest-reference) for every kind and field.

## Related

- [Pipelines](/docs/cicd/pipelines)
- [GitOps](/docs/cicd/gitops)
- [Build runners](/docs/cicd/runners)
- [GitHub Actions](/docs/cicd/github-actions)
