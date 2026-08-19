---
name: Local Orion inference
description: Durable decision for Orion's browser-side assistant architecture.
---

Orion keeps all assistant generation behind a small browser-side transformer adapter. The adapter can call a loaded on-device pipeline when available and must fall back to deterministic local intent routing when model loading fails or the device is offline.

**Why:** The app must remain usable without an external API, while leaving a clean seam for installing free pretrained weights later.

**How to apply:** Add model loading, caching, or quantized weights inside the adapter; preserve the system prompt, safety guardrails, model timing behavior, and fallback response contract used by the chat UI.