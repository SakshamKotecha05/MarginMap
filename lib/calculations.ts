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

// Deadstock risk: trapped cash — high days of inventory + low sales velocity
export const deadstockRisk = allSKUs
  .filter((s) => s.days_of_inventory > 90 && s.monthly_units < 100)
  .sort((a, b) => b.days_of_inventory - a.days_of_inventory);

// Pearson correlation: avg_rating vs monthly_profit
// Verifies the r ≈ 0.010 finding — rating is not a proxy for profitability
export const ratingProfitCorrelation = (() => {
  const n = allSKUs.length;
  const xMean = allSKUs.reduce((s, d) => s + d.avg_rating, 0) / n;
  const yMean = allSKUs.reduce((s, d) => s + d.monthly_profit, 0) / n;
  const num   = allSKUs.reduce((s, d) => s + (d.avg_rating - xMean) * (d.monthly_profit - yMean), 0);
  const den   = Math.sqrt(
    allSKUs.reduce((s, d) => s + (d.avg_rating - xMean) ** 2, 0) *
    allSKUs.reduce((s, d) => s + (d.monthly_profit - yMean) ** 2, 0)
  );
  return den === 0 ? 0 : Math.round((num / den) * 1000) / 1000;
})();

// Return rate vs rating anomalies — surprising combinations
export const returnRatingAnomalies = {
  // Customers love it but return it anyway (possibly sizing/fit issues)
  highReturnGoodRating: allSKUs.filter((s) => s.return_rate_pct > 20 && s.avg_rating >= 4.0),
  // Customers dislike it but rarely return it (possibly consumables)
  lowReturnBadRating:   allSKUs.filter((s) => s.return_rate_pct < 5  && s.avg_rating < 2.5),
};

// ─── Phase 4.5: Advanced Category Management Analytics ────────────────────

// Cannibalization detection: same brand + sub_category + channel, MRP within 15%
// These SKUs are directly competing with each other on the same shelf
export const cannibalizationGroups = (() => {
  const key = (s: ClassifiedSKU) => `${s.brand}|||${s.sub_category}|||${s.channel}`;
  const groups = new Map<string, ClassifiedSKU[]>();
  allSKUs.forEach((sku) => {
    const k = key(sku);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(sku);
  });
  return Array.from(groups.entries())
    .filter(([, items]) => {
      if (items.length < 2) return false;
      const mrps = items.map((s) => s.mrp);
      const maxMrp = Math.max(...mrps);
      const minMrp = Math.min(...mrps);
      return maxMrp > 0 && (maxMrp - minMrp) / maxMrp < 0.15;
    })
    .map(([, items]) => ({
      brand:               items[0].brand,
      subCategory:         items[0].sub_category,
      channel:             items[0].channel,
      items,
      skuCount:            items.length,
      minMrp:              Math.min(...items.map((s) => s.mrp)),
      maxMrp:              Math.max(...items.map((s) => s.mrp)),
      avgMargin:           items.reduce((s, d) => s + d.margin_pct, 0) / items.length,
      totalMonthlyRevenue: items.reduce((s, d) => s + d.monthly_revenue, 0),
      hasZombies:          items.some((d) => d.classification === "zombie"),
    }))
    .sort((a, b) => b.skuCount - a.skuCount);
})();

// Break-even analysis for each zombie SKU
// breakEvenPrice: the selling price needed to achieve 0% margin
// priceGap: how much price must rise to break even (or how much cost must fall)
// discountDepth: % discount being given from MRP (over-discounting often causes losses)
// d2cDeltaMargin: margin % recovered if platform fee removed (move to D2C)
// recoveryType: "channel" if a D2C shift alone fixes it, "pricing" if repricing is needed
export type ZombieWithBreakeven = ClassifiedSKU & {
  breakEvenPrice:  number;
  priceGap:        number;
  discountDepth:   number;
  d2cDeltaMargin:  number;
  recoveryType:    "channel" | "pricing";
};

