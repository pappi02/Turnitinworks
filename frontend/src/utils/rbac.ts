/**
 * Role-Based Access Control (RBAC) System
 */

export type UserRole = "admin" | "instructor" | "student" | "reviewer";

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: "create" | "read" | "update" | "delete";
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}

// Define permissions
const permissions: Record<string, Permission> = {
  // Submission permissions
  CREATE_SUBMISSION: {
    id: "create_submission",
    name: "Create Submission",
    description: "Ability to create new submissions",
    resource: "submission",
    action: "create",
  },
  READ_SUBMISSION: {
    id: "read_submission",
    name: "View Submission",
    description: "Ability to view submissions",
    resource: "submission",
    action: "read",
  },
  UPDATE_SUBMISSION: {
    id: "update_submission",
    name: "Update Submission",
    description: "Ability to edit submissions",
    resource: "submission",
    action: "update",
  },
  DELETE_SUBMISSION: {
    id: "delete_submission",
    name: "Delete Submission",
    description: "Ability to delete submissions",
    resource: "submission",
    action: "delete",
  },

  // Report permissions
  READ_REPORT: {
    id: "read_report",
    name: "View Report",
    description: "Ability to view plagiarism reports",
    resource: "report",
    action: "read",
  },
  EXPORT_REPORT: {
    id: "export_report",
    name: "Export Report",
    description: "Ability to export reports",
    resource: "report",
    action: "create",
  },
  DELETE_REPORT: {
    id: "delete_report",
    name: "Delete Report",
    description: "Ability to delete reports",
    resource: "report",
    action: "delete",
  },

  // Course permissions
  MANAGE_COURSE: {
    id: "manage_course",
    name: "Manage Course",
    description: "Ability to manage course settings",
    resource: "course",
    action: "update",
  },
  VIEW_COURSE_ANALYTICS: {
    id: "view_course_analytics",
    name: "View Course Analytics",
    description: "Ability to view course-level analytics",
    resource: "course",
    action: "read",
  },

  // User permissions
  MANAGE_USERS: {
    id: "manage_users",
    name: "Manage Users",
    description: "Ability to manage users",
    resource: "user",
    action: "update",
  },
  VIEW_USER_LOGS: {
    id: "view_user_logs",
    name: "View User Logs",
    description: "Ability to view user activity logs",
    resource: "user",
    action: "read",
  },

  // System permissions
  MANAGE_SETTINGS: {
    id: "manage_settings",
    name: "Manage Settings",
    description: "Ability to manage system settings",
    resource: "system",
    action: "update",
  },
  VIEW_SYSTEM_LOGS: {
    id: "view_system_logs",
    name: "View System Logs",
    description: "Ability to view system logs",
    resource: "system",
    action: "read",
  },
};

// Define roles
export const roles: Record<UserRole, Role> = {
  admin: {
    id: "admin",
    name: "Administrator",
    description: "Full system access",
    permissions: Object.values(permissions),
  },
  instructor: {
    id: "instructor",
    name: "Instructor",
    description: "Can manage courses and view submissions",
    permissions: [
      permissions.CREATE_SUBMISSION,
      permissions.READ_SUBMISSION,
      permissions.UPDATE_SUBMISSION,
      permissions.DELETE_SUBMISSION,
      permissions.READ_REPORT,
      permissions.EXPORT_REPORT,
      permissions.MANAGE_COURSE,
      permissions.VIEW_COURSE_ANALYTICS,
      permissions.VIEW_USER_LOGS,
    ],
  },
  student: {
    id: "student",
    name: "Student",
    description: "Can submit documents and view own reports",
    permissions: [
      permissions.CREATE_SUBMISSION,
      permissions.READ_SUBMISSION,
      permissions.READ_REPORT,
    ],
  },
  reviewer: {
    id: "reviewer",
    name: "Reviewer",
    description: "Can review and comment on submissions",
    permissions: [
      permissions.READ_SUBMISSION,
      permissions.READ_REPORT,
      permissions.VIEW_COURSE_ANALYTICS,
    ],
  },
};

/**
 * Check if user has permission
 */
export const hasPermission = (
  userRole: UserRole,
  permissionId: string
): boolean => {
  const role = roles[userRole];
  if (!role) return false;
  return role.permissions.some((p) => p.id === permissionId);
};

/**
 * Check if user has any of the specified permissions
 */
export const hasAnyPermission = (
  userRole: UserRole,
  permissionIds: string[]
): boolean => {
  return permissionIds.some((permissionId) =>
    hasPermission(userRole, permissionId)
  );
};

/**
 * Check if user has all of the specified permissions
 */
export const hasAllPermissions = (
  userRole: UserRole,
  permissionIds: string[]
): boolean => {
  return permissionIds.every((permissionId) =>
    hasPermission(userRole, permissionId)
  );
};

/**
 * Get role details
 */
export const getRole = (roleId: UserRole): Role | null => {
  return roles[roleId] || null;
};

/**
 * Get all permissions for a role
 */
export const getRolePermissions = (roleId: UserRole): Permission[] => {
  const role = roles[roleId];
  return role ? role.permissions : [];
};

/**
 * Get permission details
 */
export const getPermission = (permissionId: string): Permission | null => {
  return permissions[permissionId] || null;
};

/**
 * Check if action is allowed on resource
 */
export const canPerformAction = (
  userRole: UserRole,
  resource: string,
  action: "create" | "read" | "update" | "delete"
): boolean => {
  const role = roles[userRole];
  if (!role) return false;
  return role.permissions.some(
    (p) => p.resource === resource && p.action === action
  );
};
