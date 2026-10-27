import { cn } from "../../lib/cn.js";

const tones = {
  brand: "bg-brand-600",
  sage: "bg-sage-600",
  clay: "bg-clay-600",
};

const ProgressBar = ({ value, tone = "brand", label, className }) => {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-sunken", className)}
    >
      <div
        className={cn("h-full rounded-full transition-all", tones[tone])}
        style={{ width: `${value}%` }}
      />
    </div>
  );
};
export default ProgressBar;
