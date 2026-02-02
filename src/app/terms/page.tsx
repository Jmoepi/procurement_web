import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Radar } from "lucide-react";

export const metadata = {
  title: "Terms of Service | Procurement Radar SA",
  description: "Terms and conditions for using Procurement Radar SA tender monitoring service.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Radar className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">Procurement Radar SA</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-4xl py-12 px-4">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Terms of Service</h1>
            <p className="text-muted-foreground mt-2">Last updated: February 2, 2026</p>
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">1. Agreement to Terms</h2>
              <p>
                By accessing or using Procurement Radar SA (&quot;the Service&quot;), operated by Procurement Radar SA (Pty) Ltd 
                (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree to be bound by these Terms of Service. If you do not agree 
                to these terms, please do not use the Service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">2. Description of Service</h2>
              <p>
                Procurement Radar SA is a tender monitoring and notification service that:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Aggregates tender information from publicly available South African government procurement portals</li>
                <li>Categorizes and prioritizes tenders based on user-defined criteria</li>
                <li>Sends email and/or SMS notifications about relevant tender opportunities</li>
                <li>Provides a dashboard for viewing and managing tender information</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">3. User Accounts</h2>
              <p>
                To access certain features of the Service, you must create an account. You agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and promptly update your account information</li>
                <li>Keep your password secure and confidential</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized access to your account</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">4. Subscription Plans and Billing</h2>
              <p>
                <strong>4.1 Free Trial:</strong> New users receive a 14-day free trial with full access to features. 
                No credit card is required during the trial period.
              </p>
              <p>
                <strong>4.2 Subscription Fees:</strong> After the trial, continued use requires a paid subscription. 
                Fees are billed monthly or annually as selected. All amounts are in South African Rand (ZAR) and 
                include VAT where applicable.
              </p>
              <p>
                <strong>4.3 Automatic Renewal:</strong> Subscriptions automatically renew unless cancelled before 
                the renewal date. You may cancel at any time through your account settings.
              </p>
              <p>
                <strong>4.4 Refunds:</strong> Subscription fees are non-refundable except where required by law. 
                Unused portions of subscriptions are not refunded upon cancellation.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">5. Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use the Service for any unlawful purpose or in violation of any laws</li>
                <li>Share your account credentials with third parties</li>
                <li>Attempt to gain unauthorized access to the Service or its systems</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Scrape, harvest, or collect information from the Service by automated means</li>
                <li>Resell, redistribute, or commercially exploit the Service without our written consent</li>
                <li>Use the Service to send spam or unsolicited communications</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">6. Intellectual Property</h2>
              <p>
                The Service, including its original content, features, and functionality, is owned by 
                Procurement Radar SA (Pty) Ltd and is protected by South African and international copyright, 
                trademark, and other intellectual property laws.
              </p>
              <p>
                Tender information displayed through the Service is sourced from public government portals. 
                We do not claim ownership of this public tender data but may claim rights to our aggregation, 
                categorization, and presentation of such data.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">7. Disclaimer of Warranties</h2>
              <p>
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, 
                EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Accuracy, completeness, or timeliness of tender information</li>
                <li>Uninterrupted or error-free operation</li>
                <li>Fitness for a particular purpose</li>
                <li>Non-infringement of third-party rights</li>
              </ul>
              <p>
                We aggregate information from third-party sources and cannot guarantee the accuracy of tender 
                details. Users should verify all tender information directly with the issuing authority before 
                submitting bids.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">8. Limitation of Liability</h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY SOUTH AFRICAN LAW, PROCUREMENT RADAR SA (PTY) LTD SHALL NOT 
                BE LIABLE FOR:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Any indirect, incidental, special, consequential, or punitive damages</li>
                <li>Loss of profits, revenue, data, or business opportunities</li>
                <li>Missed tender deadlines or unsuccessful tender submissions</li>
                <li>Errors or omissions in tender information</li>
                <li>Any damages exceeding the amount paid by you in the 12 months preceding the claim</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">9. Indemnification</h2>
              <p>
                You agree to indemnify and hold harmless Procurement Radar SA (Pty) Ltd, its officers, directors, 
                employees, and agents from any claims, damages, losses, or expenses arising from your use of the 
                Service or violation of these Terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">10. Modifications to Service and Terms</h2>
              <p>
                We reserve the right to modify or discontinue the Service at any time without notice. We may also 
                update these Terms from time to time. Continued use of the Service after changes constitutes 
                acceptance of the modified Terms. Material changes will be communicated via email or through the Service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">11. Termination</h2>
              <p>
                We may terminate or suspend your account and access to the Service immediately, without prior 
                notice or liability, for any reason, including breach of these Terms. Upon termination, your 
                right to use the Service ceases immediately.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">12. Governing Law</h2>
              <p>
                These Terms are governed by and construed in accordance with the laws of the Republic of South Africa. 
                Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive 
                jurisdiction of the courts of South Africa.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">13. Contact Information</h2>
              <p>
                For questions about these Terms of Service, please contact us at:
              </p>
              <ul className="list-none space-y-1">
                <li><strong>Email:</strong> legal@procurementradar.co.za</li>
                <li><strong>Address:</strong> Johannesburg, Gauteng, South Africa</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">14. Consumer Protection</h2>
              <p>
                These Terms do not exclude or limit any rights you may have under the Consumer Protection Act 68 
                of 2008 or the Electronic Communications and Transactions Act 25 of 2002 that cannot be excluded 
                or limited by agreement.
              </p>
            </section>
          </div>

          <div className="border-t pt-8">
            <p className="text-sm text-muted-foreground">
              By using Procurement Radar SA, you acknowledge that you have read, understood, and agree to be 
              bound by these Terms of Service.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 Procurement Radar SA (Pty) Ltd. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
