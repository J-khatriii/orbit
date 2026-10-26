import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api.js";

export const useServerHealth = () => {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => {
      return api("/health");
    },
    refetchInterval: 15_000,
  });
};

export const useDatabaseHealth = () => {
  return useQuery({
    queryKey: ["health", "db"],
    queryFn: () => {
      return api("/health/db");
    },
    refetchInterval: 15_000,
  });
};
