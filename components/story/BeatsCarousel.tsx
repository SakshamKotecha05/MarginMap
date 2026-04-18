"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/formatters";
import {
  TOTAL_LOSS,
  UPSIDE,
  CORRELATION,
  PARADOX_SKU,
  DotGrid,
  CostWaterfall,
  ScatterPlot,
  useBleedingCounter,
} from "@/components/story/StoryVisuals";

const F = "'Inter', ui-sans-serif, system-ui, sans-serif";
const TOTAL = 8;
const GAP_PX = 64;
const STICK_PX = 50;

// ── Per-beat design tokens ────────────────────────────────────────────────────

const BEAT_BG = [
  "linear-gradient(145deg, #1E0808 0%, #300E0E 100%)", // 0 maroon
  "#ECEAE4",                                             // 1 cream
  "#ECEAE4",                                             // 2 cream
  "#EDE8DF",                                             // 3 warm cream
  "linear-gradient(145deg, #071510 0%, #0D2018 100%)", // 4 forest
  "#ECEAE4",                                             // 5 cream
  "linear-gradient(145deg, #060610 0%, #0C0C1C 100%)", // 6 midnight
  "linear-gradient(145deg, #121228 0%, #1C1C38 100%)", // 7 indigo
];

const IS_LIGHT = [false, true, true, true, false, true, false, false];

const LABELS = [
  "The Problem", "The Scale", "The Cause", "The Nuance",
  "Hidden Gems", "Rating ≠ Profit", "The Strategy", "The Verdict",
];

const TITLES = [
  "Your best-reviewed product is losing money.",
  "600 SKUs. 5 channels. 3 brands.",
  "188 of them are bleeding. The culprit is the same every time.",
  "But don't kill them all.",
  "50 products hiding in plain sight.",
  "High ratings don't mean high profit.",
  "Every rupee shifted to D2C recovers 15% margin.",
  "Three moves. One playbook.",
];

// ── Card inner content — one case per beat ───────────────────────────────────

