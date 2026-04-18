"use client";

import { useRef, useState, useEffect, useCallback, memo } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import type { BeatId } from "@/app/page";
import { allSKUs } from "@/lib/data";
import {
  portfolioSummary,
  gemRevenueUpside,
  ratingProfitCorrelation,
} from "@/lib/calculations";
import { formatCurrency } from "@/lib/formatters";

gsap.registerPlugin(ScrollTrigger);

// ─── Pre-computed data (module-level, never recalculated) ────────────────────

const TOTAL_LOSS  = portfolioSummary.totalMonthlyNegativeProfitLoss;
const UPSIDE      = gemRevenueUpside;
const CORRELATION = ratingProfitCorrelation;

const PARADOX_SKU = (() => {
  const c = allSKUs
    .filter((s) => s.avg_rating >= 4.5 && s.monthly_profit < 0)
    .sort((a, b) => b.avg_rating - a.avg_rating)[0];
  return c ?? allSKUs.filter((s) => s.avg_rating >= 4.0 && s.monthly_profit < 0)[0];
})();

// Deterministic scatter sample — no Math.random (avoids hydration mismatch)
const SCATTER_POINTS = (() => {
  const sampled     = allSKUs.filter((_, i) => i % 5 === 0).slice(0, 120);
  const maxRevenue  = Math.max(...allSKUs.map((s) => Math.abs(s.monthly_profit)));
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

// Scatter min/max computed once (not inside render)
const A_MIN_CX = CLUSTER_A_PTS.length ? Math.min(...CLUSTER_A_PTS.map((p) => p.cx)) : 0;
const A_MAX_CY = CLUSTER_A_PTS.length ? Math.max(...CLUSTER_A_PTS.map((p) => p.cy)) : 0;
const B_MAX_CX = CLUSTER_B_PTS.length ? Math.max(...CLUSTER_B_PTS.map((p) => p.cx)) : 0;
const B_MIN_CY = CLUSTER_B_PTS.length ? Math.min(...CLUSTER_B_PTS.map((p) => p.cy)) : 0;

// 600-dot grid assignments
const DOT_ASSIGNMENTS = Array.from({ length: 600 }, (_, i) => {
  if (i < 188) return "zombie";
  if (i < 263) return "channel";
  if (i < 362) return "gateway";
  if (i < 412) return "gem";
  return "healthy";
});

// ─── Beat definitions ─────────────────────────────────────────────────────────

type DotBeat = "none" | "appear" | "red" | "twist" | "gem";

// ─── useBleedingCounter ──────────────────────────────────────────────────────

function useBleedingCounter(target: number, active: boolean) {
  const [value, setValue] = useState(target);
  useEffect(() => {
    if (!active) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) { setValue(target); return; }
    setValue(0);
    let current = 0;
    let timerId: ReturnType<typeof setTimeout>;
    const tick = () => {
      const remaining = target - current;
      current += remaining * (Math.random() * 0.15 + 0.02);
      if (current >= target - 100) { setValue(target); return; }
      setValue(Math.floor(current));
      timerId = setTimeout(tick, Math.random() * 80 + 20);
    };
    tick();
    return () => clearTimeout(timerId);
  }, [active, target]);
  return value;
}

// ─── Sub-components — memoized so beat transitions don't remount them ─────────

const DotGrid = memo(function DotGrid({ beat }: { beat: DotBeat }) {
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
      return "";
    },
    [beat]
  );

  const staggerMs =
    beat === "appear" ? 8 : beat === "red" ? 3 : beat === "twist" ? 4 : beat === "gem" ? 6 : 0;

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
          className={`dot${beat === "none" ? " opacity-0" : ""} ${getDotClass(assignment, i)}`}
          style={{ ["--i" as string]: i }}
        />
      ))}
    </div>
  );
});

