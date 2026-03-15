"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CANONICAL_TENDER_CATEGORY_OPTIONS,
  DEFAULT_SUBSCRIBER_CATEGORIES,
  normalizeTenderCategorySelection,
} from "@/lib/tender-categories";
import { toast } from "@/lib/sonner";
import { Loader2 } from "lucide-react";
import type { Subscription, SubscriptionPreferences, TenderCategory } from "@/types";

interface PreferencesFormProps {
  subscription: Subscription | null;
}

const defaultPreferences: SubscriptionPreferences = {
  categories: [...DEFAULT_SUBSCRIBER_CATEGORIES],
  highPriorityOnly: false,
  keywordsInclude: [],
  keywordsExclude: [],
  maxItems: 15,
  digestFrequency: "daily",
};

export function PreferencesForm({ subscription }: PreferencesFormProps) {
  const [preferences, setPreferences] = useState<SubscriptionPreferences>(
    subscription
      ? {
          ...subscription.preferences,
          categories: normalizeTenderCategorySelection(
            subscription.preferences?.categories ?? []
          ),
        }
      : defaultPreferences
  );
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleCategoryToggle = (category: TenderCategory) => {
    const newCategories = preferences.categories.includes(category)
      ? preferences.categories.filter((c) => c !== category)
      : [...preferences.categories, category];
    
    setPreferences({ ...preferences, categories: newCategories });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({ preferences })
        .eq("id", subscription?.id ?? "");

      if (error) throw error;

      toast.success("Preferences updated", {
        description: "Your email preferences have been saved.",
      });
      
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update preferences");
    } finally {
      setLoading(false);
    }
  };

  if (!subscription) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          No subscription found. Contact support for assistance.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      {/* Categories */}
      <div className="space-y-4">
        <Label>Categories to Include</Label>
        <div className="space-y-2">
          {CANONICAL_TENDER_CATEGORY_OPTIONS.map((category) => (
            <div key={category.value} className="flex items-center space-x-2">
              <Checkbox
                id={category.value}
                checked={preferences.categories.includes(category.value)}
                onCheckedChange={() => handleCategoryToggle(category.value)}
              />
              <Label htmlFor={category.value} className="cursor-pointer">
                {category.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* High Priority Only */}
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="highPriority">High Priority Only</Label>
          <p className="text-sm text-muted-foreground">
            Only receive tenders marked as high priority
          </p>
        </div>
        <Switch
          id="highPriority"
          checked={preferences.highPriorityOnly}
          onCheckedChange={(checked) =>
            setPreferences({ ...preferences, highPriorityOnly: checked })
          }
        />
      </div>

      {/* Keywords Include */}
      <div className="space-y-2">
        <Label htmlFor="keywordsInclude">Keywords to Include</Label>
        <Input
          id="keywordsInclude"
          placeholder="rfq, tender, quotation (comma-separated)"
          value={preferences.keywordsInclude.join(", ")}
          onChange={(e) =>
            setPreferences({
              ...preferences,
              keywordsInclude: e.target.value
                .split(",")
                .map((k) => k.trim())
                .filter(Boolean),
            })
          }
        />
        <p className="text-sm text-muted-foreground">
          Only show tenders containing these keywords
        </p>
      </div>

      {/* Keywords Exclude */}
      <div className="space-y-2">
        <Label htmlFor="keywordsExclude">Keywords to Exclude</Label>
        <Input
          id="keywordsExclude"
          placeholder="internship, job, vacancy (comma-separated)"
          value={preferences.keywordsExclude.join(", ")}
          onChange={(e) =>
            setPreferences({
              ...preferences,
              keywordsExclude: e.target.value
                .split(",")
                .map((k) => k.trim())
                .filter(Boolean),
            })
          }
        />
        <p className="text-sm text-muted-foreground">
          Hide tenders containing these keywords
        </p>
      </div>

      {/* Max Items */}
      <div className="space-y-2">
        <Label htmlFor="maxItems">Max Items per Digest</Label>
        <Input
          id="maxItems"
          type="number"
          min={1}
          max={50}
          value={preferences.maxItems}
          onChange={(e) =>
            setPreferences({
              ...preferences,
              maxItems: parseInt(e.target.value) || 15,
            })
          }
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Preferences
      </Button>
    </form>
  );
}
