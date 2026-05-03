type BunRequestInit = RequestInit & { proxy?: string };

export function geminiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const proxy = process.env.OPENCODE_GEMINI_AUTH_PROXY;
  if (!proxy) {
    return fetch(input, init);
  }

  return fetch(input, {
    ...(init ?? {}),
    proxy,
  } as BunRequestInit);
}
