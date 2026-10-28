import clsx from "clsx";
import Link from "next/link";

export type Tab = { key: string; label: string };

/**
 * Tab strip that keeps the active tab in the URL (`?tab=`), exactly like the
 * reference panel, so each tab can fetch only the data it needs on the server.
 */
export default function Tabs({
  tabs,
  active,
  basePath,
  className,
  right,
}: {
  tabs: Tab[];
  active: string;
  basePath: string;
  className?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className={clsx("flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={`${basePath}?tab=${tab.key}`}
              className={clsx(
                "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
                isActive
                  ? "border-green-600 font-semibold text-green-700"
                  : "border-transparent text-zinc-500 hover:text-zinc-800",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      {right}
    </div>
  );
}
