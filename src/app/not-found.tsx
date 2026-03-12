import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search, Home, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Page Not Found",
  description: "The page you're looking for doesn't exist.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* 404 Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <AlertTriangle className="h-8 w-8 text-primary" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">404</h1>
          <h2 className="text-2xl font-semibold">Page Not Found</h2>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Suggestions */}
        <div className="rounded-lg bg-muted p-4 text-left space-y-3">
          <p className="text-sm font-medium">What you can do:</p>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-primary">•</span>
              Check the URL for typos
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">•</span>
              Go back to the previous page
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">•</span>
              Use the search to find what you need
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="gap-2">
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link href="/tenders">
              <Search className="h-4 w-4" />
              Search Tenders
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
