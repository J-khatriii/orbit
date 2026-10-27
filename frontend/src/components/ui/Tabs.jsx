import { cn } from "../../lib/cn.js";

const Tabs = ({ items, value, onChange, className }) => {
  return (
    <div role="tablist" className={cn("flex items-center gap-6 border-b border-line", className)}>
      {items.map((item) => {
        const active = item.id === value;

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              return onChange(item.id);
            }}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 pb-3 text-sm transition-colors",
              active
                ? "border-brand-600 font-medium text-brand-700"
                : "border-transparent text-ink-soft hover:text-ink",
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={cn("text-xs", active ? "text-brand-600" : "text-ink-muted")}>
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
