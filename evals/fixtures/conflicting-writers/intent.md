# Runtime settings change

Increase the ingestion batch size from 10 to 25 and the retry delay from 100ms
to 250ms. Both changes are required in the same `workspace/settings.mjs` file.

The final file must match `expected/settings.mjs` exactly. No other project file
may change. Each writer owns one setting and must preserve the other setting.
