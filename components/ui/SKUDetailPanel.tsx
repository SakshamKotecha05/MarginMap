"use client";
import type { ClassifiedSKU } from "@/lib/classify";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/formatters";
import ClassificationBadge from "./ClassificationBadge";

interface Props {
  sku: ClassifiedSKU | null;
  onClose: () => void;
}

const fields: Array<{ label: string; key: keyof ClassifiedSKU; format?: "currency" | "percent" | "number" }> = [
  { label: "Brand",           key: "brand" },
  { label: "Category",        key: "category" },
  { label: "Sub-Category",    key: "sub_category" },
  { label: "Channel",         key: "channel" },
  { label: "Lifecycle",       key: "lifecycle_stage" },
  { label: "MRP",             key: "mrp",                      format: "currency" },
  { label: "Selling Price",   key: "selling_price",            format: "currency" },
  { label: "COGS",            key: "cogs",                     format: "currency" },
  { label: "Marketing/Unit",  key: "marketing_cost_per_unit",  format: "currency" },
  { label: "Logistics/Unit",  key: "logistics_cost_per_unit",  format: "currency" },
  { label: "Platform Fee",    key: "platform_fee",             format: "currency" },
  { label: "Total Cost/Unit", key: "total_cost_per_unit",      format: "currency" },
  { label: "Margin/Unit",     key: "margin_per_unit",          format: "currency" },
  { label: "Margin %",        key: "margin_pct",               format: "percent" },
  { label: "Units/Month",     key: "monthly_units",            format: "number" },
  { label: "Monthly Revenue", key: "monthly_revenue",          format: "currency" },
  { label: "Monthly Profit",  key: "monthly_profit",           format: "currency" },
  { label: "Avg Rating",      key: "avg_rating" },
  { label: "Review Count",    key: "review_count",             format: "number" },
  { label: "Return Rate",     key: "return_rate_pct",          format: "percent" },
  { label: "Repeat Rate",     key: "repeat_purchase_rate_pct", format: "percent" },
  { label: "Days Inventory",  key: "days_of_inventory",        format: "number" },
  { label: "Months Listed",   key: "months_listed",            format: "number" },
];

function fmt(value: unknown, format?: string): string {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  if (format === "currency") return formatCurrency(n);
  if (format === "percent") return formatPercent(n);
  if (format === "number") return formatNumber(n);
  return String(value);
}

export default function SKUDetailPanel({ sku, onClose }: Props) {
  if (!sku) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[340px] bg-white shadow-2xl z-50 overflow-y-auto animate-slide-in">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-lg border-b border-gray-100 px-5 py-4 z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-base text-slate-900 tracking-tight">{sku.sku_id}</p>
              <div className="mt-1.5">
                <ClassificationBadge classification={sku.classification} />
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scores */}
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Scores</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50/60 rounded-xl p-3">
              <p className="text-[10px] text-red-400 font-medium">Zombie Score</p>
              <p className="text-lg font-bold tabular text-red-600 mt-0.5">{sku.zombie_score}<span className="text-xs font-normal text-red-300">/100</span></p>
              <div className="mt-1.5 h-1 rounded-full bg-red-100 overflow-hidden">
                <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${sku.zombie_score}%` }} />
              </div>
            </div>
            <div className="bg-emerald-50/60 rounded-xl p-3">
              <p className="text-[10px] text-emerald-400 font-medium">Gem Score</p>
              <p className="text-lg font-bold tabular text-emerald-600 mt-0.5">{sku.gem_score}<span className="text-xs font-normal text-emerald-300">/100</span></p>
              <div className="mt-1.5 h-1 rounded-full bg-emerald-100 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${sku.gem_score}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Fields */}
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Details</p>
          <div className="space-y-0">
            {fields.map(({ label, key, format }) => {
              const value = sku[key];
              const isProfit = key === "monthly_profit" || key === "margin_pct" || key === "margin_per_unit";
              const isNegative = isProfit && Number(value) < 0;
              const isPositiveMargin = isProfit && Number(value) > 0;
              return (
                <div key={key} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <span className="text-[11px] text-slate-400">{label}</span>
                  <span className={`text-[11px] font-semibold tabular ${
                    isNegative ? "text-red-600" : isPositiveMargin ? "text-emerald-600" : "text-slate-700"
                  }`}>
                    {fmt(value, format)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slideIn 0.25s ease-out;
        }
      `}</style>
    </>
  );
}
