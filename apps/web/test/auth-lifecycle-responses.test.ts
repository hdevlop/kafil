import { describe, expect, test } from "bun:test";

import { responseRows } from "./e2e/authLifecycleResponses";

describe("remote auth lifecycle response envelopes", () => {
  test("reads a direct Najm list envelope", () => {
    const row = { id: "family-id", email: "family@example.test" };

    expect(responseRows({ data: [row] })).toEqual([row]);
  });

  test("rejects records and non-object array entries as list rows", () => {
    expect(responseRows({ data: { id: "family-id" } })).toEqual([]);
    expect(responseRows({ data: [null, "invalid", { id: "family-id" }] })).toEqual([
      { id: "family-id" },
    ]);
  });
});
