import { cn } from "../../lib/cn.js";

const OrbitLogo = ({ className }) => {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-brand-600", className)}>
      <svg
        viewBox="0 0 32 32"
        className="size-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="15" cy="17" r="9" />
        <circle cx="15" cy="17" r="3.2" />
        <circle cx="25.5" cy="7" r="2.4" fill="currentColor" stroke="none" />
      </svg>
      <span className="font-display text-3xl leading-none text-ink">orbit</span>
    </span>
  );
};

export default OrbitLogo;