function CardInner({
  idx,
  isActive,
  triggered,
  counter,
}: {
  idx: number;
  isActive: boolean;
  triggered: boolean;
  counter: number;
}) {
  const light = IS_LIGHT[idx];
  const ghostNum  = light ? "rgba(26,26,46,0.10)" : "rgba(255,255,255,0.08)";
  const ghostText = light ? "rgba(26,26,46,0.25)" : "rgba(255,255,255,0.22)";

  const wrap: React.CSSProperties = {
    width: "100%", height: "100%",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: "clamp(1rem, 3%, 1.75rem)",
    boxSizing: "border-box", position: "relative", gap: "0.85rem",
  };

  // Non-active cards show a ghost beat number so the card feels intentional
  if (!isActive) {
    return (
      <div style={wrap}>
        <span style={{
          fontFamily: F, fontSize: "clamp(3.5rem,8vw,5.5rem)",
          fontWeight: 800, color: ghostNum, lineHeight: 1,
        }}>
          {String(idx + 1).padStart(2, "0")}
        </span>
        <span style={{
          fontFamily: F, fontSize: "9px", fontWeight: 600,
          letterSpacing: "0.28em", textTransform: "uppercase",
          color: ghostText,
        }}>
          {LABELS[idx]}
        </span>
      </div>
    );
  }

  // ── Active card visuals ───────────────────────────────────────────────────

  const headingColor = light ? "rgba(26,26,46,0.35)" : "rgba(255,255,255,0.22)";
  const cardHeading = (
    <div style={{
      position: "absolute", top: "clamp(0.65rem,2%,1rem)", left: 0, right: 0,
      textAlign: "center", pointerEvents: "none", zIndex: 1,
    }}>
      <span style={{
        fontFamily: F, fontSize: "9px", fontWeight: 700,
        letterSpacing: "0.28em", textTransform: "uppercase",
        color: headingColor,
      }}>{LABELS[idx]}</span>
    </div>
  );

  switch (idx) {
    /* 01 — The Problem */
    case 0:
      return (
        <div style={wrap}>
          {cardHeading}
          <div style={{
            position: "absolute", inset: 0, borderRadius: "24px",
            background: "radial-gradient(ellipse at 50% 40%, rgba(239,68,68,0.13) 0%, transparent 65%)",
            pointerEvents: "none",
          }} />
          <p style={{
            fontFamily: F, fontSize: "10px", fontWeight: 600,
            letterSpacing: "0.28em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.28)",
          }}>monthly losses</p>
          <div style={{
            fontFamily: F, fontWeight: 800, lineHeight: 1, color: "#EF4444",
            letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums",
            fontSize: "clamp(1.7rem, 3.8vw, 2.8rem)",
          }}>
            ₹{new Intl.NumberFormat("en-IN").format(counter)}
          </div>
          <p style={{
            fontFamily: F, fontSize: "10px", fontWeight: 500,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.2)",
          }}>every month</p>
        </div>
      );

    /* 02 — The Scale */
    case 1:
      return (
        <div style={{ ...wrap, justifyContent: "space-between", gap: "0.6rem", padding: "2.2rem clamp(1rem,3%,1.75rem) clamp(1rem,3%,1.75rem)" }}>
          {cardHeading}

          {/* Brand pills */}
          <div style={{ display: "flex", gap: "5px", width: "100%" }}>
            {[
              { name: "Little Joys",  count: 210, dot: "#3B82F6" },
              { name: "Be Bodywise",  count: 202, dot: "#8B5CF6" },
              { name: "Man Matters",  count: 188, dot: "#10B981" },
            ].map((b) => (
              <div key={b.name} style={{
                flex: 1, textAlign: "center",
                background: "rgba(255,255,255,0.72)",
                borderRadius: "10px",
                padding: "0.45rem 0.3rem",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                border: "1px solid rgba(255,255,255,0.9)",
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: b.dot, margin: "0 auto 4px",
                }} />
                <p style={{
                  fontFamily: F, fontSize: "8px", fontWeight: 700,
                  color: "#0F172A", lineHeight: 1.2, letterSpacing: "0.01em",
                }}>{b.name}</p>
                <p style={{
                  fontFamily: F, fontSize: "8px", fontWeight: 500,
                  color: "rgba(26,26,46,0.38)", marginTop: "2px",
                }}>{b.count} SKUs</p>
              </div>
            ))}
          </div>

          {/* Dot grid — colored by brand */}
          <DotGrid beat="brand" active={triggered} />

          {/* Channel margin tags */}
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
            {[
              { name: "D2C",       margin: "29.5%", color: "#10B981" },
              { name: "Nykaa",     margin: "22.5%", color: "#3B82F6" },
              { name: "BigBasket", margin: "16.1%", color: "#94A3B8" },
              { name: "Amazon",    margin: "10.7%", color: "#EF4444" },
              { name: "Flipkart",  margin: "10.6%", color: "#EF4444" },
            ].map((ch) => (
              <div key={ch.name} style={{
                display: "inline-flex", alignItems: "center", gap: "4px",
                background: "rgba(255,255,255,0.68)",
                borderRadius: "6px", padding: "3px 7px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                border: "1px solid rgba(255,255,255,0.85)",
              }}>
                <span style={{ fontFamily: F, fontSize: "9px", fontWeight: 600, color: "#0F172A" }}>{ch.name}</span>
                <span style={{ fontFamily: F, fontSize: "8.5px", color: "rgba(26,26,46,0.4)", fontVariantNumeric: "tabular-nums" }}>{ch.margin}</span>
              </div>
            ))}
          </div>
        </div>
      );

    /* 03 — The Cause */
    case 2:
      return (
        <div style={wrap}>
          {cardHeading}
          <DotGrid beat="red" active={triggered} />
          <CostWaterfall triggered={triggered} />
        </div>
      );

    /* 04 — The Nuance */
    case 3:
      return (
        <div style={{ ...wrap }}>
          {cardHeading}
          <DotGrid beat="twist" active={triggered} />
          <div style={{ display: "flex", gap: "0.6rem", width: "100%" }}>
            {/* KPI-style tile — amber */}
            <div style={{
              flex: 1,
              background: "linear-gradient(135deg, rgba(180,83,9,0.13) 0%, #ffffff 100%)",
              borderRadius: "16px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
              padding: "0.7rem 0.8rem",
            }}>
              <p style={{
                fontFamily: F, fontSize: "9.5px", fontWeight: 500,
                color: "rgba(26,26,46,0.42)", marginBottom: "0.3rem",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>Wrong channel</p>
              <p style={{
                fontFamily: F, fontSize: "1.55rem", fontWeight: 700,
                color: "#0F172A", lineHeight: 1, marginBottom: "0.35rem",
              }}>75</p>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#B45309", flexShrink: 0 }} />
                <p style={{ fontFamily: F, fontSize: "9px", color: "rgba(26,26,46,0.38)", lineHeight: 1.35 }}>
                  profitable on another channel
                </p>
              </div>
            </div>

            {/* KPI-style tile — gold */}
            <div style={{
              flex: 1,
              background: "linear-gradient(135deg, rgba(154,111,0,0.12) 0%, #ffffff 100%)",
              borderRadius: "16px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
              padding: "0.7rem 0.8rem",
            }}>
              <p style={{
                fontFamily: F, fontSize: "9.5px", fontWeight: 500,
                color: "rgba(26,26,46,0.42)", marginBottom: "0.3rem",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>Gateway SKUs</p>
              <p style={{
                fontFamily: F, fontSize: "1.55rem", fontWeight: 700,
                color: "#0F172A", lineHeight: 1, marginBottom: "0.35rem",
              }}>99</p>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#9A6F00", flexShrink: 0 }} />
                <p style={{ fontFamily: F, fontSize: "9px", color: "rgba(26,26,46,0.38)", lineHeight: 1.35 }}>
                  50%+ repeat rate — protect
                </p>
              </div>
            </div>
          </div>
        </div>
      );

    /* 05 — Hidden Gems */
    case 4:
      return (
        <div style={wrap}>
          {cardHeading}
          <div style={{
            position: "absolute", inset: 0, borderRadius: "24px",
            background: "radial-gradient(ellipse at center, rgba(16,185,129,0.07) 0%, transparent 65%)",
            pointerEvents: "none",
          }} />
          <DotGrid beat="gem" active={triggered} />
          <div style={{ textAlign: "center" }}>
            <p style={{
              fontFamily: F, fontWeight: 800, color: "#10B981", lineHeight: 1,
              fontSize: "clamp(1.3rem, 2.5vw, 1.85rem)",
            }}>{formatCurrency(UPSIDE)}</p>
            <p style={{
              fontFamily: F, fontSize: "10px", fontWeight: 600,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: "rgba(255,255,255,0.26)", marginTop: "5px",
            }}>monthly upside</p>
          </div>
        </div>
      );

    /* 06 — Rating ≠ Profit */
    case 5:
      return (
        <div style={wrap}>
          {cardHeading}
          <ScatterPlot triggered={triggered} />
          <p style={{
            fontFamily: F, fontSize: "10px", fontWeight: 600,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "rgba(26,26,46,0.28)",
          }}>r = {CORRELATION.toFixed(3)} — near zero</p>
        </div>
      );

    /* 07 — The Strategy */
    case 6:
      return (
        <div style={{ ...wrap, gap: 0 }}>
          {cardHeading}
          <div style={{
            position: "absolute", inset: 0, borderRadius: "24px",
            background: "radial-gradient(ellipse at 30% 50%, rgba(59,130,246,0.07) 0%, transparent 60%)",
            pointerEvents: "none",
          }} />
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "1rem" }}>
            <div style={{ textAlign: "center" }}>
              <p style={{
                fontFamily: F, fontWeight: 800, color: "#10B981", lineHeight: 1,
                fontSize: "clamp(1.8rem, 3.5vw, 2.7rem)",
              }}>29.5%</p>
              <p style={{
                fontFamily: F, fontSize: "9.5px", fontWeight: 600,
                letterSpacing: "0.22em", textTransform: "uppercase",
                color: "rgba(255,255,255,0.32)", marginTop: "5px",
              }}>D2C</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
              <div style={{ height: "1px", width: "16px", background: "rgba(255,255,255,0.12)" }} />
              <p style={{ fontFamily: F, fontSize: "10px", color: "rgba(255,255,255,0.2)", fontWeight: 500 }}>vs</p>
              <div style={{ height: "1px", width: "16px", background: "rgba(255,255,255,0.12)" }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{
                fontFamily: F, fontWeight: 800, color: "#EF4444", lineHeight: 1,
                fontSize: "clamp(1.8rem, 3.5vw, 2.7rem)",
              }}>10.7%</p>
              <p style={{
                fontFamily: F, fontSize: "9.5px", fontWeight: 600,
                letterSpacing: "0.22em", textTransform: "uppercase",
                color: "rgba(255,255,255,0.32)", marginTop: "5px",
              }}>Amazon</p>
            </div>
          </div>
          <p style={{
            fontFamily: F, fontSize: "11px", fontWeight: 500,
            color: "rgba(255,255,255,0.18)", letterSpacing: "0.1em", textAlign: "center",
          }}>same product · same COGS</p>
        </div>
      );

    /* 08 — The Verdict */
    case 7:
      return (
        <div style={{ ...wrap, gap: "0.3rem" }}>
          {cardHeading}
          <div style={{
            position: "absolute", inset: 0, borderRadius: "24px",
            background: "radial-gradient(ellipse at center, rgba(247,245,240,0.025) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <div style={{ lineHeight: 1.1, textAlign: "center", marginBottom: "1.5rem" }}>
            <p style={{
              fontFamily: F, fontWeight: 800, color: "#F59E0B", marginBottom: "0.2rem",
              fontSize: "clamp(1.4rem, 3vw, 2.1rem)",
            }}>Delist 75.</p>
            <p style={{
              fontFamily: F, fontWeight: 800, color: "#EF4444", marginBottom: "0.2rem",
              fontSize: "clamp(1.4rem, 3vw, 2.1rem)",
            }}>Reprice 113.</p>
            <p style={{
              fontFamily: F, fontWeight: 800, color: "#10B981",
              fontSize: "clamp(1.4rem, 3vw, 2.1rem)",
            }}>Fund 50.</p>
          </div>
          <Link
            href="/"
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "0.7rem 0.9rem",
              background: "linear-gradient(135deg, #FEF3C7 0%, #FFFEF8 100%)",
              borderRadius: "16px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.18)",
              color: "#0F172A",
              fontFamily: F, fontSize: "12px", fontWeight: 600,
              textDecoration: "none", letterSpacing: "0.02em",
              transition: "box-shadow 0.2s ease",
            }}
          >
            Explore the Dashboard
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#0F172A" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      );

    default:
      return null;
  }
}

// ── Main carousel ─────────────────────────────────────────────────────────────

export default function BeatsCarousel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive]       = useState(0);
  const [triggered, setTriggered] = useState<boolean[]>(() => Array(TOTAL).fill(false));
  const [isMobile, setIsMobile]   = useState(false);

  const activeRef     = useRef(0);          // always-current mirror for keyboard handler
  useEffect(() => { activeRef.current = active; }, [active]);

  const paradoxRating = PARADOX_SKU?.avg_rating.toFixed(1) ?? "4.7";
  const paradoxLoss   = PARADOX_SKU ? Math.abs(PARADOX_SKU.monthly_profit) : 40_000;
  const counter       = useBleedingCounter(TOTAL_LOSS, triggered[0]);

  const QUOTES = [
    `600 products. ₹110 Cr in revenue. One of them is a ${paradoxRating}★ favourite losing ${formatCurrency(paradoxLoss)} every month. Popularity and profitability are not the same thing.`,
    "Each dot is one product. Before we fix anything, we need to see everything — the full portfolio, all 600 SKUs, laid out at once.",
    "Platform fees — 15–16% on every marketplace sale — wipe out margin. D2C earns 29.5%. Amazon earns 10.7%. Same product, same COGS, different channel.",
    "75 products are profitable on a different channel — wrong listing, not wrong product. 99 more have 50%+ repeat rates. Kill those and you lose the customer, not just the SKU.",
    `Strong margins. Loyal customers. Near-zero marketing spend. Fund these 50 and recover ${formatCurrency(UPSIDE)} in incremental monthly profit.`,
    `Rating and profit have a correlation of r\u2009=\u2009${CORRELATION.toFixed(3)} — essentially zero. A 4.5★ product losing money isn't a bad product. It's a mispriced one.`,
    "Same product. Same COGS. D2C earns 29.5% margin — Amazon earns 10.7%. That 18.8 point gap isn't a dashboard insight. It's a business strategy.",
    "Delist 75 from losing channels. Reprice 113 underpriced SKUs. Fund the 50 hidden gems. Not from cuts — from clarity.",
  ];

  // ── Responsive breakpoint ────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Scroll tracking ──────────────────────────────────────────────────────
  useEffect(() => {
    const trigger0 = () =>
      setTriggered(prev => {
        if (prev[0]) return prev;
        const next = [...prev]; next[0] = true; return next;
      });

    const onScroll = () => {
      const el = containerRef.current;
      if (!el) return;
      const { top, height } = el.getBoundingClientRect();
      const scrollable = height - window.innerHeight;
      if (scrollable <= 0) return;
      const progress = Math.max(0, Math.min(1, -top / scrollable));
      const idx = Math.min(TOTAL - 1, Math.floor(progress * TOTAL));
      setActive(idx);
      setTriggered(prev => {
        if (prev[idx]) return prev;
        const next = [...prev]; next[idx] = true; return next;
      });
    };

    // Trigger beat 0 as soon as the section enters the viewport
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) trigger0(); },
      { threshold: 0.01 }
    );
    if (containerRef.current) obs.observe(containerRef.current);

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      obs.disconnect();
    };
  }, []);

  // ── Programmatic scroll to beat ──────────────────────────────────────────
  const scrollToBeat = useCallback((idx: number) => {
    const el = containerRef.current;
    if (!el) return;
    const clamped    = Math.max(0, Math.min(TOTAL - 1, idx));
    const elTop      = el.getBoundingClientRect().top + window.scrollY;
    const scrollable = el.offsetHeight - window.innerHeight;
    const targetY    = elTop + (clamped / TOTAL) * scrollable;
    window.scrollTo({ top: targetY, behavior: "smooth" });
  }, []);

  // ── Keyboard navigation ──────────────────────────────────────────────────
  // Registered once — reads active via ref so it never needs to re-register.
  // Re-registering on active change caused a brief window where no listener
  // existed, silently dropping keypresses (the right-arrow bug).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        scrollToBeat(activeRef.current + 1);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        scrollToBeat(activeRef.current - 1);
      }
    };
    document.addEventListener("keydown", onKey, { capture: true });
    return () => document.removeEventListener("keydown", onKey, { capture: true });
  }, [scrollToBeat]); // scrollToBeat is stable — this runs exactly once

  // ── 3-card transform ─────────────────────────────────────────────────────
  function cardTransform(i: number): React.CSSProperties {
    const offset   = (i - active + TOTAL) % TOTAL;
    const isActive = offset === 0;
    const isLeft   = offset === TOTAL - 1;
    const isRight  = offset === 1;
    const T        = "all 0.8s cubic-bezier(.4,2,.3,1)";

    if (isActive) return {
      zIndex: 3, opacity: 1, pointerEvents: "auto",
      transform: "translateX(0px) translateY(0px) scale(1) rotateY(0deg)",
      transition: T,
    };
    // On mobile, only the active card is visible
    if (isMobile) return { zIndex: 1, opacity: 0, pointerEvents: "none", transition: T };
    if (isLeft) return {
      zIndex: 2, opacity: 1, pointerEvents: "none",
      transform: `translateX(-${GAP_PX}px) translateY(-${STICK_PX}px) scale(0.85) rotateY(15deg)`,
      transition: T,
    };
    if (isRight) return {
      zIndex: 2, opacity: 1, pointerEvents: "none",
      transform: `translateX(${GAP_PX}px) translateY(-${STICK_PX}px) scale(0.85) rotateY(-15deg)`,
      transition: T,
    };
    return { zIndex: 1, opacity: 0, pointerEvents: "none", transition: T };
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} style={{ height: `calc(${TOTAL + 1} * 100svh)` }}>
      <div
        style={{
          position: "sticky", top: 0,
          height: "100svh",
          background: "var(--story-bg)",
          overflow: "hidden",
        }}
      >
        {/* ── Outer grid ────────────────────────────────────────── */}
        <div className="bc-inner">

          {/* ── LEFT: Card stack ────────────────────────── */}
          <div className="bc-visual">
            <div className="bc-card-wrap">
              {Array.from({ length: TOTAL }, (_, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute", top: 0, left: 0,
                    width: "100%", height: "100%",
                    background: BEAT_BG[i],
                    borderRadius: "24px",
                    overflow: "hidden",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.12)",
                    ...cardTransform(i),
                  }}
                >
                  <CardInner
                    idx={i}
                    isActive={i === active}
                    triggered={triggered[i]}
                    counter={counter}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Text + nav ───────────────────────── */}
          <div className="bc-text">
            {/* Beat label */}
            <AnimatePresence mode="wait">
              <motion.p
                key={`label-${active}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  fontFamily: F, fontSize: "11px", fontWeight: 600,
                  letterSpacing: "0.22em", textTransform: "uppercase",
                  color: "var(--story-muted)", marginBottom: "1.25rem",
                }}
              >
                {String(active + 1).padStart(2, "0")} — {LABELS[active]}
              </motion.p>
            </AnimatePresence>

            {/* Title */}
            <AnimatePresence mode="wait">
              <motion.h2
                key={`title-${active}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.32, ease: "easeInOut" }}
                style={{
                  fontFamily: F,
                  fontSize: "clamp(1.4rem, 2.6vw, 2.3rem)",
                  fontWeight: 700, lineHeight: 1.18,
                  color: "var(--story-text)",
                  marginBottom: "1.25rem",
                  margin: "0 0 1.25rem 0",
                }}
              >
                {TITLES[active]}
              </motion.h2>
            </AnimatePresence>

            {/* Quote — word-by-word blur reveal */}
            <div style={{ minHeight: "5rem" }}>
              <AnimatePresence mode="wait">
                <motion.p
                  key={`quote-${active}`}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  style={{
                    fontFamily: F, fontSize: "clamp(13px, 1.25vw, 15px)",
                    lineHeight: 1.78, color: "var(--story-muted)",
                    maxWidth: "430px", margin: 0,
                  }}
                >
                  {QUOTES[active].split(" ").map((word, i) => (
                    <motion.span
                      key={`${active}-${i}`}
                      initial={{ filter: "blur(8px)", opacity: 0, y: 4 }}
                      animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut", delay: 0.018 * i }}
                      style={{ display: "inline-block" }}
                    >
                      {word}&nbsp;
                    </motion.span>
                  ))}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Progress dots */}
            <div style={{
              display: "flex", gap: "5px", alignItems: "center", marginTop: "2rem",
            }}>
              {Array.from({ length: TOTAL }, (_, i) => (
                <button
                  key={i}
                  onClick={() => scrollToBeat(i)}
                  aria-label={`${LABELS[i]}`}
                  style={{
                    width: i === active ? "18px" : "6px",
                    height: "6px", borderRadius: "3px",
                    background: i === active
                      ? "var(--story-text)"
                      : "rgba(26,26,46,0.18)",
                    border: "none", cursor: "pointer", padding: 0,
                    transition: "all 0.35s cubic-bezier(.4,2,.3,1)",
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Thin progress line at very bottom ──────── */}
        <div style={{
          position: "absolute", bottom: 0, left: 0,
          height: "2px",
          width: `${((active + 1) / TOTAL) * 100}%`,
          background: "var(--story-text)",
          opacity: 0.15,
          transition: "width 0.5s ease",
        }} />
      </div>
    </div>
  );
}
