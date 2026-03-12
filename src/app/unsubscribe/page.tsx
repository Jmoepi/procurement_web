import Link from "next/link"
import { CheckCircle2, MailWarning, ShieldAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { parseUnsubscribeToken, unsubscribeByToken } from "@/lib/subscriptions"

type UnsubscribePageProps = {
  searchParams: Promise<{
    token?: string
  }>
}

export default async function UnsubscribePage({
  searchParams,
}: UnsubscribePageProps) {
  const { token } = await searchParams
  const parsedToken = parseUnsubscribeToken(token)

  const result = parsedToken ? await unsubscribeByToken(parsedToken) : null
  const actionableResult = result && result.status !== "invalid_token" ? result : null
  const status = result?.status ?? (parsedToken ? "invalid_token" : "missing_token")

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.14),transparent_38%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.35))] px-4 py-12 sm:px-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Badge className="w-fit rounded-full px-3 py-1 text-xs font-medium">
          Subscription preferences
        </Badge>

        <Card className="overflow-hidden rounded-[32px] border-border/60 bg-background/90 shadow-lg backdrop-blur-sm">
          <CardHeader className="space-y-4 border-b border-border/60 bg-muted/20 px-6 py-8 sm:px-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {status === "unsubscribed" ? (
                <CheckCircle2 className="h-7 w-7" />
              ) : status === "already_unsubscribed" ? (
                <MailWarning className="h-7 w-7" />
              ) : (
                <ShieldAlert className="h-7 w-7" />
              )}
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl tracking-tight">
                {status === "unsubscribed"
                  ? "You have been unsubscribed"
                  : status === "already_unsubscribed"
                    ? "This recipient was already unsubscribed"
                    : "This unsubscribe link is not valid"}
              </CardTitle>
              <p className="max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                {status === "unsubscribed"
                  ? `${actionableResult?.maskedEmail ?? "This address"} will no longer receive digest emails${actionableResult?.tenantName ? ` from ${actionableResult.tenantName}` : ""}.`
                  : status === "already_unsubscribed"
                    ? `${actionableResult?.maskedEmail ?? "This address"} is already inactive. No further digest emails will be sent${actionableResult?.tenantName ? ` for ${actionableResult.tenantName}` : ""}.`
                    : "The unsubscribe token is missing, invalid, or no longer matches an active recipient."}
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 px-6 py-8 sm:px-8">
            <div className="rounded-[24px] border border-border/60 bg-muted/20 p-5">
              <p className="text-sm font-semibold">Need to make another change?</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                If you unsubscribed by mistake, contact the workspace admin to add the recipient
                again or use a fresh invitation from the application.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/">Back to home</Link>
              </Button>
              <Button variant="outline" className="border-border/60" asChild>
                <Link href="/contact">Contact support</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
