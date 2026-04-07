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
| **Executive Summary** | Full portfolio story at a glance: KPIs, brand breakdown, channel comparison |
| **Portfolio Quadrant** | Scatter of all 600 SKUs by margin % vs monthly units: click any dot for detail |
| **Zombie Kill List** | 188 loss-making SKUs with what-if P&L simulator: select rows to calculate savings |
| **Hidden Gems** | 50 underinvested SKUs ranked by gem score: revenue upside if scaled |
| **Insights** | 7 deep-discovery tabs: arbitrage, cost waterfall, anomalies, brand/category, gateways, Pareto, inventory risk |
| **Explorer** | Full 600-SKU searchable, filterable, sortable table |

---

## Key Findings

- **188 zombie SKUs** losing ₹1.59 Cr/month (₹19.07 Cr/year): 31% of portfolio
- **Platform fees (15–16%)** are the root cause of marketplace losses, not COGS
- **75 products** are profitable on one channel but losing on another: delist, don't kill
- **Rating and profit are essentially uncorrelated** (r = 0.010): a product can have 4.5 stars and negative margins
- **Top 20% of SKUs** generate 50.2% of revenue: concentration risk is real
- **18 gateway products** look like zombies but have >50% repeat purchase rates: killing them collapses LTV

---

## Classification Logic

### Step 1: Gateway Check (runs first, overrides all)
`repeat_purchase_rate_pct > 50%` → classify as **gateway** (exempt from zombie rules)

### Step 2: Hard Zombie Rule
`margin_pct < 0 AND not gateway` → **zombie**

### Step 3: Zombie Score (percentile-weighted, 0–100)
Monthly profit (25%), units (20%), rating (15%), return rate (15%), repeat rate (15%), inventory days (10%)
Threshold: score < 25 → zombie candidate

### Step 4: Gem Score (percentile-weighted, 0–100)
Margin % (25%), repeat rate (25%), rating (20%), units inverted (20%), marketing cost inverted (10%)
Threshold: score > 65 AND not zombie → hidden gem

---

## Tech Stack

- **Next.js 16** (App Router, `output: 'export'`: fully static)
- **Tailwind CSS v4**
- **Recharts**: `isAnimationActive={false}` on all large datasets, `useMemo` on all filters
- **Data:** 600 SKUs pre-bundled as static JSON: zero runtime API calls

