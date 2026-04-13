# MarginMap: Product Portfolio Intelligence

**Mosaic Wellness Fellowship Builder Challenge — Problem #3**

600 SKUs. 5 channels. 25 fields per product. The category head has no single view to answer: which products are losing money, and which ones deserve more investment?

This dashboard builds that view. It classifies all 600 SKUs into zombies, hidden gems, gateways, and healthy products — and gives a specific recovery action per zombie, not just a flag.

**Numerical answer: ₹15,892,978.83/month in avoidable losses**

---

## Live Demo

**https://margin-map-tau.vercel.app**

No login. No loading screen. Static export on Vercel: loads in under a second.

---

## What It Does

| Page                       | What's there                                                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Executive Summary**      | Portfolio KPIs, composition bar, brand health, channel comparison, launch funnel stats                                             |
| **Portfolio Intelligence** | Scatter chart of all 600 SKUs by margin vs. volume, Kill List, Quick Wins, Scale Up, and Health tabs                               |
| **Zombie Kill List**       | 188 loss-making SKUs with a recovery path per product and a live P&L simulator: select rows, watch the savings update in real time |
| **Hidden Gems**            | 50 underinvested SKUs ranked by gem score with revenue upside if scaled to category median volume                                  |
| **Insights**               | 8 tabs: Arbitrage, Cost Waterfall, Anomalies, Brand & Category, Gateway Products, Pareto, Inventory Risk, Strategy                 |
| **Explorer**               | All 600 SKUs in a searchable, filterable, sortable, paginated table — click any row for the full 25-field detail panel             |

---

## Key Findings

188 zombie SKUs lose ₹1.59 Cr/month (₹19.07 Cr/year). 31% of the portfolio is a drag on the business.

Platform fees of 15–16% on Amazon, Flipkart, BigBasket, and Nykaa are the structural cause: not COGS, which barely moves across channels (39–44%). The D2C channel carries a 14.4 percentage point margin premium over the marketplace average as a direct result.

75 products are profitable on at least one channel but losing on another. The right fix for most of them is not discontinuation: it is delisting from the wrong channel.

Rating and profit are near-uncorrelated across the portfolio (Pearson r = 0.010). Selling price (r = 0.60) and margin% (r = 0.57) drive profit. A 4.5-star product with negative margins is not a good product: it is a mispriced one.

The top 20% of SKUs (120 products) generate 50.2% of revenue. Any disruption to this group — supply issues, a channel delist, a rating drop — carries 2.5x the P&L impact of an equivalent disruption in the bottom half of the portfolio.

Hair Oil is the most efficient category: 24.4% average margin with only 5 zombies across 49 SKUs. Serum is the opposite — 19 zombies despite being the largest category by SKU count. Category health is not random. Margin structure and competitive intensity within each category explain it.

Man Matters has the highest average portfolio margin at 20.6%. Little Joys sits at 15.3%. The 5.3 percentage point gap comes from product mix and category exposure, not pricing strategy alone.

93 SKUs have high return rates alongside ratings of 4.0 or above. High return combined with a good rating points to sizing or fit problems, not product defects. High return combined with a low rating (below 2.5) points to quality issues. These two groups need different fixes: the first needs better product information and size guides, the second needs reformulation or discontinuation.

Of the 188 zombies, a subset are fixable by channel shift alone. Removing the platform fee by moving these products to D2C would bring their margins positive without touching the product or price. The rest have a deeper pricing problem: total costs exceed selling price even before the platform fee is counted. The dashboard separates both groups so the operations team and category team can work in parallel.

Gems generate more revenue per ₹1 of marketing spend than zombies. Marketing ROI per SKU is calculated as `monthly_revenue ÷ (marketing_cost_per_unit × monthly_units)`. Routing more spend toward zombies does not fix the margin problem: it compounds it.

---

## Non-Obvious Discoveries

These are the findings that standard portfolio reports do not surface:

**Cross-channel arbitrage.** 75 products are profitable on one channel and losing on another. Little Joys Biotin: +42.6% margin on Nykaa, -133.8% on Amazon. The fix is a channel delist, not a product kill.

**Pack-size arbitrage.** Same product, same channel, different pack size: the small pack loses money, the large pack earns. Delisting the small pack costs nothing and recovers the margin.

**99 gateways to protect.** 99 SKUs look like zombies on margin alone, but their repeat purchase rates exceed 50%. Cutting them does not save ₹X per month: it breaks the acquisition economics for the brands that depend on them for subscription entry.

**Cannibalization.** Same brand, same sub-category, same channel, MRP within 15% of each other: own SKUs competing against each other. Internal margin dilution with no external cause.

