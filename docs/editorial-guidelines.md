# Editorial Guidelines — Home Project Tools

Rewrite brand voice details when a final brand is chosen. The rules below apply to calculators and supporting articles.

## Positioning

This site helps homeowners and DIYers **plan material purchases** with:

- material quantities
- project dimensions
- waste allowance
- unit conversions
- packages / bags / boxes required
- later: estimated material costs and shopping lists

It does **not** provide:

- structural engineering
- building-code approval
- electrical design
- plumbing design
- architectural plans
- professional contractor estimates

## Voice

- Direct answers near the top
- Plain language
- No invented credentials, statistics, package yields, or coverage rates
- Distinguish **mathematical result** from **recommended purchase quantity** (rounding up, waste, packaging)

## Calculators

- Calculators estimate **quantities only** unless a later tool is explicitly scoped and sourced for cost
- Waste percentages must be **visible**, **editable where practical**, and described as **assumptions**, not universal facts
- Material-specific defaults must be **sourced before launch**
- Manufacturer package yields and coverage rates must **not be invented**
- Assumptions should be visible on the page rather than hidden in the formula
- Prefer shopping-list style outputs (bags, boxes, yards) that users can verify against labels

## Review / risk boundaries

Align with `src/config/review.ts`:

| Level | Use when |
|-------|----------|
| `none` | Basic arithmetic / measurement utilities with no material assumptions |
| `general` | Normal DIY planning assumptions (most quantity calculators) |
| `caution` | Material or application details where wrong assumptions can waste material or damage a project |
| `professional` | Structural, electrical, plumbing, code-sensitive, or safety-critical subjects |

The initial MVP material calculators (concrete volume/bags, gravel, mulch, paint, tile) should generally use `general` or `caution` as appropriate — **not** `professional` — unless scope expands into structural or code design.

## Forbidden recommendations

Do not recommend or calculate:

- beam spans
- joist spans
- footing design
- load capacity
- structural concrete strength / mix design for structural members
- electrical sizing
- plumbing sizing

unless a future tool is specifically researched, bounded, and reviewed.

## Sources

Allowed:

- Manufacturer product labels and technical data sheets (for yields/coverage)
- Government / standards bodies where relevant
- Established unit conversion constants
- Supplier-published density or coverage tables when cited

Not allowed as factual authorities:

- Forums and social threads
- Affiliate listicles
- AI summaries
- Competitor SEO pages (structure only)

## Context users must be reminded of

Building codes, HOA rules, permits, climate, substrate conditions, and manufacturer instructions may alter project requirements. Say so when relevant.

## Excluded topics (for now)

- Structural framing design
- Electrical circuit design
- Plumbing system design
- Live retail pricing or affiliate product pushes
- Contractor bidding / labor estimates presented as quotes

## Publishing rules

- Default drafts unpublished (`draft: true`)
- No silent topic substitution on overlap/source/safety failures
- Explicit approval required before publish-cluster
- Empty category hubs stay noindex until they contain published content
