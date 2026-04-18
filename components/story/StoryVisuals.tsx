"use client";

import React, { useRef, useState, useEffect, useCallback, memo } from "react";
import { allSKUs } from "@/lib/data";
import {
  portfolioSummary,
  gemRevenueUpside,
  ratingProfitCorrelation,
} from "@/lib/calculations";

// ─── Pre-computed constants ───────────────────────────────────────────────────

export const TOTAL_LOSS  = portfolioSummary.totalMonthlyNegativeProfitLoss;
export const UPSIDE      = gemRevenueUpside;
export const CORRELATION = ratingProfitCorrelation;

export const PARADOX_SKU = (() => {
  const c = allSKUs
    .filter((s) => s.avg_rating >= 4.5 && s.monthly_profit < 0)
    .sort((a, b) => b.avg_rating - a.avg_rating)[0];
  return c ?? allSKUs.filter((s) => s.avg_rating >= 4.0 && s.monthly_profit < 0)[0];
})();

const SCATTER_POINTS = (() => {
  const sampled    = allSKUs.filter((_, i) => i % 5 === 0).slice(0, 120);
  const maxRevenue = Math.max(...allSKUs.map((s) => Math.abs(s.monthly_profit)));
  const W = 380, H = 220;
  return sampled.map((s) => ({
    cx: 20 + ((s.avg_rating - 1) / 4) * (W - 40),
    cy: H - 20 - ((s.monthly_profit + maxRevenue) / (2 * maxRevenue)) * (H - 40),
    isClusterA: s.avg_rating >= 4.0 && s.monthly_profit < 0,
    isClusterB: s.avg_rating < 2.5  && s.monthly_profit > 0,
  }));
})();

const CLUSTER_A_PTS = SCATTER_POINTS.filter((p) => p.isClusterA);
const CLUSTER_B_PTS = SCATTER_POINTS.filter((p) => p.isClusterB);
const BG_PTS        = SCATTER_POINTS.filter((p) => !p.isClusterA && !p.isClusterB);

const A_MIN_CX = CLUSTER_A_PTS.length ? Math.min(...CLUSTER_A_PTS.map((p) => p.cx)) : 0;
const A_MAX_CY = CLUSTER_A_PTS.length ? Math.max(...CLUSTER_A_PTS.map((p) => p.cy)) : 0;
const B_MAX_CX = CLUSTER_B_PTS.length ? Math.max(...CLUSTER_B_PTS.map((p) => p.cx)) : 0;
const B_MIN_CY = CLUSTER_B_PTS.length ? Math.min(...CLUSTER_B_PTS.map((p) => p.cy)) : 0;

export const DOT_ASSIGNMENTS = Array.from({ length: 600 }, (_, i) => {
  if (i < 188) return "zombie";
  if (i < 263) return "channel";
  if (i < 362) return "gateway";
  if (i < 412) return "gem";
  return "healthy";
});

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useInView(threshold = 0.25) {
  const ref  = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return [ref, inView] as const;
}

export function useBleedingCounter(target: number, active: boolean) {
  const [value, setValue]   = useState(0);
  const started             = useRef(false);

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setValue(target);
      return;
    }

    let current = 0;
    let timerId: ReturnType<typeof setTimeout>;
    const tick = () => {
      const remaining = target - current;
      current += remaining * (Math.random() * 0.28 + 0.12);
      if (current >= target - 100) { setValue(target); return; }
      setValue(Math.floor(current));
      timerId = setTimeout(tick, Math.random() * 28 + 8);
    };
    tick();
    return () => clearTimeout(timerId);
  }, [active, target]);

  return value;
}

// ─── DotGrid ──────────────────────────────────────────────────────────────────

export type DotBeat = "none" | "appear" | "red" | "twist" | "gem" | "brand";

