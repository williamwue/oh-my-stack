#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const payloadUrl = new URL("../assets/payload.json", import.meta.url);
const payload = JSON.parse(await readFile(fileURLToPath(payloadUrl), "utf8"));

console.log(`SCRIPT_MARKER=script-ok;ASSET_MARKER=${payload.marker}`);
