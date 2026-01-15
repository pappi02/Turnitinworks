import React, { ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { hasPermission, hasAnyPermission, hasAllPermissions, UserRole, canPerformAction } from '../utils/rbac';
import { Lock } from 'lucide-react';

interface RBACGuardProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  permissionType?: 'all' | 'any';
  fallback?: ReactNode;
}

interface RoleGateProps {
  children: ReactNode;
  roles: UserRole[];
  fallback?: ReactNode;
}

interface ActionGuardProps {
  children: ReactNode;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete';
  fallback?: ReactNode;
}

/**
 * RBAC Guard Component - Check if user has specific permission
 */
export const RBACGuard = ({
  children,
  permission,
  permissions,
  permissionType = 'all',
  fallback,
}: RBACGuardProps) => {
  const userRole = useSelector((state: any) => state.auth.user?.role as UserRole);

  if (!userRole) {
    return fallback || <PermissionDenied />;
  }

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(userRole, permission);
  } else if (permissions) {
    if (permissionType === 'all') {
      hasAccess = hasAllPermissions(userRole, permissions);
    } else {
      hasAccess = hasAnyPermission(userRole, permissions);
    }
  }

  return hasAccess ? <>{children}</> : fallback || <PermissionDenied />;
};

/**
 * Role Gate Component - Check if user has specific role
 */
export const RoleGate = ({ children, roles, fallback }: RoleGateProps) => {
  const userRole = useSelector((state: any) => state.auth.user?.role as UserRole);

  if (!userRole || !roles.includes(userRole)) {
    return fallback || <PermissionDenied />;
  }

  return <>{children}</>;
};

/**
 * Action Guard Component - Check if user can perform action on resource
 */
export const ActionGuard = ({
  children,
  resource,
  action,
  fallback,
}: ActionGuardProps) => {
  const userRole = useSelector((state: any) => state.auth.user?.role as UserRole);

  if (!userRole || !canPerformAction(userRole, resource, action)) {
    return fallback || <PermissionDenied />;
  }

  return <>{children}</>;
};

/**
 * Permission Denied Component
 */
const PermissionDenied = () => (
  <div className="p-6 rounded-lg border-2 border-red-200 bg-red-50">
    <div className="flex items-center gap-3">
      <Lock className="w-5 h-5 text-red-600" />
      <div>
        <p className="font-semibold text-red-900">Permission Denied</p>
        <p className="text-sm text-red-700">You don't have access to this resource</p>
      </div>
    </div>
  </div>
);

/**
 * Hook for checking permissions programmatically
 */
export const usePermission = (permission: string) => {
  const userRole = useSelector((state: any) => state.auth.user?.role as UserRole);
  return userRole ? hasPermission(userRole, permission) : false;
};

/**
 * Hook for checking if user has any permission
 */
export const useHasAnyPermission = (permissions: string[]) => {
  const userRole = useSelector((state: any) => state.auth.user?.role as UserRole);
  return userRole ? hasAnyPermission(userRole, permissions) : false;
};

/**
 * Hook for checking if user has all permissions
 */
export const useHasAllPermissions = (permissions: string[]) => {
  const userRole = useSelector((state: any) => state.auth.user?.role as UserRole);
  return userRole ? hasAllPermissions(userRole, permissions) : false;
};

/**
 * Hook for checking user role
 */
export const useRole = () => {
  return useSelector((state: any) => state.auth.user?.role as UserRole);
};

/**
 * Conditional Button Component with Permission Check
 */
interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission?: string;
  permissions?: string[];
  permissionType?: 'all' | 'any';
  children: ReactNode;
  deniedTooltip?: string;
}

export const PermissionButton = ({
  permission,
  permissions,
  permissionType = 'all',
  children,
  deniedTooltip,
  disabled,
  className,
  ...props
}: PermissionButtonProps) => {
  const userRole = useSelector((state: any) => state.auth.user?.role as UserRole);

  let hasAccess = true;
  if (userRole) {
    if (permission) {
      hasAccess = hasPermission(userRole, permission);
    } else if (permissions) {
      hasAccess = permissionType === 'all'
        ? hasAllPermissions(userRole, permissions)
        : hasAnyPermission(userRole, permissions);
    }
  }

  return (
    <button
      disabled={disabled || !hasAccess}
      className={`${className} ${!hasAccess ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={!hasAccess ? deniedTooltip || 'You do not have permission for this action' : undefined}
      {...props}
    >
      {children}
    </button>
  );
};
