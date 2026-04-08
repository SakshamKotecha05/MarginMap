"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import KPICard from "@/components/ui/KPICard";
import { portfolioSummary, byChannel, launchSuccessRate, brandZombieRate } from "@/lib/calculations";
import { zombies, gems } from "@/lib/data";
import { formatCurrency, formatPercent } from "@/lib/formatters";

const topZombies = [...zombies].sort((a, b) => a.monthly_profit - b.monthly_profit).slice(0, 5);
const topGems    = [...gems].sort((a, b) => b.gem_score - a.gem_score).slice(0, 5);

const brandData = brandZombieRate.map((v) => ({
  name:       v.brand,
  margin:     parseFloat(v.avgMargin.toFixed(1)),
  zombies:    v.zombies,
  zombieRate: parseFloat(v.zombieRate.toFixed(1)),
}));

const channelData = Object.entries(byChannel)
  .map(([name, v]) => ({
    name: name === "D2C Website" ? "D2C" : name,
    margin: parseFloat(v.avgMargin.toFixed(1)),
    isD2C: name === "D2C Website",
  }))
  .sort((a, b) => b.margin - a.margin);

const actions = [
  {
    num: "01", color: "border-l-red-500", accent: "text-red-500", bg: "bg-red-500/5",
    title: "Delist 188 zombie products",
    desc: "Save ₹1.59 Cr/month in losses. Start with the 20 highest-loss SKUs on Amazon & Flipkart.",
    link: "/zombies",
  },
  {
    num: "02", color: "border-l-emerald-500", accent: "text-emerald-500", bg: "bg-emerald-500/5",
    title: "Scale 50 hidden gems",
    desc: "Strong margins + loyal customers — reallocate zombie marketing budget here.",
    link: "/gems",
  },
  {
    num: "03", color: "border-l-amber-500", accent: "text-amber-500", bg: "bg-amber-500/5",
    title: "Fix channel mix for 75 products",
    desc: "Same product, wildly different margins. Shift marketplace volume to D2C (+14.4pp margin).",
    link: "/explorer",
  },
];

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl">
      <p className="font-medium">{label}</p>
      <p className="text-slate-300 mt-0.5">Avg Margin: <span className="text-white font-semibold">{payload[0].value}%</span></p>
    </div>
  );
}

