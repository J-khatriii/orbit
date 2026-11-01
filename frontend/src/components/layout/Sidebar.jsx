import { NavLink } from "react-router";
import {
  CircleCheck,
  CircleHelp,
  Columns3,
  Folder,
  LayoutGrid,
  MessagesSquare,
  Receipt,
  Users,
} from "lucide-react";
import { useToast } from "../ui/index.js";
import { cn } from "../../lib/cn.js";
import AccountMenu from "./AccountMenu.jsx";
import OrbitLogo from "./OrbitLogo.jsx";
import WorkspaceSwitcher from "./WorkspaceSwitcher.jsx";

// Items without `to` are not built yet. `phase` says when they arrive.
const NAV = [
  { label: "Overview", to: "/", icon: LayoutGrid },
  { label: "Clients", icon: Users, phase: 3 },
  { label: "Projects", icon: Columns3, phase: 3 },
  { label: "Activity", icon: MessagesSquare, phase: 5 },
  { label: "Files", icon: Folder, phase: 6 },
  { label: "Approvals", icon: CircleCheck, phase: 6 },
  { label: "Invoices", icon: Receipt, phase: 7 },
];

const itemBase = "flex items-center gap-3 rounded-control px-3 py-2.5 text-sm transition-colors";

const NavItem = ({ item }) => {
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

const Sidebar = () => {
  const toast = useToast();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-sunken/60 px-4 py-6 md:flex">
      <OrbitLogo className="px-2" />

      <WorkspaceSwitcher />

      <nav aria-label="Main" className="mt-6 flex flex-col gap-1">
        {NAV.map((item) => {
          return <NavItem key={item.label} item={item} />;
        })}
      </nav>

      <div className="mt-auto">
        <button
          type="button"
          onClick={() => {
            toast.show("Help and guides arrive in Phase 11");
          }}
          className={cn(itemBase, "w-full text-ink-soft hover:bg-sunken hover:text-ink")}
        >
          <CircleHelp className="size-5" aria-hidden="true" />A little help?
        </button>

        <div className="my-3 border-t border-line" />

        <AccountMenu />
      </div>
    </aside>
  );
};

export default Sidebar;
