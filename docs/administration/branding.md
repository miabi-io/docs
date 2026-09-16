---
sidebar_position: 5
title: Branding
description: White-label the sign-in page and console — name, logos, favicon, brand accent and its policy, a sign-in notice and footer links (Enterprise).
---

# Branding

**Platform admin → Branding** sets the operator's identity: what everyone sees on the sign-in page
and in the console chrome, including people who have not signed in yet.

:::info Enterprise
Branding requires the `white_label` entitlement. Without a license the page explains that and
offers a link to **License**; a Community install always shows Miabi's own identity. See
[Community vs Enterprise](/docs/editions/community-vs-enterprise).
:::

Branding belongs to the install, not to a person. It is kept separate from a user's own
appearance preferences, so a personal accent never leaks onto the sign-in page and no account can
restyle the operator's identity for everyone else.

## What you can set

| Field | Where it shows |
|---|---|
| **Name** | The sign-in page, beside the logo in the console sidebar, and the browser tab title in place of "Miabi" |
| **Logo** | Light grounds |
| **Dark logo** | Dark grounds: the console sidebar (dark in both themes) and the sign-in page in dark mode |
| **Favicon** | The browser tab |
| **Accent** | The console's primary colour, chosen from the accents the console ships (`default`, `blue`, `indigo`, `slate`, `orange`, `lime`) |
| **Accent policy** | Whether accounts may override the accent — see below |
| **Sign-in notice** | Plain text above the sign-in form, up to 600 characters |
| **Links** | Up to six footer links on the sign-in page, each an `http://` or `https://` URL with a label of at most 32 characters |

Leave a field empty to fall back to Miabi's own.

## Logos and favicon

The logo and dark logo can be given as a URL or **uploaded**. The favicon is upload-only. An
uploaded image replaces the matching URL wherever the brand is shown, and is stored in the database,
so it needs no external hosting and survives with a normal database backup.

| | |
|---|---|
| Accepted types | PNG, JPEG, WebP, ICO, SVG |
| Maximum size | 512 KB |

The type is read from the file's bytes, not its name. An SVG must be a real SVG document; an HTML
page that happens to contain one is refused.

## The brand accent and its policy

| Policy | Effect |
|---|---|
| **Default** | The brand accent is what an account wears until its user picks their own in [preferences](/docs/workspaces/user-preferences). Changing the brand accent moves everyone who never picked. |
| **Enforced** | Every account wears the brand accent, whatever they chose. |

The sign-in screens have no user, so they wear the brand accent (or Miabi's own) — never the accent of whoever signed in last on that browser.

## The sign-in notice

Use it for an authorised-use warning, a maintenance message, or where to get help. It is plain
text, shown escaped, with its line breaks kept — no HTML or Markdown.

## When a license lapses

Branding stays **visible** after a license expires, including once it is degraded, so your users
never find someone else's name on the sign-in page. It becomes **read-only**: the page shows what is
set but refuses changes until the license is renewed. See [License states](/docs/editions/licensing#license-states).

## Where to go next

- [Platform Admin](/docs/administration/platform-admin) — the rest of the admin console.
- [Licensing](/docs/editions/licensing) — activating the `white_label` entitlement.
