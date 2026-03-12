import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Globe,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "About | Procurement Radar SA",
  description:
    "Learn what Procurement Radar SA is building for South African tender discovery teams.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <main className="container py-16 sm:py-20">
        <section className="relative overflow-hidden rounded-[32px] border border-border/60 bg-background/80 px-6 py-12 shadow-sm backdrop-blur-sm sm:px-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.14),transparent_46%)]" />
          <div className="relative mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Search className="h-6 w-6" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              About Procurement Radar
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              A sharper tender workflow for South African teams
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
              Procurement Radar SA exists to turn fragmented tender portals into a
              workflow your team can trust: monitored sources, prioritised alerts,
              and digest-ready opportunities in one place.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/auth/signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/contact">Talk to us</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Target,
              title: "Focused discovery",
              description:
                "Track the tender categories and sources that matter instead of manually checking dozens of portals.",
            },
            {
              icon: Sparkles,
              title: "Clear prioritisation",
              description:
                "Highlight the opportunities with the strongest urgency, fit, and timing before they disappear into inbox noise.",
            },
            {
              icon: ShieldCheck,
              title: "Operational clarity",
              description:
                "Give decision-makers one shared surface for digests, subscribers, analytics, and source performance.",
            },
          ].map((item) => (
            <Card
              key={item.title}
              className="rounded-[28px] border-border/60 bg-background/80 shadow-sm"
            >
              <CardHeader>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <CardTitle className="pt-4 text-xl">{item.title}</CardTitle>
                <CardDescription className="text-sm leading-6">
                  {item.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="mt-10">
          <Card className="rounded-[32px] border-border/60 bg-background/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">
                What the product is designed to solve
              </CardTitle>
              <CardDescription className="text-base">
                Procurement teams do not need more portals. They need faster
                visibility, cleaner signal, and fewer opportunities missed because
                the process was too manual.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Today
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Tender opportunities are scattered across public-sector sites,
                  university pages, metro portals, and company procurement pages.
                  Teams end up relying on repeated manual checks, spreadsheets,
                  and late forwarding.
                </p>
              </div>
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  With Procurement Radar
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  The workflow shifts to monitored sources, clean dashboards,
                  mobile-safe review, and digest distribution that keeps the right
                  people in sync without manual chasing.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-10 rounded-[32px] border border-border/60 bg-muted/30 p-6 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight">
                Built for local context
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                The product is designed around South African tender patterns, local
                monitoring windows, and business workflows that need speed more
                than ceremony.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-2 text-sm font-medium">
              <Globe className="h-4 w-4 text-primary" />
              Monitoring public and corporate sources
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
