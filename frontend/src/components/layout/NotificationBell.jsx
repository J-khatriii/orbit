import { Link } from "react-router";
import { Bell } from "lucide-react";
import { useAuth } from "../../features/auth/authContext.js";
import { useUnreadCount } from "../../features/notifications/useNotifications.js";

const NotificationBell = () => {
  const { activeWorkspace } = useAuth();
  const unread = useUnreadCount(activeWorkspace?.id).data ?? 0;
  const label = unread > 0 ? `Notifications, ${unread} unread` : "Notifications";

  return (
    <Link
      to="/notifications"
      aria-label={label}
      className="relative grid size-9 place-items-center rounded-control text-ink-soft transition-colors hover:bg-sunken"
    >
      <Bell className="size-5" aria-hidden="true" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-brand-500 px-1 text-[10px] leading-4 font-medium text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
};

export default NotificationBell;