**34 mislabeled "Decline" SKUs.** These carry margins above 35%. They are not declining: they are healthy performers being overlooked because of a stale lifecycle tag.

**28 "Launch" SKUs already losing money.** These need action now, before a full quarter of losses compounds. The pattern across 142 launch-stage SKUs — 20% already failing — is a process problem, not just a product problem.

**Recovery paths, not kill flags.** Each zombie gets a specific action: "Move to D2C" (channel fix) or "Reprice +₹X" (pricing fix). A label alone is not enough to act on.

**Price architecture gaps.** MRP distribution by sub-category shows over-crowded tiers (3–4 SKUs at the same price point) and unserved price points where no product exists.

**17 high-margin products with terrible ratings** (margin >40%, rating <2.0). The product economics are fine. The customer experience is broken. High-value fix targets.

**26 negative-margin products that customers love** (margin <0%, rating ≥4.0). Not bad products: mispriced ones.

**Little Joys has the worst zombie rate: 24.3%** (51 of 210 SKUs). Man Matters: 20.7%. The rate reveals systemic portfolio health in a way that raw counts cannot — counts scale with portfolio size, rates do not.

---

## Classification Method

Each of the 600 SKUs runs through four checks in sequence:

### Step 1: Gateway check (runs first, overrides everything)

`repeat_purchase_rate_pct > 50%` → gateway

These are exempt from all zombie rules. Per-unit economics are poor, but repeat rates above 50% mean the product anchors subscription revenue. Cutting it collapses LTV, not just one SKU's margin.

### Step 2: Hard zombie rule

`margin_pct < 0 AND not gateway` → zombie

### Step 3: Zombie score (percentile-weighted, 0–100)

Each field is normalized to a 0–1 percentile rank across all 600 SKUs, weighted, then summed.

| Field                    | Weight | Direction      |
| ------------------------ | ------ | -------------- |
| monthly_profit           | 25%    | lower = worse  |
| monthly_units            | 20%    | lower = worse  |
| avg_rating               | 15%    | lower = worse  |
| return_rate_pct          | 15%    | higher = worse |
| repeat_purchase_rate_pct | 15%    | lower = worse  |
| days_of_inventory        | 10%    | higher = worse |

Score < 25 → zombie candidate

### Step 4: Gem score (percentile-weighted, 0–100)

| Field                    | Weight | Direction                  |
| ------------------------ | ------ | -------------------------- |
| margin_pct               | 25%    | higher = better            |
| repeat_purchase_rate_pct | 25%    | higher = better            |
| avg_rating               | 20%    | higher = better            |
| monthly_units            | 20%    | lower = more underinvested |
| marketing_cost_per_unit  | 10%    | lower = more undiscovered  |

Score > 65 AND not zombie → hidden gem

### Results

| Label      | Count | Share |
| ---------- | ----- | ----- |
| Healthy    | 263   | 43.8% |
| Zombie     | 188   | 31.3% |
| Gateway    | 99    | 16.5% |
| Hidden Gem | 50    | 8.3%  |

---

## Advanced Analytics

Beyond the core classification, every previously unused field in the dataset now drives a specific analysis:

**Cannibalization detection:** Groups SKUs by brand + sub-category + channel where MRP is within 15% of another SKU in the same group. Flags them as internal shelf competitors.

**Break-even recovery paths:** For each zombie, the dashboard calculates whether a D2C channel shift closes the margin gap ("↗ Move to D2C, saves +X%") or whether repricing is the answer ("₹ Reprice +₹Y"). More specific than a kill flag.

**Price ladder:** MRP distribution per sub-category shows crowded price tiers and unserved price gaps. A crowding score ranks sub-categories by how many SKUs cluster at the same price point.

**Marketing ROI per SKU:** `monthly_revenue / (marketing_cost_per_unit × monthly_units)` — revenue per ₹1 of marketing spend. Shows which SKUs earn the most per rupee invested, and which do not.

**Launch success rate:** % of launch-stage SKUs already profitable. A process metric — it measures the launch system, not just individual products.

**`review_count` for gem validation:** Low units + many reviews = suppressed demand (real gem). Low units + few reviews = weak demand (not a gem). Without this check, the gem score overstates underinvestment.

**`months_listed` for launch analysis:** How long a losing launch-stage SKU has been losing money, and whether it is near a natural exit window.

---

## Methodology decisions

Three pushbacks on this approach, and how each is handled in the data.

### "Marketplaces drive volume: lower margins are worth it"

True for products with positive margins on marketplaces. A product earning 10% on Amazon and 29% on D2C can rationally stay on Amazon: broader reach, customer trust, and discovery are real. The dashboard does not flag these products as zombies.

