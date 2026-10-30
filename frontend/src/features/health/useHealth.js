import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api.js";

export const useServerHealth = () => {
  return useQuery({
    queryKey: ["health", "server"],
    queryFn: () => {
      return api.get("/health");
    },
    refetchInterval: 30_000,
  });
};

export const useDatabaseHealth = () => {
  return useQuery({
    queryKey: ["health", "database"],
    queryFn: () => {
      return api.get("/health/db");
    },
    refetchInterval: 30_000,
  });
};
