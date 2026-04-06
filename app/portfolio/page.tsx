"use client";
import { useState, useMemo } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell,
} from "recharts";
import { allSKUs } from "@/lib/data";
import type { ClassifiedSKU, Classification } from "@/lib/classify";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import ClassificationBadge from "@/components/ui/ClassificationBadge";
import SKUDetailPanel from "@/components/ui/SKUDetailPanel";

const COLOR: Record<Classification, string> = {
  zombie:  "#EF4444",
  gem:     "#10B981",
  gateway: "#F59E0B",
  healthy: "#6B7280",
};

const FILTERS: Array<{ key: Classification | "all"; label: string; count: number }> = [
  { key: "all",     label: "All",      count: allSKUs.length },
  { key: "zombie",  label: "Zombies",  count: allSKUs.filter(s => s.classification === "zombie").length },
  { key: "gem",     label: "Gems",     count: allSKUs.filter(s => s.classification === "gem").length },
  { key: "gateway", label: "Gateways", count: allSKUs.filter(s => s.classification === "gateway").length },
  { key: "healthy", label: "Healthy",  count: allSKUs.filter(s => s.classification === "healthy").length },
];

const medianUnits = (() => {
  const sorted = [...allSKUs].map((s) => s.monthly_units).sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
})();

interface TooltipPayload {
  payload: ClassifiedSKU;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const s = payload[0].payload;
  return (
    <div className="bg-slate-900 text-white rounded-lg shadow-xl p-3 text-xs max-w-[220px]">
      <p className="font-semibold text-sm mb-1">{s.sku_id}</p>
      <p className="text-slate-400">{s.brand} · {s.category}</p>
      <p className="text-slate-400">{s.channel}</p>
      <div className="mt-2 space-y-1 border-t border-slate-700 pt-2">
        <p>Margin: <span className={`font-semibold ${s.margin_pct < 0 ? "text-red-400" : "text-emerald-400"}`}>{formatPercent(s.margin_pct)}</span></p>
        <p>Profit: <span className={`font-semibold tabular ${s.monthly_profit < 0 ? "text-red-400" : "text-emerald-400"}`}>{formatCurrency(s.monthly_profit)}</span></p>
        <p>Units/mo: <span className="font-semibold">{s.monthly_units.toLocaleString("en-IN")}</span></p>
      </div>
      <div className="mt-2 pt-2 border-t border-slate-700">
        <ClassificationBadge classification={s.classification} />
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const [activeFilter, setActiveFilter] = useState<Classification | "all">("all");
  const [selectedSKU, setSelectedSKU] = useState<ClassifiedSKU | null>(null);

  const filteredData = useMemo(
    () => activeFilter === "all" ? allSKUs : allSKUs.filter((s) => s.classification === activeFilter),
    [activeFilter]
  );

  return (
    <div className="px-4 py-6 lg:px-8 space-y-5 max-w-[1400px]">
      {/* Header */}
      <div className="gradient-mesh rounded-2xl px-6 py-5 -mx-1">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">Portfolio Quadrant</h1>
        <p className="text-sm text-slate-500 mt-1.5">
          Each dot is one SKU. X = margin %, Y = monthly units. Click any dot for details.
        </p>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeFilter === key
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-500 ring-1 ring-slate-200 hover:ring-slate-300 hover:text-slate-700"
            }`}
          >
            {label} <span className={activeFilter === key ? "text-slate-400" : "text-slate-300"}>{count}</span>
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {(["zombie", "gem", "gateway", "healthy"] as Classification[]).map((c) => (
          <div key={c} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLOR[c] }} />
            <span className="text-xs text-slate-400 capitalize">{c === "gem" ? "Hidden Gem" : c}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-px" viewBox="0 0 16 1"><line x1="0" y1="0.5" x2="16" y2="0.5" stroke="#CBD5E1" strokeDasharray="3 2" /></svg>
          <span className="text-[11px] text-slate-300">Margin = 0 / Median units</span>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <ResponsiveContainer width="100%" height={480}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
            <XAxis
              type="number"
              dataKey="margin_pct"
              name="Margin %"
              tick={{ fontSize: 10, fill: "#94A3B8" }}
              tickFormatter={(v) => `${v}%`}
              axisLine={false}
              tickLine={false}
              label={{ value: "Margin %", position: "insideBottom", offset: -10, fontSize: 11, fill: "#94A3B8" }}
            />
            <YAxis
              type="number"
              dataKey="monthly_units"
              name="Monthly Units"
              tick={{ fontSize: 10, fill: "#94A3B8" }}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
              axisLine={false}
              tickLine={false}
              label={{ value: "Units/Month", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "#94A3B8" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={0} stroke="#E2E8F0" strokeDasharray="4 4" />
            <ReferenceLine y={medianUnits} stroke="#E2E8F0" strokeDasharray="4 4" />
            <Scatter
              data={filteredData}
              isAnimationActive={false}
              onClick={(data) => setSelectedSKU(data as unknown as ClassifiedSKU)}
              cursor="pointer"
            >
              {filteredData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={COLOR[entry.classification]}
                  fillOpacity={0.7}
                  r={4}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Quadrant labels */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "High Margin, Low Volume", desc: "Hidden Gems — underinvested, scale up", color: "border-l-emerald-500 bg-emerald-500/5", text: "text-emerald-700" },
          { label: "High Margin, High Volume", desc: "Stars — protect and invest", color: "border-l-blue-500 bg-blue-500/5", text: "text-blue-700" },
          { label: "Low Margin, Low Volume", desc: "Zombies — discontinue", color: "border-l-red-500 bg-red-500/5", text: "text-red-700" },
          { label: "Low Margin, High Volume", desc: "Cash Cows at Risk — optimise pricing", color: "border-l-amber-500 bg-amber-500/5", text: "text-amber-700" },
        ].map(({ label, desc, color, text }) => (
          <div key={label} className={`rounded-2xl border-l-4 p-4 ${color} card-hover`}>
            <p className={`text-xs font-semibold ${text}`}>{label}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <SKUDetailPanel sku={selectedSKU} onClose={() => setSelectedSKU(null)} />
    </div>
  );
}
