"use client";
import { useEffect } from "react";
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

const heroStats = [
  { label: "Annual bleed",    value: "₹19.07 Cr",              color: "text-white" },
  { label: "D2C advantage",  value: "+14.4pp margin",          color: "text-emerald-400" },
  { label: "Hidden gems",    value: `${portfolioSummary.gemCount} SKUs`, color: "text-white" },
  { label: "Channel fixable", value: "75 products",            color: "text-white" },
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
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".scroll-reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -32px 0px" }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="px-4 py-6 lg:px-8 space-y-6 max-w-[1400px] mx-auto">

      {/* ── Hero — signature moment ── */}
      <div className="relative bg-slate-950 rounded-2xl overflow-hidden -mx-1 animate-fade-up delay-0">
        {/* Ambient glow field */}
        <div className="absolute -top-24 -left-16 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-72 h-52 bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[500px] h-24 bg-blue-900/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 px-8 lg:px-12 py-12 lg:py-16">
          {/* Eyebrow */}
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-8">
            Mosaic Wellness · 600 SKUs · 5 Channels · 3 Brands
          </p>

          {/* Number — slides up from clipped container */}
          <div className="overflow-hidden">
            <h1
              className="hero-word text-7xl sm:text-8xl lg:text-[9rem] font-bold text-white tracking-tighter leading-none tabular"
              style={{ animationDelay: "80ms" }}
            >
              ₹1.59 Cr
            </h1>
          </div>

          {/* Subtitle — follows 270ms after number */}
          <div className="overflow-hidden mt-3 mb-10">
            <p
              className="hero-word text-slate-400 text-lg lg:text-xl font-light"
              style={{ animationDelay: "270ms" }}
            >
              lost every month to{" "}
              <span className="text-red-400 font-medium">188 zombie products</span>
            </p>
          </div>

          {/* Stats — staggered fade-up after subtitle */}
          <div className="flex flex-wrap gap-6 pt-6 border-t border-white/[0.06]">
            {heroStats.map(({ label, value, color }, i) => (
              <div
                key={label}
                className="animate-fade-up"
                style={{ animationDelay: `${480 + i * 80}ms` }}
              >
                <p className="text-[11px] text-slate-500 uppercase tracking-widest">{label}</p>
                <p className={`text-xl font-bold tabular mt-1 ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI Cards — staggered entrance ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="animate-fade-up delay-80 h-full"><KPICard title="Monthly Revenue" value={formatCurrency(portfolioSummary.totalMonthlyRevenue)} subtitle="Across all 600 SKUs" color="blue" icon={<svg fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>} /></div>
        <div className="animate-fade-up delay-160 h-full"><KPICard title="Monthly Profit" value={formatCurrency(portfolioSummary.totalMonthlyProfit)} subtitle={`${formatPercent(portfolioSummary.totalMonthlyProfit / portfolioSummary.totalMonthlyRevenue * 100)} avg margin`} color="green" icon={<svg fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg>} /></div>
        <div className="animate-fade-up delay-240 h-full"><KPICard title="Portfolio Losses" value={formatCurrency(portfolioSummary.totalMonthlyNegativeProfitLoss)} subtitle="₹15,892,978.83/mo from neg-profit SKUs" color="red" icon={<svg fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181" /></svg>} /></div>
        <div className="animate-fade-up delay-320 h-full"><KPICard title="Hidden Gems" value={`${portfolioSummary.gemCount}`} subtitle="Underinvested SKUs with strong fundamentals" color="green" icon={<svg fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" /></svg>} /></div>
      </section>

      {/* ── Intelligence Highlights ── */}
      <section className="scroll-reveal grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-md p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" /></svg>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Launch Success Rate</p>
            <p className="text-xl font-bold text-slate-900 tabular-nums">{launchSuccessRate.successRate.toFixed(0)}%</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{launchSuccessRate.failing} of {launchSuccessRate.total} launches losing money</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" /></svg>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Channel Fixable</p>
            <p className="text-xl font-bold text-slate-900 tabular-nums">{portfolioSummary.zombieCount} zombies</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Many viable via D2C channel shift</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
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

      {/* ── Portfolio Composition ── */}
      <section className="scroll-reveal bg-white rounded-2xl shadow-md p-5">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Portfolio Composition</p>
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
              <span className="text-xs text-slate-500">{label}</span>
              <span className="text-xs font-semibold text-slate-700 tabular">{count}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Recommended Actions ── */}
      <section className="scroll-reveal">
        <h2 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider">Recommended Actions</h2>
        <div className="space-y-2.5 scroll-stagger">
          {actions.map((a) => (
            <a key={a.num} href={a.link} className={`scroll-reveal block ${a.bg} rounded-2xl p-5 border-l-4 ${a.color} card-hover`}>
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

      {/* ── Charts ── */}
      <section className="scroll-reveal grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900">Avg Margin by Brand</h3>
            <p className="text-xs text-slate-400 mt-0.5">Little Joys: {brandZombieRate.find(b => b.brand === "Little Joys")?.zombieRate.toFixed(0)}% zombie rate vs Man Matters: {brandZombieRate.find(b => b.brand === "Man Matters")?.zombieRate.toFixed(0)}%</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
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

        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900">Avg Margin by Channel</h3>
            <p className="text-xs text-slate-400 mt-0.5">D2C carries a +14.4pp premium over marketplaces</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
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

      {/* ── Top 5 previews ── */}
      <section className="scroll-reveal grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900">Worst Zombies</h3>
            <a href="/zombies" className="text-xs text-blue-500 hover:text-blue-600 font-medium">View all →</a>
          </div>
          {topZombies.map((s, i) => (
            <div key={s.sku_id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
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

        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900">Top Hidden Gems</h3>
            <a href="/gems" className="text-xs text-blue-500 hover:text-blue-600 font-medium">View all →</a>
          </div>
          {topGems.map((s, i) => (
            <div key={s.sku_id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
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
