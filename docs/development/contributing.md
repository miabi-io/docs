---
sidebar_position: 1
title: Contributing
description: How to report bugs, request features and run Miabi from source
---

# Contributing

Feedback from people running Miabi is the most useful contribution there is: bug reports, feature
requests, questions and documentation fixes all shape the project.

:::info External pull requests

Miabi does **not accept external pull requests** at the moment. Pull requests from outside the
maintainer team are closed without review. This is not a judgement on the work: Miabi is changing
quickly, and we cannot yet review and maintain outside code. If you have a fix, open an issue that
describes it. A short patch or snippet in the issue is welcome, and we may build on it.

:::

## Before You Start

### Search first

Search the [existing issues](https://github.com/miabi-io/miabi/issues) and
[discussions](https://github.com/miabi-io/miabi/discussions) before opening a new one. If your
problem or idea is already there, add your details or a 👍 to it rather than creating a duplicate.

### Questions and ideas

Ask questions, share what you have built and discuss ideas in
[GitHub Discussions](https://github.com/miabi-io/miabi/discussions). Use issues for confirmed bugs
and concrete feature requests.

### Security reporting

Do **not** report security vulnerabilities in public issues or discussions. Email
[security@miabi.io](mailto:security@miabi.io) instead, as described in
[SECURITY.md](https://github.com/miabi-io/miabi/blob/main/SECURITY.md).

## How You Can Help

### Report bugs

[Open a bug report](https://github.com/miabi-io/miabi/issues/new?template=bug_report.yml) and
include:

- the Miabi version, shown in the web console;
- how you installed it (install script, Docker Compose, existing server) and the host OS;
- the steps to reproduce, what you expected, and what happened instead;
- the output of `sudo miabi system status`, relevant container logs (`docker logs`) and screenshots.

Remove secrets, tokens and private hostnames from logs before you paste them.

### Request features

[Open a feature request](https://github.com/miabi-io/miabi/issues/new?template=feature_request.yml)
that describes the problem you are trying to solve, not only the solution you have in mind. Knowing
the use case lets us find the design that fits Miabi best.

### Improve the documentation

If something in these docs is wrong, unclear or missing, open an issue that names the page. Every
page has an **Edit this page** link to its source, which helps you point at the exact passage.

### Spread the word

Star the [repository](https://github.com/miabi-io/miabi) and share Miabi with others who self-host.
It helps more people find the project.

## Running From Source

You do not need to build Miabi to report a bug, but running from source helps you check whether a
problem is already fixed on `main`.

### Requirements

- [Go](https://go.dev/), the version named in `go.mod`
- [Node.js](https://nodejs.org/) and npm, for the web console
- [Docker](https://www.docker.com/), with a reachable socket
- `make`

### Setup

```sh
git clone https://github.com/miabi-io/miabi.git
cd miabi
cp .env.example .env    # MIABI_DEV_MODE=true for local work
docker compose -f compose.dev.yaml up -d postgres redis
```

`MIABI_ADMIN_EMAIL` and `MIABI_ADMIN_PASSWORD` in `.env` set the first admin account.

### Running API, worker and console

```sh
make run        # API server on http://localhost:9000, worker embedded
make dev-ui     # web console with hot reload on http://localhost:3000
make test       # tests
```

The console dev server proxies `/api/v1` to `:9000`. To build a single binary with the console
embedded, run `make build-all`. The OpenAPI document is served at `/docs` and `/openapi.json` on
any running instance.

## Licensing

Miabi is open-core:

- the core is licensed under the AGPL-3.0-or-later;
- the reusable packages under `pkg/` are licensed under the Apache License 2.0;
- the Enterprise Edition files are commercially licensed.

[LICENSING.md](https://github.com/miabi-io/miabi/blob/main/LICENSING.md) has the full breakdown,
and [Licensing](../editions/licensing.md) explains how to get an Enterprise license.

## Getting Help

- **Questions:** [GitHub Discussions](https://github.com/miabi-io/miabi/discussions)
- **Bugs and feature requests:** [GitHub issues](https://github.com/miabi-io/miabi/issues)
- **Security:** [security@miabi.io](mailto:security@miabi.io)
