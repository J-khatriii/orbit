import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { chronological } from "../messages/messages.js";
import { portalApi } from "./portalApi.js";

export const portalKey = (workspaceId) => {
  return ["workspaces", workspaceId, "portal"];
};

export const usePortalProjects = (workspaceId, enabled = true) => {
  return useQuery({
    queryKey: [...portalKey(workspaceId), "projects"],
    queryFn: () => {
      return portalApi.projects(workspaceId);
    },
    enabled: Boolean(workspaceId) && enabled,
    select: (data) => {
      return data.projects;
    },
  });
};

export const usePortalProject = (workspaceId, projectId, enabled = true) => {
  return useQuery({
    queryKey: [...portalKey(workspaceId), "project", projectId],
    queryFn: () => {
      return portalApi.project(workspaceId, projectId);
    },
    enabled: Boolean(workspaceId) && enabled,
  });
};

export const usePortalClients = (workspaceId, enabled = true) => {
  return useQuery({
    queryKey: [...portalKey(workspaceId), "clients"],
    queryFn: () => {
      return portalApi.clients(workspaceId);
    },
    enabled: Boolean(workspaceId) && enabled,
    select: (data) => {
      return data.clients;
    },
  });
};

export const useClientMessages = (workspaceId, clientId, enabled = true) => {
  return useInfiniteQuery({
    queryKey: [...portalKey(workspaceId), "messages", clientId],
    queryFn: ({ pageParam }) => {
      return portalApi.messages(workspaceId, clientId, pageParam);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.page * lastPage.pageSize < lastPage.total ? lastPage.page + 1 : undefined;
    },
    enabled: Boolean(workspaceId) && Boolean(clientId) && enabled,
    select: (data) => {
      return chronological(data.pages);
    },
  });
};
