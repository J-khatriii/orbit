import { useInfiniteQuery } from "@tanstack/react-query";
import { chronological } from "./messages.js";
import { messagesApi } from "./messagesApi.js";

export const messagesKey = (workspaceId, clientId) => {
  return ["workspaces", workspaceId, "client-messages", clientId];
};

export const useMessages = (workspaceId, clientId, enabled = true) => {
  return useInfiniteQuery({
    queryKey: messagesKey(workspaceId, clientId),
    queryFn: ({ pageParam }) => {
      return messagesApi.list(workspaceId, clientId, pageParam);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.page * lastPage.pageSize < lastPage.total ? lastPage.page + 1 : undefined;
    },
    enabled: Boolean(workspaceId) && enabled,
    select: (data) => {
      return chronological(data.pages);
    },
  });
};
