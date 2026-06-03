import type { AuthResponse } from "@/lib/types";

export const permissions = {
  dashboardView: "dashboard.view",
  leadsView: "leads.view",
  leadsCreate: "leads.create",
  leadsEdit: "leads.edit",
  leadsDelete: "leads.delete",
  customersView: "customers.view",
  customersCreate: "customers.create",
  customersEdit: "customers.edit",
  customersDelete: "customers.delete",
  dealsView: "deals.view",
  dealsCreate: "deals.create",
  dealsEdit: "deals.edit",
  dealsDelete: "deals.delete",
  activitiesView: "activities.view",
  activitiesCreate: "activities.create",
  activitiesEdit: "activities.edit",
  activitiesDelete: "activities.delete",
  documentsView: "documents.view",
  documentsCreate: "documents.create",
  documentsDelete: "documents.delete",
  financeManage: "finance.manage",
  automationsManage: "automations.manage",
  whatsAppManage: "whatsapp.manage",
  settingsView: "settings.view",
  teamManage: "team.manage",
} as const;

export function hasPermission(user: AuthResponse | null, permission: string) {
  return user?.role === "Admin" || Boolean(user?.permissions?.includes(permission));
}

export function hasAnyPermission(user: AuthResponse | null, permissionList: string[]) {
  return user?.role === "Admin" || permissionList.some((permission) => user?.permissions?.includes(permission));
}
