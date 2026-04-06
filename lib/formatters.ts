// Indian locale number formatting helpers

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Format a rupee value into compact Indian notation.
 * ≥ 1 Cr → "₹X.XX Cr"
 * ≥ 1 L  → "₹X.XX L"
 * else   → "₹X,XX,XXX"
 */
export function formatCurrency(value: number, mode: "compact" | "exact" = "compact"): string {
  if (mode === "exact") {
    return inrFormatter.format(value);
  }
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_00_00_000) {
    return `${sign}₹${(abs / 1_00_00_000).toFixed(2)} Cr`;
  }
  if (abs >= 1_00_000) {
    return `${sign}₹${(abs / 1_00_000).toFixed(2)} L`;
  }
  return `${sign}${inrFormatter.format(abs)}`;
}

/** Format a decimal as a percentage string, e.g. 44.82 → "44.82%" */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/** Format a plain number with Indian comma grouping */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.round(value));
}

/** Format a profit/loss delta with a +/- sign */
export function formatDelta(value: number): string {
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${formatCurrency(value)}`;
}
