import type { ButtonHTMLAttributes, ReactNode } from "react";

const paths = {
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  close: "M6 6l12 12M18 6L6 18",
  info: "M12 11v6M12 7.5v.5",
  alert: "M12 8v5M12 16.5v.5",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
};

/** Authored line icons, one stroke weight. Decorative unless labelled by the parent. */
export function Icon({ name, className = "size-5" }: { name: keyof typeof paths; className?: string }) {
  const ring = name === "info" || name === "alert";
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {ring && <circle cx="12" cy="12" r="9" />}
      <path d={paths[name]} />
    </svg>
  );
}

type Variant = "primary" | "secondary" | "quiet";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-on-brand font-semibold hover:brightness-95 active:brightness-90",
  secondary: "bg-surface text-ink border border-control hover:bg-sunken",
  quiet: "text-brand-ink hover:bg-brand-soft underline-offset-4",
};

export function Button({ variant = "secondary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-base transition-[filter,background-color] duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  );
}

export function IconButton({ label, icon, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: keyof typeof paths }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-control bg-surface text-ink hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      <Icon name={icon} />
    </button>
  );
}

export function Notice({ tone = "neutral", title, children }: { tone?: "neutral" | "warn" | "danger"; title: string; children?: ReactNode }) {
  const tones = {
    neutral: "border-line bg-surface",
    warn: "border-brand bg-brand-soft",
    danger: "border-danger bg-danger-soft",
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`} role={tone === "danger" ? "alert" : undefined}>
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1 text-muted">{children}</div>}
    </div>
  );
}

export function Section({ title, action, children, id }: { title: string; action?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id} className="mt-8 first:mt-0">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 id={id} className="text-lg font-bold text-balance">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
