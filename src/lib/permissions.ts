/**
 * Matriz de permisos por rol (principio de mínimo privilegio).
 * Se aplica SIEMPRE en el servidor; la interfaz solo oculta lo que no se puede usar.
 */
import type { Role } from "@/db/schema";

export type Permission =
  | "panel.access"
  | "dashboard.view"
  | "needs.viewAll" // toda la bandeja de la institución
  | "needs.viewScoped" // solo su servicio o lo asignado
  | "needs.create"
  | "needs.manage" // clasificar, analizar, asignar, responder, cerrar
  | "needs.prioritizeApprove"
  | "needs.reviewEffectiveness"
  | "needs.viewReporterIdentity" // ver quién reportó en campañas CONFIDENCIALES
  | "actions.updateOwn"
  | "campaigns.manage"
  | "campaigns.viewResults"
  | "export.data"
  | "institution.configure"
  | "users.manage"
  | "audit.view"
  | "announcements.manage"
  | "priority.configure";

const MATRIX: Record<Role, Permission[]> = {
  COLABORADOR: [],
  LIDER_SERVICIO: ["panel.access", "needs.viewScoped", "actions.updateOwn"],
  TALENTO_HUMANO: [
    "panel.access",
    "dashboard.view",
    "needs.viewAll",
    "needs.create",
    "needs.manage",
    "needs.prioritizeApprove",
    "needs.reviewEffectiveness",
    "needs.viewReporterIdentity",
    "actions.updateOwn",
    "campaigns.manage",
    "campaigns.viewResults",
    "export.data",
    "announcements.manage",
  ],
  CALIDAD: [
    "panel.access",
    "dashboard.view",
    "needs.viewAll",
    "needs.create",
    "needs.manage",
    "needs.prioritizeApprove",
    "needs.reviewEffectiveness",
    "actions.updateOwn",
    "campaigns.viewResults",
    "export.data",
    "audit.view",
    "priority.configure",
  ],
  SST: ["panel.access", "needs.viewScoped", "actions.updateOwn"],
  GERENCIA: [
    "panel.access",
    "dashboard.view",
    "needs.viewAll",
    "needs.prioritizeApprove",
    "campaigns.viewResults",
    "export.data",
    "priority.configure",
  ],
  AUDITOR: ["panel.access", "dashboard.view", "needs.viewAll", "audit.view"],
  // El administrador técnico configura y mantiene, pero NO lee necesidades ni respuestas.
  ADMIN_TECNICO: ["panel.access", "institution.configure", "users.manage", "audit.view"],
};

export const ROLE_LABEL: Record<Role, string> = {
  COLABORADOR: "Colaborador",
  LIDER_SERVICIO: "Líder de servicio",
  TALENTO_HUMANO: "Talento Humano",
  CALIDAD: "Calidad y Acreditación",
  SST: "Seguridad y Salud en el Trabajo",
  GERENCIA: "Gerencia",
  AUDITOR: "Auditor",
  ADMIN_TECNICO: "Administrador técnico",
};

export const ROLES = Object.keys(ROLE_LABEL) as Role[];

export function can(role: Role, permission: Permission) {
  return MATRIX[role].includes(permission);
}

export function permissionsOf(role: Role) {
  return [...MATRIX[role]];
}
