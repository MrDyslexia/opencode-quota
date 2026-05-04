import { describe, expect, it } from "vitest";

import { buildCompactQuotaStatusLine } from "../src/lib/tui-compact-format.js";

describe("buildCompactQuotaStatusLine", () => {
  it("formats percent entries with compact labels, bars, and remaining percent semantics", () => {
    const line = buildCompactQuotaStatusLine({
      percentDisplayMode: "remaining",
      maxWidth: 96,
      data: {
        entries: [
          {
            name: "Copilot rolling window",
            group: "Copilot",
            label: "5h:",
            percentRemaining: 82,
          },
        ],
        errors: [],
      },
    });

    expect(line).toBe("Copilot 5h █████░ 82%");
  });

  it("formats used percent mode with matching compact bar fill", () => {
    const line = buildCompactQuotaStatusLine({
      percentDisplayMode: "used",
      maxWidth: 96,
      data: {
        entries: [
          {
            name: "Copilot rolling window",
            group: "Copilot",
            label: "5h:",
            percentRemaining: 82,
          },
        ],
        errors: [],
      },
    });

    expect(line).toBe("Copilot 5h █░░░░░ 18%");
  });

  it("formats value entries without percent mode changing the value", () => {
    const remaining = buildCompactQuotaStatusLine({
      percentDisplayMode: "remaining",
      maxWidth: 96,
      data: {
        entries: [
          {
            kind: "value",
            name: "Cursor API",
            value: "$2.40 / $20.00",
          },
        ],
        errors: [],
      },
    });
    const used = buildCompactQuotaStatusLine({
      percentDisplayMode: "used",
      maxWidth: 96,
      data: {
        entries: [
          {
            kind: "value",
            name: "Cursor API",
            value: "$2.40 / $20.00",
          },
        ],
        errors: [],
      },
    });

    expect(remaining).toBe("Cursor API $2.40 / $20.00");
    expect(used).toBe(remaining);
  });

  it("joins multiple entry and session-token aggregate segments", () => {
    const line = buildCompactQuotaStatusLine({
      percentDisplayMode: "remaining",
      maxWidth: 96,
      data: {
        entries: [
          {
            name: "Copilot rolling window",
            group: "Copilot",
            label: "5h:",
            percentRemaining: 82,
          },
          {
            kind: "value",
            name: "Cursor API",
            value: "$2.40",
          },
        ],
        errors: [],
        sessionTokens: {
          models: [{ modelID: "openai/gpt-5", input: 12_400, output: 3_100 }],
          totalInput: 12_400,
          totalOutput: 3_100,
        },
      },
    });

    expect(line).toBe("Copilot 5h █████░ 82% · Cursor API $2.40 · tok 12.4K in / 3.1K out");
  });

  it("summarizes errors as issue counts when quota segments exist and the count fits", () => {
    const line = buildCompactQuotaStatusLine({
      percentDisplayMode: "remaining",
      maxWidth: 96,
      data: {
        entries: [
          {
            name: "Copilot",
            percentRemaining: 75,
          },
        ],
        errors: [
          { label: "OpenAI", message: "Not configured" },
          { label: "Cursor", message: "Unavailable" },
        ],
      },
    });

    expect(line).toBe("Copilot █████░ 75% · +2 issues");
  });

  it("renders the first error with a remaining count when no quota segments exist", () => {
    const line = buildCompactQuotaStatusLine({
      percentDisplayMode: "remaining",
      maxWidth: 96,
      data: {
        entries: [],
        errors: [
          { label: "OpenAI", message: "Not configured" },
          { label: "Cursor", message: "Unavailable" },
        ],
      },
    });

    expect(line).toBe("OpenAI: Not configured +1");
  });

  it("omits the issue count when quota segments exist but the count does not fit", () => {
    const line = buildCompactQuotaStatusLine({
      percentDisplayMode: "remaining",
      maxWidth: "Copilot █████░ 75%".length,
      data: {
        entries: [
          {
            name: "Copilot",
            percentRemaining: 75,
          },
        ],
        errors: [{ label: "OpenAI", message: "Not configured" }],
      },
    });

    expect(line).toBe("Copilot █████░ 75%");
  });

  it("collapses whitespace, sanitizes control text, and truncates with ellipsis", () => {
    const line = buildCompactQuotaStatusLine({
      percentDisplayMode: "remaining",
      maxWidth: 24,
      data: {
        entries: [
          {
            name: "Open\u001b[31mAI\nProvider",
            percentRemaining: 42,
          },
        ],
        errors: [{ label: "Err\u0007", message: "Bad\u0003" }],
      },
    });

    expect(line).toBe("OpenAI Provider ███░░░…");
    expect(line.length).toBeLessThanOrEqual(24);
    expect(line).not.toContain("\n");
    expect(line).not.toContain("\u001b");
    expect(line).not.toContain("\u0007");
    expect(line).not.toContain("\u0003");
  });
});
