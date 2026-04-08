"use client";
import { useState } from "react";
import {
  mixedChannelProducts,
  byBrand,
  byCategory,
  byLifecycle,
  paretoData,
  anomalies,
  deadstockRisk,
  ratingProfitCorrelation,
  returnRatingAnomalies,
  channelCostBreakdown,
  cannibalizationGroups,
  launchSuccessRate,
  brandZombieRate,
  priceLadder,
  channelFitAnalysis,
  topMarketingROI,
  worstMarketingROI,
  avgROIByClassification,
  rationalizationCandidates,
  rationalizationSummary,
} from "@/lib/calculations";
import { gateways } from "@/lib/data";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/formatters";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, CartesianGrid,
} from "recharts";
import SKUDetailPanel from "@/components/ui/SKUDetailPanel";
import KPICard from "@/components/ui/KPICard";
import type { ClassifiedSKU } from "@/lib/classify";

// ─── Static data (computed once, not in render) ────────────────────────────

const sortedGateways = [...gateways].sort(
  (a, b) => b.repeat_purchase_rate_pct - a.repeat_purchase_rate_pct
);

const brandRows = Object.entries(byBrand)
  .map(([brand, d]) => ({ brand, ...d }))
  .sort((a, b) => b.avgMargin - a.avgMargin);

const categoryRows = Object.entries(byCategory)
  .map(([cat, d]) => ({ cat, ...d }))
  .sort((a, b) => b.avgMargin - a.avgMargin);

const lifecycleRows = Object.entries(byLifecycle)
  .map(([stage, d]) => ({ stage, ...d }))
  .sort((a, b) => b.avgMargin - a.avgMargin);

// Pareto: sample 600 → ~100 points for chart perf
const paretoChart = paretoData
  .filter((_, i) => i % 6 === 0 || i === paretoData.length - 1)
  .map((d) => ({ rank: d.rank, pct: Math.round(d.cumulativePct * 10) / 10 }));

const TOP20_RANK  = Math.round(paretoData.length * 0.2);  // 120
const TOP20_PCT   = Math.round((paretoData[TOP20_RANK - 1]?.cumulativePct ?? 50.2) * 10) / 10;
const BOT50_PCT   = Math.round(
  ((paretoData[paretoData.length - 1].cumulativePct -
    (paretoData[Math.round(paretoData.length * 0.5) - 1]?.cumulativePct ?? 85)) / 1) * 10
) / 10;

const totalAnomalies =
  anomalies.highMarginBadRating.length +
  anomalies.negMarginGoodRating.length +
  anomalies.declineMislabeled.length +
  anomalies.earlyDeathSignals.length;

// ─── Tab definition ────────────────────────────────────────────────────────

