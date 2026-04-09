# MarginMap: Product Portfolio Intelligence

**Mosaic Wellness Fellowship Builder Challenge: Problem #3**

A fast, static dashboard that analyzes 600 SKUs across 5 channels to surface zombie products losing money, hidden gems that deserve more investment, and gateway products that look unprofitable but anchor subscription revenue.

**Numerical Answer: ₹15,892,978.83/month in avoidable losses**

---

## Live Demo

**https://margin-map-tau.vercel.app**

---

## What It Does

| Page | Purpose |
|---|---|
| **Executive Summary** | Full portfolio story at a glance: KPI cards, portfolio composition, brand and channel comparison |
| **Portfolio Intelligence** | Multi-tab view: Scatter chart of all 600 SKUs, Kill List, Quick Wins (channel arbitrage), Scale Up, Health dashboard |
| **Zombie Kill List** | 188 loss-making SKUs with what-if P&L simulator: select rows to calculate monthly and annual savings |
| **Hidden Gems** | 50 underinvested SKUs ranked by gem score with revenue upside if scaled to category median volume |
| **Insights** | 8 deep-discovery tabs: Arbitrage, Cost Waterfall, Anomalies, Brand & Category, Gateway, Pareto, Inventory Risk, Strategy |
| **Explorer** | Full 600-SKU searchable, filterable, paginated, sortable table with classification filters |

---

## Key Findings

- **188 zombie SKUs** losing ₹1.59 Cr/month (₹19.07 Cr/year): 31% of portfolio is a drag
- **Platform fees (15–16%)** are the root cause of marketplace losses — not COGS, not marketing
- **75 products** are profitable on one channel but losing on another: the fix is delist, not kill
- **Rating and profit are essentially uncorrelated** (r = 0.010): a 4.5-star product can have negative margins
- **Top 20% of SKUs** generate 50.2% of revenue: concentration risk is real
- **99 gateway products** look like zombies but have >50% repeat purchase rates: killing them collapses LTV
- **Cannibalization detected** in multiple brand + sub-category + channel combinations: own SKUs competing with each other
- **34 "Decline" SKUs** have >35% margins: mislabeled by lifecycle stage, actually healthy performers
- **28 "Launch" SKUs** are already losing money: early death signals before they've had a chance to scale

---

## Classification Logic

### Step 1: Gateway Check (runs first, overrides all)
`repeat_purchase_rate_pct > 50%` → classify as **gateway** (exempt from zombie rules regardless of margin)

### Step 2: Hard Zombie Rule
`margin_pct < 0 AND not gateway` → **zombie**

### Step 3: Zombie Score (percentile-weighted, 0–100)
| Field | Weight | Direction |
|---|---|---|
| monthly_profit | 25% | lower = worse |
| monthly_units | 20% | lower = worse |
| avg_rating | 15% | lower = worse |
| return_rate_pct | 15% | higher = worse |
| repeat_purchase_rate_pct | 15% | lower = worse |
| days_of_inventory | 10% | higher = worse |

Threshold: score ≥ 60 → zombie candidate

### Step 4: Gem Score (percentile-weighted, 0–100)
| Field | Weight | Direction |
|---|---|---|
| margin_pct | 25% | higher = better |
| repeat_purchase_rate_pct | 25% | higher = better |
| avg_rating | 20% | higher = better |
| monthly_units | 20% | lower = more underinvested (inverted) |
| marketing_cost_per_unit | 10% | lower = more undiscovered (inverted) |

Threshold: score ≥ 65 AND not zombie → hidden gem

---

## Advanced Analytics (Phase 4.5)

- **Cannibalization detection:** SKUs sharing brand + sub-category + channel with MRP within 15% are flagged as shelf competitors
- **Break-even analysis:** Each zombie gets a recovery path — "Move to D2C" (channel fix) or "Reprice +₹X" (pricing fix) — more actionable than a kill flag alone
- **Price ladder:** MRP distribution by sub-category reveals over-crowded price tiers and unserved price points
- **Channel-SKU fit score:** Optimal channel per product group; surfaces which SKUs belong on D2C vs marketplace
- **Marketing ROI per SKU:** Revenue per ₹1 of marketing spend — identifies which SKUs earn the most per rupee invested
- **Launch success rate:** % of new launches already profitable vs bleeding money — a process failure KPI

---

## Tech Stack

- **Next.js 16** (App Router, `output: 'export'`: fully static, zero backend)
- **Tailwind CSS v4**
- **Recharts** (`isAnimationActive={false}` on all large datasets, `useMemo` on all filters)
- **Data:** 600 SKUs pre-bundled as static JSON, zero runtime API calls
- **Deployment:** Vercel
