import { useId } from "react";
import { cn } from "../../lib/cn.js";

const Select = ({ label, error, hint, className, id, children, ...props }) => {
  const autoId = useId();
  const selectId = id ?? autoId;
  const messageId = error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <select
        id={selectId}
        aria-invalid={Boolean(error)}
        aria-describedby={messageId}
        className={cn(
          "block h-10 w-full rounded-control border bg-surface px-3 text-sm text-ink transition-colors focus:ring-2 focus:outline-none disabled:bg-sunken disabled:text-ink-muted",
          error
            ? "border-clay-500 focus:ring-clay-500/20"
            : "border-line focus:border-brand-500 focus:ring-brand-500/20",
        )}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={messageId} className="mt-1.5 text-sm text-clay-600">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={messageId} className="mt-1.5 text-sm text-ink-muted">
          {hint}
        </p>
      )}
    </div>
  );
};

export default Select;
