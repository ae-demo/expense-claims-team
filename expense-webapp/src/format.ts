// Small, shared display helpers so every page formats claims and categories
// the same way the wireframe's demo data shows them ("8,500 LKR", "Meals").
import type { components } from "./generated/expense-api";

export type Category = components["schemas"]["Claim"]["category"];
export type ClaimStatus = components["schemas"]["Claim"]["status"];

const CATEGORY_LABELS: Record<Category, string> = {
  meals: "Meals",
  travel: "Travel",
  accommodation: "Accommodation",
  "office-supplies": "Office Supplies",
  other: "Other",
};

export const CATEGORIES: readonly Category[] = [
  "meals",
  "travel",
  "accommodation",
  "office-supplies",
  "other",
];

export function categoryLabel(category: Category): string {
  return CATEGORY_LABELS[category] ?? category;
}

export function formatMoney(total: number, currency: string): string {
  return `${total.toLocaleString("en-US")} ${currency}`;
}

export function statusColor(status: ClaimStatus): "info" | "success" | "error" {
  if (status === "approved") return "success";
  if (status === "rejected") return "error";
  return "info";
}

export function statusLabel(status: ClaimStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
