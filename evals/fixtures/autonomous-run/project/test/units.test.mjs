import assert from "node:assert/strict";
import test from "node:test";

import { unitA } from "../lib/unit-a.mjs";
import { unitB } from "../lib/unit-b.mjs";
import { unitC } from "../lib/unit-c.mjs";

test("unit-a returns alpha", () => assert.equal(unitA(), "alpha"));
test("unit-b returns beta", () => assert.equal(unitB(), "beta"));
test("unit-c returns gamma", () => assert.equal(unitC(), "gamma"));
