---
sidebar_position: 2
title: Using Templates
description: Install a marketplace template, configure it, and update to newer versions.
---

# Using Templates

Templates turn popular software into a one-click install. This page walks through installing a
template, configuring it for your environment, and keeping it up to date.

![Install a template](/img/screenshots/marketplace-template.png)

## Installing a template

1. Open your workspace and go to the **Marketplace**.
2. Browse or search the catalog and select a template (for example WordPress).
3. Review the template details and the **version** you're installing.
4. Choose **Install** and pick the target workspace.

The install creates a standard Miabi application from the template's definition. From here on you
manage it like any [application](/docs/applications/overview).

## Configuring the app

Templates ship with sensible defaults, but you'll usually customize a few things before or just
after install:

### Environment variables

Templates expose the environment variables the software expects (admin credentials, database
connection settings, feature flags, and so on). Fill in any required values; secrets are stored
encrypted. Review the defaults and override what you need.

### Domain and SSL

Attach a custom domain to make the app reachable, and Miabi handles SSL automatically. Add the
domain in the application's **Domains** section after install.

### Resources

Set CPU and memory limits to match the workload. You can adjust resource limits and scale the app
at any time from its settings.

:::tip
For templates that need a database (WordPress, Ghost, Nextcloud, …), provision the database first
or alongside the install, then point the template's environment variables at it.
:::

## Updating to a newer template version

Because templates are **versioned**, updates are deliberate:

1. Open the installed application.
2. If a newer template version is available, you'll see an **update available** indicator.
3. Review what changes between your current version and the new one.
4. Apply the update — this rolls the application forward to the newer template version.

Your data on mounted [volumes](/docs/storage/volumes) and any environment overrides you set are
preserved across the update; only the template-defined configuration moves forward.

:::caution
Treat a template update like any deploy: take a [backup](/docs/storage/backups) of the app's
database and volumes first, then update. If anything goes wrong you can roll back the deployment.
:::

:::note
Updating the template version is independent from the application image's own update flow — a
template update applies the new template definition, which may include a new image tag, changed
defaults, or additional configuration.
:::
