import { NavLink } from "react-router";
import {
  CircleCheck,
  CircleHelp,
  Columns3,
  ClipboardList,
  Folder,
  LayoutGrid,
  MessagesSquare,
  Receipt,
  Users,
  UsersRound,
  ListChecks,
} from "lucide-react";
import { useToast } from "../ui/index.js";
import { cn } from "../../lib/cn.js";
import AccountMenu from "./AccountMenu.jsx";
import OrbitLogo from "./OrbitLogo.jsx";
import WorkspaceSwitcher from "./WorkspaceSwitcher.jsx";
import { useAuth } from "../../features/auth/authContext.js";

// Items without `to` are not built yet. `phase` says when they arrive.
const NAV = [
  { label: "Overview", to: "/", icon: LayoutGrid },
  { label: "Team", to: "/team", icon: UsersRound, hideFor: ["client"] },
  { label: "Clients", to: "/clients", icon: Users, hideFor: ["client"] },
  { label: "Projects", to: "/projects", icon: Columns3, hideFor: ["client"] },
  { label: "My tasks", to: "/my-tasks", icon: ListChecks, hideFor: ["client"] },
  { label: "Activity", icon: MessagesSquare, phase: 5 },
  { label: "Files", icon: Folder, phase: 6 },
  { label: "Approvals", icon: CircleCheck, phase: 6 },
  { label: "Invoices", icon: Receipt, phase: 7 },
  { label: "Templates", to: "/templates", icon: ClipboardList, hideFor: ["client"] },
];

const itemBase = "flex items-center gap-3 rounded-control px-3 py-2.5 text-sm transition-colors";

const NavItem = ({ item, onNavigate }) => {
  const Icon = item.icon;

  if (!item.to) {
    return (
      <span
        aria-disabled="true"
        title={`Coming in Phase ${item.phase}`}
        className={cn(itemBase, "cursor-not-allowed text-ink-muted")}
      >
        <Icon className="size-5" aria-hidden="true" />
        {item.label}
        <span className="ml-auto text-xs">Soon</span>
      </span>
    );
  }

  return (
    <NavLink
      to={item.to}
      end
      onClick={onNavigate}
      className={({ isActive }) => {
        return cn(
          itemBase,
          isActive
            ? "bg-brand-50 font-medium text-brand-700"
            : "text-ink-soft hover:bg-sunken hover:text-ink",
        );
      }}
    >
      <Icon className="size-5" aria-hidden="true" />
      {item.label}
    </NavLink>
  );
};

// Everything that lives in the sidebar. The desktop sidebar and the mobile menu both show this.
// `onNavigate` lets the mobile menu close itself after the person picks something.
const SidebarContent = ({ onNavigate }) => {
  const toast = useToast();

  const { activeWorkspace } = useAuth();
  const role = activeWorkspace?.role;

  return (
    <>
      <OrbitLogo className="px-2" />

      <WorkspaceSwitcher onSelect={onNavigate} />

      <nav aria-label="Main" className="mt-6 flex flex-col gap-1">
        {NAV.filter((item) => {
          return !item.hideFor?.includes(role);
        }).map((item) => {
          return <NavItem key={item.label} item={item} onNavigate={onNavigate} />;
        })}
      </nav>

      <div className="mt-auto">
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            toast.show("Help and guides arrive in Phase 11");
          }}
          className={cn(itemBase, "w-full text-ink-soft hover:bg-sunken hover:text-ink")}
        >
          <CircleHelp className="size-5" aria-hidden="true" />A little help?
        </button>

        <div className="my-3 border-t border-line" />

        <AccountMenu />
      </div>
    </>
  );
};

export default SidebarContent;
