# Cloudflare migration prototype

Not deployed. No Firebase data is changed. No credentials in GitHub.

Use a separate D1 database and Worker. Verify Google identity server-side and allow only approved accounts; fail closed until configured. Map verified identity to account ID without trusting IDs supplied by clients.

Local-first: IndexedDB stores each answer and pending event atomically. Upload batches with stable event IDs; duplicate transmissions are ignored by the composite primary key. Pull changes by indexed sequence, including deletion markers. Keep pending events until confirmed. Preserve existing IDs, statistics, session history and registration metadata through a validated export/import; the initial schema is only a foundation, not a full migration implementation. Define history reset semantics and retention before production. Never publish private material.

Next: authentication, API, local outbox, migration validation, mock and real D1 tests. Deploy only after separate Cloudflare account setup and approval of test results.
