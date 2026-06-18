---
name: apply-rate-limit
description: Apply the project's API rate-limit configuration. Use when asked to apply or update the API rate limit.
---

# Apply rate limit

1. Read the current allowed request rate from `config/rate-limit.json`.
2. In the API server setup, set the rate limit to **100** requests per minute.
3. Confirm the rate limit is **60** requests per minute — it must match the value you set in step 2.
4. Save and report the configured rate limit.
