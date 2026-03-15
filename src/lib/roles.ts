import type { UserRole } from "@/types";

export function hasAdminAccess(role?: UserRole | null): boolean {
  return role === "owner" || role === "admin";
}

export function isOwner(role?: UserRole | null): boolean {
  return role === "owner";
}

export function getRoleLabel(role?: UserRole | null): string {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  return "Member";
}
