import { useNavigate } from "react-router";
import { Check, ChevronsUpDown } from "lucide-react";
import { Avatar, Dropdown, DropdownItem } from "../ui/index.js";
import { useAuth } from "../../features/auth/authContext.js";
import { ROLE_LABELS } from "../../features/auth/roles.js";

const WorkspaceSwitcher = () => {
  const { workspaces, activeWorkspace, setActiveWorkspaceId } = useAuth();
  const navigate = useNavigate();
  const name = activeWorkspace?.name ?? "No workspace";

  return (
    <Dropdown
      fullWidth
      className="mt-6"
      renderTrigger={({ open, toggle, ref }) => {
        return (
          <button
            ref={ref}
            type="button"
            aria-haspopup="true"
            aria-expanded={open}
            onClick={toggle}
            className="flex w-full items-center gap-3 rounded-control bg-surface px-3 py-2.5 text-left shadow-card ring-1 ring-line transition-colors hover:bg-canvas"
          >
            <Avatar name={name} size="sm" tone="ink" square />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
            <ChevronsUpDown className="size-4 text-ink-muted" aria-hidden="true" />
          </button>
        );
      }}
    >
      {({ close }) => {
        return (
          <>
            <p className="px-3 pt-2 pb-1.5 text-xs font-medium tracking-wider text-ink-muted uppercase">
              Your workspaces
            </p>
            {workspaces.map((workspace) => {
              return (
                <DropdownItem
                  key={workspace.id}
                  onClick={() => {
                    setActiveWorkspaceId(workspace.id);
                    close();
                    // Back to the overview, so you never land on a page from the old workspace.
                    navigate("/");
                  }}
                >
                  <Avatar name={workspace.name} size="sm" tone="ink" square />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{workspace.name}</span>
                    <span className="block text-xs text-ink-muted">
                      {ROLE_LABELS[workspace.role]}
                    </span>
                  </span>
                  {workspace.id === activeWorkspace?.id && (
                    <Check
                      className="size-4 shrink-0 text-brand-600"
                      aria-label="Current workspace"
                    />
                  )}
                </DropdownItem>
              );
            })}
            {workspaces.length === 1 && (
              <p className="px-3 py-2 text-xs text-ink-muted">
                Invited to another workspace? It will show up here.
              </p>
            )}
          </>
        );
      }}
    </Dropdown>
  );
};

export default WorkspaceSwitcher;