The problem is negative margins. A product losing ₹50 per unit does not benefit from more volume: selling 500 units loses ₹25,000/month, selling 5,000 loses ₹2,50,000/month. The 15–16% platform fee is what pushes most of these products past zero. A product earning 3% on D2C becomes -12% on Amazon after the fee. The cause is structural: the platform fee, not weak demand.

The zombie classification applies only to products with negative per-unit margins. Products with positive but thin marketplace margins sit in the "healthy" bucket and get no action recommendation.

### "The channel is the problem, not the product"

75 products are profitable on at least one channel but losing on another. Recommending discontinuation for these would cut profitable lines. For this group, the recommendation is: delist from the losing channel, keep it on the profitable one. The Insights page has an Arbitrage tab specifically to separate channel decisions from product decisions before the kill list is built.

### "Thin-margin, high-repeat products are customer acquisition"

The gateway check exists for this reason. Any SKU with a repeat purchase rate above 50% is classified as a gateway and exempt from zombie rules, regardless of margin. These products anchor subscription revenue. Cutting them on margin alone destroys LTV. All 99 are surfaced separately, with a flag on the subset where margins fall below -10%, so the decision goes to finance rather than an automated threshold.

### Why percentile scores, not fixed thresholds

A product earning ₹50,000/month in profit means something different in Body Wash versus Supplements. Fixed thresholds (zombie if profit < ₹10,000) punish low-price categories and let high-price ones off the hook.

Percentile scoring compares each product against all 600 SKUs on every dimension. A body wash at ₹50,000 monthly profit might rank in the 70th percentile; a supplement at the same absolute number might rank in the 30th. The classification reflects where the product stands in its actual competitive context, not a threshold someone calibrated on the first day and never revisited.

### Low volume as a signal of underinvestment, not failure

The gem score inverts monthly_units: low volume scores higher. The reasoning is that a product with strong margins and high repeat purchase rates but little volume is likely undiscovered, not naturally small.

But low volume has two explanations. The product could be suppressed: narrow distribution, low marketing spend, limited channel presence. Or it could have weak demand — customers have seen it and chosen not to buy. The gem score resolves this with `review_count`. Low units + many reviews means customers know the product but the business has not pushed it. Low units + few reviews means the market has not engaged at all. Only the first pattern qualifies as a true hidden gem.

### How recovery paths are assigned to each zombie

Not every zombie needs discontinuation. The break-even analysis asks one question for each: if the platform fee were removed by shifting to D2C, would the margin turn positive? If yes, the recovery type is "Move to D2C" — the product's unit economics are viable, only the distribution cost is broken. If no, the problem runs deeper than the platform fee, and repricing is required. The dashboard shows the exact rupee increase needed to reach breakeven, not just a label.

### Cannibalization: why 15% MRP proximity

Cannibalization is flagged when two SKUs from the same brand share a sub-category and channel, and their MRPs are within 15% of each other. At that proximity, a customer browsing the listing sees near-identical price options and picks one — the brand loses the other sale to itself.

Products priced further apart represent genuine price-ladder coverage: a ₹299 entry option alongside a ₹599 premium. Within 15%, the gap is too small to signal different value tiers. Customers treat them as the same product at a slightly different price.

### The gateway bleeding flag

The gateway classification protects all products with repeat purchase rate above 50%. But the protection is not unconditional. Within the 99 gateways, any product where the margin falls below -10% gets a separate flag.

This is not a kill recommendation. It is a prompt for finance: the product is worth protecting in principle, but the per-transaction loss is large enough that the LTV case needs to be verified against actual customer cohort data, not assumed. A gateway product losing ₹200 per unit needs a different business case than one losing ₹10.

---

## Tech Stack

| Layer      | Choice                                                                  |
| ---------- | ----------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, `output: 'export'`: fully static, zero backend) |
| Styling    | Tailwind CSS v4                                                         |
| Charts     | Recharts                                                                |
| Data       | 600 SKUs pre-bundled as static JSON — zero runtime API calls            |
| Deployment | Vercel                                                                  |

All classification and aggregation logic runs at build time in `lib/classify.ts` and `lib/calculations.ts`. Pages read pre-computed arrays: no recalculation at render time. The app is a static export — no server, no database, no runtime fetching.

---

## Performance Decisions

- `isAnimationActive={false}` on all scatter plots: 600 animated points caused noticeable lag on mid-range devices
- `useMemo` on all filtered and sorted data: filters update without recalculating the full dataset on every keystroke
- `dynamic(() => import(...), { ssr: false })` on chart-heavy pages: reduces the initial bundle
- All aggregations computed once at build time: page speed is a product of architecture, not runtime optimization
