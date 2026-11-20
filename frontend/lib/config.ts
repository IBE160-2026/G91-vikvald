"use client";

// The config hook: what the backend says about demo mode and the feature switches.
import { queryOptions, useQuery } from "@tanstack/react-query";

import { apiFetch } from "./api";

export type AppConfig = {
  demo_mode: boolean;
  feature_mnemonics: boolean;
  feature_freetext: boolean;
  feature_summary: boolean;
};

export function fetchConfig(): Promise<AppConfig> {
  return apiFetch<AppConfig>("/api/config");
}

// Settings only change when the backend restarts, so the answer never goes stale.
export const configQueryOptions = queryOptions({
  queryKey: ["config"],
  queryFn: fetchConfig,
  staleTime: Infinity,
});

export function useAppConfig() {
  return useQuery(configQueryOptions);
}
