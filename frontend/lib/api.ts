// The one fetch transport for calls to the backend (/api/*).
// Error responses are turned into an ApiError with the code and details from
// the shared error format {"error": {"code", "details"}}.

export type ErrorDetails = Record<string, unknown>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ErrorDetails;

  constructor(status: number, code: string, details: ErrorDetails = {}) {
    super(`API error ${status} ${code}`);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && isRecord(body.error) && typeof body.error.code === "string") {
      const details = isRecord(body.error.details) ? body.error.details : {};
      return new ApiError(response.status, body.error.code, details);
    }
  } catch {
    // Not JSON (e.g. an HTML error page from a proxy): handled below.
  }
  return new ApiError(response.status, "INTERNAL_ERROR");
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  // String bodies are JSON (JSON.stringify) unless the caller says otherwise.
  if (typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(path, { ...init, headers, credentials: "same-origin" });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR");
  }

  if (!response.ok) {
    throw await toApiError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(response.status, "INTERNAL_ERROR");
  }
}
