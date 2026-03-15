import type { TenderCategory, TenderCategoryFilter } from "@/types/database"

export const CANONICAL_TENDER_CATEGORY_VALUES = [
  "courier",
  "printing",
  "logistics",
  "stationery",
  "it_hardware",
  "general",
] as const satisfies readonly TenderCategory[]

export const TENDER_CATEGORY_FILTER_VALUES = [
  ...CANONICAL_TENDER_CATEGORY_VALUES,
  "both",
  "other",
] as const satisfies readonly TenderCategoryFilter[]

export const DEFAULT_SUBSCRIBER_CATEGORIES = [
  "courier",
  "printing",
] as const satisfies readonly TenderCategory[]

export const CANONICAL_TENDER_CATEGORY_OPTIONS: ReadonlyArray<{
  value: TenderCategory
  label: string
}> = [
  { value: "courier", label: "Courier" },
  { value: "printing", label: "Printing" },
  { value: "logistics", label: "Logistics" },
  { value: "stationery", label: "Stationery" },
  { value: "it_hardware", label: "IT Hardware" },
  { value: "general", label: "General" },
]

export const TENDER_CATEGORY_FILTER_OPTIONS: ReadonlyArray<{
  value: TenderCategoryFilter
  label: string
}> = [
  ...CANONICAL_TENDER_CATEGORY_OPTIONS,
  { value: "both", label: "Courier + Printing" },
  { value: "other", label: "Everything Else" },
]

const CANONICAL_TENDER_CATEGORY_SET = new Set<string>(CANONICAL_TENDER_CATEGORY_VALUES)
const TENDER_CATEGORY_FILTER_SET = new Set<string>(TENDER_CATEGORY_FILTER_VALUES)

export function isCanonicalTenderCategory(value: string): value is TenderCategory {
  return CANONICAL_TENDER_CATEGORY_SET.has(value)
}

export function isTenderCategoryFilter(value: string): value is TenderCategoryFilter {
  return TENDER_CATEGORY_FILTER_SET.has(value)
}

export function expandTenderCategoryFilter(
  value: TenderCategoryFilter | string
): TenderCategory[] {
  if (value === "both") {
    return ["courier", "printing"]
  }

  if (value === "other") {
    return ["logistics", "stationery", "it_hardware", "general"]
  }

  return isCanonicalTenderCategory(value) ? [value] : []
}

export function normalizeTenderCategorySelection(
  values: readonly string[] | null | undefined
): TenderCategory[] {
  if (!values || values.length === 0) {
    return []
  }

  const normalized: TenderCategory[] = []

  for (const value of values) {
    for (const category of expandTenderCategoryFilter(value)) {
      if (!normalized.includes(category)) {
        normalized.push(category)
      }
    }
  }

  return normalized
}

export function matchesTenderCategorySelection(
  tenderCategory: string,
  selectedCategories: readonly string[] | null | undefined
) {
  if (!selectedCategories || selectedCategories.length === 0) {
    return true
  }

  if (!isCanonicalTenderCategory(tenderCategory)) {
    return false
  }

  return normalizeTenderCategorySelection(selectedCategories).includes(tenderCategory)
}

export function getTenderCategoryLabel(value: string) {
  const option = TENDER_CATEGORY_FILTER_OPTIONS.find((item) => item.value === value)
  if (option) {
    return option.label
  }

  return value.replaceAll("_", " ")
}
