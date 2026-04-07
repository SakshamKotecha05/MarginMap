"use client";
import { useState } from "react";
import { gems } from "@/lib/data";
import { byCategory } from "@/lib/calculations";
import type { ClassifiedSKU } from "@/lib/classify";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import SKUDetailPanel from "@/components/ui/SKUDetailPanel";

const sorted = [...gems].sort((a, b) => b.gem_score - a.gem_score);

const avgGemMargin = gems.reduce((s, d) => s + d.margin_pct, 0) / gems.length;

// Potential revenue: if each gem scaled to its category's median volume
const potentialRevenue = gems.reduce((sum, s) => {
  const catSKUs = Object.entries(byCategory).find(([k]) => k === s.category)?.[1];
  const targetUnits = catSKUs ? catSKUs.monthlyRevenue / catSKUs.count / s.selling_price : s.monthly_units * 3;
  const upside = Math.max(0, targetUnits - s.monthly_units) * s.selling_price;
  return sum + upside;
}, 0);

function StarRating({ rating }: { rating: number }) {
  const full  = Math.floor(rating);
  const empty = 5 - Math.ceil(rating);
  const color = rating >= 4.0 ? "text-emerald-500" : rating >= 3.0 ? "text-amber-500" : "text-red-400";
  return (
    <span className={`tabular text-xs font-semibold ${color}`}>
      {"★".repeat(full)}{"☆".repeat(empty)} {rating.toFixed(1)}
    </span>
  );
}

function downloadGemsCSV() {
  const header = ["Rank","SKU ID","Brand","Category","Channel","Margin %","Rating","Repeat Rate %","Units/Mo","Monthly Revenue","Monthly Profit","Gem Score"];
  const rows = sorted.map((s, i) => [
    i + 1, s.sku_id, s.brand, s.category, s.channel,
    s.margin_pct.toFixed(2), s.avg_rating.toFixed(1),
    s.repeat_purchase_rate_pct.toFixed(2), s.monthly_units,
    s.monthly_revenue.toFixed(2), s.monthly_profit.toFixed(2),
    s.gem_score,
  ]);
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "hidden-gems-invest-list.csv";
  a.click();
}

export default function GemsPage() {
  const [detailSKU, setDetailSKU] = useState<ClassifiedSKU | null>(null);

  return (
    <div className="px-4 py-6 lg:px-8 space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="gradient-mesh rounded-2xl px-6 py-5 -mx-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">Hidden Gems — Invest List</h1>
            <p className="text-sm text-slate-500 mt-1.5">
              {gems.length} underinvested SKUs with strong fundamentals. Ranked by gem score.
            </p>
          </div>
          <button
            onClick={downloadGemsCSV}
            className="flex-shrink-0 text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 bg-white/70 text-slate-600 hover:bg-white hover:border-slate-300 transition-all flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-100/65 to-white rounded-2xl shadow-md p-6 card-hover">
          <p className="text-xs text-slate-400 mb-2">Hidden Gems</p>
          <p className="text-2xl lg:text-3xl font-bold tabular text-slate-900">{gems.length}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <p className="text-[11px] text-slate-400">underinvested SKUs</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-100/65 to-white rounded-2xl shadow-md p-6 card-hover">
          <p className="text-xs text-slate-400 mb-2">Avg Gem Margin</p>
          <p className="text-2xl lg:text-3xl font-bold tabular text-slate-900">{formatPercent(avgGemMargin)}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <p className="text-[11px] text-slate-400">vs portfolio average</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-100/65 to-white rounded-2xl shadow-md p-6 card-hover">
          <p className="text-xs text-slate-400 mb-2">Revenue Upside</p>
          <p className="text-2xl lg:text-3xl font-bold tabular text-slate-900">{formatCurrency(potentialRevenue)}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <p className="text-[11px] text-slate-400">if scaled to category median</p>
          </div>
        </div>
      </section>

      {/* Insight banner */}
      <div className="bg-emerald-500/5 rounded-2xl p-5 border-l-4 border-l-emerald-500">
        <p className="text-sm font-semibold text-slate-800 mb-1">Why these are gems</p>
        <p className="text-[13px] text-slate-500 leading-relaxed">
          High margin + strong repeat purchase rates + good ratings, but low current volume.
          They earn well on every unit sold — they just aren&apos;t being found by enough customers yet.
          Reallocating marketing budget from zombies to gems is the highest-leverage action in this portfolio.
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Rank</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">SKU</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Brand</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Channel</th>
                <th className="px-3 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Margin%</th>
                <th className="px-3 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Rating</th>
                <th className="px-3 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Repeat Rate</th>
                <th className="px-3 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Units/mo</th>
                <th className="px-3 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Gem Score</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => (
                <tr
                  key={s.sku_id}
                  className="border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer transition-colors"
                  onClick={() => setDetailSKU(s)}
                >
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] font-bold text-slate-300">#{i + 1}</span>
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-slate-800">{s.sku_id}</td>
                  <td className="px-3 py-2.5 text-slate-500">{s.brand}</td>
                  <td className="px-3 py-2.5 text-slate-500">{s.category}</td>
                  <td className="px-3 py-2.5 text-slate-500">{s.channel}</td>
                  <td className="px-3 py-2.5 text-right tabular font-bold text-emerald-600">
                    {formatPercent(s.margin_pct)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <StarRating rating={s.avg_rating} />
                  </td>
                  <td className="px-3 py-2.5 text-right tabular text-blue-600 font-semibold">
                    {formatPercent(s.repeat_purchase_rate_pct)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular text-slate-500">
                    {s.monthly_units.toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="inline-flex items-center justify-center min-w-[32px] h-6 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                      {s.gem_score}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SKUDetailPanel sku={detailSKU} onClose={() => setDetailSKU(null)} />
    </div>
  );
}
