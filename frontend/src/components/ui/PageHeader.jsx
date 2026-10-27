const PageHeader = ({ eyebrow, title, subtitle, actions }) => {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-medium tracking-wider text-ink-muted uppercase">{eyebrow}</p>
        )}
        <h1 className="mt-3 font-display text-5xl leading-[1.05] text-ink md:text-6xl">{title}</h1>
        {subtitle && <p className="mt-3 text-base text-ink-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </header>
  );
};

export default PageHeader;
