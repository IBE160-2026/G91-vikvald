import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { ApiError, isUnauthenticated } from "./api";

export const MAX_RETRIES = 3;

// 4xx answers (NOT_FOUND, FEATURE_DISABLED, VALIDATION_ERROR, ...) will not change
// on a new try, so they are shown at once. Network and server errors are retried.
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status <= 499) {
    return false;
  }
  return failureCount < MAX_RETRIES;
}

// Every 401 UNAUTHENTICATED, from any query or mutation in the app, goes to the
// one function `onUnauthenticated`. Pages never handle a lost login themselves.
//
// It runs once per lost login. `onUnauthenticated` empties the cache while the
// page that asked is still on screen, so its query starts again, gets 401 again,
// and would empty the cache again in a loop until the page is gone. Later 401s
// are therefore ignored until a query succeeds again (/me after the next login).
export function makeQueryClient(onUnauthenticated?: () => void): QueryClient {
  let handled = false;
  const onError = (error: unknown) => {
    if (!isUnauthenticated(error) || handled) return;
    handled = true;
    onUnauthenticated?.();
  };
  const onSuccess = () => {
    handled = false;
  };
  return new QueryClient({
    queryCache: new QueryCache({ onError, onSuccess }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: { queries: { retry: shouldRetry } },
  });
}
