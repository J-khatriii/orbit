import { cn } from "../../lib/cn.js";

const tones = {
  default: { box: "bg-surface ring-line", eyebrow: "text-ink-muted" },
  brand: { box: "bg-brand-50 ring-brand-100", eyebrow: "text-brand-700" },
  sage: { box: "bg-sage-50 ring-sage-100", eyebrow: "text-sage-700" },
  clay: { box: "bg-clay-50 ring-clay-100", eyebrow: "text-clay-700" },
};

const Card = ({ title, eyebrow, actions, tone = "default", className, children }) => {
  return (
    <section className={cn("rounded-card p-6 shadow-card ring-1", tones[tone].box, className)}>
      {(title || eyebrow || actions) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {eyebrow && (
              <p
                className={cn("text-xs font-medium tracking-wider uppercase", tones[tone].eyebrow)}
              >
                {eyebrow}
              </p>
            )}
            {title && <h2 className="text-lg font-medium text-ink">{title}</h2>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
};

export default Card;