export default function SummaryPage() {
  return (
    <div className="px-4 py-6 lg:px-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Header with gradient mesh */}
      <div className="gradient-mesh rounded-2xl px-6 py-5 -mx-1">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">Portfolio Summary</h1>
        <p className="text-sm text-slate-500 mt-1.5">
          Analyzing 600 SKUs across Man Matters, Be Bodywise & Little Joys
        </p>
      </div>

      {/* KPI Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Monthly Revenue" value={formatCurrency(portfolioSummary.totalMonthlyRevenue)} subtitle="Across all 600 SKUs" color="blue" icon="₹" />
        <KPICard title="Monthly Profit" value={formatCurrency(portfolioSummary.totalMonthlyProfit)} subtitle={`${formatPercent(portfolioSummary.totalMonthlyProfit / portfolioSummary.totalMonthlyRevenue * 100)} avg margin`} color="green" icon="↗" />
        <KPICard title="Portfolio Losses" value={formatCurrency(portfolioSummary.totalMonthlyNegativeProfitLoss)} subtitle="₹15,892,978.83/mo from neg-profit SKUs" color="red" icon="↘" />
        <KPICard title="Hidden Gems" value={`${portfolioSummary.gemCount}`} subtitle="Underinvested SKUs with strong fundamentals" color="green" icon="◆" />
      </section>

      {/* Intelligence Highlights */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
            <span className="text-amber-500 text-base font-bold">%</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Launch Success Rate</p>
            <p className="text-xl font-bold text-slate-900 tabular-nums">{launchSuccessRate.successRate.toFixed(0)}%</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{launchSuccessRate.failing} of {launchSuccessRate.total} launches losing money</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <span className="text-blue-500 text-base font-bold">↗</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Channel Fixable</p>
            <p className="text-xl font-bold text-slate-900 tabular-nums">{portfolioSummary.zombieCount} zombies</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Many viable via D2C channel shift</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium mb-3">Brand Zombie Rate</p>
          {brandZombieRate.map((b) => (
            <div key={b.brand} className="flex items-center justify-between mb-2 last:mb-0">
              <span className="text-xs text-slate-600 w-28 truncate">{b.brand}</span>
              <div className="flex items-center gap-2 flex-1">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-400 rounded-full" style={{ width: `${b.zombieRate}%` }} />
                </div>
                <span className="text-xs font-bold tabular-nums text-red-500 w-10 text-right">
                  {b.zombieRate.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Classification breakdown — horizontal bar */}
      <section className="bg-white rounded-2xl shadow-sm p-5">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Portfolio Composition</p>
        <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
          {[
            { pct: portfolioSummary.zombieCount / 600 * 100,  color: "bg-red-500",     label: "Zombie" },
            { pct: portfolioSummary.gemCount / 600 * 100,     color: "bg-emerald-500", label: "Gem" },
            { pct: portfolioSummary.gatewayCount / 600 * 100, color: "bg-amber-500",   label: "Gateway" },
            { pct: portfolioSummary.healthyCount / 600 * 100, color: "bg-slate-300",   label: "Healthy" },
          ].map(({ pct, color, label }) => (
            <div key={label} className={`${color} rounded-full transition-all`} style={{ width: `${pct}%` }} title={`${label}: ${pct.toFixed(1)}%`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3">
          {[
            { label: "Zombies",     count: portfolioSummary.zombieCount,  dot: "bg-red-500" },
            { label: "Hidden Gems", count: portfolioSummary.gemCount,     dot: "bg-emerald-500" },
            { label: "Gateways",    count: portfolioSummary.gatewayCount, dot: "bg-amber-500" },
            { label: "Healthy",     count: portfolioSummary.healthyCount, dot: "bg-slate-300" },
          ].map(({ label, count, dot }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${dot}`} />
              <span className="text-xs text-gray-500">{label}</span>
              <span className="text-xs font-semibold text-gray-700 tabular">{count}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Top Actions */}
      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider">Recommended Actions</h2>
        <div className="space-y-2.5">
          {actions.map((a) => (
            <a key={a.num} href={a.link} className={`block ${a.bg} rounded-2xl p-5 border-l-4 ${a.color} card-hover`}>
              <div className="flex items-start gap-4">
                <span className={`text-xs font-bold font-mono ${a.accent} opacity-60`}>{a.num}</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{a.title}</p>
                  <p className="text-[13px] text-slate-500 mt-0.5 leading-relaxed">{a.desc}</p>
                </div>
                <svg className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5 ml-auto" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Avg Margin by Brand</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Little Joys: {brandZombieRate.find(b => b.brand === "Little Joys")?.zombieRate.toFixed(0)}% zombie rate vs Man Matters: {brandZombieRate.find(b => b.brand === "Man Matters")?.zombieRate.toFixed(0)}%</p>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={brandData} layout="vertical" margin={{ left: 0, right: 16 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} width={90} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.02)" }} />
              <Bar dataKey="margin" radius={[0, 6, 6, 0]} barSize={20}>
                {brandData.map((entry, i) => (
                  <Cell key={i} fill={entry.margin > 20 ? "#10B981" : entry.margin > 15 ? "#F59E0B" : "#EF4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Avg Margin by Channel</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">D2C carries a +14.4pp premium over marketplaces</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={channelData} layout="vertical" margin={{ left: 0, right: 16 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} width={65} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.02)" }} />
              <Bar dataKey="margin" radius={[0, 6, 6, 0]} barSize={20}>
                {channelData.map((entry, i) => (
                  <Cell key={i} fill={entry.isD2C ? "#10B981" : "#94A3B8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Top 5 previews */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Worst Zombies</h3>
            <a href="/zombies" className="text-[11px] text-blue-500 hover:text-blue-600 font-medium">View all →</a>
          </div>
          {topZombies.map((s, i) => (
            <div key={s.sku_id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
              <span className="text-[10px] font-bold text-slate-300 w-4">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800">{s.sku_id}</p>
                <p className="text-[11px] text-slate-400 truncate">{s.brand} · {s.category} · {s.channel}</p>
              </div>
              <span className="text-xs font-bold tabular text-red-500 flex-shrink-0">
                {formatCurrency(s.monthly_profit)}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Top Hidden Gems</h3>
            <a href="/gems" className="text-[11px] text-blue-500 hover:text-blue-600 font-medium">View all →</a>
          </div>
          {topGems.map((s, i) => (
            <div key={s.sku_id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
              <span className="text-[10px] font-bold text-slate-300 w-4">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800">{s.sku_id}</p>
                <p className="text-[11px] text-slate-400 truncate">{s.brand} · {s.category} · {s.channel}</p>
              </div>
              <span className="text-xs font-bold tabular text-emerald-500 flex-shrink-0">
                {formatPercent(s.margin_pct)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
