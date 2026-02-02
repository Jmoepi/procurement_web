import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Radar } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | Procurement Radar SA",
  description: "How Procurement Radar SA collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
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
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>
            <p className="text-muted-foreground mt-2">Last updated: February 2, 2026</p>
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">1. Introduction</h2>
              <p>
                Procurement Radar SA (Pty) Ltd (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your 
                privacy and personal information. This Privacy Policy explains how we collect, use, disclose, 
                and safeguard your information when you use our tender monitoring service (&quot;the Service&quot;).
              </p>
              <p>
                We comply with the Protection of Personal Information Act 4 of 2013 (&quot;POPIA&quot;) and other 
                applicable South African data protection laws.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">2. Information We Collect</h2>
              
              <h3 className="text-lg font-medium">2.1 Information You Provide</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Information:</strong> Name, email address, phone number, company name, and password when you register</li>
                <li><strong>Profile Information:</strong> Business category preferences, tender interests, and notification settings</li>
                <li><strong>Billing Information:</strong> Payment method details processed securely through our payment provider</li>
                <li><strong>Communications:</strong> Messages you send us for support or inquiries</li>
              </ul>

              <h3 className="text-lg font-medium">2.2 Information Collected Automatically</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Usage Data:</strong> Pages viewed, features used, tenders clicked, search queries</li>
                <li><strong>Device Information:</strong> Browser type, operating system, device type, IP address</li>
                <li><strong>Cookies and Tracking:</strong> Session cookies for authentication and analytics cookies for service improvement</li>
                <li><strong>Log Data:</strong> Access times, error logs, and referring URLs</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">3. How We Use Your Information</h2>
              <p>We use your personal information to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Provide the Service:</strong> Deliver tender notifications, manage your account, and process subscriptions</li>
                <li><strong>Personalize Experience:</strong> Customize tender recommendations based on your preferences and industry</li>
                <li><strong>Communicate:</strong> Send service updates, tender alerts, and respond to inquiries</li>
                <li><strong>Improve the Service:</strong> Analyze usage patterns to enhance features and user experience</li>
                <li><strong>Ensure Security:</strong> Detect and prevent fraud, abuse, and unauthorized access</li>
                <li><strong>Comply with Law:</strong> Meet legal obligations and respond to lawful requests</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">4. Legal Basis for Processing (POPIA Compliance)</h2>
              <p>We process your personal information based on:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Contract Performance:</strong> To provide the Service you subscribed to</li>
                <li><strong>Consent:</strong> For marketing communications (you may withdraw consent at any time)</li>
                <li><strong>Legitimate Interest:</strong> To improve our Service and protect against fraud</li>
                <li><strong>Legal Obligation:</strong> To comply with applicable laws and regulations</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">5. Information Sharing and Disclosure</h2>
              <p>We do not sell your personal information. We may share information with:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Service Providers:</strong> Third parties that help us operate the Service (hosting, email delivery, payment processing)</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                <li><strong>Legal Requirements:</strong> When required by law, court order, or government request</li>
                <li><strong>Protection of Rights:</strong> To protect our rights, privacy, safety, or property</li>
              </ul>
              
              <h3 className="text-lg font-medium">Our Service Providers Include:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Supabase:</strong> Database and authentication (servers in various regions)</li>
                <li><strong>Vercel:</strong> Website hosting and delivery</li>
                <li><strong>Resend:</strong> Email delivery service</li>
                <li><strong>Payment Processors:</strong> Secure payment handling</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">6. Data Retention</h2>
              <p>
                We retain your personal information for as long as your account is active or as needed to provide 
                the Service. After account deletion, we may retain certain information for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Legal compliance and tax purposes (up to 7 years)</li>
                <li>Dispute resolution</li>
                <li>Fraud prevention</li>
              </ul>
              <p>
                Anonymized and aggregated data may be retained indefinitely for analytics purposes.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">7. Your Rights Under POPIA</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal retention requirements)</li>
                <li><strong>Objection:</strong> Object to processing of your personal information for direct marketing</li>
                <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
                <li><strong>Data Portability:</strong> Receive your data in a structured, machine-readable format</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent where processing is based on consent</li>
                <li><strong>Lodge a Complaint:</strong> File a complaint with the Information Regulator of South Africa</li>
              </ul>
              <p>
                To exercise these rights, contact us at privacy@procurementradar.co.za. We will respond within 
                30 days as required by POPIA.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">8. Data Security</h2>
              <p>We implement appropriate technical and organizational measures to protect your information:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Encryption of data in transit (TLS/SSL) and at rest</li>
                <li>Secure authentication with hashed passwords</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls limiting employee access to personal data</li>
                <li>Monitoring for unauthorized access attempts</li>
              </ul>
              <p>
                While we strive to protect your information, no method of transmission or storage is 100% secure. 
                We cannot guarantee absolute security.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">9. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries outside South Africa where our 
                service providers operate. When we transfer data internationally, we ensure appropriate safeguards 
                are in place as required by POPIA, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Transfers to countries with adequate data protection laws</li>
                <li>Contractual protections with service providers</li>
                <li>Your consent where applicable</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">10. Cookies and Tracking Technologies</h2>
              <p>We use cookies and similar technologies for:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Essential Cookies:</strong> Required for authentication and security (always active)</li>
                <li><strong>Functional Cookies:</strong> Remember your preferences and settings</li>
                <li><strong>Analytics Cookies:</strong> Understand how you use the Service to make improvements</li>
              </ul>
              <p>
                You can control cookies through your browser settings. Disabling essential cookies may affect 
                Service functionality.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">11. Children&apos;s Privacy</h2>
              <p>
                The Service is not intended for individuals under 18 years of age. We do not knowingly collect 
                personal information from children. If we learn we have collected information from a child, we 
                will delete it promptly.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">12. Third-Party Links</h2>
              <p>
                The Service may contain links to third-party websites, including government tender portals. We 
                are not responsible for the privacy practices of these external sites. We encourage you to review 
                their privacy policies.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">13. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of material changes by 
                email or through the Service. Your continued use after changes constitutes acceptance of the 
                updated policy.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">14. Contact Us</h2>
              <p>
                For privacy-related inquiries or to exercise your rights, contact our Information Officer:
              </p>
              <ul className="list-none space-y-1">
                <li><strong>Email:</strong> privacy@procurementradar.co.za</li>
                <li><strong>Address:</strong> Johannesburg, Gauteng, South Africa</li>
              </ul>
              <p className="mt-4">
                You may also contact the Information Regulator of South Africa:
              </p>
              <ul className="list-none space-y-1">
                <li><strong>Website:</strong> www.justice.gov.za/inforeg</li>
                <li><strong>Email:</strong> inforeg@justice.gov.za</li>
              </ul>
            </section>
          </div>

          <div className="border-t pt-8">
            <p className="text-sm text-muted-foreground">
              By using Procurement Radar SA, you acknowledge that you have read and understood this Privacy Policy.
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
