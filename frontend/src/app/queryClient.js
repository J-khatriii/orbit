import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "../lib/api.js";

// Retrying only helps when the server might have had a hiccup. A 401 or 400 will fail
// the same way every time, so we don't retry those.
const shouldRetry = (failureCount, error) => {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }

  return failureCount < 1;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: shouldRetry,
    },
    mutations: {
      retry: false,
    },
  },
});
