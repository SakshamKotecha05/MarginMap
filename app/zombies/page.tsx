"use client";
import { useState, useMemo } from "react";
import { zombies } from "@/lib/data";
import { zombieBreakeven } from "@/lib/calculations";
import type { ClassifiedSKU } from "@/lib/classify";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import SKUDetailPanel from "@/components/ui/SKUDetailPanel";
import KPICard from "@/components/ui/KPICard";

const sorted = [...zombieBreakeven].sort((a, b) => a.monthly_profit - b.monthly_profit);
const zombieLoss = Math.abs(zombies.reduce((s, d) => s + Math.min(d.monthly_profit, 0), 0));
const brands   = [...new Set(zombies.map((s) => s.brand))];
const channels = [...new Set(zombies.map((s) => s.channel))];

export default function ZombiesPage() {
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [brandFilter, setBrandFilter]   = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [detailSKU, setDetailSKU]     = useState<ClassifiedSKU | null>(null);

  const filtered = useMemo(() => sorted.filter((s) => {
    if (brandFilter   !== "all" && s.brand   !== brandFilter)   return false;
    if (channelFilter !== "all" && s.channel !== channelFilter) return false;
    return true;
  }), [brandFilter, channelFilter]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((s) => s.sku_id)));
    }
  };

  const selectedItems = filtered.filter((s) => selected.has(s.sku_id));
  const monthlySavings = Math.abs(selectedItems.reduce((sum, s) => sum + Math.min(s.monthly_profit, 0), 0));
  const annualSavings  = monthlySavings * 12;

  const downloadCSV = () => {
    const header = ["SKU ID","Brand","Category","Sub-Category","Channel","Lifecycle","Margin %","Units/Mo","Monthly Revenue","Monthly Loss","Zombie Score"];
    const rows = filtered.map((s) => [
      s.sku_id, s.brand, s.category, s.sub_category, s.channel, s.lifecycle_stage,
      s.margin_pct.toFixed(2), s.monthly_units,
      s.monthly_revenue.toFixed(2),
      s.monthly_profit < 0 ? s.monthly_profit.toFixed(2) : "0",
      s.zombie_score,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "zombie-kill-list.csv";
    a.click();
  };

  return (
    <div className="px-4 py-6 lg:px-8 pb-32 space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="gradient-mesh rounded-2xl px-6 py-5 -mx-1">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">Zombie Products — Kill List</h1>
        <p className="text-sm text-slate-500 mt-1.5">
          {zombies.length} SKUs flagged for discontinuation. Select products to simulate P&L impact.
        </p>
      </div>

      {/* Summary stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Zombie SKUs"    value={String(zombies.length)}       subtitle="of 600 total products"         color="red" />
        <KPICard title="Monthly Losses" value={formatCurrency(zombieLoss)}    subtitle="from negative-profit SKUs"     color="red" />
        <KPICard title="Annual Losses"  value={formatCurrency(zombieLoss*12)} subtitle="projected at current rate"     color="red" />
      </section>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          className="text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
        >
          <option value="all">All Brands</option>
          {brands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
        >
          <option value="all">All Channels</option>
          {channels.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-[11px] text-slate-400 font-medium ml-1">{filtered.length} shown</span>
        <button
          onClick={downloadCSV}
          className="ml-auto text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                    className="rounded border-slate-300 text-blue-500 focus:ring-blue-500/30"
                  />
                </th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">SKU</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Brand</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Channel</th>
                <th className="px-3 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Margin%</th>
                <th className="px-3 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Units/mo</th>
                <th className="px-3 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Monthly Loss</th>
                <th className="px-3 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Score</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Recovery</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.sku_id}
                  className={`border-b border-slate-50 cursor-pointer transition-colors ${
                    selected.has(s.sku_id) ? "bg-red-50/40" : "hover:bg-slate-50/80"
                  }`}
                  onClick={() => setDetailSKU(s)}
                >
                  <td className="px-4 py-2.5" onClick={(e) => { e.stopPropagation(); toggle(s.sku_id); }}>
                    <input
                      type="checkbox"
                      checked={selected.has(s.sku_id)}
                      onChange={() => {}}
                      className="rounded border-slate-300 text-blue-500 focus:ring-blue-500/30 pointer-events-none"
                    />
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{s.sku_id}</td>
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{s.brand}</td>
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{s.category}</td>
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{s.channel}</td>
                  <td className="px-3 py-2.5 text-right tabular text-red-500 font-semibold whitespace-nowrap">{formatPercent(s.margin_pct)}</td>
                  <td className="px-3 py-2.5 text-right tabular text-slate-500 whitespace-nowrap">{s.monthly_units.toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2.5 text-right tabular font-bold text-red-600 whitespace-nowrap">
                    {s.monthly_profit < 0 ? formatCurrency(s.monthly_profit) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="inline-flex items-center justify-center min-w-[32px] h-6 rounded-full text-[10px] font-bold bg-red-50 text-red-600 ring-1 ring-red-100">
                      {s.zombie_score}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {s.recoveryType === "channel" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 rounded-full px-2 py-0.5 ring-1 ring-blue-100" title={`Move to D2C: +${s.d2cDeltaMargin.toFixed(1)}pp margin`}>
                        ↗ Move to D2C
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 rounded-full px-2 py-0.5 ring-1 ring-amber-100" title={`Raise price by ₹${s.priceGap.toFixed(0)} to break even`}>
                        ₹ Reprice +{Math.ceil(s.priceGap)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* What-If Simulator — sticky bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div className="bg-slate-900/95 backdrop-blur-lg text-white px-5 lg:px-8 py-4 flex items-center justify-between gap-4 border-t border-slate-700/50">
          {selected.size === 0 ? (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0 0 12 2.25Z" /></svg>
              <p className="text-sm text-slate-400">Select rows to simulate P&L impact</p>
            </div>
          ) : (
            <div className="flex items-center gap-6 flex-wrap">
              <span className="text-sm font-semibold">
                <span className="text-blue-400 tabular">{selected.size}</span> products selected
              </span>
              <span className="text-sm">
                Monthly savings: <span className="font-bold text-emerald-400 tabular">{formatCurrency(monthlySavings)}</span>
              </span>
              <span className="text-sm">
                Annual savings: <span className="font-bold text-emerald-400 tabular">{formatCurrency(annualSavings)}</span>
              </span>
            </div>
          )}
          {selected.size > 0 && (
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors flex-shrink-0"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <SKUDetailPanel sku={detailSKU} onClose={() => setDetailSKU(null)} />
    </div>
  );
}