export const zombieBreakeven: ZombieWithBreakeven[] = zombies.map((sku) => {
  const priceGap        = sku.total_cost_per_unit - sku.selling_price;
  const discountDepth   = sku.mrp > 0 ? (sku.mrp - sku.selling_price) / sku.mrp : 0;
  const d2cDeltaMargin  = sku.selling_price > 0 ? (sku.platform_fee / sku.selling_price) * 100 : 0;
  // "channel" fix: removing platform fee alone would bring margin to >= 0
  const isChannelFix    = sku.platform_fee > 0 && (sku.margin_pct + d2cDeltaMargin) >= 0;
  return {
    ...sku,
    breakEvenPrice: sku.total_cost_per_unit,
    priceGap,
    discountDepth,
    d2cDeltaMargin,
    recoveryType: isChannelFix ? "channel" : "pricing",
  };
});

export const channelFixCount  = zombieBreakeven.filter((z) => z.recoveryType === "channel").length;
export const pricingFixCount  = zombieBreakeven.filter((z) => z.recoveryType === "pricing").length;

// Launch success rate: what % of new launches are profitable
export const launchSuccessRate = (() => {
  const launches   = allSKUs.filter((s) => s.lifecycle_stage === "Launch");
  const profitable = launches.filter((s) => s.monthly_profit > 0);
  return {
    total:       launches.length,
    profitable:  profitable.length,
    failing:     launches.length - profitable.length,
    successRate: launches.length > 0 ? (profitable.length / launches.length) * 100 : 0,
    failingSkus: launches
      .filter((s) => s.monthly_profit < 0)
      .sort((a, b) => a.monthly_profit - b.monthly_profit),
  };
})();

// Brand zombie rate: % of each brand's portfolio that is zombie (rate > count)
export const brandZombieRate = Object.entries(byBrand)
  .map(([brand, data]) => ({
    brand,
    ...data,
    zombieRate: data.count > 0 ? (data.zombies / data.count) * 100 : 0,
    gemRate:    data.count > 0 ? (data.gems    / data.count) * 100 : 0,
  }))
  .sort((a, b) => b.zombieRate - a.zombieRate);

// Price ladder: MRP distribution by sub_category — reveals crowded tiers and gaps
export const priceLadder = (() => {
  const bySubCat = new Map<string, ClassifiedSKU[]>();
  allSKUs.forEach((sku) => {
    if (!bySubCat.has(sku.sub_category)) bySubCat.set(sku.sub_category, []);
    bySubCat.get(sku.sub_category)!.push(sku);
  });
  return Array.from(bySubCat.entries())
    .filter(([, items]) => items.length >= 4)
    .map(([subCategory, items]) => {
      const mrps      = items.map((s) => s.mrp).sort((a, b) => a - b);
      const minMrp    = mrps[0];
      const maxMrp    = mrps[mrps.length - 1];
      // Find the largest cluster: consecutive MRPs within 15% spread
      let maxCluster = 1, clusterStart = 0;
      for (let i = 1; i < mrps.length; i++) {
        if (mrps[i] > 0 && (mrps[i] - mrps[clusterStart]) / mrps[i] < 0.15) {
          maxCluster = Math.max(maxCluster, i - clusterStart + 1);
        } else {
          clusterStart = i;
        }
      }
      return {
        subCategory,
        count:         items.length,
        minMrp,
        maxMrp,
        mrpRange:      maxMrp - minMrp,
        crowdingScore: maxCluster,
        avgMargin:     items.reduce((s, d) => s + d.margin_pct, 0) / items.length,
      };
    })
    .sort((a, b) => b.crowdingScore - a.crowdingScore);
})();

