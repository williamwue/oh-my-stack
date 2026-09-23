---
name: make-bot-ui
description: "Build a local control page that submits validated actions to an authenticated webhook, with optional private-network access."
disable-model-invocation: true
---

# Make bot UI

Use when the user asks for a page or dashboard that wakes an existing bot or
automation through a webhook. Confirm that the target runtime exposes a
supported webhook trigger, a documented authentication mechanism, and a safe
way to store the credential. If a required capability is absent, stop at a
reviewable local UI and name the missing integration; a fabricated endpoint
must never be called live.

Define a small JSON action schema. Treat incoming form data and webhook bodies
as untrusted. Keep the credential server-side in a runtime-supported secret
store or a restricted local config file; never put it in browser code, source
control, chat, logs, or diagnostic output. Where a host offers a secret-request
flow, use it; otherwise ask the user to set the secret through the host's
secure mechanism without pasting it into conversation.

Build a page that posts to a local server, which validates the action and
forwards it to the configured webhook with the provider's documented headers,
timeout, and retry semantics. Never infer authentication headers or delivery
guarantees from another provider. Match field names in the UI, server, and
webhook consumer. A successful HTTP response proves only acceptance unless the
provider gives a separate completion signal. Probe with a harmless action and
verify both local response and target readback before saying the bot is live.

Default to a local loopback binding. If the user asks for private-network
access, use an existing approved network path and confirm its interface and
access controls before binding beyond loopback. Installing network software,
changing device login, or exposing the server requires explicit scope. Avoid
logging payloads that contain secrets or personal data; any delivery queue
needs bounded retention and deduplication before retries.

Return the local page path/URL, action schema, secret setup method without its
value, actual webhook proof, and network reachability. Mark absent target
confirmation or private-network checks as unverified.
