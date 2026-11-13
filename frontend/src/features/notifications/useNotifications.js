import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { notificationsApi } from "./notificationsApi.js";

export const notificationsKey = (workspaceId) => {
  return ["workspaces", workspaceId, "notifications"];
};

// The badge number. It checks again every 30 seconds, and when you return to the tab.
export const useUnreadCount = (workspaceId) => {
  return useQuery({
    queryKey: [...notificationsKey(workspaceId), "unread"],
    queryFn: () => {
      return notificationsApi.unread(workspaceId);
    },
    enabled: Boolean(workspaceId),
    refetchInterval: 30000,
    select: (data) => {
      return data.unread;
    },
  });
};

export const useNotificationList = (workspaceId, view) => {
  return useInfiniteQuery({
    queryKey: [...notificationsKey(workspaceId), "list", view],
    queryFn: ({ pageParam }) => {
      return notificationsApi.list(workspaceId, view, pageParam);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.page * lastPage.pageSize < lastPage.total ? lastPage.page + 1 : undefined;
    },
    enabled: Boolean(workspaceId),
    // New ones arriving while you page can repeat an item, so repeats are dropped.
    select: (data) => {
      const seen = new Set();

      return data.pages
        .flatMap((page) => {
          return page.notifications;
        })
        .filter((notification) => {
          if (seen.has(notification.id)) {
            return false;
          }

          seen.add(notification.id);

          return true;
        });
    },
  });
};
