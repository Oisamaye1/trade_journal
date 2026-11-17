/**
 * Reference data seeded into every environment. Pure data — no I/O — so it can be unit-tested.
 */
import type { RuleTemplateParams } from "@/domain/rules/params";

type AssetClass = "fx" | "metal" | "index" | "energy" | "crypto" | "other";

export type InstrumentSeed = {
  symbol: string;
  assetClass: AssetClass;
  pipSize: string;
  baseCurrency: string | null;
  quoteCurrency: string | null;
};

const FX_PAIRS = [
  // Majors
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "USDCHF",
  "USDCAD",
  "AUDUSD",
  "NZDUSD",
  // EUR crosses
  "EURGBP",
  "EURJPY",
  "EURCHF",
  "EURCAD",
  "EURAUD",
  "EURNZD",
  // GBP crosses
  "GBPJPY",
  "GBPCHF",
  "GBPCAD",
  "GBPAUD",
  "GBPNZD",
  // Other crosses
  "AUDJPY",
  "AUDCHF",
  "AUDCAD",
  "AUDNZD",
  "NZDJPY",
  "NZDCHF",
  "NZDCAD",
  "CADJPY",
  "CADCHF",
  "CHFJPY",
];

function fx(symbol: string): InstrumentSeed {
  const quote = symbol.slice(3);
  return {
    symbol,
    assetClass: "fx",
    // Convention: JPY-quoted pairs use 0.01, everything else 0.0001 (Part B §B4).
    pipSize: quote === "JPY" ? "0.01" : "0.0001",
    baseCurrency: symbol.slice(0, 3),
    quoteCurrency: quote,
  };
}

export const INSTRUMENT_SEED: InstrumentSeed[] = [
  ...FX_PAIRS.map(fx),
  {
    symbol: "XAUUSD",
    assetClass: "metal",
    pipSize: "0.1",
    baseCurrency: "XAU",
    quoteCurrency: "USD",
  },
  {
    symbol: "XAGUSD",
    assetClass: "metal",
    pipSize: "0.01",
    baseCurrency: "XAG",
    quoteCurrency: "USD",
  },
  // Index CFD naming varies by broker; these are common defaults and users can override pip size.
  { symbol: "US30", assetClass: "index", pipSize: "1", baseCurrency: null, quoteCurrency: "USD" },
  { symbol: "NAS100", assetClass: "index", pipSize: "1", baseCurrency: null, quoteCurrency: "USD" },
  {
    symbol: "SPX500",
    assetClass: "index",
    pipSize: "0.1",
    baseCurrency: null,
    quoteCurrency: "USD",
  },
  { symbol: "GER40", assetClass: "index", pipSize: "1", baseCurrency: null, quoteCurrency: "EUR" },
  { symbol: "UK100", assetClass: "index", pipSize: "1", baseCurrency: null, quoteCurrency: "GBP" },
];

export type RuleTemplateSeed = {
  slug: string;
  firm: string | null;
  program: string;
  phase: string;
  params: RuleTemplateParams;
  version: number;
  lastReviewedOn: string;
  sourceNote: string;
};

const GENERIC_NOTE =
  "Generic starting point, not any specific firm's rules. Edit every value to match your firm's current terms before confirming.";
const REVIEWED = "2026-11-17";

const dailyLoss5 = {
  ruleType: "daily_loss",
  params: {
    mode: "percent",
    value: "5",
    basis: "initial_balance",
    resetTimezone: "UTC",
    resetTime: "00:00",
  },
} as const;

/** Generic templates only. Firm-specific templates are added later via an admin script (Part B §B3). */
export const RULE_TEMPLATE_SEED: RuleTemplateSeed[] = [
  {
    slug: "generic-2-step-phase-1",
    firm: null,
    program: "Generic 2-step",
    phase: "Phase 1",
    params: {
      rules: [
        { ruleType: "profit_target", params: { mode: "percent", value: "10" } },
        dailyLoss5,
        { ruleType: "max_loss_static", params: { mode: "percent", value: "10" } },
        { ruleType: "min_trading_days", params: { days: 4 } },
      ],
    },
    version: 1,
    lastReviewedOn: REVIEWED,
    sourceNote: GENERIC_NOTE,
  },
  {
    slug: "generic-2-step-phase-2",
    firm: null,
    program: "Generic 2-step",
    phase: "Phase 2",
    params: {
      rules: [
        { ruleType: "profit_target", params: { mode: "percent", value: "5" } },
        dailyLoss5,
        { ruleType: "max_loss_static", params: { mode: "percent", value: "10" } },
        { ruleType: "min_trading_days", params: { days: 4 } },
      ],
    },
    version: 1,
    lastReviewedOn: REVIEWED,
    sourceNote: GENERIC_NOTE,
  },
  {
    slug: "generic-1-step-trailing",
    firm: null,
    program: "Generic 1-step",
    phase: "Evaluation",
    params: {
      rules: [
        { ruleType: "profit_target", params: { mode: "percent", value: "10" } },
        {
          ruleType: "daily_loss",
          params: { ...dailyLoss5.params, value: "3" },
        },
        {
          ruleType: "max_loss_trailing",
          params: { mode: "percent", value: "6", trailOn: "closed_balance", lockAtInitial: true },
        },
      ],
    },
    version: 1,
    lastReviewedOn: REVIEWED,
    sourceNote: GENERIC_NOTE,
  },
  {
    slug: "generic-funded",
    firm: null,
    program: "Generic",
    phase: "Funded",
    params: {
      rules: [
        dailyLoss5,
        { ruleType: "max_loss_static", params: { mode: "percent", value: "10" } },
      ],
    },
    version: 1,
    lastReviewedOn: REVIEWED,
    sourceNote: GENERIC_NOTE,
  },
];