const CostWaterfall = memo(function CostWaterfall({ triggered }: { triggered: boolean }) {
  const bars: { label: string; pct: number; color: string; delay: string; platform?: boolean }[] = [
    { label: "COGS",         pct: 41, color: "#64748B", delay: "0ms"   },
    { label: "Marketing",    pct: 12, color: "#3B82F6", delay: "500ms" },
    { label: "Logistics",    pct: 8,  color: "#60A5FA", delay: "900ms" },
    { label: "Platform Fee", pct: 16, color: "#EF4444", delay: "1300ms", platform: true },
  ];
  return (
    <div className="w-full max-w-[260px] space-y-1.5">
      {bars.map((b) => (
        <div key={b.label} className="space-y-0.5">
          <div className="flex justify-between text-[10px] text-slate-400">
            <span className={b.platform ? "text-red-400 font-semibold" : ""}>{b.label}</span>
            <span className={b.platform ? "text-red-400 font-semibold" : ""}>{b.pct}%</span>
          </div>
          <div className="h-3.5 bg-slate-800 rounded overflow-hidden">
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

const ScatterPlot = memo(function ScatterPlot({ triggered }: { triggered: boolean }) {
  return (
    <svg
      viewBox="0 0 380 220"
      className="w-full block"
      style={{ opacity: triggered ? 1 : 0, transition: "opacity 0.6s ease-out" }}
    >
      <line x1="20" y1="200" x2="360" y2="200" stroke="#334155" strokeWidth="1" />
      <line x1="20" y1="10"  x2="20"  y2="200" stroke="#334155" strokeWidth="1" />
      <text x="190" y="215" textAnchor="middle" fill="#475569" fontSize="9">Customer Rating →</text>
      <text x="9" y="110" textAnchor="middle" fill="#475569" fontSize="9" transform="rotate(-90,9,110)">
        Profit →
      </text>
      {BG_PTS.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={2} fill="#94A3B8" opacity={0.15} />
      ))}
      {CLUSTER_A_PTS.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={3.5} fill="#EF4444" opacity={0.85} />
      ))}
      {CLUSTER_B_PTS.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={3.5} fill="#8B5CF6" opacity={0.85} />
      ))}
      {CLUSTER_A_PTS.length > 0 && (
        <text x={A_MIN_CX + 5} y={A_MAX_CY + 12} fill="#EF4444" fontSize={8} fontWeight="600">
          4.5★ — losing money
        </text>
      )}
      {CLUSTER_B_PTS.length > 0 && (
        <text x={B_MAX_CX - 75} y={B_MIN_CY - 6} fill="#8B5CF6" fontSize={8} fontWeight="600">
          3.2★ — printing money
        </text>
      )}
    </svg>
  );
});

// ─── Combined beat2 + beat3 panel ────────────────────────────────────────────
// Stays mounted for both beats so the DotGrid CSS transitions animate in-place.
// Phase 1 (beat2): neutral dots + overview label.
// Phase 2 (beat3): label fades, header slides from top, dots turn red, waterfall slides from bottom.

const Beat23Panel = memo(function Beat23Panel({
  isPhase3,
  dotBeat,
  waterfallActive,
}: {
  isPhase3: boolean;
  dotBeat: DotBeat;
  waterfallActive: boolean;
}) {
  const tr = (delay = 0) =>
    `opacity 0.4s ease-out ${delay}s, transform 0.4s ease-out ${delay}s`;

  return (
    <div className="flex flex-col items-center gap-3 text-center">

      {/* Phase 2 header — slides down from above */}
      <div style={{
        opacity: isPhase3 ? 1 : 0,
        transform: isPhase3 ? "translateY(0)" : "translateY(-14px)",
        transition: tr(0),
        pointerEvents: "none",
      }}>
        <p className="text-slate-400 text-xs mb-1">188 of them are losing money.</p>
        <h3 className="text-xl md:text-2xl font-bold text-white">Why?</h3>
      </div>

      {/* Phase 1 label — fades out */}
      <div style={{
        opacity: isPhase3 ? 0 : 1,
        transition: "opacity 0.3s ease-out",
        marginTop: isPhase3 ? "-2rem" : 0,  // collapse space so dots don't shift
        pointerEvents: "none",
      }}>
        <p className="text-slate-300 text-xs tracking-wider uppercase">
          600 products · 5 channels · 3 brands
        </p>
      </div>

      {/* Dot grid — stays alive across both phases */}
      <DotGrid beat={dotBeat} />

      {/* Phase 2 bottom content — slides up */}
      <div style={{
        opacity: isPhase3 ? 1 : 0,
        transform: isPhase3 ? "translateY(0)" : "translateY(14px)",
        transition: tr(0.25),
        pointerEvents: "none",
      }}>
        <CostWaterfall triggered={waterfallActive} />
        <div className="space-y-1 mt-3">
          <p className="text-red-400 font-semibold text-sm">The platform fee — every single time.</p>
          <p className="text-slate-500 text-xs">D2C earns 29.5%. Amazon earns 10.7%. Same product.</p>
        </div>
      </div>

    </div>
  );
});

