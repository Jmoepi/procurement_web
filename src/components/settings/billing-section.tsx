"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check } from "lucide-react";
import { PLANS, getPlanBySlug } from "@/lib/plans";
import type { Profile, TenantStats } from "@/types";

interface BillingSectionProps {
  profile: Profile | null;
  stats: TenantStats | null;
}

export function BillingSection({ profile, stats }: BillingSectionProps) {
  const currentPlan = getPlanBySlug(profile?.tenant?.plan ?? "starter");
  const sourceUsage = stats ? (stats.source_count / stats.max_sources) * 100 : 0;
  const subscriberUsage = stats ? (stats.subscriber_count / stats.max_subscribers) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                Manage your subscription and billing
              </CardDescription>
            </div>
            <Badge className="text-lg px-4 py-1 capitalize">
              {currentPlan?.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage Stats */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Sources</span>
                <span>
                  {stats?.source_count ?? 0} / {stats?.max_sources ?? 30}
                </span>
              </div>
              <Progress value={sourceUsage} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Subscribers</span>
                <span>
                  {stats?.subscriber_count ?? 0} / {stats?.max_subscribers ?? 1}
                </span>
              </div>
              <Progress value={subscriberUsage} />
            </div>
          </div>

          {/* Billing Actions */}
          <div className="flex gap-4">
            <Button variant="outline" disabled>
              Manage Billing
            </Button>
            <Button variant="outline" disabled>
              Download Invoice
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Stripe billing integration coming soon. During the demo period, all features are free.
          </p>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>
            Compare plans and upgrade when you&apos;re ready
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => {
              const isCurrent = plan.slug === profile?.tenant?.plan;
              return (
                <div
                  key={plan.slug}
                  className={`relative rounded-lg border p-6 ${
                    isCurrent ? "border-primary bg-primary/5" : ""
                  } ${plan.popular ? "ring-2 ring-primary" : ""}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge>Most Popular</Badge>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute top-4 right-4">
                      <Badge variant="secondary">Current</Badge>
                    </div>
                  )}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold">R{plan.price.monthly}</span>
                      <span className="text-muted-foreground">/mo</span>
                    </div>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.slice(0, 5).map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={isCurrent ? "secondary" : "default"}
                    disabled={isCurrent}
                  >
                    {isCurrent ? "Current Plan" : plan.cta}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
