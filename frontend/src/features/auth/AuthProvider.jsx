import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { ApiError } from "../../lib/api.js";
import { authApi } from "./authApi.js";
import { AuthContext } from "./authContext.js";
import { ME_QUERY_KEY } from "./queryKeys.js";

const STORAGE_KEY = "orbit.workspaceId";

// Browser storage can be missing or blocked (private windows), so every use is guarded.
const readStoredWorkspaceId = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const writeStoredWorkspaceId = (id) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Not saving the choice is fine: we fall back to the first workspace.
  }
};

// Being signed out is a normal answer, not a failure, so a 401 becomes null.
const fetchMe = async () => {
  try {
    return await authApi.me();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
};

export const AuthProvider = ({ children }) => {
  const query = useQuery({ queryKey: ME_QUERY_KEY, queryFn: fetchMe, staleTime: 60_000 });
  const [storedWorkspaceId, setStoredWorkspaceId] = useState(readStoredWorkspaceId);

  const setActiveWorkspaceId = useCallback((id) => {
    writeStoredWorkspaceId(id);
    setStoredWorkspaceId(id);
  }, []);

  const value = useMemo(() => {
    const data = query.data ?? null;
    let status = "loading";

    // If we already have an answer, a failed re-check (a network blip) doesn't throw it away.
    if (query.data !== undefined) {
      status = data ? "signedIn" : "signedOut";
    } else if (query.isError) {
      status = "error";
    }

    const workspaces = data?.workspaces ?? [];
    const activeWorkspace =
      workspaces.find((workspace) => {
        return workspace.id === storedWorkspaceId;
      }) ??
      workspaces[0] ??
      null;

    return {
      status,
      user: data?.user ?? null,
      workspaces,
      activeWorkspace,
      setActiveWorkspaceId,
      refetch: query.refetch,
    };
  }, [query.data, query.isError, query.refetch, storedWorkspaceId, setActiveWorkspaceId]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
