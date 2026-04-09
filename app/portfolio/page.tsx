"use client";
import { useState, useMemo } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip,
  ReferenceLine, ReferenceArea, ResponsiveContainer, Cell,
} from "recharts";
import { allSKUs, gems } from "@/lib/data";
import type { ClassifiedSKU, Classification } from "@/lib/classify";
import {
  portfolioSummary,
  zombieBreakeven,
  channelFixCount,
  pricingFixCount,
  channelFitAnalysis,
  brandZombieRate,
  byChannel,
  topMarketingROI,
  worstMarketingROI,
  type ZombieWithBreakeven,
} from "@/lib/calculations";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import KPICard from "@/components/ui/KPICard";
import SKUDetailPanel from "@/components/ui/SKUDetailPanel";

// ─── Scatter chart constants ───────────────────────────────────────────────
const COLOR: Record<Classification, string> = {
  zombie:  "#EF4444",
  gem:     "#10B981",
  gateway: "#F59E0B",
  healthy: "#6B7280",
};

const FILTERS = [
  { key: "all"     as const, label: "All",      count: allSKUs.length },
  { key: "zombie"  as const, label: "Zombies",  count: allSKUs.filter(s => s.classification === "zombie").length },
  { key: "gem"     as const, label: "Gems",     count: allSKUs.filter(s => s.classification === "gem").length },
  { key: "gateway" as const, label: "Gateways", count: allSKUs.filter(s => s.classification === "gateway").length },
  { key: "healthy" as const, label: "Healthy",  count: allSKUs.filter(s => s.classification === "healthy").length },
];

const medianUnits = (() => {
  const sorted = [...allSKUs].map(s => s.monthly_units).sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
})();
const maxUnits  = Math.max(...allSKUs.map(s => s.monthly_units));
const minMargin = Math.min(...allSKUs.map(s => s.margin_pct));
const maxMargin = Math.max(...allSKUs.map(s => s.margin_pct));

// ─── Module-level precomputations ─────────────────────────────────────────
const profitRecovery  = portfolioSummary.profitAfterZombiesRemoved - portfolioSummary.totalMonthlyProfit;
const avgPricingGap   = pricingFixCount > 0
  ? zombieBreakeven.filter(z => z.recoveryType === "pricing").reduce((s, z) => s + z.priceGap, 0) / pricingFixCount
  : 0;
const channelRowsBase     = Object.entries(byChannel).map(([channel, d]) => ({ channel, ...d }));
const sortedBrandHealth   = [...brandZombieRate].sort((a, b) => b.zombieRate - a.zombieRate);
const sortedChannelHealth = [...channelRowsBase].sort((a, b) => b.monthlyLoss - a.monthlyLoss);

// ─── Tooltip ──────────────────────────────────────────────────────────────
interface TooltipPayload { payload: ClassifiedSKU; }
function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const s = payload[0].payload;
  return (
    <div className="bg-slate-900 text-white rounded-lg shadow-xl p-3 text-xs max-w-[200px]">
      <p className="font-semibold text-sm mb-1">{s.sku_id}</p>
      <p className="text-slate-400">{s.brand} · {s.channel}</p>
      <div className="mt-2 space-y-1 border-t border-slate-700 pt-2">
        <p>Margin: <span className={`font-semibold ${s.margin_pct < 0 ? "text-red-400" : "text-emerald-400"}`}>{formatPercent(s.margin_pct)}</span></p>
        <p>Profit: <span className={`font-semibold ${s.monthly_profit < 0 ? "text-red-400" : "text-emerald-400"}`}>{formatCurrency(s.monthly_profit)}</span></p>
      </div>
    </div>
  );
}

// ─── Fix Badge ────────────────────────────────────────────────────────────
function FixBadge({ sku }: { sku: ZombieWithBreakeven }) {
  if (sku.recoveryType === "channel") {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 rounded-full px-2 py-0.5 ring-1 ring-blue-100"
        title={`Move to D2C: +${sku.d2cDeltaMargin.toFixed(1)}pp margin`}
      >
        ↗ Move to D2C
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 rounded-full px-2 py-0.5 ring-1 ring-amber-100"
      title={`Raise price by ₹${sku.priceGap.toFixed(0)} to break even`}
    >
      ₹ Reprice +{Math.ceil(sku.priceGap)}
    </span>
  );
}

// ─── Mini gem score bar ────────────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] font-bold tabular-nums text-slate-600">{score}</span>
    </div>
  );
}

