import { cn } from "../../lib/cn.js";

// The row of tabs under the client's name. Each tab is {id, label}.
const ClientTabs = ({ tabs, current, onChange }) => {
  return (
    <div
      role="tablist"
      aria-label="Client sections"
      className="flex gap-1 overflow-x-auto border-b border-line"
    >
      {tabs.map((tab) => {
        const selected = tab.id === current;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            onClick={() => {
              onChange(tab.id);
            }}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm transition-colors",
              selected
                ? "border-brand-600 font-medium text-ink"
                : "border-transparent text-ink-soft hover:text-ink",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default ClientTabs;
