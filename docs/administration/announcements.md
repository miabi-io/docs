---
sidebar_position: 6
title: Announcements
description: Broadcast a platform notice to user inboxes — targeted, scheduled, with an expiry and an optional pinned banner.
---

# Announcements

An **announcement** puts a notice in the inbox of the users it concerns: planned maintenance, a
breaking upgrade, a policy change. It arrives in the same notification bell and inbox as
[alerts](/docs/operations/alerts), and can also be pinned as a banner across the console.

:::info Enterprise
Announcements need an Enterprise licence with announcements (Business and up). On a lapsed licence
you can no longer send or edit one, but **Retract** stays available, so a mistake never gets stuck in
every inbox.
:::

## Sending one

Open **Platform admin → Announcements** and click **New announcement**.

| Field | What it does |
|---|---|
| **Title** | The headline, up to 200 characters. Required. |
| **Message** | The body. |
| **Audience** | Who receives it (see [below](#audience)). The form shows how many users it reaches before you send. |
| **Severity** | **Info**, **Warning** or **Critical**. |
| **Link** / **Action text** | Where the notice takes the reader, and the button label for it. Both optional. |
| **Publish at** | Leave empty to send immediately, or pick a time to schedule it. |
| **Expires at** | When the notice retires itself. Leave empty to keep it until you retract it. |
| **Pin as a banner across the app** | Shows it as a banner above every page, not only in the inbox. |
| **Dismissal** | For a pinned banner: whether readers can close it. |

## Audience

| Audience | Who receives it |
|---|---|
| **Everyone** | Every active user on the platform. |
| **Platform admins** | Platform admins only. |
| **Workspace owners & admins** | Anyone who is an Owner or Admin of at least one workspace. |
| **Specific workspaces** | Every member of the workspaces you pick. Pick at least one. |

Suspended accounts and service accounts are never included.

The audience is a standing rule, not a snapshot. While an announcement is live, a user who joins
later, such as a new account or a new member of a targeted workspace, receives it too, within about
a minute of their next visit.

## Scheduling and expiry

A scheduled announcement shows as **scheduled** in the list and goes out within a minute of its
**Publish at** time. **Send now** sends it early. Once sent, its publish time can no longer change;
only the expiry can.

An expired announcement stops showing at its **Expires at** time and is listed as **expired**. Set an
expiry on anything tied to a date, such as a maintenance window, so nobody has to clean it up
afterwards.

## Pinned banners

Pin an announcement when it changes what someone should do right now. The banner appears above
every page of the console, for workspace and admin views alike.

| Dismissal | Effect |
|---|---|
| **Readers can close it** | Each reader can close the banner, and it stays closed for them. |
| **Readers cannot close it** | No close button. The banner stays until it expires or you retract it. |

A banner nobody can close and with no expiry stays on every screen until you retract it; the form
warns you before you send one. An announcement that isn't pinned rests in the inbox only.

## Editing and retracting

The list shows each announcement's audience, status, severity and **Delivered** count, the number
of inboxes it has reached so far.

- **Edit** rewrites the notice in every inbox it already reached, so a correction replaces the
  original rather than adding a second one.
- **Retract** deletes the announcement and removes it from every inbox it was delivered to.

Sending, editing and retracting are recorded in the [audit log](/docs/operations/audit-log).

## Where to go next

- [Alerts & Notifications](/docs/operations/alerts) — the inbox and bell announcements are delivered to.
- [Platform Admin](/docs/administration/platform-admin) — everything else the admin console manages.
