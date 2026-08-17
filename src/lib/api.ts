type QueryValue = string | number | boolean | null | undefined;

export type ApiQuery = Record<string, QueryValue | readonly QueryValue[]>;

export interface ApiRequestOptions
  extends Omit<RequestInit, "body" | "headers"> {
  query?: ApiQuery;
  token?: string;
  body?: unknown;
  headers?: HeadersInit;
}

interface BackendErrorBody {
  message?: string | string[];
  error?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = new URL(path.replace(/^\//, ""), `${baseUrl}/`);
  appendQuery(url, options.query);

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const requestInit = toRequestInit(options);

  try {
    const response = await fetch(url, {
      ...requestInit,
      cache: options.cache ?? "no-store",
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const payload = await readJson(response);

    if (!response.ok) {
      throw new ApiError(
        normalizeErrorMessage(payload, response.status),
        response.status,
      );
    }
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "Unable to reach the catalog service. Check that the backend is running.",
      0,
    );
  }
}

function toRequestInit(options: ApiRequestOptions): RequestInit {
  const { query, token, body, headers, ...requestInit } = options;
  void query;
  void token;
  void body;
  void headers;
  return requestInit;
}

export function apiErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : "An unexpected catalog error occurred.";
}

function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!configured) {
    throw new ApiError("NEXT_PUBLIC_API_BASE_URL is not configured.", 0);
  }

  try {
    const url = new URL(configured);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    return url.toString().replace(/\/$/, "");
  } catch {
    throw new ApiError(
      "NEXT_PUBLIC_API_BASE_URL must be a valid HTTP(S) URL.",
      0,
    );
  }
}

function appendQuery(url: URL, query: ApiQuery | undefined): void {
  if (!query) return;
  for (const [key, rawValue] of Object.entries(query)) {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    }
  }
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    if (!response.ok) return undefined;
    throw new ApiError(
      "The catalog service returned an invalid response.",
      response.status,
    );
  }
  try {
    return await response.json();
  } catch {
    throw new ApiError(
      "The catalog service returned invalid JSON.",
      response.status,
    );
  }
}

function normalizeErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === "object" && payload !== null) {
    const body = payload as BackendErrorBody;
    if (Array.isArray(body.message) && body.message.length > 0) {
      return body.message.join(" ");
    }
    if (typeof body.message === "string" && body.message.trim()) {
      return body.message;
    }
    if (typeof body.error === "string" && body.error.trim()) {
      return body.error;
    }
  }
  return `Catalog request failed with status ${status}.`;
}
