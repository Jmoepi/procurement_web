// Plan configuration and pricing for Procurement Radar SA

import { PlanType } from "@/types";

// Free trial configuration
export const FREE_TRIAL_DAYS = 30;

export interface PlanFeature {
  name: string;
  starter: boolean | string;
  pro: boolean | string;
  enterprise: boolean | string;
}

export interface PlanConfig {
  name: string;
  slug: PlanType;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: string[];
  limits: {
    sources: number;
    subscribers: number;
    tendersPerDay: number;
  };
  popular?: boolean;
  cta: string;
}

export const PLANS: PlanConfig[] = [
  {
    name: "Starter",
    slug: "starter",
    description: "Perfect for solo entrepreneurs and small businesses getting started with tender monitoring.",
    price: {
      monthly: 299,
      yearly: 2990, // ~2 months free
    },
    features: [
      "Up to 30 sources monitored",
      "1 email subscriber",
      "Daily email digest",
      "Basic tender categorization",
      "7-day tender history",
      "Email support",
    ],
    limits: {
      sources: 30,
      subscribers: 1,
      tendersPerDay: 100,
    },
    cta: "Start Free Trial",
  },
  {
    name: "Pro",
    slug: "pro",
    description: "For growing businesses that need comprehensive tender monitoring and team collaboration.",
    price: {
      monthly: 799,
      yearly: 7990, // ~2 months free
    },
    features: [
      "Up to 150 sources monitored",
      "Up to 20 email subscribers",
      "Daily & weekly digests",
      "Advanced tender categorization",
      "PDF document extraction",
      "30-day tender history",
      "Custom keywords & filters",
      "API access",
      "Webhook notifications",
      "Priority email support",
    ],
    limits: {
      sources: 150,
      subscribers: 20,
      tendersPerDay: 1000,
    },
    popular: true,
    cta: "Start Free Trial",
  },
  {
    name: "Enterprise",
    slug: "enterprise",
    description: "For large organizations needing unlimited access, custom integrations, and dedicated support.",
    price: {
      monthly: 2499,
      yearly: 24990, // ~2 months free
    },
    features: [
      "Unlimited sources",
      "Unlimited subscribers",
      "All Pro features",
      "Custom source onboarding",
      "White-label email branding",
      "Dedicated account manager",
      "SLA guarantee",
      "Custom integrations",
      "Audit logs",
      "SSO/SAML",
      "Phone support",
    ],
    limits: {
      sources: 999999,
      subscribers: 999999,
      tendersPerDay: 999999,
    },
    cta: "Contact Sales",
  },
];

export const PLAN_FEATURES: PlanFeature[] = [
  { name: "Sources monitored", starter: "30", pro: "150", enterprise: "Unlimited" },
  { name: "Email subscribers", starter: "1", pro: "20", enterprise: "Unlimited" },
  { name: "Daily email digest", starter: true, pro: true, enterprise: true },
  { name: "Weekly digest option", starter: false, pro: true, enterprise: true },
  { name: "Tender categorization", starter: true, pro: true, enterprise: true },
  { name: "PDF extraction", starter: false, pro: true, enterprise: true },
  { name: "Tender history", starter: "7 days", pro: "30 days", enterprise: "Unlimited" },
  { name: "Custom keywords", starter: false, pro: true, enterprise: true },
  { name: "API access", starter: false, pro: true, enterprise: true },
  { name: "Webhook notifications", starter: false, pro: true, enterprise: true },
  { name: "Custom branding", starter: false, pro: false, enterprise: true },
  { name: "SSO/SAML", starter: false, pro: false, enterprise: true },
  { name: "Support", starter: "Email", pro: "Priority Email", enterprise: "Phone + Dedicated Manager" },
];

export function getPlanBySlug(slug: PlanType): PlanConfig | undefined {
  return PLANS.find((plan) => plan.slug === slug);
}

export function formatPlanPrice(plan: PlanConfig, yearly: boolean = false): string {
  const price = yearly ? plan.price.yearly : plan.price.monthly;
  return `R${price.toLocaleString("en-ZA")}`;
}

export function getPlanLimitMessage(
  currentCount: number,
  maxCount: number,
  itemType: string
): string | null {
  const percentUsed = (currentCount / maxCount) * 100;
  
  if (percentUsed >= 100) {
    return `You've reached your ${itemType} limit. Please upgrade your plan.`;
  }
  
  if (percentUsed >= 80) {
    return `You're using ${currentCount} of ${maxCount} ${itemType}. Consider upgrading soon.`;
  }
  
  return null;
}
