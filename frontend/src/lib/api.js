const BASE_URL = "/api/v1";

// Every failed request becomes one of these, so screens only handle one kind of error.
//   status:  the HTTP status (0 means the server couldn't be reached)
//   code:    our error code, e.g. "EMAIL_TAKEN" or "INVALID_CREDENTIALS"
//   details: for validation errors, { fields: { email: "message", ... } }
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const parseBody = async (response) => {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const request = async (method, path, body) => {
  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      // Sends and receives the httpOnly session cookie.
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Can't reach the server. Check your connection and try again.",
    );
  }

  const data = await parseBody(response);

  if (!response.ok) {
    const error = data?.error;

    throw new ApiError(
      response.status,
      error?.code ?? "UNKNOWN_ERROR",
      error?.message ?? "Something went wrong. Please try again.",
      error?.details,
    );
  }

  return data;
};

export const api = {
  get: (path) => {
    return request("GET", path);
  },
  post: (path, body) => {
    return request("POST", path, body);
  },
  patch: (path, body) => {
    return request("PATCH", path, body);
  },
  delete: (path) => {
    return request("DELETE", path);
  },
};

// For forms: the per-field messages from a validation error, or {} for anything else.
export const fieldErrorsOf = (error) => {
  return error instanceof ApiError ? (error.details?.fields ?? {}) : {};
};
