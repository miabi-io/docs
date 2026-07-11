# Miabi Documentation

The official documentation site for [Miabi](https://github.com/miabi-io/miabi) — the
open-source, self-hosted Platform-as-a-Service for Docker. Built with
[Docusaurus](https://docusaurus.io/).

This is a **standalone documentation repository**. It does not contain the Miabi
application source (that lives in the [`miabi/`](https://github.com/miabi-io/miabi) module)
and it deliberately does **not** duplicate the REST API reference — the interactive API docs
are generated from code and served at `/docs` on every running Miabi instance.

## Local development

```bash
npm install
npm start
```

This starts a local dev server and opens a browser window. Most edits reload live.

## Build

```bash
npm run build
```

Generates static content into the `build/` directory, deployable to any static host.

## Contributing

Pages are plain Markdown with frontmatter (`title`, `description`, `sidebar_position`).
Keep the docs **guide-oriented** — explain concepts and workflows through the web console,
and link to `/docs` (the generated OpenAPI reference) for endpoint-level detail rather than
repeating it here.
