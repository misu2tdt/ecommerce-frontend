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
  const isFormData = options.body instanceof FormData;
  if (options.body !== undefined && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  const requestInit = toRequestInit(options);
  const requestBody: BodyInit | undefined =
    options.body === undefined
      ? undefined
      : isFormData
        ? (options.body as FormData)
        : JSON.stringify(options.body);

  try {
    const response = await fetch(url, {
      ...requestInit,
      cache: options.cache ?? "no-store",
      headers,
      body: requestBody,
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
      "Service is temporarily unavailable. Please try again shortly.",
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
  if (error instanceof ApiError) {
    return error.status === 0 || error.status >= 500
      ? "Service is temporarily unavailable. Please try again shortly."
      : error.message;
  }
  return "Service is temporarily unavailable. Please try again shortly.";
}

function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!configured) {
    throw new ApiError(
      "Service is temporarily unavailable. Please try again shortly.",
      0,
    );
  }

  try {
    const url = new URL(configured);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    return url.toString().replace(/\/$/, "");
  } catch {
    throw new ApiError(
      "Service is temporarily unavailable. Please try again shortly.",
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
  const text = await response.text();
  if (!text.trim()) return undefined;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    if (!response.ok) return undefined;
    throw new ApiError(
      "Service is temporarily unavailable. Please try again shortly.",
      response.status,
    );
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(
      "Service is temporarily unavailable. Please try again shortly.",
      response.status,
    );
  }
}

function normalizeErrorMessage(payload: unknown, status: number): string {
  if (status >= 500) {
    return "Service is temporarily unavailable. Please try again shortly.";
  }
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
  return "Unable to complete the request. Please try again shortly.";
}
