import { NavLink } from "react-router";

const NAV = [
  { label: "Dashboard", to: "/" },
  { label: "Clients", phase: 3 },
  { label: "Projects", phase: 3 },
  { label: "Tasks", phase: 4 },
  { label: "Messages", phase: 5 },
  { label: "Files", phase: 6 },
  { label: "Invoices", phase: 7 },
];

const Sidebar = () => {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex h-14 items-center px-5 text-lg font-bold text-indigo-600">Orbit</div>
      <nav className="flex flex-col gap-1 px-3 py-2">
        {NAV.map((item) => {
          return item.to ? (
            <NavLink
              key={item.label}
              to={item.to}
              end
              className={({ isActive }) => {
                return `rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
                }`;
              }}
            >
              {item.label}
            </NavLink>
          ) : (
            <span
              key={item.label}
              className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-400"
            >
              {item.label}
              <span className="text-xs">Phase {item.phase}</span>
            </span>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
