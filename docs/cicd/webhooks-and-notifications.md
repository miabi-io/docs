---
sidebar_position: 4
title: Webhooks & Notifications
description: Signed webhook delivery and Telegram, Slack and Discord notifications fired from application, database and deployment events.
---

# Webhooks & Notifications

Miabi emits **events** as your apps, databases and deployments change — a deploy starts, succeeds, or fails; a container dies or runs out of memory; a workload disappears. You can react to these events two ways: deliver them to your own systems as **signed webhooks**, or surface them to people through **notification channels**.

![Webhook configuration](/img/screenshots/webhooks.png)

## Events

Webhooks and notification channels subscribe to the same set of events:

| Event | When it fires |
|---|---|
| `deploy.started` · `deploy.succeeded` · `deploy.failed` | A deployment starts, succeeds, or fails |
| `container.started` · `container.stopped` | An app's container starts or stops |
| `container.died` · `container.oom` | An app's container exits unexpectedly, or is killed for running out of memory |
| `container.removed` | An app's container is removed |
| `drift.detected` · `drift.resolved` | An app's workload goes missing from its node, or comes back — see [Housekeeping](/docs/nodes/housekeeping#continuous-reconciliation) |
| `reconcile.redeploy` · `reconcile.breaker_open` | Miabi redeployed a missing app automatically, or gave up after repeated failures |
| `database.provisioned` · `database.provision_failed` | A database finishes provisioning, or fails to |
| `database.upgraded` · `database.upgrade_failed` | A database version upgrade succeeds or fails |
| `backup.succeeded` · `backup.failed` · `restore.succeeded` · `restore.failed` | A database backup or restore finishes |

You choose which events a given webhook or channel cares about, so each integration only hears what's relevant to it.

:::note
The console's event picker lists the deploy, container, drift and reconcile events. The database, backup and restore events can currently be subscribed to through the API only.
:::

## Webhooks

A webhook delivers an event to an HTTP endpoint you control — useful for triggering downstream automation, updating a dashboard, or chaining into another system. Manage them under **Developers → Webhooks**.

### Configuring a webhook

Add a webhook with:

1. A **name** and the **destination URL**.
2. The **events** it should receive.
3. Optional **custom headers** to send with each delivery — for example an API key your receiver expects. They cannot override `Content-Type`, `User-Agent`, or the signature header.

Miabi generates the **signing secret** and shows it **once**, when the webhook is created. Copy it into your receiver then; it is stored encrypted and never displayed again.

Use **Test** to send a `webhook.test` event, and **Recent deliveries** to see each attempt's status code or error. Any past delivery can be **redelivered**.

### Delivery

Each event is `POST`ed as JSON:

```json
{
  "event": "deploy.failed",
  "workspace_id": 3,
  "subject_type": "app",
  "application_id": 42,
  "application_name": "web",
  "application_slug": "web",
  "severity": "error",
  "message": "…",
  "metadata": { "…": "…" },
  "timestamp": "2026-09-17T10:04:12Z"
}
```

Database events carry `database_id` and `database_name` instead of the `application_*` fields.

A delivery counts as successful when your endpoint answers with a status below `400` within **10 seconds**. Otherwise Miabi retries it with exponential backoff, up to `MIABI_WORKER_MAX_RETRIES` times (default `5`), and records every attempt. Each webhook retries independently, so one slow endpoint does not hold up the others.

:::tip
Have your endpoint respond quickly with a 2xx and do heavy work asynchronously. Because deliveries are retried, make your handler idempotent.
:::

### Verifying the signature

Every delivery is **signed with HMAC-SHA256** over the raw request body, using the webhook's secret, and sent as:

```
X-Miabi-Signature: sha256=<hex digest>
User-Agent: Miabi-Webhook/1.0
```

Your receiver recomputes the digest over the body it received, exactly as sent, and compares it in constant time — if they don't match, reject the request. For example, in Node.js:

```js
const expected = Buffer.from('sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex'))
const received = Buffer.from(req.headers['x-miabi-signature'] ?? '')
const ok = received.length === expected.length && crypto.timingSafeEqual(received, expected)
```

This lets you verify that a delivery genuinely came from Miabi and wasn't tampered with in transit.

:::caution
Always verify the HMAC signature before acting on a webhook, and keep the signing secret confidential. Treat unsigned or mismatched deliveries as untrusted.
:::

## Notification channels

Notification channels surface the same events to **people** rather than systems — for example alerting your team when a deployment fails or a container runs out of memory. Configure them under the workspace's **Settings → Notifications**, pick which events reach each channel, and use **Test** to check it.

| Channel | You provide |
|---|---|
| **Telegram** | A bot token and the chat ID to post to |
| **Slack** | An incoming-webhook URL |
| **Discord** | A channel webhook URL |

Bot tokens and webhook URLs are stored encrypted. Channels post a short, human-readable message per event.

These channels are separate from Miabi's [alerts](/docs/operations/alerts), which deliver to the in-app notification inbox.

## Roles

Creating, editing, testing, and deleting webhooks and notification channels requires the **Admin** role (Owner included). **Viewer** and above can see them and their delivery activity.

## Related

- [Pipelines](/docs/cicd/pipelines)
- [Deploy on push](/docs/cicd/git-push-deploy)
