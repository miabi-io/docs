---
sidebar_position: 9
title: Miabi Console
description: Connect a Miabi instance to Miabi Console (Enterprise, Billing add-on).
---

# Miabi Console

A Miabi instance can be connected to Miabi Console, which then manages billing for its workspaces.

:::info Enterprise
Connecting needs an Enterprise licence with the **Billing** add-on, and
`MIABI_BILLING_API_ENABLED=true` set on the instance (restart to apply).
:::

## Connect

1. In Miabi Console, copy the instance's **enrolment code** (`mce1.…`).
2. In Miabi, open **Platform admin → Billing**, paste the code and select **Connect**.

Codes work once and expire after 24 hours. The Billing page shows the connection and lets an admin
disconnect it.