const TABS = [
  { id: "arbitrage",  label: "Arbitrage",       badge: mixedChannelProducts.length },
  { id: "cost",       label: "Cost Waterfall",   badge: null },
  { id: "anomalies",  label: "Anomalies",        badge: totalAnomalies },
  { id: "brand",      label: "Brand & Category", badge: null },
  { id: "gateway",    label: "Gateway",          badge: gateways.length },
  { id: "pareto",     label: "Pareto",           badge: null },
  { id: "inventory",  label: "Inventory Risk",   badge: deadstockRisk.length },
  { id: "strategy",   label: "Strategy",         badge: cannibalizationGroups.length },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Shared micro-components ───────────────────────────────────────────────

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-3 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

// ─── Sub-navigation pill bar (used inside heavy tabs) ─────────────────────

function SubNav<T extends string>({
  items,
  active,
  onChange,
}: {
  items: Array<{ id: T; label: string; badge?: number | null }>;
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto scrollbar-hide shrink-0">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 ${
            active === item.id
              ? "bg-white shadow-sm text-slate-900"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {item.label}
          {item.badge != null && (
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                active === item.id
                  ? "bg-blue-500 text-white"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {item.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function InsightBanner({
  color,
  title,
  body,
}: {
  color: "blue" | "red" | "emerald" | "amber";
  title: string;
  body: string;
}) {
  const cls = {
    blue:    "border-l-blue-500 bg-blue-500/5",
    red:     "border-l-red-500 bg-red-500/5",
    emerald: "border-l-emerald-500 bg-emerald-500/5",
    amber:   "border-l-amber-500 bg-amber-500/5",
  }[color];
  return (
    <div className={`rounded-2xl p-5 border-l-4 ${cls}`}>
      <p className="text-sm font-semibold text-slate-800 mb-1">{title}</p>
      <p className="text-[13px] text-slate-500 leading-relaxed">{body}</p>
    </div>
  );
}

// ─── Tab: Arbitrage ────────────────────────────────────────────────────────

// Group a product group's SKUs by channel and compute per-channel summary
function groupByChannel(items: ClassifiedSKU[]) {
  const map: Record<string, ClassifiedSKU[]> = {};
  for (const s of items) {
    if (!map[s.channel]) map[s.channel] = [];
    map[s.channel].push(s);
  }
  return Object.entries(map)
    .map(([channel, skus]) => {
      const best  = Math.max(...skus.map((s) => s.margin_pct));
      const worst = Math.min(...skus.map((s) => s.margin_pct));
      const rep   = skus.reduce((a, b) => (a.margin_pct > b.margin_pct ? a : b));
      const hasProfit = skus.some((s) => s.monthly_profit >= 0);
      const hasLoss   = skus.some((s) => s.monthly_profit < 0);
      return { channel, skus, best, worst, rep, hasProfit, hasLoss };
    })
    .sort((a, b) => b.best - a.best);
}

// Products with >1 SKU on the same channel = pack-size variants competing with themselves
const packSizeCases = mixedChannelProducts.filter((g) =>
  Object.values(
    g.items.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.channel]: (acc[s.channel] ?? 0) + 1 }), {})
  ).some((n) => n > 1)
);

// key = "rowKey|channel", value = true when popover open
type PopoverKey = string;

function ChannelBadge({
  channel, skus, onSelect,
  popoverKey, openPopover, setOpenPopover,
}: {
  channel: string;
  skus: ClassifiedSKU[];
  onSelect: (s: ClassifiedSKU) => void;
  popoverKey: PopoverKey;
  openPopover: PopoverKey | null;
  setOpenPopover: (k: PopoverKey | null) => void;
}) {
  const hasProfit = skus.some((s) => s.monthly_profit >= 0);
  const hasLoss   = skus.some((s) => s.monthly_profit < 0);
  const mixed     = hasProfit && hasLoss;
  const multi     = skus.length > 1;
  const isOpen    = openPopover === popoverKey;

  const badgeColor = mixed
    ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    : hasProfit
    ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"
    : "bg-red-50 text-red-600 ring-1 ring-red-100";

  return (
    <div className="relative">
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpenPopover(null)}
        />
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (multi) setOpenPopover(isOpen ? null : popoverKey);
          else { onSelect(skus[0]); setOpenPopover(null); }
        }}
        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity ${badgeColor}`}
      >
        {channel}{multi ? ` ×${skus.length}` : ""}
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-100 p-2 min-w-[160px]">
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-1.5">
            {channel} — pick variant
          </p>
          {[...skus].sort((a, b) => a.mrp - b.mrp).map((s) => (
            <button
              key={s.sku_id}
              onClick={(e) => { e.stopPropagation(); onSelect(s); setOpenPopover(null); }}
              className="w-full flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors text-left cursor-pointer group"
            >
              <span className="text-[10px] font-semibold text-slate-700">
                MRP ₹{Math.round(s.mrp).toLocaleString("en-IN")}
              </span>
              <span className={`text-[9px] font-bold tabular ${s.margin_pct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {s.margin_pct.toFixed(1)}%
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const ARBITRAGE_SUBNAV = [
  { id: "spread"  as const, label: "Margin Spread",  badge: mixedChannelProducts.length },
  { id: "fit"     as const, label: "Channel Fit",    badge: channelFitAnalysis.length },
];

function ArbitrageTab({ onSelect }: { onSelect: (s: ClassifiedSKU) => void }) {
  const top30 = mixedChannelProducts.slice(0, 30);
  const [openPopover, setOpenPopover] = useState<PopoverKey | null>(null);
  const [sub, setSub] = useState<"spread" | "fit">("spread");

  return (
    <div className="space-y-5">
      {/* Sub-navigation */}
      <SubNav items={ARBITRAGE_SUBNAV} active={sub} onChange={setSub} />

      {/* ── Margin Spread ── */}
      {sub === "spread" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KPICard title="Mixed Products"     value={String(mixedChannelProducts.length)} subtitle="profitable on one variant, losing on another"          color="blue" />
            <KPICard title="Pack-Size Bleeding" value={String(packSizeCases.length)}        subtitle="same channel, different price point — small pack losing" color="red" />
            <KPICard title="Max Margin Spread"  value={`${formatPercent(mixedChannelProducts[0]?.spread ?? 0)}pp`} subtitle="best vs worst variant in same product family" color="green" />
          </div>
          <InsightBanner
            color="blue"
            title="Two types of margin bleeding — channel arbitrage AND pack-size arbitrage"
            body="Some products lose money on specific channels (platform fees kill margins on Amazon/Flipkart vs D2C). Others lose on specific pack sizes — the ₹250 small pack on the same channel bleeds cash while the ₹1,800 large pack earns. Both are fixable: delist the losing variant, not the product. Channel badges show ×N when multiple price variants exist on that channel."
          />
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">Top 30 — Widest Margin Spread</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Green = profitable variant · Red = all losing · Amber = mixed (pack-size) · ×N = N price variants on that channel
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <Th>Product</Th>
                    <Th>MRP Range</Th>
                    <Th>Channels &amp; Variants</Th>
                    <Th right>Best</Th>
                    <Th right>Worst</Th>
                    <Th right>Spread</Th>
                  </tr>
                </thead>
                <tbody>
                  {top30.map((g) => {
                    const [, cat, sub2] = g.key.split("|");
                    const brand    = g.items[0].brand;
                    const bestSKU  = g.items.reduce((a, b) => (a.margin_pct > b.margin_pct ? a : b));
                    const worstSKU = g.items.reduce((a, b) => (a.margin_pct < b.margin_pct ? a : b));
                    const mrpMin   = Math.min(...g.items.map((s) => s.mrp));
                    const mrpMax   = Math.max(...g.items.map((s) => s.mrp));
                    const channels = groupByChannel(g.items);
                    return (
                      <tr key={g.key} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-slate-800 text-[11px]">{brand}</p>
                          <p className="text-slate-400 text-[10px]">{cat} · {sub2}</p>
                          <p className="text-slate-300 text-[9px] mt-0.5">{g.items.length} SKUs total</p>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <p className="tabular text-[11px] font-semibold text-slate-700">
                            ₹{Math.round(mrpMin).toLocaleString("en-IN")}
                            {mrpMin !== mrpMax && <> – ₹{Math.round(mrpMax).toLocaleString("en-IN")}</>}
                          </p>
                          {mrpMin !== mrpMax && (
                            <p className="text-[9px] text-amber-500 font-semibold mt-0.5">
                              {Math.round(mrpMax / mrpMin)}× price range
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {channels.map(({ channel, skus }) => (
                              <ChannelBadge
                                key={channel}
                                channel={channel}
                                skus={skus}
                                onSelect={onSelect}
                                popoverKey={`${g.key}|${channel}`}
                                openPopover={openPopover}
                                setOpenPopover={setOpenPopover}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right tabular font-bold text-emerald-600">{formatPercent(bestSKU.margin_pct)}</td>
                        <td className="px-3 py-3 text-right tabular font-bold text-red-500">{formatPercent(worstSKU.margin_pct)}</td>
                        <td className="px-3 py-3 text-right tabular font-bold text-slate-800">{formatPercent(g.spread)}pp</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Channel Fit ── */}
      {sub === "fit" && (
        <div className="space-y-4">
          <InsightBanner
            color="emerald"
            title="Not all channels suit all products — the margin spread tells you where each SKU belongs"
            body="For each multi-channel product family, the channel with the highest average margin is the optimal home. Stocking the same product on a channel where it bleeds margin is a distribution decision, not a product failure. Sort by spread to find the highest-leverage channel shifts."
          />
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">Top 30 — Biggest Channel Fit Gap</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Sorted by margin spread between optimal and worst channel</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <Th>Product</Th>
                    <Th>Optimal Channel</Th>
                    <Th>Worst Channel</Th>
                    <Th right>Best Margin</Th>
                    <Th right>Worst Margin</Th>
                    <Th right>Fit Gap</Th>
                  </tr>
                </thead>
                <tbody>
                  {channelFitAnalysis.slice(0, 30).map((g) => {
                    const [brand, , sub2] = g.key.split("|");
                    const best  = g.channelRankings[0];
                    const worst = g.channelRankings[g.channelRankings.length - 1];
                    return (
                      <tr key={g.key} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-slate-800 text-[11px]">{brand}</p>
                          <p className="text-slate-400 text-[10px]">{sub2}</p>
                          <p className="text-slate-300 text-[9px] mt-0.5">{g.items.length} SKUs · {g.channelRankings.length} channels</p>
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                            {best.channel === "D2C Website" ? "D2C" : best.channel}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600">
                            {worst.channel === "D2C Website" ? "D2C" : worst.channel}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right tabular font-bold text-emerald-600">{formatPercent(best.avgMargin)}</td>
                        <td className="px-3 py-3 text-right tabular font-bold text-red-500">{formatPercent(worst.avgMargin)}</td>
                        <td className="px-3 py-3 text-right tabular font-bold text-slate-800">{formatPercent(g.marginSpread)}pp</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Cost Waterfall ────────────────────────────────────────────────────

const COST_COLORS = {
  cogsPct:      "#94A3B8", // slate
  marketingPct: "#60A5FA", // blue
  logisticsPct: "#FBBF24", // amber
  platformPct:  "#F87171", // red
  marginPct:    "#34D399", // emerald
};

const costKeys = ["cogsPct", "marketingPct", "logisticsPct", "platformPct", "marginPct"] as const;
const costLabels: Record<(typeof costKeys)[number], string> = {
  cogsPct:      "COGS",
  marketingPct: "Marketing",
  logisticsPct: "Logistics",
  platformPct:  "Platform Fee",
  marginPct:    "Margin",
};

function CostTab() {
  return (
    <div className="space-y-5">
      <InsightBanner
        color="red"
        title="Platform fees (15–16%) are the root cause — not COGS, not marketing"
        body="D2C carries zero platform fee and earns 29.5% average margin. Switch to any marketplace and platform fees immediately consume 15–16% of selling price, collapsing margin to 10–22%. COGS barely moves across channels. The zombie problem is a distribution problem."
      />

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <p className="text-sm font-semibold text-slate-800 mb-1">Cost Breakdown by Channel (% of selling price)</p>
        <p className="text-[11px] text-slate-400 mb-5">Stacked bars = 100% of selling price. Red = platform fee.</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={channelCostBreakdown} barSize={40} margin={{ top: 0, right: 16, bottom: 0, left: -8 }}>
            <XAxis dataKey="channel" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 10, fill: "#94A3B8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
            />
            <Tooltip
              formatter={(value, name) => [
                `${Number(value).toFixed(1)}%`,
                costLabels[name as (typeof costKeys)[number]] ?? String(name),
              ]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}
            />
            {costKeys.map((k) => (
              <Bar key={k} dataKey={k} stackId="a" fill={COST_COLORS[k]} radius={k === "marginPct" ? [4, 4, 0, 0] : undefined} />
            ))}
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 justify-center">
          {costKeys.map((k) => (
            <div key={k} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: COST_COLORS[k] }} />
              <span className="text-[11px] text-slate-500">{costLabels[k]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Numeric table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Channel</Th>
                <Th right>COGS</Th>
                <Th right>Marketing</Th>
                <Th right>Logistics</Th>
                <Th right>Platform Fee</Th>
                <Th right>Margin</Th>
              </tr>
            </thead>
            <tbody>
              {channelCostBreakdown.map((row) => (
                <tr key={row.channel} className="border-b border-slate-50">
                  <td className="px-3 py-3 font-semibold text-slate-800">{row.channel}</td>
                  <td className="px-3 py-3 text-right tabular text-slate-500">{row.cogsPct.toFixed(1)}%</td>
                  <td className="px-3 py-3 text-right tabular text-blue-500">{row.marketingPct.toFixed(1)}%</td>
                  <td className="px-3 py-3 text-right tabular text-amber-500">{row.logisticsPct.toFixed(1)}%</td>
                  <td className="px-3 py-3 text-right tabular font-bold text-red-500">
                    {row.platformPct.toFixed(1)}%
                    {row.platformPct === 0 && (
                      <span className="ml-1.5 text-[9px] font-semibold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full">None</span>
                    )}
                  </td>
                  <td className={`px-3 py-3 text-right tabular font-bold ${row.marginPct >= 20 ? "text-emerald-600" : row.marginPct >= 10 ? "text-amber-600" : "text-red-500"}`}>
                    {row.marginPct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Anomalies ────────────────────────────────────────────────────────

function AnomalyGroup({
  title,
  subtitle,
  color,
  skus,
  onSelect,
  cols,
}: {
  title: string;
  subtitle: string;
  color: "red" | "emerald" | "amber" | "blue";
  skus: ClassifiedSKU[];
  onSelect: (s: ClassifiedSKU) => void;
  cols: { label: string; value: (s: ClassifiedSKU) => React.ReactNode; right?: boolean }[];
}) {
  const borderCls = { red: "border-l-red-500", emerald: "border-l-emerald-500", amber: "border-l-amber-500", blue: "border-l-blue-500" }[color];
  const countCls  = { red: "text-red-600", emerald: "text-emerald-600", amber: "text-amber-600", blue: "text-blue-600" }[color];

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className={`px-5 py-4 border-b border-slate-100 border-l-4 ${borderCls}`}>
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-bold tabular ${countCls}`}>{skus.length}</span>
          <div>
            <p className="text-sm font-semibold text-slate-800">{title}</p>
            <p className="text-[11px] text-slate-400">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto max-h-64 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-slate-100">
              {cols.map((c) => <Th key={c.label} right={c.right}>{c.label}</Th>)}
            </tr>
          </thead>
          <tbody>
            {skus.map((s) => (
              <tr
                key={s.sku_id}
                className="border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer transition-colors"
                onClick={() => onSelect(s)}
              >
                {cols.map((c) => (
                  <td key={c.label} className={`px-3 py-2 ${c.right ? "text-right tabular" : ""}`}>
                    {c.value(s)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnomaliesTab({ onSelect }: { onSelect: (s: ClassifiedSKU) => void }) {
  return (
    <div className="space-y-5">
      {/* Correlation callout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KPICard title="Rating–Profit Correlation" value={`r = ${ratingProfitCorrelation.toFixed(3)}`} subtitle="near-zero — rating is not a proxy for profitability" color="blue" />
        <KPICard title="Return–Rating Surprises" value={`${returnRatingAnomalies.highReturnGoodRating.length} SKUs`} subtitle="high return rate (>20%) despite great rating (≥4.0★)" color="amber" />
      </div>

      <InsightBanner
        color="blue"
        title="Rating and profit are essentially uncorrelated (r ≈ 0.010)"
        body="A 5-star product is not automatically profitable. Selling price (r = 0.60) and margin % (r = 0.57) are the real profit drivers. Optimizing for ratings alone is a flawed strategy — price and cost structure are what matter."
      />

      <AnomalyGroup
        title="High Margin, Terrible Rating"
        subtitle="margin > 40% but avg_rating < 2.0 — economics are fine, experience is broken"
        color="amber"
        skus={anomalies.highMarginBadRating}
        onSelect={onSelect}
        cols={[
          { label: "SKU", value: (s) => <span className="font-semibold text-slate-800">{s.sku_id}</span> },
          { label: "Brand", value: (s) => <span className="text-slate-500">{s.brand}</span> },
          { label: "Category", value: (s) => <span className="text-slate-500">{s.category}</span> },
          { label: "Margin%", right: true, value: (s) => <span className="font-bold text-emerald-600">{formatPercent(s.margin_pct)}</span> },
          { label: "Rating", right: true, value: (s) => <span className="font-bold text-red-500">★ {s.avg_rating.toFixed(1)}</span> },
        ]}
      />

      <AnomalyGroup
        title="Negative Margin, Great Rating"
        subtitle="margin < 0 but avg_rating ≥ 4.0 — customers love it, pricing is wrong"
        color="emerald"
        skus={anomalies.negMarginGoodRating}
        onSelect={onSelect}
        cols={[
          { label: "SKU", value: (s) => <span className="font-semibold text-slate-800">{s.sku_id}</span> },
          { label: "Brand", value: (s) => <span className="text-slate-500">{s.brand}</span> },
          { label: "Channel", value: (s) => <span className="text-slate-500">{s.channel}</span> },
          { label: "Margin%", right: true, value: (s) => <span className="font-bold text-red-500">{formatPercent(s.margin_pct)}</span> },
          { label: "Rating", right: true, value: (s) => <span className="font-bold text-emerald-600">★ {s.avg_rating.toFixed(1)}</span> },
          { label: "Loss/mo", right: true, value: (s) => <span className="font-bold text-red-500">{formatCurrency(Math.abs(s.monthly_profit))}</span> },
        ]}
      />

      <AnomalyGroup
        title="Mislabeled Decline"
        subtitle="lifecycle_stage = Decline but margin > 35% — actually healthy, wrongly tagged"
        color="blue"
        skus={anomalies.declineMislabeled}
        onSelect={onSelect}
        cols={[
          { label: "SKU", value: (s) => <span className="font-semibold text-slate-800">{s.sku_id}</span> },
          { label: "Brand", value: (s) => <span className="text-slate-500">{s.brand}</span> },
          { label: "Category", value: (s) => <span className="text-slate-500">{s.category}</span> },
          { label: "Margin%", right: true, value: (s) => <span className="font-bold text-emerald-600">{formatPercent(s.margin_pct)}</span> },
          { label: "Units/mo", right: true, value: (s) => <span className="tabular text-slate-500">{formatNumber(s.monthly_units)}</span> },
          { label: "Profit/mo", right: true, value: (s) => <span className="font-bold text-emerald-600">{formatCurrency(s.monthly_profit)}</span> },
        ]}
      />

      <AnomalyGroup
        title="Early Death Signals"
        subtitle="lifecycle_stage = Launch but already losing money — needs immediate review"
        color="red"
        skus={anomalies.earlyDeathSignals}
        onSelect={onSelect}
        cols={[
          { label: "SKU", value: (s) => <span className="font-semibold text-slate-800">{s.sku_id}</span> },
          { label: "Brand", value: (s) => <span className="text-slate-500">{s.brand}</span> },
          { label: "Channel", value: (s) => <span className="text-slate-500">{s.channel}</span> },
          { label: "Margin%", right: true, value: (s) => <span className="font-bold text-red-500">{formatPercent(s.margin_pct)}</span> },
          { label: "Months Listed", right: true, value: (s) => <span className="tabular text-slate-500">{s.months_listed}mo</span> },
          { label: "Loss/mo", right: true, value: (s) => <span className="font-bold text-red-500">{formatCurrency(Math.abs(s.monthly_profit))}</span> },
        ]}
      />
    </div>
  );
}

// ─── Tab: Brand & Category ─────────────────────────────────────────────────

function BrandCategoryTab() {
  return (
    <div className="space-y-5">
      {/* Brand table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-800">Brand Health</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Sorted by avg margin — highest to lowest</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Brand</Th>
                <Th right>SKUs</Th>
                <Th right>Avg Margin</Th>
                <Th right>Zombies</Th>
                <Th right>Gems</Th>
                <Th right>Monthly Revenue</Th>
                <Th right>Monthly Profit</Th>
              </tr>
            </thead>
            <tbody>
              {brandRows.map((r) => (
                <tr key={r.brand} className="border-b border-slate-50">
                  <td className="px-3 py-3 font-semibold text-slate-800">{r.brand}</td>
                  <td className="px-3 py-3 text-right tabular text-slate-500">{r.count}</td>
                  <td className={`px-3 py-3 text-right tabular font-bold ${r.avgMargin >= 20 ? "text-emerald-600" : r.avgMargin >= 15 ? "text-amber-600" : "text-red-500"}`}>
                    {formatPercent(r.avgMargin)}
                  </td>
                  <td className="px-3 py-3 text-right tabular text-red-500 font-semibold">{r.zombies}</td>
                  <td className="px-3 py-3 text-right tabular text-emerald-600 font-semibold">{r.gems}</td>
                  <td className="px-3 py-3 text-right tabular text-slate-500">{formatCurrency(r.monthlyRevenue)}</td>
                  <td className={`px-3 py-3 text-right tabular font-bold ${r.monthlyProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {formatCurrency(r.monthlyProfit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-800">Category Rankings</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Sorted by avg margin — Hair Oil tops, Serum has most zombies</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Category</Th>
                <Th right>SKUs</Th>
                <Th right>Avg Margin</Th>
                <Th right>Zombies</Th>
                <Th right>Gems</Th>
                <Th right>Monthly Profit</Th>
              </tr>
            </thead>
            <tbody>
              {categoryRows.map((r, i) => (
                <tr key={r.cat} className="border-b border-slate-50">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-300">#{i + 1}</span>
                      <span className="font-semibold text-slate-800">{r.cat}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular text-slate-500">{r.count}</td>
                  <td className={`px-3 py-2.5 text-right tabular font-bold ${r.avgMargin >= 22 ? "text-emerald-600" : r.avgMargin >= 15 ? "text-amber-600" : "text-red-500"}`}>
                    {formatPercent(r.avgMargin)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular text-red-500 font-semibold">{r.zombies}</td>
                  <td className="px-3 py-2.5 text-right tabular text-emerald-600 font-semibold">{r.gems}</td>
                  <td className={`px-3 py-2.5 text-right tabular font-bold ${r.monthlyProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {formatCurrency(r.monthlyProfit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lifecycle table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-800">Lifecycle Stage Analysis</p>
          <p className="text-[11px] text-slate-400 mt-0.5">34 Decline SKUs still earn &gt;35% margin — mislabeled. 28 Launch SKUs already losing money.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Stage</Th>
                <Th right>SKUs</Th>
                <Th right>Avg Margin</Th>
                <Th right>Zombies</Th>
                <Th right>Gems</Th>
                <Th right>Monthly Profit</Th>
              </tr>
            </thead>
            <tbody>
              {lifecycleRows.map((r) => (
                <tr key={r.stage} className="border-b border-slate-50">
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      r.stage === "Launch"  ? "bg-blue-50 text-blue-600" :
                      r.stage === "Growth"  ? "bg-emerald-50 text-emerald-600" :
                      r.stage === "Mature"  ? "bg-amber-50 text-amber-600" :
                      "bg-slate-100 text-slate-500"
                    }`}>
                      {r.stage}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right tabular text-slate-500">{r.count}</td>
                  <td className={`px-3 py-3 text-right tabular font-bold ${r.avgMargin >= 20 ? "text-emerald-600" : r.avgMargin >= 15 ? "text-amber-600" : "text-red-500"}`}>
                    {formatPercent(r.avgMargin)}
                  </td>
                  <td className="px-3 py-3 text-right tabular text-red-500 font-semibold">{r.zombies}</td>
                  <td className="px-3 py-3 text-right tabular text-emerald-600 font-semibold">{r.gems}</td>
                  <td className={`px-3 py-3 text-right tabular font-bold ${r.monthlyProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {formatCurrency(r.monthlyProfit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Gateway ───────────────────────────────────────────────────────────

function GatewayTab({ onSelect }: { onSelect: (s: ClassifiedSKU) => void }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Gateway SKUs"          value={String(gateways.length)}    subtitle="protected from zombie classification"     color="amber" />
        <KPICard title="Repeat Rate Threshold" value="> 50%"                       subtitle="repeat purchase rate triggers exemption"  color="amber" />
        <KPICard title="Avg Repeat Rate"       value={formatPercent(gateways.reduce((s, g) => s + g.repeat_purchase_rate_pct, 0) / gateways.length)} subtitle="customers come back compulsively" color="amber" />
      </div>

      <InsightBanner
        color="amber"
        title="These look like zombies — thin margins, sometimes negative — but they anchor subscription revenue"
        body="Gateway products (repeat purchase rate > 50%) are brand entry points. Customers buy protein powder or a supplement at a loss-making price, then reorder every month for years. The LTV from the relationship far exceeds the per-unit loss. Killing a gateway product can collapse an entire customer cohort's revenue stream."
      />

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-800">Gateway Products — Sorted by Repeat Rate</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <Th>SKU</Th>
                <Th>Brand</Th>
                <Th>Category</Th>
                <Th>Channel</Th>
                <Th right>Repeat Rate</Th>
                <Th right>Margin%</Th>
                <Th right>Units/mo</Th>
                <Th right>Profit/mo</Th>
              </tr>
            </thead>
            <tbody>
              {sortedGateways.map((s) => (
                <tr
                  key={s.sku_id}
                  className="border-b border-slate-50 hover:bg-amber-50/40 cursor-pointer transition-colors"
                  onClick={() => onSelect(s)}
                >
                  <td className="px-3 py-2.5 font-semibold text-slate-800">{s.sku_id}</td>
                  <td className="px-3 py-2.5 text-slate-500">{s.brand}</td>
                  <td className="px-3 py-2.5 text-slate-500">{s.category}</td>
                  <td className="px-3 py-2.5 text-slate-500">{s.channel}</td>
                  <td className="px-3 py-2.5 text-right tabular font-bold text-amber-600">
                    {formatPercent(s.repeat_purchase_rate_pct)}
                  </td>
                  <td className={`px-3 py-2.5 text-right tabular font-bold ${s.margin_pct >= 0 ? "text-slate-600" : "text-red-500"}`}>
                    {formatPercent(s.margin_pct)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular text-slate-500">{formatNumber(s.monthly_units)}</td>
                  <td className={`px-3 py-2.5 text-right tabular font-bold ${s.monthly_profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {formatCurrency(s.monthly_profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Pareto ────────────────────────────────────────────────────────────

function ParetoTab() {
  const bot50StartRank = Math.round(paretoData.length * 0.5);
  const bot50Pct = Math.round(
    (paretoData[paretoData.length - 1].cumulativePct -
      (paretoData[bot50StartRank - 1]?.cumulativePct ?? 0)) * 10
  ) / 10;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Top 20% SKUs"       value={`${TOP20_RANK} SKUs`}  subtitle={`drive ${TOP20_PCT}% of total revenue`}           color="blue" />
        <KPICard title="Bottom 50% SKUs"    value="300 SKUs"              subtitle={`generate only ${bot50Pct.toFixed(1)}% of revenue`} color="red" />
        <KPICard title="Concentration Risk" value="High"                  subtitle="losing any top SKU has outsized P&L impact"         color="amber" />
      </div>

      <InsightBanner
        color="blue"
        title="Top 20% of SKUs generate 50.2% of revenue — Pareto holds"
        body="Revenue is highly concentrated. The top 120 SKUs are disproportionately important to protect and grow. Any disruption to these — supply issues, channel delisting, rating drops — has 2.5× the P&L impact of an equivalent issue in the bottom half of the portfolio."
      />

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <p className="text-sm font-semibold text-slate-800 mb-1">Revenue Concentration Curve</p>
        <p className="text-[11px] text-slate-400 mb-5">
          X = SKU rank (1–600, sorted by revenue). Y = cumulative revenue %. Dashed lines at top 20%.
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={paretoChart} margin={{ top: 8, right: 16, bottom: 8, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis
              dataKey="rank"
              tick={{ fontSize: 10, fill: "#94A3B8" }}
              axisLine={false}
              tickLine={false}
              label={{ value: "SKU Rank", position: "insideBottom", offset: -4, fontSize: 10, fill: "#94A3B8" }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#94A3B8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
            />
            <Tooltip
              formatter={(v) => [`${Number(v).toFixed(1)}%`, "Cumulative Revenue"]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}
            />
            {/* Reference lines at 20% SKU rank */}
            <ReferenceLine x={TOP20_RANK} stroke="#94A3B8" strokeDasharray="4 4" />
            <ReferenceLine y={TOP20_PCT} stroke="#94A3B8" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="pct"
              stroke="#3B82F6"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top 20 SKUs table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-800">Top 20 Revenue SKUs</p>
          <p className="text-[11px] text-slate-400 mt-0.5">These are the assets to protect above all else</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Rank</Th>
                <Th>SKU</Th>
                <Th>Brand</Th>
                <Th>Category</Th>
                <Th right>Monthly Revenue</Th>
                <Th right>Cumulative %</Th>
              </tr>
            </thead>
            <tbody>
              {paretoData.slice(0, 20).map((d, i) => (
                <tr key={d.skuId} className="border-b border-slate-50">
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] font-bold text-slate-300">#{i + 1}</span>
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-slate-800">{d.skuId}</td>
                  <td className="px-3 py-2.5 text-slate-500">
                    {/* look up brand from skuId pattern */}
                    {d.skuId.startsWith("BB") ? "Be Bodywise" : d.skuId.startsWith("MM") ? "Man Matters" : "Little Joys"}
                  </td>
                  <td className="px-3 py-2.5 text-slate-400 text-[10px]">{d.skuId}</td>
                  <td className="px-3 py-2.5 text-right tabular font-bold text-blue-600">
                    {formatCurrency(d.revenue)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular text-slate-500">
                    {d.cumulativePct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Inventory Risk ────────────────────────────────────────────────────

function InventoryTab({ onSelect }: { onSelect: (s: ClassifiedSKU) => void }) {
  const trappedCash = deadstockRisk.reduce(
    (s, d) => s + d.days_of_inventory * d.monthly_units * d.cogs / 30,
    0
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Deadstock SKUs"    value={String(deadstockRisk.length)}                  subtitle=">90 days inventory, <100 units/month"   color="red" />
        <KPICard title="Trapped Cash (est.)" value={formatCurrency(trappedCash)}                  subtitle="COGS sitting in slow-moving inventory"  color="red" />
        <KPICard title="Max Days of Stock" value={`${deadstockRisk[0]?.days_of_inventory ?? 0}d`} subtitle="worst-case inventory overhang"           color="amber" />
      </div>

      <InsightBanner
        color="red"
        title="Deadstock = cash trapped in a warehouse earning zero return"
        body="These SKUs have 90+ days of inventory sitting unsold at current sales velocity. Every day they sit, the business carries COGS cost with no revenue. For perishable or trend-sensitive categories, this deteriorates to write-off. Action: clearance pricing, channel reallocation, or supplier negotiation to reduce reorder quantity."
      />

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-800">Deadstock Risk — Sorted by Days of Inventory</p>
          <p className="text-[11px] text-slate-400 mt-0.5">High inventory + low velocity = cash trap</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <Th>SKU</Th>
                <Th>Brand</Th>
                <Th>Category</Th>
                <Th>Channel</Th>
                <Th right>Days of Stock</Th>
                <Th right>Units/mo</Th>
                <Th right>Margin%</Th>
                <Th right>Classification</Th>
              </tr>
            </thead>
            <tbody>
              {deadstockRisk.map((s) => (
                <tr
                  key={s.sku_id}
                  className="border-b border-slate-50 hover:bg-red-50/30 cursor-pointer transition-colors"
                  onClick={() => onSelect(s)}
                >
                  <td className="px-3 py-2.5 font-semibold text-slate-800">{s.sku_id}</td>
                  <td className="px-3 py-2.5 text-slate-500">{s.brand}</td>
                  <td className="px-3 py-2.5 text-slate-500">{s.category}</td>
                  <td className="px-3 py-2.5 text-slate-500">{s.channel}</td>
                  <td className="px-3 py-2.5 text-right tabular font-bold text-red-500">
                    {s.days_of_inventory}d
                  </td>
                  <td className="px-3 py-2.5 text-right tabular text-slate-500">{formatNumber(s.monthly_units)}</td>
                  <td className={`px-3 py-2.5 text-right tabular font-bold ${s.margin_pct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {formatPercent(s.margin_pct)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                      s.classification === "zombie"  ? "bg-red-50 text-red-600" :
                      s.classification === "gem"     ? "bg-emerald-50 text-emerald-600" :
                      s.classification === "gateway" ? "bg-amber-50 text-amber-600" :
                      "bg-slate-100 text-slate-500"
                    }`}>
                      {s.classification}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Strategy ─────────────────────────────────────────────────────────

type StrategySub = "launch" | "brand" | "cannibalization" | "roi" | "rationalize" | "price";

const STRATEGY_SUBNAV: Array<{ id: StrategySub; label: string; badge?: number }> = [
  { id: "launch",          label: "Launch Funnel",    badge: launchSuccessRate.failing },
  { id: "brand",           label: "Brand Health",     badge: brandZombieRate.length },
  { id: "cannibalization", label: "Cannibalization",  badge: cannibalizationGroups.length },
  { id: "roi",             label: "Mktg ROI"                                               },
  { id: "rationalize",     label: "Rationalization",  badge: rationalizationSummary.count  },
  { id: "price",           label: "Price Ladder",     badge: priceLadder.length            },
];

function StrategyTab({ onSelect }: { onSelect: (s: ClassifiedSKU) => void }) {
  const [sub, setSub] = useState<StrategySub>("launch");

  return (
    <div className="space-y-5">
      {/* Sub-navigation */}
      <SubNav items={STRATEGY_SUBNAV} active={sub} onChange={setSub} />

      {/* ── Launch Funnel ── */}
      {sub === "launch" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KPICard title="Launch Success Rate" value={`${launchSuccessRate.successRate.toFixed(0)}%`} subtitle={`${launchSuccessRate.profitable} of ${launchSuccessRate.total} launches are profitable`} color="amber" />
            <KPICard title="Failing at Launch"   value={String(launchSuccessRate.failing)}              subtitle="Products losing money before they've scaled"          color="red" />
            <KPICard title="Launch SKUs Total"   value={String(launchSuccessRate.total)}                subtitle="Currently in Launch lifecycle stage"                  color="blue" />
          </div>
          <InsightBanner
            color="amber"
            title={`${launchSuccessRate.failing} products are losing money before they've even scaled`}
            body="A launch-stage SKU with negative margins is an early death signal — not a growth problem. At this point the cost structure is wrong, not the sales volume. These need pricing or channel review immediately, not more marketing spend."
          />
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">Failing Launch SKUs — Worst First</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-slate-100"><Th>SKU</Th><Th>Brand</Th><Th>Category</Th><Th>Channel</Th><Th right>Margin%</Th><Th right>Monthly Loss</Th></tr></thead>
                <tbody>
                  {launchSuccessRate.failingSkus.map((s) => (
                    <tr key={s.sku_id} className="border-b border-slate-50 hover:bg-amber-50/30 cursor-pointer transition-colors" onClick={() => onSelect(s)}>
                      <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{s.sku_id}</td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{s.brand}</td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{s.category}</td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{s.channel}</td>
                      <td className="px-3 py-2.5 text-right tabular font-bold text-red-500 whitespace-nowrap">{formatPercent(s.margin_pct)}</td>
                      <td className="px-3 py-2.5 text-right tabular font-bold text-red-600 whitespace-nowrap">{formatCurrency(s.monthly_profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Brand Health ── */}
      {sub === "brand" && (
        <div className="space-y-4">
          <InsightBanner
            color="red"
            title="Zombie rate (%) reveals brand strategy problems — not just SKU problems"
            body="Little Joys has more zombies in absolute count AND as a proportion of its portfolio. Count hides the structural issue: one brand is systematically launching or retaining unprofitable SKUs at a higher rate than the others."
          />
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <Th>Brand</Th><Th right>Total SKUs</Th><Th right>Zombies</Th><Th right>Zombie Rate</Th>
                    <Th right>Gems</Th><Th right>Gem Rate</Th><Th right>Avg Margin</Th><Th right>Monthly Profit</Th>
                  </tr>
                </thead>
                <tbody>
                  {brandZombieRate.map((r) => (
                    <tr key={r.brand} className="border-b border-slate-50">
                      <td className="px-3 py-3 font-semibold text-slate-800">{r.brand}</td>
                      <td className="px-3 py-3 text-right tabular text-slate-500">{r.count}</td>
                      <td className="px-3 py-3 text-right tabular font-bold text-red-500">{r.zombies}</td>
                      <td className="px-3 py-3 text-right tabular font-bold">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${r.zombieRate > 25 ? "bg-red-50 text-red-600" : r.zombieRate > 20 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-700"}`}>
                          {r.zombieRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right tabular text-emerald-600 font-semibold">{r.gems}</td>
                      <td className="px-3 py-3 text-right tabular text-emerald-600">{r.gemRate.toFixed(1)}%</td>
                      <td className={`px-3 py-3 text-right tabular font-bold ${r.avgMargin >= 20 ? "text-emerald-600" : r.avgMargin >= 15 ? "text-amber-600" : "text-red-500"}`}>{formatPercent(r.avgMargin)}</td>
                      <td className={`px-3 py-3 text-right tabular font-bold ${r.monthlyProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>{formatCurrency(r.monthlyProfit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Cannibalization ── */}
      {sub === "cannibalization" && (
        <div className="space-y-4">
          <InsightBanner
            color="blue"
            title={`${cannibalizationGroups.length} groups of SKUs are competing with themselves`}
            body="Same brand, same sub-category, same channel — MRP within 15% of each other. These SKUs split demand instead of growing it. A customer choosing between two nearly-identical products at the same price is a customer you've already won; you're just splitting their spend across two SKUs, inflating the total SKU count with no incremental revenue."
          />
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">Cannibalizing SKU Groups</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Same brand · same sub-category · same channel · MRP within 15%</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <Th>Brand</Th><Th>Sub-Category</Th><Th>Channel</Th>
                    <Th right>SKUs</Th><Th right>MRP Range</Th><Th right>Avg Margin</Th><Th right>Monthly Revenue</Th><Th right>Has Zombies</Th>
                  </tr>
                </thead>
                <tbody>
                  {cannibalizationGroups.map((g, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{g.brand}</td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{g.subCategory}</td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{g.channel}</td>
                      <td className="px-3 py-2.5 text-right tabular font-bold text-blue-600">{g.skuCount}</td>
                      <td className="px-3 py-2.5 text-right tabular text-slate-500 whitespace-nowrap">₹{g.minMrp.toLocaleString("en-IN")}–₹{g.maxMrp.toLocaleString("en-IN")}</td>
                      <td className={`px-3 py-2.5 text-right tabular font-bold ${g.avgMargin >= 0 ? "text-emerald-600" : "text-red-500"}`}>{formatPercent(g.avgMargin)}</td>
                      <td className="px-3 py-2.5 text-right tabular text-slate-500">{formatCurrency(g.totalMonthlyRevenue)}</td>
                      <td className="px-3 py-2.5 text-right">
                        {g.hasZombies
                          ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 text-red-600">Yes</span>
                          : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-400">No</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Marketing ROI ── */}
      {sub === "roi" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KPICard title="Gems avg ROI"    value={`${avgROIByClassification.gem.toFixed(1)}×`}     subtitle="Revenue per ₹1 of marketing spend" color="green" />
            <KPICard title="Zombies avg ROI" value={`${avgROIByClassification.zombie.toFixed(1)}×`}  subtitle="Revenue per ₹1 of marketing spend" color="red" />
            <KPICard title="Gateway avg ROI" value={`${avgROIByClassification.gateway.toFixed(1)}×`} subtitle="Revenue per ₹1 of marketing spend" color="amber" />
            <KPICard title="Healthy avg ROI" value={`${avgROIByClassification.healthy.toFixed(1)}×`} subtitle="Revenue per ₹1 of marketing spend" color="blue" />
          </div>
          <InsightBanner
            color="emerald"
            title="Gems earn more revenue per marketing rupee — not just more margin"
            body="Marketing ROI = monthly revenue ÷ (marketing cost per unit × monthly units). A gem with 3× ROI turns every ₹1 of ad spend into ₹3 of revenue. A zombie at 0.8× destroys value before cost structure is even considered. Reallocating marketing budget from zombies to gems compounds returns at both the revenue and margin level."
          />
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">Top 20 vs Bottom 20 — Marketing ROI</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Click any row to inspect the SKU</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
              <div className="overflow-x-auto">
                <div className="px-4 py-2.5 bg-emerald-50/60 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Top 20 — Highest ROI</p>
                </div>
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-slate-100"><Th>SKU</Th><Th>Brand</Th><Th right>ROI</Th><Th right>Margin</Th></tr></thead>
                  <tbody>
                    {topMarketingROI.map((s) => (
                      <tr key={s.sku_id} className="border-b border-slate-50 hover:bg-emerald-50/30 cursor-pointer transition-colors" onClick={() => onSelect(s)}>
                        <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{s.sku_id}</td>
                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{s.brand}</td>
                        <td className="px-3 py-2.5 text-right tabular font-bold text-emerald-600">{s.marketingRoi.toFixed(1)}×</td>
                        <td className="px-3 py-2.5 text-right tabular font-semibold text-slate-600">{formatPercent(s.margin_pct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="overflow-x-auto">
                <div className="px-4 py-2.5 bg-red-50/60 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Bottom 20 — Lowest ROI</p>
                </div>
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-slate-100"><Th>SKU</Th><Th>Brand</Th><Th right>ROI</Th><Th right>Margin</Th></tr></thead>
                  <tbody>
                    {worstMarketingROI.map((s) => (
                      <tr key={s.sku_id} className="border-b border-slate-50 hover:bg-red-50/30 cursor-pointer transition-colors" onClick={() => onSelect(s)}>
                        <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{s.sku_id}</td>
                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{s.brand}</td>
                        <td className="px-3 py-2.5 text-right tabular font-bold text-red-500">{s.marketingRoi.toFixed(1)}×</td>
                        <td className="px-3 py-2.5 text-right tabular font-semibold text-slate-600">{formatPercent(s.margin_pct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Rationalization ── */}
      {sub === "rationalize" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KPICard title="Candidates"      value={String(rationalizationSummary.count)}             subtitle="Under ₹50K/mo revenue AND under 15% margin"   color="red" />
            <KPICard title="Revenue at Stake" value={formatCurrency(rationalizationSummary.totalRevenue)} subtitle="Monthly revenue from these long-tail SKUs"   color="amber" />
            <KPICard title="Avg Margin"      value={formatPercent(rationalizationSummary.avgMargin)}   subtitle="Average across all rationalization candidates" color="gray" />
          </div>
          <InsightBanner
            color="red"
            title={`${rationalizationSummary.count} SKUs generate under ₹50K/month at under 15% margin`}
            body="These long-tail SKUs contribute almost nothing to revenue but consume full ops bandwidth — warehouse space, procurement cycles, listing management, inventory planning. Cutting them doesn't shrink the business; it shrinks the complexity that is hiding it."
          />
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">Rationalization Candidates — Worst First</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Gateway SKUs excluded (high repeat rate protects them)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <Th>SKU</Th><Th>Brand</Th><Th>Channel</Th><Th>Type</Th>
                    <Th right>Monthly Revenue</Th><Th right>Margin%</Th><Th right>Monthly Profit</Th>
                  </tr>
                </thead>
                <tbody>
                  {rationalizationCandidates.map((s) => (
                    <tr key={s.sku_id} className="border-b border-slate-50 hover:bg-red-50/20 cursor-pointer transition-colors" onClick={() => onSelect(s)}>
                      <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{s.sku_id}</td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{s.brand}</td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{s.channel}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${s.classification === "zombie" ? "bg-red-50 text-red-600" : s.classification === "gem" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {s.classification}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular text-slate-600 whitespace-nowrap">{formatCurrency(s.monthly_revenue)}</td>
                      <td className={`px-3 py-2.5 text-right tabular font-bold ${s.margin_pct >= 0 ? "text-amber-600" : "text-red-500"}`}>{formatPercent(s.margin_pct)}</td>
                      <td className={`px-3 py-2.5 text-right tabular font-bold ${s.monthly_profit >= 0 ? "text-slate-600" : "text-red-500"}`}>{formatCurrency(s.monthly_profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Price Ladder ── */}
      {sub === "price" && (
        <div className="space-y-4">
          <InsightBanner
            color="blue"
            title="Crowded price tiers = internal price competition. Gaps = unserved customer segments."
            body="The crowding score shows how many SKUs cluster within 15% of each other in MRP. High crowding means customers see near-identical price options from the same brand — internal competition, not market coverage. A high MRP range with low crowding suggests a healthy price ladder with options at each tier."
          />
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <Th>Sub-Category</Th><Th right>SKUs</Th><Th right>Min MRP</Th><Th right>Max MRP</Th>
                    <Th right>Price Range</Th><Th right>Crowding Score</Th><Th right>Avg Margin</Th>
                  </tr>
                </thead>
                <tbody>
                  {priceLadder.map((r) => (
                    <tr key={r.subCategory} className="border-b border-slate-50">
                      <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{r.subCategory}</td>
                      <td className="px-3 py-2.5 text-right tabular text-slate-500">{r.count}</td>
                      <td className="px-3 py-2.5 text-right tabular text-slate-500 whitespace-nowrap">₹{r.minMrp.toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2.5 text-right tabular text-slate-500 whitespace-nowrap">₹{r.maxMrp.toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2.5 text-right tabular text-slate-500 whitespace-nowrap">₹{r.mrpRange.toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2.5 text-right tabular">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${r.crowdingScore >= 5 ? "bg-red-50 text-red-600" : r.crowdingScore >= 3 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-700"}`}>
                          {r.crowdingScore} SKUs
                        </span>
                      </td>
                      <td className={`px-3 py-2.5 text-right tabular font-bold ${r.avgMargin >= 20 ? "text-emerald-600" : r.avgMargin >= 10 ? "text-amber-600" : "text-red-500"}`}>
                        {formatPercent(r.avgMargin)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("arbitrage");
  const [detailSKU, setDetailSKU] = useState<ClassifiedSKU | null>(null);

  return (
    <div className="px-4 py-6 lg:px-8 space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="gradient-mesh rounded-2xl px-6 py-5 -mx-1">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">Deep Insights</h1>
        <p className="text-sm text-slate-500 mt-1.5">
          Non-obvious patterns across 600 SKUs — the discoveries that change the strategy.
        </p>
      </div>

      {/* Tab bar */}
      <div className="overflow-x-auto -mx-1 pb-1">
        <div className="flex gap-1.5 min-w-max px-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-blue-500 text-white shadow-sm"
                  : "bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 shadow-sm border border-slate-100"
              }`}
            >
              {tab.label}
              {tab.badge !== null && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "arbitrage" && <ArbitrageTab onSelect={setDetailSKU} />}
        {activeTab === "cost"      && <CostTab />}
        {activeTab === "anomalies" && <AnomaliesTab onSelect={setDetailSKU} />}
        {activeTab === "brand"     && <BrandCategoryTab />}
        {activeTab === "gateway"   && <GatewayTab onSelect={setDetailSKU} />}
        {activeTab === "pareto"    && <ParetoTab />}
        {activeTab === "inventory" && <InventoryTab onSelect={setDetailSKU} />}
        {activeTab === "strategy"  && <StrategyTab onSelect={setDetailSKU} />}
      </div>

      <SKUDetailPanel sku={detailSKU} onClose={() => setDetailSKU(null)} />
    </div>
  );
}