// ─── Beat content — memoized ──────────────────────────────────────────────────

const BeatPanel = memo(function BeatPanel({
  id,
  dotBeat,
  counterValue,
  scatterActive,
  waterfallActive,
}: {
  id: BeatId;
  dotBeat: DotBeat;
  counterValue: number;
  scatterActive: boolean;
  waterfallActive: boolean;
}) {
  const paradoxLoss   = PARADOX_SKU ? Math.abs(PARADOX_SKU.monthly_profit) : 40_000;
  const paradoxRating = PARADOX_SKU?.avg_rating.toFixed(1) ?? "4.7";

  switch (id) {
    case "beat1":
      return (
        <div className="space-y-4 text-center">
          <div className="space-y-2">
            <p style={{ color: "rgba(248,244,238,0.55)", fontSize: "13px" }}>
              600 products. ₹110 Cr in revenue.
            </p>
            <p style={{ color: "#C9A227", fontSize: "13px", fontWeight: 500, lineHeight: 1.4 }}>
              One of them is a {paradoxRating}★ favourite losing {formatCurrency(paradoxLoss)}/month.
            </p>
          </div>
          <div className="pt-1">
            <div className="tabular"
                 style={{
                   fontFamily: "'Bebas Neue', sans-serif",
                   fontSize: "clamp(1.4rem,4.5vw,2rem)",
                   color: "#C9A227",
                   letterSpacing: "0.02em",
                   lineHeight: 1,
                   overflowWrap: "break-word",
                   wordBreak: "break-all",
                 }}>
              ₹{new Intl.NumberFormat("en-IN").format(counterValue)}
            </div>
            <div style={{ color: "rgba(248,244,238,0.4)", fontSize: "10px", marginTop: "4px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              lost every month
            </div>
          </div>
        </div>
      );

    case "beat4":
      return (
        <div className="flex flex-col items-center gap-4 text-center">
          <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(1.25rem,3vw,1.6rem)", fontStyle: "italic", fontWeight: 600, color: "#F8F4EE" }}>
            But don&apos;t kill them all.
          </h3>
          <DotGrid beat={dotBeat} />
          <div className="space-y-3 text-left max-w-[260px]">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" />
                <span className="text-amber-300 font-semibold text-xs">75 products</span>
              </div>
              <p className="text-slate-400 text-xs pl-4">
                Profitable on another channel. Wrong listing — not wrong product.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-300 flex-shrink-0"
                     style={{ boxShadow: "0 0 5px #FDE047" }} />
                <span className="text-yellow-200 font-semibold text-xs">99 products</span>
              </div>
              <p className="text-slate-400 text-xs pl-4">
                Subscription entry points. Kill them and you lose the customer — not just the SKU.
              </p>
            </div>
          </div>
        </div>
      );

    case "beat5":
      return (
        <div className="flex flex-col items-center gap-4 text-center">
          <DotGrid beat={dotBeat} />
          <div className="space-y-2">
            <div className="flex items-center gap-2 justify-center">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-emerald-300 font-semibold text-sm">50 hidden gems</span>
            </div>
            <p className="text-slate-400 text-xs max-w-[240px]">
              Strong margins. Loyal customers. Almost no marketing spend.
            </p>
            {UPSIDE > 0 && (
              <div className="pt-1">
                <p className="tabular" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(1.5rem,4vw,2rem)", color: "#4ADE80", letterSpacing: "0.02em" }}>
                  {formatCurrency(UPSIDE)}
                </p>
                <p style={{ color: "rgba(74,222,128,0.5)", fontSize: "11px" }}>incremental profit/month if funded</p>
              </div>
            )}
          </div>
        </div>
      );

    case "beat6":
      return (
        <div className="flex flex-col items-center gap-3 text-center">
          <div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(1.1rem,2.5vw,1.3rem)", fontStyle: "italic", fontWeight: 600, color: "#F8F4EE", marginBottom: "2px" }}>
              One more thing.
            </h3>
            <p style={{ color: "rgba(248,244,238,0.4)", fontSize: "11px" }}>Rating vs. profit correlation:</p>
            <p className="tabular leading-none mt-1" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2.5rem,6vw,3.5rem)", color: "#F8F4EE", letterSpacing: "0.02em" }}>
              {CORRELATION.toFixed(3)}
            </p>
            <p style={{ color: "rgba(248,244,238,0.35)", fontSize: "11px", marginTop: "2px" }}>Essentially zero.</p>
          </div>
          <ScatterPlot triggered={scatterActive} />
          <p className="text-slate-300 text-xs max-w-[260px] leading-relaxed">
            A 4.5★ product losing money isn&apos;t a bad product. It&apos;s a mispriced one.
          </p>
        </div>
      );

    case "beat6b":
      return (
        <div className="space-y-4 text-center">
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(1.2rem,3vw,1.5rem)", fontStyle: "italic", fontWeight: 600, color: "#F8F4EE", lineHeight: 1.3 }}>
            Every rupee shifted to D2C recovers{" "}
            <span style={{ color: "#4ADE80" }}>15% margin.</span>
          </p>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(1.2rem,3vw,1.5rem)", fontStyle: "italic", fontWeight: 600, color: "#F8F4EE", lineHeight: 1.3 }}>
            Without touching the product.
          </p>
          <p style={{ color: "rgba(248,244,238,0.3)", fontSize: "11px", marginTop: "12px" }}>
            That&apos;s not a dashboard insight. That&apos;s a business strategy.
          </p>
        </div>
      );

    case "beat7":
      return (
        <div className="space-y-5 text-center">
          <div className="space-y-2">
            <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2rem,5vw,2.5rem)", color: "#C9A227", letterSpacing: "0.04em" }}>Delist 75.</p>
            <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2rem,5vw,2.5rem)", color: "#E85D5D", letterSpacing: "0.04em" }}>Reprice 113.</p>
            <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2rem,5vw,2.5rem)", color: "#4ADE80", letterSpacing: "0.04em" }}>Fund 50.</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900
                       rounded-xl font-semibold text-sm hover:bg-slate-100 transition-colors"
          >
            Explore the Dashboard
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <p className="text-slate-600 text-xs">600 products. Every channel. Every decision.</p>
        </div>
      );

    default:
      return null;
  }
});

