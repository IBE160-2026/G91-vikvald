import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "./api";

export const MAX_RETRIES = 3;

// 4xx answers (NOT_FOUND, FEATURE_DISABLED, VALIDATION_ERROR, ...) will not change
// on a new try, so they are shown at once. Network and server errors are retried.
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status <= 499) {
    return false;
  }
  return failureCount < MAX_RETRIES;
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } });
}