type TabKey = "kill" | "quickwins" | "scale" | "health";
type KillSortField = "monthly_profit" | "margin_pct" | "zombie_score" | "brand";
type QuickWinsSortKey = "spread_desc" | "spread_asc" | "best_margin_desc" | "sku_count_desc";
type ScaleSortKey = "gem_score_desc" | "margin_desc" | "repeat_desc" | "units_desc";

// Clickable sortable column header with ↑↓ indicator
function SortTh({
  children, active, dir, onClick, align = "right",
}: {
  children: React.ReactNode;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <th
      onClick={onClick}
      className={`px-3 py-3 text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors ${
        active ? "text-slate-700" : "text-slate-400 hover:text-slate-600"
      } ${align === "right" ? "text-right" : "text-left"}`}
    >
      <span className={`inline-flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""}`}>
        {children}
        <span className="inline-flex flex-col gap-px leading-none">
          <svg className={`w-[7px] h-[5px] ${active && dir === "asc" ? "text-slate-700" : "text-slate-300"}`} viewBox="0 0 7 5" fill="currentColor"><path d="M3.5 0 7 5H0z"/></svg>
          <svg className={`w-[7px] h-[5px] ${active && dir === "desc" ? "text-slate-700" : "text-slate-300"}`} viewBox="0 0 7 5" fill="currentColor"><path d="M3.5 5 0 0h7z"/></svg>
        </span>
      </span>
    </th>
  );
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "kill",      label: "Kill List" },
  { key: "quickwins", label: "Quick Wins" },
  { key: "scale",     label: "Scale Up" },
  { key: "health",    label: "Health" },
];

