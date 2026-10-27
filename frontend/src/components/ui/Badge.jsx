import { cn } from "../../lib/cn.js";

const tones = {
  neutral: { pill: "bg-sunken text-ink-soft", dot: "bg-ink-muted" },
  brand: { pill: "bg-brand-100 text-brand-700", dot: "bg-brand-600" },
  sage: { pill: "bg-sage-100 text-sage-700", dot: "bg-sage-600" },
  clay: { pill: "bg-clay-100 text-clay-700", dot: "bg-clay-600" },
};

const Badge = ({ tone = "neutral", dot = true, className, children }) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone].pill,
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", tones[tone].dot)} />}
      {children}
    </span>
  );
};

export default Badge;
