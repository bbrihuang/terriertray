import type { ButtonHTMLAttributes, ReactNode } from "react";

const paths = {
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  close: "M6 6l12 12M18 6L6 18",
  info: "M12 11v6M12 7.5v.5",
  alert: "M12 8v5M12 16.5v.5",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  // Meal periods
  sunrise: "M12 3v3M5.6 7.6l1.8 1.8M18.4 7.6l-1.8 1.8M3 16h18M7.5 16a4.5 4.5 0 0 1 9 0M6 20h12",
  cup: "M5 9h11v4.5A5.5 5.5 0 0 1 10.5 19h0A5.5 5.5 0 0 1 5 13.5V9zM16 11h1.5a2.5 2.5 0 0 1 0 5H16M8.5 3.5v2.5M12.5 3.5v2.5",
  sun: "M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4",
  moon: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z",
};

/** Authored line icons, one stroke weight. Decorative unless labelled by the parent. */
export function Icon({ name, className = "size-5" }: { name: keyof typeof paths; className?: string }) {
  const ring = name === "info" || name === "alert";
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {ring && <circle cx="12" cy="12" r="9" />}
      {name === "sun" && <circle cx="12" cy="12" r="4" />}
      <path d={paths[name]} />
    </svg>
  );
}

export type IconName = keyof typeof paths;

type Variant = "primary" | "secondary" | "quiet";

const variants: Record<Variant, string> = {
  // Red identifies the primary action.
  primary: "bg-action text-on-action font-semibold hover:brightness-125 dark:hover:brightness-95",
  secondary: "bg-field text-ink font-semibold border border-rim shadow-[var(--shadow)] hover:bg-surface-solid",
  quiet: "text-brand-ink font-semibold hover:bg-brand-soft",
};

export function Button({ variant = "secondary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`press inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-base disabled:cursor-not-allowed disabled:opacity-45 ${variants[variant]} ${className}`}
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
      className={`press inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-rim bg-field text-ink shadow-[var(--shadow)] hover:bg-surface-solid disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      <Icon name={icon} />
    </button>
  );
}

const tones = {
  neutral: "glass",
  warn: "rounded-[var(--radius-card)] border border-warn/25 bg-warn-soft",
  danger: "rounded-[var(--radius-card)] border border-danger/30 bg-danger-soft",
};

export function Notice({ tone = "neutral", title, children }: { tone?: keyof typeof tones; title: string; children?: ReactNode }) {
  return (
    <div className={`p-4 ${tones[tone]}`} role={tone === "danger" ? "alert" : undefined}>
      <p className={`font-semibold ${tone === "warn" ? "text-warn" : tone === "danger" ? "text-danger" : ""}`}>{title}</p>
      {children && <div className="mt-1 text-ink">{children}</div>}
    </div>
  );
}

/** Small tinted status pill: dot + words, never colour alone. */
export function Pill({ tone = "neutral", children }: { tone?: "neutral" | "ok" | "warn" | "danger"; children: ReactNode }) {
  const t = {
    neutral: "bg-sunken text-ink",
    ok: "bg-ok-soft text-ok",
    warn: "bg-warn-soft text-warn",
    danger: "bg-danger-soft text-danger",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-semibold ${t}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}

/** Two-tone headline: a statement, then a quieter line in the same size. */
export function Headline({ id, statement, feeling, as: Tag = "h2" }: { id?: string; statement: ReactNode; feeling: ReactNode; as?: "h1" | "h2" }) {
  return (
    <Tag id={id} className="text-[1.6875rem] leading-[1.15] font-medium tracking-[-0.02em] text-balance lg:text-[2.5rem]">
      <span className="block">{statement}</span>
      <span className="block text-muted">{feeling}</span>
    </Tag>
  );
}

export function Section({ title, action, children, id, card = false }: { title: string; action?: ReactNode; children: ReactNode; id?: string; card?: boolean }) {
  return (
    <section aria-labelledby={id} className="mt-8 first:mt-0">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h3 id={id} className="text-lg font-semibold tracking-[-0.01em] text-balance">
          {title}
        </h3>
        {action}
      </div>
      {card ? <div className="glass p-5">{children}</div> : children}
    </section>
  );
}
