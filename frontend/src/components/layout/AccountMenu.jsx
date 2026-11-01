import { ChevronsUpDown, LogOut, Mail } from "lucide-react";
import { Avatar, Badge, Dropdown, DropdownItem, useToast } from "../ui/index.js";
import { useAuth } from "../../features/auth/authContext.js";
import { ROLE_LABELS } from "../../features/auth/roles.js";
import { useLogout, useResendVerification } from "../../features/auth/useAuthActions.js";

const AccountMenu = () => {
  const { user, activeWorkspace } = useAuth();
  const toast = useToast();
  const logout = useLogout();
  const resend = useResendVerification();

  // Signing out empties the cached "who am I", and the route guard then sends us to /login.
  const handleSignOut = () => {
    logout.mutate(undefined, {
      onError: (error) => {
        toast.show(error.message);
      },
    });
  };

  const handleResend = (close) => {
    close();
    resend.mutate(undefined, {
      onSuccess: () => {
        toast.show("We sent you a new confirmation link.");
      },
      onError: (error) => {
        toast.show(error.message);
      },
    });
  };

  return (
    <Dropdown
      fullWidth
      placement="top"
      renderTrigger={({ open, toggle, ref }) => {
        return (
          <button
            ref={ref}
            type="button"
            aria-haspopup="true"
            aria-expanded={open}
            onClick={toggle}
            className="flex w-full items-center gap-3 rounded-control px-3 py-2 text-left transition-colors hover:bg-sunken"
          >
            <Avatar name={user?.name ?? "?"} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{user?.name}</span>
              <span className="block truncate text-xs text-ink-muted">
                {ROLE_LABELS[activeWorkspace?.role] ?? ""}
              </span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
          </button>
        );
      }}
    >
      {({ close }) => {
        return (
          <>
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-medium text-ink">{user?.name}</p>
              <p className="truncate text-xs text-ink-muted">{user?.email}</p>
              <div className="mt-2">
                {user?.emailVerified ? (
                  <Badge tone="sage">Email confirmed</Badge>
                ) : (
                  <Badge tone="clay">Email not confirmed</Badge>
                )}
              </div>
            </div>
            <div className="my-1 border-t border-line" />
            {!user?.emailVerified && (
              <DropdownItem
                icon={Mail}
                disabled={resend.isPending}
                onClick={() => {
                  handleResend(close);
                }}
              >
                Resend confirmation email
              </DropdownItem>
            )}
            <DropdownItem
              icon={LogOut}
              tone="danger"
              disabled={logout.isPending}
              onClick={handleSignOut}
            >
              Sign out
            </DropdownItem>
          </>
        );
      }}
    </Dropdown>
  );
};

export default AccountMenu;
