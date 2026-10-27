import { cn } from "../../lib/cn.js";

const hintTones = {
  muted: "text-ink-muted",
  sage: "text-sage-700",
  clay: "text-clay-600",
};

const StatCard = ({ label, value, hint, hintTone = "muted", icon: Icon }) => {
  return (
    <div className="rounded-card bg-surface p-5 shadow-card ring-1 ring-line">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">{label}</p>
          <p className="mt-2 font-display text-5xl leading-none text-ink">{value}</p>
        </div>
        {Icon && <Icon className="size-5 text-ink-muted" aria-hidden="true" />}
      </div>
      {hint && <p className={cn("mt-3 text-xs", hintTones[hintTone])}>{hint}</p>}
    </div>
  );
};

export default StatCard;