export const DotGrid = memo(function DotGrid({
  beat,
  active = true,
}: {
  beat: DotBeat;
  active?: boolean;
}) {
  const getDotClass = useCallback(
    (_: string, idx: number) => {
      if (beat === "none" || beat === "appear") return "";
      if (beat === "red")   return idx < 188 ? "red" : "";
      if (beat === "twist") {
        if (idx < 75)  return "amber";
        if (idx < 188) return "gold";
        return "";
      }
      if (beat === "gem") {
        if (idx < 75)  return "amber";
        if (idx < 188) return "gold";
        if (idx >= 263 && idx < 313) return "green";
        return "";
      }
      // brand beat: colored by brand (Little Joys 210 / Be Bodywise 202 / Man Matters 188)
      if (beat === "brand") {
        return idx < 412 ? "" : "green"; // lj/bw applied via inline style below
      }
      return "";
    },
    [beat]
  );

  const getBrandStyle = useCallback(
    (idx: number): React.CSSProperties => {
      if (beat !== "brand") return {};
      if (idx < 210) return { background: "#3B82F6", boxShadow: "0 0 3px rgba(59,130,246,0.45)" };
      if (idx < 412) return { background: "#8B5CF6", boxShadow: "0 0 3px rgba(139,92,246,0.45)" };
      return {};
    },
    [beat]
  );

  const staggerMs =
    beat === "appear" ? 8 :
    beat === "red"    ? 3 :
    beat === "twist"  ? 4 :
    beat === "gem"    ? 6 :
    beat === "brand"  ? 5 : 0;

  return (
    <div
      className={`dot-grid${beat !== "none" && beat !== "appear" ? " recoloring" : ""}`}
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "3px",
        maxWidth: "270px",
        ["--stagger-ms" as string]: staggerMs,
      }}
    >
      {DOT_ASSIGNMENTS.map((assignment, i) => (
        <div
          key={i}
          className={`dot${!active || beat === "none" ? " opacity-0" : ""} ${getDotClass(assignment, i)}`}
          style={{ ["--i" as string]: i, ...getBrandStyle(i) }}
        />
      ))}
    </div>
  );
});

// ─── CostWaterfall ────────────────────────────────────────────────────────────

export const CostWaterfall = memo(function CostWaterfall({ triggered }: { triggered: boolean }) {
  const bars: { label: string; pct: number; color: string; delay: string; platform?: boolean }[] = [
    { label: "COGS",         pct: 41, color: "#64748B", delay: "0ms"    },
    { label: "Marketing",    pct: 12, color: "#3B82F6", delay: "500ms"  },
    { label: "Logistics",    pct: 8,  color: "#60A5FA", delay: "900ms"  },
    { label: "Platform Fee", pct: 16, color: "#C0392B", delay: "1300ms", platform: true },
  ];

  return (
    <div className="w-full max-w-[260px] space-y-1.5">
      {bars.map((b) => (
        <div key={b.label} className="space-y-0.5">
          <div className="flex justify-between text-[10px]" style={{ color: "var(--story-muted)" }}>
            <span style={b.platform ? { color: "var(--story-red)", fontWeight: 600 } : {}}>
              {b.label}
            </span>
            <span style={b.platform ? { color: "var(--story-red)", fontWeight: 600 } : {}}>
              {b.pct}%
            </span>
          </div>
          <div className="h-3.5 rounded overflow-hidden" style={{ background: "var(--story-divider)" }}>
            <div
              className={`h-full rounded cost-bar${b.platform ? " platform" : ""}`}
              style={{
                background: b.color,
                width: `${b.pct * 2}%`,
                animationDelay: triggered ? b.delay : "9999s",
                transform: triggered ? undefined : "scaleX(0)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
});

// ─── ScatterPlot ──────────────────────────────────────────────────────────────

export const ScatterPlot = memo(function ScatterPlot({ triggered }: { triggered: boolean }) {
  return (
    <svg
      viewBox="0 0 380 220"
      className="w-full block"
      style={{ opacity: triggered ? 1 : 0, transition: "opacity 0.7s ease-out" }}
    >
      <line x1="20" y1="200" x2="360" y2="200" stroke="var(--story-divider)" strokeWidth="1.5" />
      <line x1="20" y1="10"  x2="20"  y2="200" stroke="var(--story-divider)" strokeWidth="1.5" />
      <text x="190" y="215" textAnchor="middle" fill="var(--story-muted)" fontSize="9"
            fontFamily="'Inter', ui-sans-serif, system-ui, sans-serif">
        Customer Rating →
      </text>
      <text x="9" y="110" textAnchor="middle" fill="var(--story-muted)" fontSize="9"
            fontFamily="'Inter', ui-sans-serif, system-ui, sans-serif" transform="rotate(-90,9,110)">
        Profit →
      </text>
      {BG_PTS.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={2} fill="#94A3B8" opacity={0.3} />
      ))}
      {CLUSTER_A_PTS.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={3.5} fill="#C0392B" opacity={0.85} />
      ))}
      {CLUSTER_B_PTS.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={3.5} fill="#7C3AED" opacity={0.85} />
      ))}
      {CLUSTER_A_PTS.length > 0 && (
        <text x={A_MIN_CX + 5} y={A_MAX_CY + 12} fill="#C0392B" fontSize={8} fontWeight="600"
              fontFamily="'Inter', ui-sans-serif, system-ui, sans-serif">
          4.5★ — losing money
        </text>
      )}
      {CLUSTER_B_PTS.length > 0 && (
        <text x={B_MAX_CX - 75} y={B_MIN_CY - 6} fill="#7C3AED" fontSize={8} fontWeight="600"
              fontFamily="'Inter', ui-sans-serif, system-ui, sans-serif">
          3.2★ — printing money
        </text>
      )}
    </svg>
  );
});