// ─── Main overlay ─────────────────────────────────────────────────────────────

export default function StoryOverlay({ activeBeat }: { activeBeat: BeatId | null }) {
  const titleRef       = useRef<HTMLDivElement>(null);
  const [panelVisible, setPanelVisible] = useState(false);
  const counterStarted = useRef(false);
  const [counterActive, setCounterActive] = useState(false);

  // Title fade only — beat detection is now owned by page.tsx
  useEffect(() => {
    const gsapCtx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: "#story-seq",
        start: "top top",
        end: "bottom bottom",
        onUpdate(self) {
          if (titleRef.current) {
            titleRef.current.style.opacity = String(Math.max(0, 1 - self.progress / 0.04));
          }
        },
      });
    });
    return () => gsapCtx.revert();
  }, []);

  // Reveal the beat panel once on first beat appearance
  useEffect(() => {
    if (activeBeat && !panelVisible) setPanelVisible(true);
  }, [activeBeat, panelVisible]);

  // Start the bleeding counter the first time beat1 is seen
  useEffect(() => {
    if (activeBeat === "beat1" && !counterStarted.current) {
      counterStarted.current = true;
      setCounterActive(true);
    }
  }, [activeBeat]);

  const counterValue = useBleedingCounter(TOTAL_LOSS, counterActive);

  const dotBeat: DotBeat =
    activeBeat === "beat5" || activeBeat === "beat6" || activeBeat === "beat6b" || activeBeat === "beat7" ? "gem"
    : activeBeat === "beat4" ? "twist"
    : activeBeat === "beat3" ? "red"
    : activeBeat === "beat2" ? "appear"
    : "none";

  const scatterActive   = activeBeat === "beat6" || activeBeat === "beat6b" || activeBeat === "beat7";
  const waterfallActive = !!activeBeat && activeBeat !== "beat1" && activeBeat !== "beat2";

  return (
    <div className="absolute inset-0 pointer-events-none">

      {/* Vignette overlay */}
      <div className="story-vignette absolute inset-0" />

      {/* Opening hook — fades out via direct DOM opacity mutation in GSAP onUpdate */}
      <div
        ref={titleRef}
        className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
        style={{ willChange: "opacity" }}
      >
        <p style={{
          fontSize: "9px",
          letterSpacing: "0.35em",
          textTransform: "uppercase",
          color: "rgba(248,244,238,0.4)",
          marginBottom: "2rem",
        }}>
          Mosaic Wellness · Portfolio Intelligence
        </p>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "clamp(2.8rem,8vw,5rem)",
          fontStyle: "italic",
          fontWeight: 600,
          lineHeight: 1.1,
          color: "#F8F4EE",
          maxWidth: "640px",
        }}>
          Your best-reviewed<br />product is losing money.
        </h1>
        <p style={{
          fontSize: "11px",
          letterSpacing: "0.2em",
          color: "rgba(248,244,238,0.35)",
          marginTop: "2rem",
        }}>
          600 SKUs · 5 channels · 3 brands
        </p>
        <div className="mt-6 flex flex-col items-center gap-1.5"
             style={{ color: "rgba(248,244,238,0.25)" }}>
          <p style={{ fontSize: "9px", letterSpacing: "0.3em", textTransform: "uppercase" }}>
            ↓ scroll
          </p>
          <svg className="w-3.5 h-3.5 animate-bounce" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>

      {/* Beat panel — floating glass card, bottom-right desktop / bottom mobile */}
      <div
        className="glass-panel"
        style={{
          position: "absolute",
          bottom: "48px",
          right: "40px",
          width: "300px",
          padding: "24px",
          opacity: panelVisible ? 1 : 0,
          transition: "opacity 0.5s ease-out",
          pointerEvents: panelVisible ? "auto" : "none",

          /* Mobile override via inline media-style via a wrapper div below */
        }}
      >
        <div className="w-full">
          {/*
            Beat2 + beat3 share the same mounted node so the DotGrid
            stays alive and its CSS color transitions animate in-place.
            All other beats get a key-based remount for the enter animation.
          */}
          {(activeBeat === "beat2" || activeBeat === "beat3") && (
            <div className={activeBeat === "beat2" ? "beat-enter" : ""}>
              <Beat23Panel
                isPhase3={activeBeat === "beat3"}
                dotBeat={dotBeat}
                waterfallActive={waterfallActive}
              />
            </div>
          )}

          {activeBeat && activeBeat !== "beat2" && activeBeat !== "beat3" && (
            <div key={activeBeat} className="beat-enter">
              <BeatPanel
                id={activeBeat}
                dotBeat={dotBeat}
                counterValue={counterValue}
                scatterActive={scatterActive}
                waterfallActive={waterfallActive}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile beat panel positioning (bottom full-width) */}
      <style>{`
        @media (max-width: 767px) {
          .glass-panel {
            right: 16px !important;
            left: 16px !important;
            bottom: 32px !important;
            width: auto !important;
          }
        }
      `}</style>

    </div>
  );
}
