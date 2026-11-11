// One fetch wrapper for the whole app. Requests go to /api/... on our own origin
// (Next rewrites them to FastAPI), so the HttpOnly session cookie rides along.

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export async function api<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = init;
  const finalHeaders = new Headers(headers);
  if (json !== undefined) finalHeaders.set("Content-Type", "application/json");

  let res: Response;
  try {
    res = await fetch(path, {
      ...rest,
      headers: finalHeaders,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, "network_error", "Could not reach the server. Please try again.");
  }

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = body?.error;
    throw new ApiError(
      res.status,
      err?.code ?? "unknown_error",
      err?.message ?? "Something went wrong. Please try again.",
      err?.fields,
    );
  }
  return body as T;
}
