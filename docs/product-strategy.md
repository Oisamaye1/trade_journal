# Product Strategy: from "forex journal" to a product traders pay for

> Working name in these docs: **PropBook**. It's a placeholder. Check domain and trademark availability before you commit to a name.

---

## 1. Honest take on the original idea

The original spec is good engineering: a multi-account journal, MT5 HTML import with Position-ID dedupe, combined and per-account dashboards, and analytics. As a **business** it has a problem. Every one of those features is table stakes:

| Alternative | What it does | Price |
|---|---|---|
| Myfxbook, FX Blue | Auto-sync from MT4/MT5, multi-account, analytics | Free |
| TradeZella, TraderSync, Edgewonk, Tradervue | Polished journals, import, tagging, analytics | ~$15–$80 / month |
| Spreadsheet / Notion template | Manual journal | Free |

A trader who only wants "a journal with an import button" already has free options. Copying them leaves you competing on price against free.

**To charge money, you need a specific buyer with an expensive, recurring pain that the generic tools ignore.**

---

## 2. The buyer: prop-firm traders

Most retail forex activity today runs through **proprietary trading firms**: FTMO, FundedNext, The5ers, E8, and dozens of others. Traders buy an evaluation ("challenge"), pass it under strict rules, then trade a funded account for a profit split.

Why this group is a strong fit:

1. **They already spend money every month.** A challenge costs roughly $50–$1,100. Most traders fail and buy again, so many spend hundreds per month on fees. A $19/month tool is a rounding error next to that, and saving a single challenge pays for years of it.
2. **They already run multiple accounts.** It's normal to hold accounts at several firms in different phases (Phase 1, Phase 2, Funded) at the same time, often running the same trades across them. Your multi-account core is something they need, not a nice extra.
3. **Most of them fail on rules, not strategy.** Common causes are the daily loss limit, max or trailing drawdown, consistency rules, lot-size caps, and news or weekend restrictions. Generic journals don't model any of these.
4. **Most don't know whether prop trading pays them.** Few track total fees against total payouts. "Am I actually up?" is an emotional question, it's easy to share, and almost nobody answers it well.

Secondary audiences, reachable with the same product later: retail traders with several broker accounts, and mentors or educators who want to review students' journals.

---

## 3. Positioning

> **The trading journal that keeps your funded accounts alive and tells you whether prop trading is actually paying you.**

Taglines to test:
- "Know your limits before you hit them."
- "Every account, every rule, every dollar spent and withdrawn, in one place."
- "Stop paying for failed challenges."

---

## 4. Product pillars (what people pay for)

The journal, import and dashboards stay as the foundation. These pillars on top are what justify the subscription.

### 4.1 Rule Guard (core paid feature)
- Each account gets a **rule set**: daily loss limit, static or trailing max drawdown, profit target, minimum trading days, consistency rule, max lots, and weekend or news flags.
- Rule sets start from **templates** (generic "1-step" and "2-step" programs, plus firm-specific templates that show the date they were last reviewed). **The user confirms or edits every value.** The app never presents a firm's rules as authoritative.
- A live status per account shows: daily loss used vs. limit, distance to max drawdown, trailing-drawdown floor, profit-target progress, consistency %, and trading days. Each rule reads **Safe / Caution / Danger / Breached**.
- A breach log records which trade caused each breach and when.
- **Honesty requirement:** the data is only as fresh as the last import, so the status always shows "as of <last trade time>". Rules that depend on equity are labelled as approximations from closed trades until live sync exists.

### 4.2 "Can I take this trade?" calculator
- Inputs: account, symbol, stop-loss distance, and optionally your own risk %.
- Output: the **maximum lot size** that respects both your personal risk and the remaining daily-loss and max-drawdown buffer on that account. This turns the rules into a pre-trade habit.
- A stripped-down public version works as a free SEO and lead-magnet tool.

### 4.3 Prop P&L Ledger and ROI
- Record challenge fees, resets, add-ons, payouts and refunds, per firm and per account.
- Track each account's lifecycle: Phase 1 → Phase 2 → Funded → Payout(s) / Breached.
- The dashboard shows total spent, total withdrawn, net result, ROI, pass rate per firm, average days to pass, and cost per funded account.
- A shareable, anonymised "My prop ROI" card gives you organic growth.

