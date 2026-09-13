export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    readonly body: string,
  ) {
    super(`HTTP ${status} from ${new URL(url).host}: ${body.slice(0, 200)}`);
  }
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface FetchJsonOptions {
  method?: "GET" | "POST";
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  /** Retries on network errors, 429 and 5xx. */
  retries?: number;
}

export async function fetchJson<T = unknown>(url: string, opts: FetchJsonOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, timeoutMs = 20_000, retries = 2 } = opts;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json", ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await res.text();
      if (!res.ok) throw new HttpError(res.status, url, text);
      return JSON.parse(text) as T;
    } catch (err) {
      lastError = err;
      const retryable = !(err instanceof HttpError) || err.status === 429 || err.status >= 500;
      if (!retryable || attempt === retries) break;
      await sleep(1_000 * 2 ** attempt + Math.random() * 500);
    }
  }
  throw lastError;
}
