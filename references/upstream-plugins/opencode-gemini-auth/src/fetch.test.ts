import { afterEach, describe, expect, it, mock } from "bun:test";

import { geminiFetch } from "./fetch";

const originalFetch = globalThis.fetch;
const originalProxy = process.env.OPENCODE_GEMINI_AUTH_PROXY;

describe("geminiFetch", () => {
  afterEach(() => {
    (globalThis as { fetch: typeof fetch }).fetch = originalFetch;
    if (originalProxy === undefined) {
      delete process.env.OPENCODE_GEMINI_AUTH_PROXY;
    } else {
      process.env.OPENCODE_GEMINI_AUTH_PROXY = originalProxy;
    }
  });

  it("passes through fetch options when no proxy is configured", async () => {
    delete process.env.OPENCODE_GEMINI_AUTH_PROXY;
    const fetchMock = mock(async () => new Response("ok"));
    (globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

    await geminiFetch("https://example.com", { method: "POST" });

    const firstCall = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, Record<string, unknown>];
    expect(firstCall[1]).toEqual({ method: "POST" });
  });

  it("adds Bun proxy option when configured", async () => {
    process.env.OPENCODE_GEMINI_AUTH_PROXY = "http://127.0.0.1:8080";
    const fetchMock = mock(async () => new Response("ok"));
    (globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

    await geminiFetch("https://example.com", { method: "POST" });

    const firstCall = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, Record<string, unknown>];
    expect(firstCall[1]).toEqual({
      method: "POST",
      proxy: "http://127.0.0.1:8080",
    });
  });
});