### 4.4 Copy groups
- Link accounts that mirror the same trades. Executions on the same symbol and direction that open within a short window become one **trade idea**.
- Journal the idea once: notes, tags and screenshots apply to every execution.
- Analytics can count **ideas instead of executions**, so five copied accounts don't inflate your win count fivefold.

### 4.5 Behaviour analytics
- Tags for setups, mistakes and emotions, plus **mistake cost** ("Mistakes cost you $1,240 this month; 'moved stop-loss' was $610 of it").
- R-multiples, session analysis (Asia, London, New York), weekday and hour heatmaps, and hold time.
- **Tilt signals:** performance in the hour after a loss, overtrading days, and performance when an account is near its limits.

### 4.6 Weekly review ritual
- An auto-generated weekly review covers key numbers, best and worst trades, rule near-misses, the top mistake by cost, and three reflection prompts.
- It's saved as a journal entry. This is the retention loop: users come back every week.
- Optional AI summary on the top tier. It is descriptive only, never gives trade signals or advice, and is clearly labelled.

### 4.7 Frictionless, trustworthy import
- v1: MT5 HTML report (spec in the build prompt). Later: MT4 statement, cTrader, and a generic CSV mapping wizard.
- The account number is detected from the report header, which **prevents imports into the wrong account**.
- Import batches are kept with counts and can be **undone**. The uploaded file is never stored.
- Later, on the top tier: auto-sync through a broker-connection API. This has a per-account cost, so it belongs on the higher plan.

---

## 5. Explicitly NOT in v1

- Social feed, leaderboards, or trade signals
- Order execution or a trade copier
- Backtesting or chart replay
- Native mobile apps (a responsive web app or PWA is enough)
- Hard-coded "official" firm rules
- Multi-currency FX conversion. Combined totals are shown **per currency**, while percentages and R-based stats aggregate across currencies.

---

## 6. Pricing

| Plan | Price | Includes |
|---|---|---|
| **Free** | $0 | 1 account, manual entry and MT5 import, journal, basic dashboard, last 90 days of analytics, public calculators |
| **Pro** | $19/mo or $159/yr | Unlimited accounts, Rule Guard, "Can I take this trade?", Prop Ledger and ROI, copy groups, full analytics, weekly reviews, CSV export |
| **Elite** | $39/mo or $329/yr | Everything in Pro, plus auto-sync (when shipped), AI weekly summary, email/push alerts when an account nears a limit, priority import support |

- 14-day Pro trial, no card required.
- Founding-member offer for the first ~200 users: locked-in discounted annual price.
- Sales argument: *"One failed $100k challenge costs about $500. That's more than two years of Pro."*

---

## 7. Validate before building everything

1. **Interview 10–15 prop traders** in prop-firm Discord servers, trading subreddits, and the X and YouTube prop community. Ask:
   - How many accounts do you run right now, and at which firms?
   - How do you track fees and payouts today?
   - What made you fail your last challenge?
   - What would you pay to never break a daily-loss rule by accident?
2. **Landing page and waitlist** with the **free Prop ROI calculator** (no signup) as the hook.
3. **Ship the MVP**: accounts, manual trades, MT5 import, journal, Rule Guard, and the ledger. Charge from day one via the trial.
4. **Metrics to watch:**
   - Activation: imported at least one report **and** configured rules within 24 hours.
   - Retention: weekly-review completion rate.
   - Conversion: trial to paid. Aim for ≥ 8–10% of activated users.
   - Qualitative: how often users say a breach warning saved them.

---

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Firm rules change, or the app computes them wrongly | User-confirmed templates showing the date last reviewed, clear "verify with your firm" copy, a pure and fully unit-tested rule engine, and a "not financial advice" disclaimer |
| Data is stale without live sync | "As of" timestamps everywhere; auto-sync on the Elite roadmap |
| MT5 reports vary (UTF-16 encoding, locale number formats, broker time zones, languages, symbol suffixes) | Header-driven parser, a fixture corpus collected from real users (with consent, anonymised), and failing rows loudly instead of guessing |
| Trust and privacy (financial data) | Uploaded files never stored, Row Level Security, data export and full account deletion, no selling of data |
| Incumbents add prop features | Go deep on prop-native features (ledger, copy groups, rule engine) and community-driven templates |