export default function PortfolioPage() {
  const [activeTab, setActiveTab]           = useState<TabKey>("kill");
  const [showAllKill, setShowAllKill]       = useState(false);
  const [showROIRealloc, setShowROIRealloc] = useState(false);
  const [killSortField, setKillSortField]   = useState<KillSortField>("monthly_profit");
  const [killSortDir, setKillSortDir]       = useState<"asc" | "desc">("asc");
  const [quickWinsSort, setQuickWinsSort]   = useState<QuickWinsSortKey>("spread_desc");
  const [graphExpanded, setGraphExpanded]   = useState(false);
  const [scaleSort, setScaleSort]         = useState<ScaleSortKey>("gem_score_desc");
  const [activeFilter, setActiveFilter]   = useState<Classification | "all">("all");
  const [selectedSKU, setSelectedSKU]     = useState<ClassifiedSKU | null>(null);

  const filteredData = useMemo(
    () => activeFilter === "all" ? allSKUs : allSKUs.filter(s => s.classification === activeFilter),
    [activeFilter]
  );

  const toggleKillSort = (field: KillSortField) => {
    if (killSortField === field) {
      setKillSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setKillSortField(field);
      // defaults: score desc (worst first), everything else asc (worst first naturally)
      setKillSortDir(field === "zombie_score" ? "desc" : "asc");
    }
  };

  const sortedKillList = useMemo(() => {
    const rows = [...zombieBreakeven];
    if (killSortField === "brand") {
      return rows.sort((a, b) =>
        killSortDir === "asc" ? a.brand.localeCompare(b.brand) : b.brand.localeCompare(a.brand)
      );
    }
    return rows.sort((a, b) =>
      killSortDir === "asc" ? a[killSortField] - b[killSortField] : b[killSortField] - a[killSortField]
    );
  }, [killSortField, killSortDir]);

  const sortedQuickWins = useMemo(() => {
    const rows = [...channelFitAnalysis];
    switch (quickWinsSort) {
      case "spread_asc":
        return rows.sort((a, b) => a.marginSpread - b.marginSpread);
      case "best_margin_desc":
        return rows.sort((a, b) => b.channelRankings[0].avgMargin - a.channelRankings[0].avgMargin);
      case "sku_count_desc":
        return rows.sort((a, b) => b.items.length - a.items.length);
      case "spread_desc":
      default:
        return rows.sort((a, b) => b.marginSpread - a.marginSpread);
    }
  }, [quickWinsSort]);

  const sortedScaleUp = useMemo(() => {
    const rows = [...gems];
    switch (scaleSort) {
      case "margin_desc":
        return rows.sort((a, b) => b.margin_pct - a.margin_pct).slice(0, 20);
      case "repeat_desc":
        return rows.sort((a, b) => b.repeat_purchase_rate_pct - a.repeat_purchase_rate_pct).slice(0, 20);
      case "units_desc":
        return rows.sort((a, b) => b.monthly_units - a.monthly_units).slice(0, 20);
      case "gem_score_desc":
      default:
        return rows.sort((a, b) => b.gem_score - a.gem_score).slice(0, 20);
    }
  }, [scaleSort]);


  const killListData = showAllKill ? sortedKillList : sortedKillList.slice(0, 25);
  const quickWinsData = sortedQuickWins.slice(0, 10);

  return (
    <div className="px-4 py-6 lg:px-8 space-y-5 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="gradient-mesh rounded-2xl px-6 py-5 -mx-1">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">Portfolio Intelligence</h1>
        <p className="text-sm text-slate-500 mt-1.5">
          Actionable decisions across all 600 SKUs — kill the bleeders, switch channels, scale the gems.
        </p>
      </div>

      {/* 4 KPI cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Monthly Bleed"
          value={formatCurrency(portfolioSummary.monthlyZombieLoss)}
          subtitle={`from ${portfolioSummary.zombieCount} zombie SKUs`}
          color="red"
        />
        <KPICard
          title="Recoverable Profit"
          value={formatCurrency(profitRecovery)}
          subtitle="if all zombies removed"
          color="green"
        />
        <KPICard
          title="Quick Wins"
          value={`${channelFixCount} SKUs`}
          subtitle="recoverable via D2C switch"
          color="blue"
        />
        <KPICard
          title="Hidden Upside"
          value={`${portfolioSummary.gemCount} gems`}
          subtitle="underinvested, ready to scale"
          color="amber"
        />
      </section>

      {/* Expanded scatter — full width, above everything */}
      {graphExpanded && (
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-700">Portfolio Map</p>
            <button
              onClick={() => setGraphExpanded(false)}
              className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" /></svg>
              Collapse
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {FILTERS.map(({ key, label, count }) => (
              <button key={key} onClick={() => setActiveFilter(key)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${activeFilter === key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                {label} <span className={activeFilter === key ? "text-slate-400" : "text-slate-300"}>{count}</span>
              </button>
            ))}
          </div>
          <div className="h-[480px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                <XAxis type="number" dataKey="margin_pct" name="Margin %" domain={[minMargin - 5, maxMargin + 5]} tick={{ fontSize: 10, fill: "#94A3B8" }} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} label={{ value: "Margin %  →", position: "insideBottom", offset: -10, fontSize: 10, fill: "#94A3B8" }} />
                <YAxis type="number" dataKey="monthly_units" name="Monthly Units" domain={[0, maxUnits + 100]} tick={{ fontSize: 10, fill: "#94A3B8" }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} axisLine={false} tickLine={false} label={{ value: "Units/Month  →", angle: -90, position: "insideLeft", offset: 10, fontSize: 10, fill: "#94A3B8" }} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceArea x1={minMargin - 5} x2={0}           y1={0}           y2={medianUnits}    fill="#EF4444" fillOpacity={0.07} strokeOpacity={0} />
                <ReferenceArea x1={0}           x2={maxMargin + 5} y1={0}           y2={medianUnits}    fill="#10B981" fillOpacity={0.07} strokeOpacity={0} />
                <ReferenceArea x1={minMargin - 5} x2={0}           y1={medianUnits} y2={maxUnits + 100} fill="#F59E0B" fillOpacity={0.07} strokeOpacity={0} />
                <ReferenceArea x1={0}           x2={maxMargin + 5} y1={medianUnits} y2={maxUnits + 100} fill="#3B82F6" fillOpacity={0.07} strokeOpacity={0} />
                <ReferenceLine x={0}           stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="5 3" label={{ value: "Breakeven", position: "insideTopLeft",  fontSize: 9, fill: "#94A3B8" }} />
                <ReferenceLine y={medianUnits} stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="5 3" label={{ value: "Median volume", position: "insideTopRight", fontSize: 9, fill: "#94A3B8" }} />
                <Scatter data={filteredData} isAnimationActive={false} onClick={(data) => setSelectedSKU(data as unknown as ClassifiedSKU)} cursor="pointer">
                  {filteredData.map((entry, i) => <Cell key={i} fill={COLOR[entry.classification]} fillOpacity={0.75} r={4} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[
              { label: "Kill",    color: "#EF4444", sub: "Low margin · low vol" },
              { label: "Invest",  color: "#10B981", sub: "High margin · low vol" },
              { label: "Fix",     color: "#F59E0B", sub: "Low margin · high vol" },
              { label: "Protect", color: "#3B82F6", sub: "High margin · high vol" },
            ].map(({ label, color, sub }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color, opacity: 0.75 }} />
                <span className="text-[10px] text-slate-500"><span className="font-semibold">{label}</span> · {sub}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className={`grid grid-cols-1 ${graphExpanded ? "" : "lg:grid-cols-3"} gap-5 items-start`}>

        {/* ── Left col: Sub-nav + Sections ── */}
        <div className={`${graphExpanded ? "" : "lg:col-span-2"} space-y-4`}>

          {/* Sub-nav pills */}
          <div className="flex gap-2 flex-wrap">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                  activeTab === t.key
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-500 ring-1 ring-slate-200 hover:ring-slate-300 hover:text-slate-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Kill List ── */}
          {activeTab === "kill" && (
            <div className="space-y-3">
              {/* Recovery path strip */}
              <div className="bg-white rounded-xl shadow-sm px-4 py-3 flex flex-wrap items-center gap-4 text-xs">
                <span className="font-semibold text-slate-600">Recovery paths:</span>
                <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                  {channelFixCount} → Move to D2C
                </span>
                <span className="flex items-center gap-1.5 text-amber-600 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                  {pricingFixCount} → Reprice (avg +₹{Math.ceil(avgPricingGap)})
                </span>
              </div>

              <p className="text-xs font-semibold text-slate-700">Kill List ({zombieBreakeven.length})</p>

              {/* Table */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">SKU</th>
                        <SortTh align="left"  active={killSortField === "brand"}          dir={killSortDir} onClick={() => toggleKillSort("brand")}>Brand</SortTh>
                        <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Channel</th>
                        <SortTh align="right" active={killSortField === "margin_pct"}     dir={killSortDir} onClick={() => toggleKillSort("margin_pct")}>Margin%</SortTh>
                        <SortTh align="right" active={killSortField === "monthly_profit"} dir={killSortDir} onClick={() => toggleKillSort("monthly_profit")}>Loss/Mo</SortTh>
                        <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Fix</th>
                        <SortTh align="right" active={killSortField === "zombie_score"}   dir={killSortDir} onClick={() => toggleKillSort("zombie_score")}>Score</SortTh>
                      </tr>
                    </thead>
                    <tbody>
                      {killListData.map(s => (
                        <tr
                          key={s.sku_id}
                          onClick={() => setSelectedSKU(s)}
                          className="border-b border-slate-50 cursor-pointer hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{s.sku_id}</td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{s.brand}</td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{s.channel}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-red-500 font-semibold whitespace-nowrap">{formatPercent(s.margin_pct)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums font-bold text-red-600 whitespace-nowrap">
                            {s.monthly_profit < 0 ? formatCurrency(s.monthly_profit) : "—"}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap"><FixBadge sku={s} /></td>
                          <td className="px-3 py-2.5 text-right">
                            <span className="inline-flex items-center justify-center min-w-[32px] h-6 rounded-full text-[10px] font-bold bg-red-50 text-red-600 ring-1 ring-red-100">
                              {s.zombie_score}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {sortedKillList.length > 25 && (
                <button
                  onClick={() => setShowAllKill(v => !v)}
                  className="w-full text-center text-xs text-slate-500 font-medium py-2.5 bg-white rounded-xl ring-1 ring-slate-200 hover:ring-slate-300 transition-all"
                >
                  {showAllKill ? "Show fewer" : `Show all ${sortedKillList.length} zombies`}
                </button>
              )}
            </div>
          )}

          {/* ── Quick Wins ── */}
          {activeTab === "quickwins" && (
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-blue-700 font-medium">
                  {channelFixCount} zombies could recover by switching to D2C — no repricing needed.
                </p>
                <label className="inline-flex items-center gap-2 text-[11px] text-blue-700">
                  Sort by
                  <select
                    value={quickWinsSort}
                    onChange={(e) => setQuickWinsSort(e.target.value as QuickWinsSortKey)}
                    className="rounded-lg border border-blue-200 bg-white px-2 py-1 text-[11px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="spread_desc">Largest spread</option>
                    <option value="spread_asc">Smallest spread</option>
                    <option value="best_margin_desc">Best channel margin</option>
                    <option value="sku_count_desc">Most SKUs in group</option>
                  </select>
                </label>
              </div>
              <div className="bg-white rounded-2xl shadow-sm divide-y divide-slate-50">
                {quickWinsData.map((group, i) => {
                  const parts  = group.key.split("|");
                  const brand  = parts[0];
                  const subCat = parts[2];
                  const worst  = group.channelRankings[group.channelRankings.length - 1];
                  const best   = group.channelRankings[0];
                  const worstSKU = group.items.reduce((w, s) => s.margin_pct < w.margin_pct ? s : w);
                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedSKU(worstSKU)}
                      className="px-4 py-3 cursor-pointer hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{brand}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">{subCat}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                          <span className="text-[10px] font-semibold text-red-600 bg-red-50 rounded-full px-2 py-0.5 ring-1 ring-red-100 whitespace-nowrap">
                            {worst.channel}: {formatPercent(worst.avgMargin)}
                          </span>
                          <span className="text-slate-300 text-xs">→</span>
                          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 ring-1 ring-emerald-100 whitespace-nowrap">
                            {best.channel}: {formatPercent(best.avgMargin)}
                          </span>
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 rounded-full px-2 py-0.5 whitespace-nowrap">
                            +{formatPercent(group.marginSpread)} spread
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Scale Up ── */}
          {activeTab === "scale" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-700">Scale Up Priorities</p>
                <label className="inline-flex items-center gap-2 text-[11px] text-slate-500">
                  Sort by
                  <select
                    value={scaleSort}
                    onChange={(e) => setScaleSort(e.target.value as ScaleSortKey)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="gem_score_desc">Gem score</option>
                    <option value="margin_desc">Margin %</option>
                    <option value="repeat_desc">Repeat %</option>
                    <option value="units_desc">Units/month</option>
                  </select>
                </label>
              </div>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">#</th>
                        <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">SKU</th>
                        <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Brand</th>
                        <th className="px-3 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Margin%</th>
                        <th className="px-3 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Repeat%</th>
                        <th className="px-3 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Units/mo</th>
                        <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Gem Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedScaleUp.map((s, i) => (
                        <tr
                          key={s.sku_id}
                          onClick={() => setSelectedSKU(s)}
                          className="border-b border-slate-50 cursor-pointer hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-3 py-2.5 text-slate-400 font-medium">{i + 1}</td>
                          <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{s.sku_id}</td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{s.brand}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600 font-semibold">{formatPercent(s.margin_pct)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{formatPercent(s.repeat_purchase_rate_pct)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{s.monthly_units.toLocaleString("en-IN")}</td>
                          <td className="px-3 py-2.5"><ScoreBar score={s.gem_score} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ROI reallocation */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setShowROIRealloc(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <span>Marketing Budget Reallocation — ROI comparison</span>
                  <svg
                    className={`w-4 h-4 text-slate-400 transition-transform ${showROIRealloc ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                {showROIRealloc && (
                  <div className="px-4 pb-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-semibold text-emerald-600 mb-2 uppercase tracking-wider">Top ROI SKUs</p>
                        <div className="space-y-1.5">
                          {topMarketingROI.slice(0, 10).map(s => (
                            <div key={s.sku_id} className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="text-slate-600 truncate">{s.sku_id}</span>
                              <span className="font-semibold text-emerald-600 tabular-nums flex-shrink-0">{s.marketingRoi.toFixed(1)}x</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-red-500 mb-2 uppercase tracking-wider">Worst ROI SKUs</p>
                        <div className="space-y-1.5">
                          {worstMarketingROI.slice(0, 10).map(s => (
                            <div key={s.sku_id} className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="text-slate-600 truncate">{s.sku_id}</span>
                              <span className="font-semibold text-red-500 tabular-nums flex-shrink-0">{s.marketingRoi.toFixed(1)}x</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Health ── */}
          {activeTab === "health" && (
            <div className="space-y-4">
              {/* Brand health bars */}
              <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-700">Brand Health</p>
                {sortedBrandHealth.map(b => (
                  <div key={b.brand} className="space-y-1">
                    <div className="flex items-center gap-3 text-[11px] flex-wrap">
                      <span className="font-semibold text-slate-700 w-28 flex-shrink-0">{b.brand}</span>
                      <span className="text-red-500 font-medium">{b.zombieRate.toFixed(1)}% zombie</span>
                      <span className="text-emerald-600 font-medium">{b.gemRate.toFixed(1)}% gem</span>
                      <span className="text-slate-400 ml-auto">{formatPercent(b.avgMargin)} avg</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex">
                      <div className="h-full bg-red-400"     style={{ width: `${b.zombieRate}%` }} />
                      <div className="h-full bg-emerald-400" style={{ width: `${b.gemRate}%` }} />
                      <div className="h-full bg-slate-200"   style={{ width: `${Math.max(0, 100 - b.zombieRate - b.gemRate)}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Channel table */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-700">Channel Breakdown</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Channel</th>
                        <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">SKUs</th>
                        <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Zombies</th>
                        <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Avg Margin</th>
                        <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Monthly Loss</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedChannelHealth.map(r => (
                        <tr key={r.channel} className="border-b border-slate-50">
                          <td className="px-4 py-2.5 font-medium text-slate-700">{r.channel}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">{r.count}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-red-500 font-semibold">{r.zombies}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatPercent(r.avgMargin)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-bold text-red-600">
                            {r.monthlyLoss > 0 ? formatCurrency(r.monthlyLoss) : "—"}
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

        {/* ── Right col: Scatter plot card (hidden when expanded) ── */}
        {!graphExpanded && (
        <div className="bg-white rounded-2xl shadow-sm p-4 sticky top-[4.5rem]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-700">Portfolio Map</p>
            <button
              onClick={() => setGraphExpanded(true)}
              className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              title="Expand chart"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
              Expand
            </button>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {FILTERS.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                  activeFilter === key
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {label} <span className={activeFilter === key ? "text-slate-400" : "text-slate-300"}>{count}</span>
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="h-[280px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 12, bottom: 16, left: 4 }}>
                <XAxis
                  type="number"
                  dataKey="margin_pct"
                  name="Margin %"
                  domain={[minMargin - 5, maxMargin + 5]}
                  tick={{ fontSize: 9, fill: "#94A3B8" }}
                  tickFormatter={(v) => `${v}%`}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: "Margin %  →", position: "insideBottom", offset: -8, fontSize: 9, fill: "#94A3B8" }}
                />
                <YAxis
                  type="number"
                  dataKey="monthly_units"
                  name="Monthly Units"
                  domain={[0, maxUnits + 100]}
                  tick={{ fontSize: 9, fill: "#94A3B8" }}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: "Units →", angle: -90, position: "insideLeft", offset: 8, fontSize: 9, fill: "#94A3B8" }}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* Shaded quadrant zones */}
                <ReferenceArea x1={minMargin - 5} x2={0}           y1={0}           y2={medianUnits}    fill="#EF4444" fillOpacity={0.07} strokeOpacity={0} />
                <ReferenceArea x1={0}           x2={maxMargin + 5} y1={0}           y2={medianUnits}    fill="#10B981" fillOpacity={0.07} strokeOpacity={0} />
                <ReferenceArea x1={minMargin - 5} x2={0}           y1={medianUnits} y2={maxUnits + 100} fill="#F59E0B" fillOpacity={0.07} strokeOpacity={0} />
                <ReferenceArea x1={0}           x2={maxMargin + 5} y1={medianUnits} y2={maxUnits + 100} fill="#3B82F6" fillOpacity={0.07} strokeOpacity={0} />

                <ReferenceLine x={0}           stroke="#94A3B8" strokeWidth={1} strokeDasharray="4 2" />
                <ReferenceLine y={medianUnits} stroke="#94A3B8" strokeWidth={1} strokeDasharray="4 2" />

                <Scatter
                  data={filteredData}
                  isAnimationActive={false}
                  onClick={(data) => setSelectedSKU(data as unknown as ClassifiedSKU)}
                  cursor="pointer"
                >
                  {filteredData.map((entry, i) => (
                    <Cell key={i} fill={COLOR[entry.classification]} fillOpacity={0.75} r={3} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* 2×2 compact quadrant legend */}
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {[
              { label: "Kill",    color: "#EF4444", sub: "Low margin · low vol" },
              { label: "Invest",  color: "#10B981", sub: "High margin · low vol" },
              { label: "Fix",     color: "#F59E0B", sub: "Low margin · high vol" },
              { label: "Protect", color: "#3B82F6", sub: "High margin · high vol" },
            ].map(({ label, color, sub }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color, opacity: 0.75 }} />
                <div>
                  <span className="text-[10px] font-semibold text-slate-600">{label}</span>
                  <span className="text-[10px] text-slate-300 ml-1">{sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}
      </div>

      <SKUDetailPanel sku={selectedSKU} onClose={() => setSelectedSKU(null)} />
    </div>
  );
}
