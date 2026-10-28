"use client";

import { useEffect } from "react";

/** Opens the browser print dialog so the PDF button produces a printable statement. */
export default function PrintTrigger() {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn btn-green mb-4 print:hidden"
    >
      Print / Save as PDF
    </button>
  );
}