// Channel-SKU fit: for each multi-channel product group, rank channels by margin
// Surfaces optimal channel per product — more actionable than raw arbitrage spread
export const channelFitAnalysis = (() => {
  return crossChannelGroups
    .map((group) => {
      const byChannel = group.items.reduce<Record<string, ClassifiedSKU[]>>((acc, s) => {
        if (!acc[s.channel]) acc[s.channel] = [];
        acc[s.channel].push(s);
        return acc;
      }, {});
      const channelRankings = Object.entries(byChannel)
        .map(([channel, skus]) => ({
          channel,
          avgMargin: skus.reduce((s, d) => s + d.margin_pct, 0) / skus.length,
          avgProfit: skus.reduce((s, d) => s + d.monthly_profit, 0) / skus.length,
          skuCount:  skus.length,
        }))
        .sort((a, b) => b.avgMargin - a.avgMargin);
      return {
        ...group,
        optimalChannel: channelRankings[0].channel,
        worstChannel:   channelRankings[channelRankings.length - 1].channel,
        channelRankings,
        marginSpread:   channelRankings[0].avgMargin - channelRankings[channelRankings.length - 1].avgMargin,
      };
    })
    .filter((g) => g.channelRankings.length > 1)
    .sort((a, b) => b.marginSpread - a.marginSpread);
})();

// Marketing ROI per SKU: monthly_revenue / (marketing_cost × monthly_units)
// Higher = more revenue generated per ₹1 of marketing spend
export type SKUWithMarketingROI = ClassifiedSKU & { marketingRoi: number };

const _avgRoi = (items: SKUWithMarketingROI[]) =>
  items.reduce((s, d) => s + d.marketingRoi, 0) / (items.length || 1);

export const marketingROIRanking: SKUWithMarketingROI[] = allSKUs
  .filter((s) => s.marketing_cost_per_unit > 0 && s.monthly_units > 0)
  .map((s) => ({
    ...s,
    marketingRoi: s.monthly_revenue / (s.marketing_cost_per_unit * s.monthly_units),
  }))
  .sort((a, b) => b.marketingRoi - a.marketingRoi);

export const topMarketingROI   = marketingROIRanking.slice(0, 20);
export const worstMarketingROI = [...marketingROIRanking].reverse().slice(0, 20);

export const avgROIByClassification = {
  zombie:  _avgRoi(marketingROIRanking.filter((s) => s.classification === "zombie")),
  gem:     _avgRoi(marketingROIRanking.filter((s) => s.classification === "gem")),
  gateway: _avgRoi(marketingROIRanking.filter((s) => s.classification === "gateway")),
  healthy: _avgRoi(marketingROIRanking.filter((s) => s.classification === "healthy")),
};

// SKU rationalization: long-tail products that consume ops bandwidth with minimal return
// <₹50K/month revenue AND <15% margin — not gateways (gateway SKUs are exempt)
export const rationalizationCandidates = allSKUs
  .filter((s) =>
    s.classification !== "gateway" &&
    s.monthly_revenue < 50000 &&
    s.margin_pct < 15
  )
  .sort((a, b) => a.monthly_revenue - b.monthly_revenue);

export const rationalizationSummary = {
  count:        rationalizationCandidates.length,
  totalRevenue: rationalizationCandidates.reduce((s, d) => s + d.monthly_revenue, 0),
  totalProfit:  rationalizationCandidates.reduce((s, d) => s + d.monthly_profit, 0),
  avgMargin:    rationalizationCandidates.reduce((s, d) => s + d.margin_pct, 0)
                  / (rationalizationCandidates.length || 1),
};

// Channel cost breakdown (avg % of selling price) for waterfall chart
// Platform fee is the root cause of marketplace vs D2C margin gap
const CHANNEL_ORDER = ["D2C Website", "Nykaa", "BigBasket", "Amazon", "Flipkart"];
export const channelCostBreakdown = CHANNEL_ORDER.map((ch) => {
  const items = groupBy(allSKUs, "channel")[ch] ?? [];
  const n = items.length || 1;
  const avg = (fn: (s: typeof items[0]) => number) =>
    Math.round((items.reduce((s, d) => s + fn(d), 0) / n) * 10) / 10;
  return {
    channel:      ch === "D2C Website" ? "D2C" : ch,
    cogsPct:      avg((d) => (d.cogs / d.selling_price) * 100),
    marketingPct: avg((d) => (d.marketing_cost_per_unit / d.selling_price) * 100),
    logisticsPct: avg((d) => (d.logistics_cost_per_unit / d.selling_price) * 100),
    platformPct:  avg((d) => (d.platform_fee / d.selling_price) * 100),
    marginPct:    avg((d) => d.margin_pct),
  };
});
