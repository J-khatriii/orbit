const AuthCard = ({ title, subtitle, footer, children }) => {
  return (
    <>
      <section className="rounded-card bg-surface p-8 shadow-card ring-1 ring-line">
        <h1 className="font-display text-3xl leading-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-ink-soft">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </section>
      {footer && <p className="mt-6 text-center text-sm text-ink-soft">{footer}</p>}
    </>
  );
};

export default AuthCard;
