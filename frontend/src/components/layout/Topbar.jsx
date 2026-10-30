import { useMatches } from "react-router";
import { Bell, Search } from "lucide-react";
import { useToast } from "../ui/index.js";
import OrbitLogo from "./OrbitLogo.jsx";
import { useAuth } from "../../features/auth/authContext.js";

const Topbar = () => {
  const matches = useMatches();
  const toast = useToast();
  const { activeWorkspace } = useAuth();

  const title = matches.findLast((match) => {
    match.handle?.title;
  })?.handle.title;

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-line bg-canvas/80 px-6 backdrop-blur md:px-10">
      <div className="flex items-center gap-4">
        <OrbitLogo className="md:hidden" />
        <nav aria-label="Breadcrumb" className="hidden items-center gap-2 text-sm md:flex">
          <span className="text-ink-muted">{activeWorkspace?.name ?? "Workspace"}</span>
          {title && (
            <>
              <span className="text-ink-muted/60">/</span>
              <span className="font-medium text-ink">{title}</span>
            </>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            return toast.show("Search arrives in Phase 8");
          }}
          className="hidden h-9 items-center gap-2 rounded-control px-3 text-sm text-ink-muted transition-colors hover:bg-sunken sm:flex"
        >
          <Search className="size-4" aria-hidden="true" />
          Search anything
          <kbd className="rounded-md bg-sunken px-1.5 py-0.5 font-sans text-xs">⌘ K</kbd>
        </button>
        <button
          type="button"
          aria-label="Notifications"
          onClick={() => {
            return toast.show("Notifications arrive in Phase 5");
          }}
          className="grid size-9 place-items-center rounded-control text-ink-soft transition-colors hover:bg-sunken"
        >
          <Bell className="size-5" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
};

export default Topbar;
