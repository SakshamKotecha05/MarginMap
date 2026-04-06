"use client";
import { useState, useMemo } from "react";
import { allSKUs } from "@/lib/data";
import type { ClassifiedSKU, Classification } from "@/lib/classify";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import ClassificationBadge from "@/components/ui/ClassificationBadge";
import SKUDetailPanel from "@/components/ui/SKUDetailPanel";

const PAGE_SIZE = 25;
const BRANDS    = [...new Set(allSKUs.map((s) => s.brand))];
const CHANNELS  = [...new Set(allSKUs.map((s) => s.channel))];
const CATEGORIES = [...new Set(allSKUs.map((s) => s.category))].sort();
const CLASS_FILTERS: Array<{ key: Classification | "all"; label: string }> = [
  { key: "all",     label: "All"        },
  { key: "zombie",  label: "Zombie"     },
  { key: "gem",     label: "Hidden Gem" },
  { key: "gateway", label: "Gateway"    },
  { key: "healthy", label: "Healthy"    },
];

export default function ExplorerPage() {
  const [search,     setSearch]     = useState("");
  const [classFilter, setClassFilter] = useState<Classification | "all">("all");
  const [brandFilter,  setBrandFilter]  = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page,       setPage]       = useState(1);
  const [detailSKU,  setDetailSKU]  = useState<ClassifiedSKU | null>(null);
  const [sortKey,    setSortKey]    = useState<keyof ClassifiedSKU>("sku_id");
  const [sortDir,    setSortDir]    = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    let data = allSKUs.filter((s) => {
      if (search && !s.sku_id.toLowerCase().includes(search.toLowerCase()) &&
          !s.brand.toLowerCase().includes(search.toLowerCase())) return false;
      if (classFilter   !== "all" && s.classification !== classFilter)   return false;
      if (brandFilter   !== "all" && s.brand          !== brandFilter)   return false;
      if (channelFilter !== "all" && s.channel        !== channelFilter) return false;
      if (categoryFilter !== "all" && s.category      !== categoryFilter) return false;
      return true;
    });

    data = [...data].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });

    return data;
  }, [search, classFilter, brandFilter, channelFilter, categoryFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activeFilterCount = [
    search, classFilter !== "all", brandFilter !== "all",
    channelFilter !== "all", categoryFilter !== "all",
  ].filter(Boolean).length;

  const clearAll = () => {
    setSearch(""); setClassFilter("all"); setBrandFilter("all");
    setChannelFilter("all"); setCategoryFilter("all"); setPage(1);
  };

  const sort = (key: keyof ClassifiedSKU) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };

  const SortIcon = ({ k }: { k: keyof ClassifiedSKU }) => {
    if (sortKey !== k) return <span className="text-slate-200 ml-0.5">↕</span>;
    return <span className="text-blue-500 ml-0.5">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className="px-4 py-6 lg:px-8 space-y-5 max-w-[1400px]">
      {/* Header */}
      <div className="gradient-mesh rounded-2xl px-6 py-5 -mx-1">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">Explorer</h1>
        <p className="text-sm text-slate-500 mt-1.5">All 600 SKUs — filterable, searchable, sortable.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search by SKU ID or brand..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full text-sm border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all placeholder:text-slate-300"
          />
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Classification chips */}
          {CLASS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setClassFilter(key); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                classFilter === key
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-50 text-slate-500 ring-1 ring-slate-200 hover:ring-slate-300 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}

          <div className="w-px h-5 bg-slate-200 mx-1" />

          {/* Dropdowns */}
          <select value={brandFilter} onChange={(e) => { setBrandFilter(e.target.value); setPage(1); }}
            className="text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all">
            <option value="all">All Brands</option>
            {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={channelFilter} onChange={(e) => { setChannelFilter(e.target.value); setPage(1); }}
            className="text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all">
            <option value="all">All Channels</option>
            {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all">
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          {activeFilterCount > 0 && (
            <button onClick={clearAll} className="text-xs text-blue-500 hover:text-blue-600 font-medium px-2 transition-colors">
              Clear all ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="text-[11px] text-slate-400 font-medium">
        {filtered.length} SKUs · page {page} of {totalPages}
      </p>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                {[
                  { key: "sku_id",         label: "SKU"      },
                  { key: "brand",          label: "Brand"    },
                  { key: "category",       label: "Category" },
                  { key: "channel",        label: "Channel"  },
                  { key: "lifecycle_stage", label: "Stage"   },
                  { key: "margin_pct",     label: "Margin%"  },
                  { key: "monthly_units",  label: "Units"    },
                  { key: "monthly_revenue", label: "Revenue" },
                  { key: "monthly_profit", label: "Profit"   },
                  { key: "avg_rating",     label: "Rating"   },
                  { key: "classification", label: "Status"   },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => sort(key as keyof ClassifiedSKU)}
                    className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 select-none whitespace-nowrap transition-colors"
                  >
                    {label}<SortIcon k={key as keyof ClassifiedSKU} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((s) => (
                <tr
                  key={s.sku_id}
                  className="border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer transition-colors"
                  onClick={() => setDetailSKU(s)}
                >
                  <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{s.sku_id}</td>
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{s.brand}</td>
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{s.category}</td>
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{s.channel}</td>
                  <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{s.lifecycle_stage}</td>
                  <td className={`px-3 py-2.5 text-right tabular font-semibold whitespace-nowrap ${s.margin_pct < 0 ? "text-red-500" : s.margin_pct > 30 ? "text-emerald-600" : "text-slate-600"}`}>
                    {formatPercent(s.margin_pct)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular text-slate-500 whitespace-nowrap">{s.monthly_units.toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2.5 text-right tabular text-slate-600 whitespace-nowrap">{formatCurrency(s.monthly_revenue)}</td>
                  <td className={`px-3 py-2.5 text-right tabular font-semibold whitespace-nowrap ${s.monthly_profit < 0 ? "text-red-500" : "text-slate-600"}`}>
                    {formatCurrency(s.monthly_profit)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular text-slate-500 whitespace-nowrap">{s.avg_rating.toFixed(1)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <ClassificationBadge classification={s.classification} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="px-4 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all"
        >
          ← Previous
        </button>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const pageNum = totalPages <= 7 ? i + 1 :
              page <= 4 ? i + 1 :
              page >= totalPages - 3 ? totalPages - 6 + i :
              page - 3 + i;
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                  page === pageNum
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>
        <button
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="px-4 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all"
        >
          Next →
        </button>
      </div>

      <SKUDetailPanel sku={detailSKU} onClose={() => setDetailSKU(null)} />
    </div>
  );
}
