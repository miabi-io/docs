---
sidebar_position: 2
title: Badges
description: Deploy on Miabi and Running on Miabi badges for READMEs, templates and sites hosted on Miabi.
---

# Badges

Two ready-made badges let you show that a project runs on Miabi, or point readers at how to run it
there.

| Badge | Use it for |
|---|---|
| **Deploy on Miabi** | The top of a README or a marketplace template, pointing readers at how to run your project on Miabi. |
| **Running on Miabi** | The footer of a site or app you host on Miabi. |

## Variants

Each badge comes in four variants. Pick the one with enough contrast for where it sits:

<table>
  <thead>
    <tr><th>Variant</th><th>Background</th><th>Deploy on Miabi</th><th>Running on Miabi</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><code>-dark</code></td><td>Light</td>
      <td style={{background: '#ffffff'}}><img src="/img/badges/deploy-on-miabi-dark.svg" alt="Deploy on Miabi, dark" height="32" /></td>
      <td style={{background: '#ffffff'}}><img src="/img/badges/running-on-miabi-dark.svg" alt="Running on Miabi, dark" height="32" /></td>
    </tr>
    <tr>
      <td><code>-light</code></td><td>Dark</td>
      <td style={{background: '#101a37'}}><img src="/img/badges/deploy-on-miabi-light.svg" alt="Deploy on Miabi, light" height="32" /></td>
      <td style={{background: '#101a37'}}><img src="/img/badges/running-on-miabi-light.svg" alt="Running on Miabi, light" height="32" /></td>
    </tr>
    <tr>
      <td><code>-white</code></td><td>Coloured or brand</td>
      <td style={{background: '#7e22ce'}}><img src="/img/badges/deploy-on-miabi-white.svg" alt="Deploy on Miabi, white" height="32" /></td>
      <td style={{background: '#7e22ce'}}><img src="/img/badges/running-on-miabi-white.svg" alt="Running on Miabi, white" height="32" /></td>
    </tr>
    <tr>
      <td><code>-purple</code></td><td>Any</td>
      <td><img src="/img/badges/deploy-on-miabi-purple.svg" alt="Deploy on Miabi, purple" height="32" /></td>
      <td><img src="/img/badges/running-on-miabi-purple.svg" alt="Running on Miabi, purple" height="32" /></td>
    </tr>
  </tbody>
</table>

`-purple` is a filled gradient that stands out on any background, so use it when the badge is a
call to action. `-white` is transparent and single-colour.

## Adding a badge

The badges are served from `https://miabi.io/badges/<file>`. Link them back to Miabi:

```markdown title="README.md"
[![Deploy on Miabi](https://miabi.io/badges/deploy-on-miabi-purple.svg)](https://docs.miabi.io/docs/getting-started/quickstart?ref=badge)
```

```markdown title="README.md"
[![Running on Miabi](https://miabi.io/badges/running-on-miabi-dark.svg)](https://miabi.io?ref=badge)
```

To follow the reader's light or dark theme, which GitHub supports, use a `<picture>` element:

```html title="README.md"
<a href="https://miabi.io?ref=badge">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://miabi.io/badges/running-on-miabi-light.svg">
    <img src="https://miabi.io/badges/running-on-miabi-dark.svg" alt="Running on Miabi" height="32">
  </picture>
</a>
```

On a website, the same goes in the footer:

```html title="footer.html"
<a href="https://miabi.io?ref=badge" rel="noopener">
  <img src="https://miabi.io/badges/running-on-miabi-dark.svg" alt="Running on Miabi" height="28">
</a>
```

The badges are vectors: set any `height` (24 to 40 px reads well) and the width follows. To serve
them yourself, download them from [`branding/badges`](https://github.com/miabi-io/miabi/tree/main/branding/badges)
in the Miabi repository. All variants are on the [preview page](https://miabi.io/badges/preview.html).

## Guidelines

- Keep the link back to Miabi.
- Use the files as they are: don't recolour, redraw, stretch or crop them.
- Don't use a badge to suggest an endorsement or partnership with the Miabi project.

The Miabi logos, for articles, slides and integration docs, are in the same
[`branding`](https://github.com/miabi-io/miabi/tree/main/branding) folder, with their usage terms.
