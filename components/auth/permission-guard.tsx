'use client';

import { ReactNode } from 'react';
import { ModuleKey, Permission } from '@/lib/permissions';
import { usePermissions } from '@/hooks/use-permissions';

interface PermissionGuardProps {
  permission?: Permission;
  module?: ModuleKey;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGuard({ permission, module, fallback = null, children }: PermissionGuardProps) {
  const { can, canModule, isSuperAdmin, loading } = usePermissions();

  if (loading) return null;

  if (isSuperAdmin) return <>{children}</>;

  if (permission && !can(permission)) return <>{fallback}</>;
  if (module && !canModule(module)) return <>{fallback}</>;

  return <>{children}</>;
}
