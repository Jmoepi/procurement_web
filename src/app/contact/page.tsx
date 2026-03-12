import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Mail,
  MessageSquareMore,
  Search,
  ShieldCheck,
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
  title: "Contact | Procurement Radar SA",
  description:
    "Get in touch with Procurement Radar SA about onboarding, product questions, or support.",
};

export default function ContactPage() {
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
              Contact
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Talk to the team behind Procurement Radar SA
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
              Use the details below for onboarding questions, rollout planning,
              support, or product feedback.
            </p>
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <Card className="rounded-[28px] border-border/60 bg-background/80 shadow-sm">
            <CardHeader>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <CardTitle className="pt-4 text-xl">Email</CardTitle>
              <CardDescription className="text-sm leading-6">
                The fastest way to reach the team for demos, onboarding, and
                support.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  General
                </p>
                <p className="mt-2 text-base font-semibold">
                  hello@procurementradar.co.za
                </p>
              </div>
              <Button asChild>
                <a href="mailto:hello@procurementradar.co.za">
                  Send an email
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-border/60 bg-background/80 shadow-sm">
            <CardHeader>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MessageSquareMore className="h-5 w-5" />
              </div>
              <CardTitle className="pt-4 text-xl">What to include</CardTitle>
              <CardDescription className="text-sm leading-6">
                A little context upfront helps the conversation move quickly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
              <p>Tell us what kind of tenders you monitor.</p>
              <p>
                Mention whether you need onboarding, source setup, or digest
                configuration help.
              </p>
              <p>
                Include your organisation name and the best reply email for your
                team.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="mt-10">
          <Card className="rounded-[32px] border-border/60 bg-background/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Support expectations</CardTitle>
              <CardDescription className="text-base">
                Procurement Radar SA is being rolled out carefully, so support
                conversations are direct and hands-on.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              {[
                {
                  title: "Onboarding",
                  description:
                    "Source setup, trial activation, and team access guidance for new workspaces.",
                },
                {
                  title: "Operational help",
                  description:
                    "Questions about digests, subscriptions, filtering, and source quality.",
                },
                {
                  title: "Trust and privacy",
                  description:
                    "Reach out about data handling, internal rollout requirements, or security questions.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[24px] border border-border/60 bg-muted/20 p-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <h2 className="mt-4 text-base font-semibold">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="mt-10 flex flex-col gap-3 rounded-[32px] border border-border/60 bg-muted/30 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Prefer to start in-product?
            </h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              You can create a workspace first and contact us once your team is
              inside.
            </p>
          </div>
          <Button size="lg" asChild>
            <Link href="/auth/signup">
              Create a workspace
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
