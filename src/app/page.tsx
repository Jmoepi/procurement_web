import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, ArrowRight, Mail, Search, Bell, Zap, Shield, Clock, Globe, TrendingUp } from "lucide-react";
import { PLANS, PLAN_FEATURES } from "@/lib/plans";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Navigation - Apple-style glass effect */}
      <header className="sticky top-0 z-50 w-full glass-nav">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Search className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-semibold tracking-tight">Procurement Radar</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </Link>
          </nav>
          
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section - Apple-inspired minimal design */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-radial" />
          
          <div className="container relative pt-24 pb-20 md:pt-32 md:pb-28 lg:pt-40 lg:pb-36">
            <div className="mx-auto max-w-3xl text-center">
              {/* Pill badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-sm text-muted-foreground mb-8">
                <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span>Built for South African businesses</span>
              </div>
              
              {/* Main heading - Large, clean typography */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.08] mb-6">
                Find tenders.
                <br />
                <span className="text-muted-foreground">Win contracts.</span>
              </h1>
              
              {/* Subtitle - Clean and readable */}
              <p className="mx-auto mb-10 max-w-xl text-lg md:text-xl text-muted-foreground leading-relaxed">
                AI-powered monitoring of 35+ government and corporate portals. 
                Get daily notifications for opportunities that match your business.
              </p>
              
              {/* CTA Buttons - Apple-style */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <Link href="/auth/signup">
                  <Button size="xl" className="w-full sm:w-auto">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button size="xl" variant="outline" className="w-full sm:w-auto">
                    View Demo
                  </Button>
                </Link>
              </div>
              
              {/* Trust badges - Minimal */}
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  No credit card required
                </span>
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  14-day free trial
                </span>
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Cancel anytime
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section - Clean cards */}
        <section className="py-20 border-y border-border/40">
          <div className="container">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
              {[
                { value: "35+", label: "Data Sources", icon: Globe },
                { value: "1,000+", label: "Daily Tenders", icon: TrendingUp },
                { value: "07:00", label: "Daily Digest", icon: Mail },
                { value: "R50B+", label: "Value Tracked", icon: Zap },
              ].map((stat, i) => (
                <div key={i} className="group p-6 rounded-2xl bg-muted/40 hover:bg-muted/60 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background mb-4">
                    <stat.icon className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="text-3xl md:text-4xl font-semibold tracking-tight">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section - Apple-style grid */}
        <section id="features" className="py-24 md:py-32">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center mb-16 lg:mb-20">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-4">
                Everything you need to win
              </h2>
              <p className="text-lg text-muted-foreground">
                Powerful tools designed specifically for South African businesses.
              </p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Search,
                  title: "Intelligent Crawling",
                  description: "AI-powered crawler scans 35+ government and corporate tender portals daily.",
                },
                {
                  icon: Mail,
                  title: "Daily Email Digest",
                  description: "Personalized emails every morning at 07:00 SAST with matching opportunities.",
                },
                {
                  icon: Bell,
                  title: "Smart Categorization",
                  description: "Automatic priority levels based on keywords, value, and closing dates.",
                },
                {
                  icon: Zap,
                  title: "Deadline Tracking",
                  description: "Visual countdown timers ensure you never miss a submission deadline.",
                },
                {
                  icon: Shield,
                  title: "Smart Deduplication",
                  description: "Intelligent matching removes duplicate listings across all portals.",
                },
                {
                  icon: Clock,
                  title: "Historical Archive",
                  description: "Access past tenders for research and trend analysis.",
                },
              ].map((feature, i) => (
                <Card key={i} className="group bg-muted/20 border-transparent hover:bg-muted/40 hover:border-border/40 transition-all duration-300">
                  <CardHeader>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-background shadow-sm mb-4">
                      <feature.icon className="h-5 w-5 text-foreground" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section - Clean minimal cards */}
        <section id="pricing" className="py-24 md:py-32 bg-muted/30">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center mb-16 lg:mb-20">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-4">
                Simple pricing
              </h2>
              <p className="text-lg text-muted-foreground">
                Start free, upgrade when you need more. All plans include a 14-day trial.
              </p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
              {PLANS.map((plan) => (
                <Card
                  key={plan.slug}
                  className={`relative transition-all duration-300 ${
                    plan.popular 
                      ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]" 
                      : "hover:border-border hover:shadow-lg"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <CardHeader className="pt-8">
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-6">
                      <span className="text-5xl font-semibold tracking-tight">R{plan.price.monthly}</span>
                      <span className="text-muted-foreground ml-1">/mo</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      R{plan.price.yearly}/year <span className="text-primary">(save 17%)</span>
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="pt-4">
                    <Link href="/auth/signup" className="w-full">
                      <Button
                        className="w-full"
                        variant={plan.popular ? "default" : "outline"}
                        size="lg"
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {/* Feature Comparison */}
            <div className="mt-24 max-w-4xl mx-auto">
              <h3 className="text-2xl font-semibold text-center mb-10">Compare features</h3>
              <div className="overflow-hidden rounded-2xl border bg-card">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left py-4 px-6 font-medium text-muted-foreground">Feature</th>
                      <th className="text-center py-4 px-6 font-medium text-muted-foreground">Starter</th>
                      <th className="text-center py-4 px-6 font-medium text-primary">Pro</th>
                      <th className="text-center py-4 px-6 font-medium text-muted-foreground">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PLAN_FEATURES.map((feature, i) => (
                      <tr key={feature.name} className="border-b last:border-0">
                        <td className="py-4 px-6 text-sm">{feature.name}</td>
                        <td className="text-center py-4 px-6">
                          {typeof feature.starter === "boolean" ? (
                            feature.starter ? (
                              <Check className="h-4 w-4 text-primary mx-auto" />
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )
                          ) : (
                            <span className="text-sm">{feature.starter}</span>
                          )}
                        </td>
                        <td className="text-center py-4 px-6 bg-primary/[0.02]">
                          {typeof feature.pro === "boolean" ? (
                            feature.pro ? (
                              <Check className="h-4 w-4 text-primary mx-auto" />
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )
                          ) : (
                            <span className="text-sm font-medium text-primary">{feature.pro}</span>
                          )}
                        </td>
                        <td className="text-center py-4 px-6">
                          {typeof feature.enterprise === "boolean" ? (
                            feature.enterprise ? (
                              <Check className="h-4 w-4 text-primary mx-auto" />
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )
                          ) : (
                            <span className="text-sm">{feature.enterprise}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section - Minimal accordion style */}
        <section id="faq" className="py-24 md:py-32">
          <div className="container max-w-3xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight">
                Questions & answers
              </h2>
            </div>
            <div className="space-y-3">
              {[
                {
                  q: "What sources do you monitor?",
                  a: "We monitor 35+ sources including the eTender Portal (National Treasury), all 9 provincial treasuries, major metro municipalities (Joburg, Cape Town, Durban, Pretoria), state-owned enterprises (Transnet, Eskom, PRASA), and major universities."
                },
                {
                  q: "How often is the data updated?",
                  a: "Our crawler runs daily at 06:00 SAST. Email digests are sent at 07:00 SAST, giving you fresh opportunities every morning."
                },
                {
                  q: "Can I customize what tenders I receive?",
                  a: "Yes! You can filter by category, set keyword includes/excludes, choose priority levels, and customize the maximum items per digest."
                },
                {
                  q: "Is there a free trial?",
                  a: "Yes, all plans include a 14-day free trial. No credit card required. Upgrade, downgrade, or cancel anytime."
                },
                {
                  q: "What payment methods do you accept?",
                  a: "During the current rollout, paid upgrades are activated through assisted onboarding. Self-serve billing is planned, but not yet live in the product."
                },
              ].map((faq, i) => (
                <div key={i} className="group p-6 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <h3 className="font-medium text-base mb-2">{faq.q}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section - Minimal gradient */}
        <section className="py-24 md:py-32 bg-foreground text-background">
          <div className="container text-center">
            <div className="mx-auto max-w-2xl">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-6">
                Ready to find more opportunities?
              </h2>
              <p className="text-lg text-background/70 mb-10">
                Join hundreds of South African businesses winning more contracts.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/auth/signup">
                  <Button size="xl" variant="secondary" className="w-full sm:w-auto">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer - Clean and minimal */}
      <footer className="border-t py-16">
        <div className="container">
          <div className="grid gap-10 md:grid-cols-4">
            <div>
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Search className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-base font-semibold tracking-tight">Procurement Radar</span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Finding tender opportunities for South African businesses.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-4 text-sm">Product</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="#features" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link href="#faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4 text-sm">Company</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4 text-sm">Legal</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Procurement Radar SA</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
