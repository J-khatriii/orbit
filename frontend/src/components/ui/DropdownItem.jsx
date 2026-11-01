import { cn } from "../../lib/cn.js";

// One clickable row inside a Dropdown.
const DropdownItem = ({ icon: Icon, tone = "default", className, children, ...props }) => {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left text-sm transition-colors hover:bg-sunken disabled:pointer-events-none disabled:opacity-50",
        tone === "danger" ? "text-clay-700" : "text-ink",
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
      {children}
    </button>
  );
};

export default DropdownItem;
