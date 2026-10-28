// All money lives in the database as BigInt paise. Nothing else touches rupees
// except these helpers, so we never lose a paisa to floating point.

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrPlain = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function toPaise(rupees: number | string): bigint {
  const value = typeof rupees === "string" ? Number(rupees) : rupees;
  if (!Number.isFinite(value)) return BigInt(0);
  return BigInt(Math.round(value * 100));
}

export function toRupees(paise: bigint | number): number {
  return Number(paise) / 100;
}

/** "₹1,55,583.00" */
export function formatINR(paise: bigint | number): string {
  return inr.format(toRupees(paise));
}

/** "155583.00" without the symbol */
export function formatAmount(paise: bigint | number): string {
  return inrPlain.format(toRupees(paise));
}

/** Signed amount for P&L style columns, e.g. "+₹0.94" / "-₹10.00" */
export function formatSigned(paise: bigint | number): string {
  const value = toRupees(paise);
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${inr.format(Math.abs(value))}`;
}
