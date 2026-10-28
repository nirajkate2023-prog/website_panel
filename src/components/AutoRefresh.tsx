"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** The "Data refetch in every N Sec" indicator from the reference panel. */
export default function AutoRefresh({ seconds = 17 }: { seconds?: number }) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(seconds);
  const started = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setRemaining((value) => (value <= 1 ? seconds : value - 1)), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      return;
    }
    if (remaining === seconds) router.refresh();
  }, [remaining, seconds, router]);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
      <RefreshCw className="h-3.5 w-3.5" />
      Data refetch in every {remaining} Sec
    </span>
  );
}
