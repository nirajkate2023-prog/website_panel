import Link from "next/link";

/** From/To picker used by the dashboard and reports. Plain GET form, no JS needed. */
export default function DateRangeForm({
  from,
  to,
  resetHref = "?",
  label = "Date Range Pick",
}: {
  from: string;
  to: string;
  resetHref?: string;
  label?: string;
}) {
  return (
    <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
      <div>
        <label className="label" htmlFor="from">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <input id="from" name="from" type="date" defaultValue={from} className="field w-auto" />
          <span className="text-zinc-400">—</span>
          <input name="to" type="date" defaultValue={to} className="field w-auto" />
        </div>
      </div>
      <button type="submit" className="btn btn-green">
        Submit
      </button>
      <Link href={resetHref} className="btn btn-red">
        Reset
      </Link>
    </form>
  );
}
