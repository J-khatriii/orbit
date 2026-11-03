import { Users } from "lucide-react";
import { Button } from "../ui/index.js";

// Two different situations, two different messages:
//   filtered: you searched or filtered and nothing matched
//   otherwise: this workspace has no clients yet (`action` is an optional button)
const ClientsEmpty = ({ filtered, onClear, action }) => {
  return (
    <div className="grid place-items-center rounded-card bg-surface px-6 py-16 text-center shadow-card ring-1 ring-line">
      <div className="flex max-w-sm flex-col items-center gap-3">
        <span className="grid size-12 place-items-center rounded-full bg-sunken text-ink-muted">
          <Users className="size-6" aria-hidden="true" />
        </span>
        {filtered ? (
          <>
            <h2 className="font-display text-2xl text-ink">No clients match.</h2>
            <p className="text-sm text-ink-soft">
              Try a different search, or clear the filters to see everyone.
            </p>
            <Button variant="secondary" onClick={onClear}>
              Clear filters
            </Button>
          </>
        ) : (
          <>
            <h2 className="font-display text-2xl text-ink">Your first client goes here.</h2>
            <p className="text-sm text-ink-soft">
              Clients are the companies and people you work for. Projects, files and invoices will
              all hang off them.
            </p>
            {action}
          </>
        )}
      </div>
    </div>
  );
};

export default ClientsEmpty;
