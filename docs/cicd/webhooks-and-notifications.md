---
sidebar_position: 4
title: Webhooks & Notifications
description: Signed webhook delivery and notifications fired from application and deployment events.
---

# Webhooks & Notifications

Miabi emits **events** as your apps and deployments change — a deploy starts, succeeds, or fails; an app becomes unhealthy. You can react to these events two ways: deliver them to your own systems as **signed webhooks**, or surface them to people through **notifications**.

![Webhook configuration](/img/screenshots/webhooks.png)

## Events

Webhooks and notifications are driven by the same underlying events, including:

- **Deployment events** — started, succeeded, failed, rolled back.
- **Application events** — created, updated, scaled, health changed.

You choose which events a given webhook or notification channel cares about, so each integration only hears what's relevant to it.

## Webhooks

A webhook delivers an event to an HTTP endpoint you control — useful for triggering downstream automation, updating a dashboard, or chaining into another system.

### Signed delivery

Every webhook delivery is **signed with HMAC**. Miabi computes a signature over the payload using a per-webhook secret and sends it in a header. Your receiver recomputes the signature with the same secret and compares — if they don't match, reject the request.

This lets you verify that a delivery genuinely came from Miabi and wasn't tampered with in transit.

:::caution
Always verify the HMAC signature before acting on a webhook, and keep the signing secret confidential. Treat unsigned or mismatched deliveries as untrusted.
:::

### Configuring a webhook

From the console, add a webhook with:

1. The **destination URL**.
2. The **events** it should receive.
3. A **signing secret** Miabi uses to sign each delivery.

Miabi shows recent delivery attempts and their responses so you can confirm endpoints are reachable and debug failures.

:::tip
Have your endpoint respond quickly with a 2xx and do heavy work asynchronously. Miabi treats non-2xx responses as failed deliveries.
:::

## Notifications

Notifications surface the same events to **people** rather than systems — for example alerting your team when a deployment fails or an app goes unhealthy. Configure notification channels in the console and pick which events should reach each one, so the right people hear about the changes that matter.

## Roles

Configuring webhooks and notification channels is a privileged action — **Owner** and **Admin** manage them, while **Developer** and **Viewer** can see delivery activity according to their access.

## Related

- [Pipelines](/docs/cicd/pipelines)
- [Git push deploy](/docs/cicd/git-push-deploy)
