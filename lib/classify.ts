export type Classification = "zombie" | "gem" | "gateway" | "healthy";

export interface WeightEntry {
  field: string;
  label: string;
  weight: number;
  direction: "higher-is-worse" | "lower-is-worse" | "higher-is-better" | "lower-is-better";
}

export const ZOMBIE_WEIGHTS: WeightEntry[] = [
  { field: "monthly_profit",          label: "Monthly Profit",      weight: 0.25, direction: "lower-is-worse"  },
  { field: "monthly_units",           label: "Monthly Units",       weight: 0.20, direction: "lower-is-worse"  },
  { field: "avg_rating",              label: "Avg Rating",          weight: 0.15, direction: "lower-is-worse"  },
  { field: "return_rate_pct",         label: "Return Rate",         weight: 0.15, direction: "higher-is-worse" },
  { field: "repeat_purchase_rate_pct",label: "Repeat Rate",         weight: 0.15, direction: "lower-is-worse"  },
  { field: "days_of_inventory",       label: "Days of Inventory",   weight: 0.10, direction: "higher-is-worse" },
];

export const GEM_WEIGHTS: WeightEntry[] = [
  { field: "margin_pct",              label: "Margin %",            weight: 0.25, direction: "higher-is-better" },
  { field: "repeat_purchase_rate_pct",label: "Repeat Rate",         weight: 0.25, direction: "higher-is-better" },
  { field: "avg_rating",              label: "Avg Rating",          weight: 0.20, direction: "higher-is-better" },
  { field: "monthly_units",           label: "Monthly Units",       weight: 0.20, direction: "lower-is-better"  },
  { field: "marketing_cost_per_unit", label: "Marketing Cost/Unit", weight: 0.10, direction: "lower-is-better"  },
];

export interface SKU {
  sku_id: string;
  brand: string;
  category: string;
  sub_category: string;
  channel: string;
  lifecycle_stage: string;
  mrp: number;
  selling_price: number;
  cogs: number;
  marketing_cost_per_unit: number;
  logistics_cost_per_unit: number;
  platform_fee: number;
  total_cost_per_unit: number;
  margin_per_unit: number;
  margin_pct: number;
  monthly_units: number;
  monthly_revenue: number;
  monthly_profit: number;
  avg_rating: number;
  review_count: number;
  return_rate_pct: number;
  repeat_purchase_rate_pct: number;
  days_of_inventory: number;
  months_listed: number;
}

export interface ClassifiedSKU extends SKU {
  classification: Classification;
  zombie_score: number;  // 0–100, higher = more zombie
  gem_score: number;     // 0–100, higher = more gem
}

// --- Percentile ranking helpers ---

/** Build a lookup of value → percentile rank (0–1) for an array of numbers */
function buildPercentileMap(values: number[]): Map<number, number> {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const map = new Map<number, number>();
  // A value's first index in the sorted array is exactly the count of items
  // strictly less than it, so one pass gives the same ranks a per-value
  // filter would, without the O(n²) rescan.
  for (let i = 0; i < n; i++) {
    if (i === 0 || sorted[i] !== sorted[i - 1]) {
      map.set(sorted[i], Math.min(1, Math.max(0, i / (n - 1))));
    }
  }
  return map;
}

// --- Main classification function ---

export function classifyAll(skus: SKU[]): ClassifiedSKU[] {
  // Build percentile maps for each scoring dimension
  const pctMonthlyProfit   = buildPercentileMap(skus.map((s) => s.monthly_profit));
  const pctMonthlyUnits    = buildPercentileMap(skus.map((s) => s.monthly_units));
  const pctAvgRating       = buildPercentileMap(skus.map((s) => s.avg_rating));
  const pctReturnRate      = buildPercentileMap(skus.map((s) => s.return_rate_pct));
  const pctRepeatRate      = buildPercentileMap(skus.map((s) => s.repeat_purchase_rate_pct));
  const pctDaysInventory   = buildPercentileMap(skus.map((s) => s.days_of_inventory));
  const pctMarginPct       = buildPercentileMap(skus.map((s) => s.margin_pct));
  const pctMarketingCost   = buildPercentileMap(skus.map((s) => s.marketing_cost_per_unit));

  return skus.map((sku) => {
    // --- Step 1: Gateway check (overrides everything else) ---
    // High repeat purchase rate = brand entry point product, protect it
    if (sku.repeat_purchase_rate_pct > 50) {
      return { ...sku, classification: "gateway", zombie_score: 0, gem_score: 0 };
    }

    // --- Step 2: Zombie score (higher = more zombie-like) ---
    // For "lower = worse" fields, invert the percentile (1 - rank) so that
    // low profit/units/rating/repeat → high zombie contribution
    const zombieScore =
      0.25 * (1 - (pctMonthlyProfit.get(sku.monthly_profit) ?? 0)) +
      0.20 * (1 - (pctMonthlyUnits.get(sku.monthly_units) ?? 0)) +
      0.15 * (1 - (pctAvgRating.get(sku.avg_rating) ?? 0)) +
      0.15 * (pctReturnRate.get(sku.return_rate_pct) ?? 0) +           // higher return = worse
      0.15 * (1 - (pctRepeatRate.get(sku.repeat_purchase_rate_pct) ?? 0)) +
      0.10 * (pctDaysInventory.get(sku.days_of_inventory) ?? 0);       // more inventory = worse

    const zombieScoreNormalized = Math.round(zombieScore * 100);

    // --- Step 3: Gem score (higher = more gem-like) ---
    // Low monthly_units = underinvested → invert for gem signal
    // Low marketing_cost = undiscovered → invert for gem signal
    const gemScore =
      0.25 * (pctMarginPct.get(sku.margin_pct) ?? 0) +
      0.25 * (pctRepeatRate.get(sku.repeat_purchase_rate_pct) ?? 0) +
      0.20 * (pctAvgRating.get(sku.avg_rating) ?? 0) +
      0.20 * (1 - (pctMonthlyUnits.get(sku.monthly_units) ?? 0)) +     // low volume = underinvested
      0.10 * (1 - (pctMarketingCost.get(sku.marketing_cost_per_unit) ?? 0)); // low mktg = undiscovered

    const gemScoreNormalized = Math.round(gemScore * 100);

    // --- Step 4: Hard zombie rule —  negative margin always zombie ---
    if (sku.margin_pct < 0) {
      return { ...sku, classification: "zombie", zombie_score: zombieScoreNormalized, gem_score: gemScoreNormalized };
    }

    // --- Step 5: Classify by scores ---
    // Zombie threshold: score ≥ 60 (top 40% most zombie-like)
    // Gem threshold: score ≥ 65 AND not zombie
    let classification: Classification;
    if (zombieScoreNormalized >= 60) {
      classification = "zombie";
    } else if (gemScoreNormalized >= 65) {
      classification = "gem";
    } else {
      classification = "healthy";
    }

    return { ...sku, classification, zombie_score: zombieScoreNormalized, gem_score: gemScoreNormalized };
  });
}
