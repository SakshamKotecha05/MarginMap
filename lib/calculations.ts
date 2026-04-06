import { allSKUs, zombies, gems, gateways } from "./data";
import type { ClassifiedSKU } from "./classify";

export const portfolioSummary = {
  totalSKUs:                    allSKUs.length,
  totalMonthlyRevenue:          allSKUs.reduce((s, d) => s + d.monthly_revenue, 0),
  totalMonthlyProfit:           allSKUs.reduce((s, d) => s + d.monthly_profit, 0),
  zombieCount:                  zombies.length,
  gemCount:                     gems.length,
  gatewayCount:                 gateways.length,
  healthyCount:                 allSKUs.filter((s) => s.classification === "healthy").length,
  monthlyZombieLoss:            Math.abs(zombies.reduce((s, d) => s + Math.min(d.monthly_profit, 0), 0)),
  annualZombieLoss:             Math.abs(zombies.reduce((s, d) => s + Math.min(d.monthly_profit, 0), 0)) * 12,
  profitAfterZombiesRemoved:    allSKUs.reduce((s, d) => s + d.monthly_profit, 0)
                                  - zombies.reduce((s, d) => s + Math.min(d.monthly_profit, 0), 0),
  // Total across ALL negative-profit SKUs including gateways = ₹15,892,978.83
  totalMonthlyNegativeProfitLoss: Math.abs(
    allSKUs.filter((s) => s.monthly_profit < 0).reduce((s, d) => s + d.monthly_profit, 0)
  ),
};

function groupBy<T>(arr: T[], key: keyof T) {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = String(item[key]);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

function summarizeGroup(items: ClassifiedSKU[]) {
  return {
    count:          items.length,
    monthlyRevenue: items.reduce((s, d) => s + d.monthly_revenue, 0),
    monthlyProfit:  items.reduce((s, d) => s + d.monthly_profit, 0),
    avgMargin:      items.reduce((s, d) => s + d.margin_pct, 0) / items.length,
    zombies:        items.filter((d) => d.classification === "zombie").length,
    gems:           items.filter((d) => d.classification === "gem").length,
    gateways:       items.filter((d) => d.classification === "gateway").length,
    monthlyLoss:    Math.abs(
      items.filter((d) => d.classification === "zombie")
           .reduce((s, d) => s + Math.min(d.monthly_profit, 0), 0)
    ),
  };
}

export const byBrand    = Object.fromEntries(
  Object.entries(groupBy(allSKUs, "brand")).map(([k, v]) => [k, summarizeGroup(v)])
);
export const byChannel  = Object.fromEntries(
  Object.entries(groupBy(allSKUs, "channel")).map(([k, v]) => [k, summarizeGroup(v)])
);
export const byCategory = Object.fromEntries(
  Object.entries(groupBy(allSKUs, "category")).map(([k, v]) => [k, summarizeGroup(v)])
);
export const byLifecycle = Object.fromEntries(
  Object.entries(groupBy(allSKUs, "lifecycle_stage")).map(([k, v]) => [k, summarizeGroup(v)])
);

type ProductKey = string;
function productKey(sku: ClassifiedSKU): ProductKey {
  return `${sku.brand}|${sku.category}|${sku.sub_category}`;
}

export const crossChannelGroups = (() => {
  const groups = new Map<ProductKey, ClassifiedSKU[]>();
  allSKUs.forEach((sku) => {
    const key = productKey(sku);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(sku);
  });
  return Array.from(groups.entries())
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => {
      const margins = items.map((s) => s.margin_pct);
      const profits = items.map((s) => s.monthly_profit);
      return {
        key, items,
        maxMargin: Math.max(...margins),
        minMargin: Math.min(...margins),
        spread:    Math.max(...margins) - Math.min(...margins),
        hasMixedProfitability: profits.some((p) => p > 0) && profits.some((p) => p < 0),
      };
    })
    .sort((a, b) => b.spread - a.spread);
})();

export const mixedChannelProducts = crossChannelGroups.filter((g) => g.hasMixedProfitability);

export const paretoData = (() => {
  const sorted = [...allSKUs].sort((a, b) => b.monthly_revenue - a.monthly_revenue);
  const total = portfolioSummary.totalMonthlyRevenue;
  let cumulative = 0;
  return sorted.map((sku, i) => {
    cumulative += sku.monthly_revenue;
    return { rank: i + 1, skuId: sku.sku_id, revenue: sku.monthly_revenue, cumulativePct: (cumulative / total) * 100 };
  });
})();

export const anomalies = {
  highMarginBadRating:  allSKUs.filter((s) => s.margin_pct > 40 && s.avg_rating < 2.0),
  negMarginGoodRating:  allSKUs.filter((s) => s.margin_pct < 0 && s.avg_rating >= 4.0),
  declineMislabeled:    allSKUs.filter((s) => s.lifecycle_stage === "Decline" && s.margin_pct > 35),
  earlyDeathSignals:    allSKUs.filter((s) => s.lifecycle_stage === "Launch" && s.monthly_profit < 0),
};
