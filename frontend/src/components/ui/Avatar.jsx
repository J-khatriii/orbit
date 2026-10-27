import { cn } from "../../lib/cn.js";

const sizes = {
  sm: "size-7 text-xs",
  md: "size-9 text-sm",
  lg: "size-11 text-base",
};

const tones = {
  sage: "bg-sage-100 text-sage-700",
  brand: "bg-brand-100 text-brand-700",
  ink: "bg-ink text-surface",
};

const initialsOf = (name = "") => {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => {
      return part[0].toUpperCase();
    })
    .join("");
};

const Avatar = ({ name, size = "md", tone = "sage", square = false, className }) => {
  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-semibold select-none",
        square ? "rounded-lg" : "rounded-full",
        sizes[size],
        tones[tone],
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
};

export default Avatar;
