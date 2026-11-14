import { useState } from "react";
import { useNavigate } from "react-router";
import { Button, Spinner } from "../components/ui/index.js";
import { useAuth } from "../features/auth/authContext.js";
import { describeNotification } from "../features/notifications/describe.js";
import { useMarkRead } from "../features/notifications/useMarkRead.js";
import { useNotificationList, useUnreadCount } from "../features/notifications/useNotifications.js";
import { timeAgo } from "../lib/timeAgo.js";

const VIEWS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
];

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { activeWorkspace } = useAuth();
  const workspaceId = activeWorkspace?.id;
  const role = activeWorkspace?.role;
  const [view, setView] = useState("all");
  const list = useNotificationList(workspaceId, view);
  const unread = useUnreadCount(workspaceId).data ?? 0;
  const markRead = useMarkRead();
  const items = list.data ?? [];

  const open = (notification) => {
    const { to } = describeNotification(notification, role);

    if (!notification.read) {
      markRead.mutate({ workspaceId, input: { ids: [notification.id] } });
    }

    navigate(to);
  };

  const markAll = () => {
    markRead.mutate({ workspaceId, input: { all: true } });
  };

  const renderList = () => {
    if (list.isPending) {
      return (
        <div role="status" className="flex justify-center py-16 text-ink-muted">
          <Spinner className="size-6" />
          <span className="sr-only">Loading</span>
        </div>
      );
    }
    if (list.isError) {
      return (
        <div className="rounded-card bg-surface px-6 py-8 shadow-card ring-1 ring-line">
          <p className="mb-3 text-sm text-clay-700">{list.error.message}</p>
          <Button
            variant="secondary"
            onClick={() => {
              list.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      );
    }
    if (items.length === 0) {
      return (
        <div className="rounded-card bg-surface px-6 py-16 text-center shadow-card ring-1 ring-line">
          <h2 className="font-display text-2xl text-ink">
            {view === "unread" ? "You're all caught up." : "Nothing yet."}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
            {view === "unread"
              ? "New messages and reviews will show up here."
              : "Messages and reviews that need you will appear here."}
          </p>
        </div>
      );
    }

    return (
      <>
        <ul className="divide-y divide-line rounded-card bg-surface shadow-card ring-1 ring-line">
          {items.map((notification) => {
            const { text } = describeNotification(notification, role);

            return (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => {
                    open(notification);
                  }}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-sunken focus:outline-none focus-visible:bg-sunken"
                >
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${notification.read ? "bg-transparent" : "bg-brand-500"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm wrap-break-word ${notification.read ? "text-ink-soft" : "font-medium text-ink"}`}
                    >
                      {text}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-muted">
                      {timeAgo(notification.createdAt)}
                      {notification.read ? "" : " · Unread"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {list.hasNextPage && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="secondary"
              loading={list.isFetchingNextPage}
              onClick={() => {
                list.fetchNextPage();
              }}
            >
              Load more
            </Button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">Notifications</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={unread === 0}
          loading={markRead.isPending}
          onClick={markAll}
        >
          Mark all as read
        </Button>
      </div>

      <div className="flex gap-2" role="group" aria-label="Show">
        {VIEWS.map((option) => {
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={view === option.id}
              onClick={() => {
                setView(option.id);
              }}
              className={`rounded-full px-3.5 py-1.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                view === option.id ? "bg-ink text-canvas" : "bg-sunken text-ink-soft hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {renderList()}
    </div>
  );
};

export default NotificationsPage;
