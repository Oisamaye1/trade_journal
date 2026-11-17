import { ArrowRight, Layers, ShieldCheck, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: { absolute: "PropBook — the trading journal that keeps funded accounts alive" },
  description:
    "Multi-account trading journal for prop-firm traders: import MT5 reports, track daily-loss and drawdown rules, and see your real ROI across challenge fees and payouts.",
};

const PILLARS = [
  {
    icon: ShieldCheck,
    title: "Know your limits before you hit them",
    body: "Track daily loss, max drawdown and profit targets for every prop account, with an honest “as of” timestamp on every number.",
  },
  {
    icon: Layers,
    title: "Every account, one journal",
    body: "Challenges, verifications, funded and personal accounts side by side. Import MT5 reports without duplicates.",
  },
  {
    icon: Wallet,
    title: "Is prop trading paying you?",
    body: "Log challenge fees, resets and payouts to see your real return per firm — not just your win rate.",
  },
];

export default function LandingPage() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:py-20">
        <p className="text-sm font-medium text-primary">For prop-firm and multi-account traders</p>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
          The trading journal that keeps your funded accounts alive.
        </h1>
        <p className="max-w-2xl text-base text-pretty text-muted-foreground sm:text-lg">
          Journal every trade across all your accounts, see how close you are to each firm&apos;s
          rules, and find out whether your challenge fees are actually paying off.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/sign-in">
              Start free <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </section>
      <section aria-labelledby="pillars-heading" className="mx-auto max-w-6xl px-4 pb-16">
        <h2 id="pillars-heading" className="sr-only">
          What PropBook does
        </h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <li key={title}>
              <Card className="h-full">
                <CardHeader>
                  <Icon aria-hidden className="size-5 text-primary" />
                  <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
