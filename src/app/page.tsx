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
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Mail, Search, Bell, Zap, Shield, Clock, Sparkles, Globe2, TrendingUp, ChevronRight } from "lucide-react";
import { PLANS, PLAN_FEATURES } from "@/lib/plans";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
              <Search className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">Procurement Radar</span>
            <span className="hidden sm:inline-block text-xs font-semibold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">SA</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" className="font-medium">Sign In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="font-medium shadow-lg shadow-primary/20">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section - Premium Design */}
        <section className="relative overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 bg-hero-pattern" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px]" />
          
          {/* Floating elements */}
          <div className="absolute top-20 left-[10%] w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-[10%] w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          
          <div className="container relative py-24 md:py-36 lg:py-44">
            <div className="mx-auto max-w-4xl text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-sm font-medium text-foreground">🇿🇦 Built for South African businesses</span>
              </div>
              
              {/* Main heading */}
              <h1 className="mb-6 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
                <span className="text-gradient-subtle">Win more tenders with</span>
                <br />
                <span className="text-gradient">intelligent monitoring</span>
              </h1>
              
              {/* Subtitle */}
              <p className="mx-auto mb-10 max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
                Stop missing opportunities. Our AI-powered crawler scans 35+ government and corporate 
                portals daily, delivering the best matches straight to your inbox.
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <Link href="/auth/signup">
                  <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base font-semibold shadow-xl shadow-primary/25 hover:shadow-primary/30 transition-all">
                    Start 14-Day Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base font-medium border-2">
                    <Sparkles className="mr-2 h-5 w-5" />
                    View Live Demo
                  </Button>
                </Link>
              </div>
              
              {/* Trust indicators */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Setup in 2 minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section - Premium Cards */}
        <section className="py-16 md:py-20 border-y bg-muted/30">
          <div className="container">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {[
                { value: "35+", label: "Sources Monitored", icon: Globe2 },
                { value: "1000+", label: "Tenders Daily", icon: TrendingUp },
                { value: "07:00", label: "Daily Digest", icon: Mail },
                { value: "R50B+", label: "Value Tracked", icon: Zap },
              ].map((stat, i) => (
                <div key={i} className="group relative">
                  <div className="relative overflow-hidden rounded-2xl bg-card border border-border/50 p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <stat.icon className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{stat.value}</div>
                    <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section - Premium Grid */}
        <section id="features" className="py-20 md:py-28">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <Badge variant="outline" className="mb-4 px-3 py-1">Features</Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Everything you need to win
              </h2>
              <p className="text-lg text-muted-foreground">
                Powerful tools designed for South African businesses competing for government and corporate contracts.
              </p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Search,
                  title: "Intelligent Crawling",
                  description: "AI-powered crawler scans 35+ SA government and corporate tender portals daily, extracting opportunities automatically.",
                  gradient: "from-emerald-500/20 to-teal-500/20",
                },
                {
                  icon: Mail,
                  title: "Daily Email Digest",
                  description: "Personalized emails every morning at 07:00 SAST with new tenders matching your criteria, sorted by priority.",
                  gradient: "from-blue-500/20 to-indigo-500/20",
                },
                {
                  icon: Bell,
                  title: "Smart Categorization",
                  description: "Automatic categorization by industry with priority levels based on keywords, value, and closing dates.",
                  gradient: "from-violet-500/20 to-purple-500/20",
                },
                {
                  icon: Zap,
                  title: "Deadline Tracking",
                  description: "Visual countdown timers show exactly how many days remain. Never miss a submission deadline again.",
                  gradient: "from-amber-500/20 to-orange-500/20",
                },
                {
                  icon: Shield,
                  title: "Smart Deduplication",
                  description: "Intelligent matching removes duplicate listings across portals. See each opportunity only once.",
                  gradient: "from-rose-500/20 to-pink-500/20",
                },
                {
                  icon: Clock,
                  title: "Historical Archive",
                  description: "Access past tenders for research and trend analysis. Pro plans include up to 30 days of history.",
                  gradient: "from-cyan-500/20 to-sky-500/20",
                },
              ].map((feature, i) => (
                <Card key={i} className="group relative overflow-hidden border-border/50 bg-card hover:border-primary/30 transition-all duration-500 hover:shadow-xl hover:shadow-primary/5">
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  <CardHeader className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4 transition-transform duration-300 group-hover:scale-110">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section - Premium Design */}
        <section id="pricing" className="py-20 md:py-28 bg-muted/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-mesh opacity-50" />
          <div className="container relative">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <Badge variant="outline" className="mb-4 px-3 py-1">Pricing</Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Simple, transparent pricing
              </h2>
              <p className="text-lg text-muted-foreground">
                Choose the plan that fits your business. All plans include a 14-day free trial.
              </p>
            </div>
            
            <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
              {PLANS.map((plan) => (
                <Card
                  key={plan.slug}
                  className={`relative overflow-hidden transition-all duration-300 hover:-translate-y-2 ${
                    plan.popular 
                      ? "border-primary shadow-2xl shadow-primary/20 scale-105 md:scale-110 z-10" 
                      : "border-border/50 hover:border-primary/30 hover:shadow-xl"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent" />
                  )}
                  {plan.popular && (
                    <div className="absolute -top-0 left-1/2 -translate-x-1/2 translate-y-0">
                      <Badge className="rounded-t-none shadow-lg">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="pt-8">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-6">
                      <span className="text-5xl font-bold tracking-tight">R{plan.price.monthly}</span>
                      <span className="text-muted-foreground ml-2">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      or R{plan.price.yearly}/year <span className="text-primary font-medium">(save ~17%)</span>
                    </p>
                  </CardHeader>
                  <CardContent className="pb-8">
                    <ul className="space-y-4">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 shrink-0 mt-0.5">
                            <Check className="h-3 w-3 text-primary" />
                          </div>
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="pb-8">
                    <Link href="/auth/signup" className="w-full">
                      <Button
                        className={`w-full h-12 text-base font-semibold ${
                          plan.popular 
                            ? "shadow-lg shadow-primary/25" 
                            : ""
                        }`}
                        variant={plan.popular ? "default" : "outline"}
                      >
                        {plan.cta}
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {/* Feature Comparison Table */}
            <div className="mt-20 max-w-4xl mx-auto">
              <h3 className="text-2xl font-bold text-center mb-8">Compare all features</h3>
              <div className="overflow-x-auto rounded-xl border bg-card">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-4 px-6 font-semibold">Feature</th>
                      <th className="text-center py-4 px-6 font-semibold">Starter</th>
                      <th className="text-center py-4 px-6 font-semibold text-primary">Pro</th>
                      <th className="text-center py-4 px-6 font-semibold">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PLAN_FEATURES.map((feature, i) => (
                      <tr key={feature.name} className={`border-b last:border-0 ${i % 2 === 0 ? 'bg-muted/20' : ''}`}>
                        <td className="py-4 px-6 font-medium">{feature.name}</td>
                        <td className="text-center py-4 px-6">
                          {typeof feature.starter === "boolean" ? (
                            feature.starter ? (
                              <Check className="h-5 w-5 text-primary mx-auto" />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )
                          ) : (
                            <span className="font-medium">{feature.starter}</span>
                          )}
                        </td>
                        <td className="text-center py-4 px-6 bg-primary/5">
                          {typeof feature.pro === "boolean" ? (
                            feature.pro ? (
                              <Check className="h-5 w-5 text-primary mx-auto" />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )
                          ) : (
                            <span className="font-medium text-primary">{feature.pro}</span>
                          )}
                        </td>
                        <td className="text-center py-4 px-6">
                          {typeof feature.enterprise === "boolean" ? (
                            feature.enterprise ? (
                              <Check className="h-5 w-5 text-primary mx-auto" />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )
                          ) : (
                            <span className="font-medium">{feature.enterprise}</span>
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

        {/* FAQ Section */}
        <section id="faq" className="py-20 md:py-28">
          <div className="container max-w-3xl">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4 px-3 py-1">FAQ</Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Frequently asked questions
              </h2>
            </div>
            <div className="space-y-4">
              {[
                {
                  q: "What sources do you monitor?",
                  a: "We monitor 35+ sources including the eTender Portal (National Treasury), all 9 provincial treasuries, major metro municipalities (Joburg, Cape Town, Durban, Pretoria), state-owned enterprises (Transnet, Eskom, PRASA), and major universities."
                },
                {
                  q: "How often is the data updated?",
                  a: "Our crawler runs daily at 06:00 SAST. Email digests are sent at 07:00 SAST, giving you fresh opportunities every morning before your workday starts."
                },
                {
                  q: "Can I customize what tenders I receive?",
                  a: "Yes! You can filter by category (Courier, Printing, or Both), set keyword includes/excludes, choose high-priority only, and customize the maximum number of items per digest."
                },
                {
                  q: "Is there a free trial?",
                  a: "Yes, all plans include a 14-day free trial. No credit card required to start. You can upgrade, downgrade, or cancel at any time."
                },
                {
                  q: "What payment methods do you accept?",
                  a: "We accept all major credit cards, debit cards, and EFT payments for annual subscriptions. Payments are processed securely through Stripe."
                },
              ].map((faq, i) => (
                <div key={i} className="group rounded-2xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                  <h3 className="font-semibold text-lg mb-3 group-hover:text-primary transition-colors">{faq.q}</h3>
                  <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section - Premium Gradient */}
        <section className="relative py-24 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:32px_32px]" />
          
          <div className="container relative text-center">
            <div className="mx-auto max-w-2xl">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-white">
                Ready to find more opportunities?
              </h2>
              <p className="text-lg md:text-xl text-white/80 mb-10">
                Join hundreds of South African businesses using Procurement Radar 
                to discover and win more contracts.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/auth/signup">
                  <Button size="lg" variant="secondary" className="h-12 px-8 text-base font-semibold shadow-xl">
                    Start Your Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="#pricing">
                  <Button size="lg" variant="ghost" className="h-12 px-8 text-base font-medium text-white border-2 border-white/20 hover:bg-white/10">
                    View Pricing
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer - Clean Design */}
      <footer className="border-t bg-muted/30 py-16">
        <div className="container">
          <div className="grid gap-12 md:grid-cols-4">
            <div className="md:col-span-1">
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80">
                  <Search className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold tracking-tight">Procurement Radar</span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Finding tender opportunities for South African businesses since 2024.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="#features" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link href="#faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
                <li><Link href="/dashboard" className="hover:text-foreground transition-colors">Demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
                <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Procurement Radar SA. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span>Made with ❤️ in South Africa</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
