export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const api = async (path, { method = "GET", body, signal } = {}) => {
  const res = await fetch(`/api/v1${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
    signal,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // Empty or non-JSON body: leave data as null.
  }

  if (!res.ok) {
    const err = data?.error;
    throw new ApiError(
      res.status,
      err?.code ?? "UNKNOWN_ERROR",
      err?.message ?? res.statusText,
      err?.details,
    );
  }

  return data;
};
