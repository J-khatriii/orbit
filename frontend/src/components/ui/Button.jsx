import { cn } from "../../lib/cn.js";
import Spinner from "./Spinner.jsx";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-control font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:pointer-events-none disabled:opacity-50";

const variants = {
  primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-700",
  secondary: "bg-surface text-ink ring-1 ring-line hover:bg-sunken",
  danger: "bg-clay-600 text-white shadow-sm hover:bg-clay-700",
  ghost: "text-ink-soft hover:bg-sunken hover:text-ink",
};

const sizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

const Button = ({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon: Icon,
  type = "button",
  className,
  children,
  ...props
}) => {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading ? <Spinner /> : Icon && <Icon className="size-4" aria-hidden="true" />}
      {children}
    </button>
  );
};

export default Button;
