import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

/* --------------------------------------------------------------- empty states */

export function EmptyState({
  children,
  tone = "muted",
  className,
}: {
  children: React.ReactNode;
  tone?: "muted" | "danger";
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "grid place-items-center px-6 py-16 text-center text-sm",
        tone === "danger" ? "text-red-600" : "text-zinc-400",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="card">
      <EmptyState>{children}</EmptyState>
    </div>
  );
}

/* --------------------------------------------------------------- cards */

export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={clsx("card", className)}>
      {title || action ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
          <h2 className="text-sm font-bold text-zinc-800">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className={clsx("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function StatCard({
  icon: Icon,
  value,
  label,
  badge,
  tone = "light",
  dot,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  badge?: string | number;
  tone?: "light" | "orange" | "slate";
  dot?: "green" | "red" | "orange";
}) {
  const tones = {
    light: "bg-white text-zinc-900 border-zinc-200",
    orange: "bg-amber-500 text-white border-amber-500",
    slate: "bg-zinc-600 text-white border-zinc-600",
  } as const;

  const iconTone = {
    light: "bg-zinc-100 text-zinc-500",
    orange: "bg-white/20 text-white",
    slate: "bg-white/15 text-white",
  } as const;

  const dotColor = { green: "bg-green-500", red: "bg-red-500", orange: "bg-amber-500" } as const;

  return (
    <div className={clsx("relative rounded-xl border p-4 shadow-sm", tones[tone])}>
      {badge !== undefined ? (
        <span className="absolute right-3 top-3 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      ) : null}
      <div className={clsx("mb-3 grid h-9 w-9 place-items-center rounded-full", iconTone[tone])}>
        <Icon className="h-[18px] w-[18px]" />
        {dot ? (
          <span className={clsx("absolute mt-6 ml-6 h-2 w-2 rounded-full", dotColor[dot])} />
        ) : null}
      </div>
      <p className="text-xl font-bold tracking-tight">{value}</p>
      <p className={clsx("mt-1 text-[11px] font-semibold uppercase tracking-wide", tone === "light" ? "text-zinc-500" : "text-white/80")}>
        {label}
      </p>
    </div>
  );
}

/* --------------------------------------------------------------- misc */

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    ON_HOLD: "bg-zinc-100 text-zinc-600 border-zinc-200",
    APPROVED: "bg-green-50 text-green-700 border-green-200",
    REJECTED: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <span
      className={clsx(
        "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize",
        map[status] ?? "bg-zinc-100 text-zinc-600 border-zinc-200",
      )}
    >
      {status.toLowerCase().replace("_", " ")}
    </span>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
