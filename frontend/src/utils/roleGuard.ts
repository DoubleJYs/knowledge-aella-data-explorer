import type { AppRole } from "~/types/role";

const ROLE_STORAGE_KEY = "knowledge_land_app_role";

function isAppRole(value: string | null): value is AppRole {
  return value === "user" || value === "admin";
}

export function getCurrentRole(): AppRole {
  const storedRole = window.localStorage.getItem(ROLE_STORAGE_KEY);
  return isAppRole(storedRole) ? storedRole : "user";
}

export function setCurrentRole(role: AppRole) {
  window.localStorage.setItem(ROLE_STORAGE_KEY, role);
}

export function canAccessAdmin(role: AppRole) {
  return role === "admin";
}
