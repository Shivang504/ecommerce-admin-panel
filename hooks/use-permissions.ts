'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ADMIN_MODULES,
  buildPermission,
  canAccessModule,
  canAccessRoute,
  hasPermission,
  isSuperAdminRole,
  ModuleKey,
  Permission,
  PermissionAction,
} from '@/lib/permissions';

export interface AdminSessionUser {
  name: string;
  email: string;
  role?: string;
  permissions?: string[];
}

export function usePermissions() {
  const [user, setUser] = useState<AdminSessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const cached = localStorage.getItem('adminUser');
      if (cached) {
        setUser(JSON.parse(cached));
      }

      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/me', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const nextUser = {
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          permissions: data.user.permissions || [],
        };
        setUser(nextUser);
        localStorage.setItem('adminUser', JSON.stringify(nextUser));
      }
    } catch (error) {
      console.error('[v0] Failed to load permissions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const role = user?.role;
  const permissions = user?.permissions || [];
  const isSuperAdmin = isSuperAdminRole(role);

  return useMemo(
    () => ({
      user,
      role,
      permissions,
      loading,
      isSuperAdmin,
      can: (permission: Permission) => hasPermission(permissions, permission, role),
      canModule: (module: ModuleKey) => canAccessModule(permissions, module, role),
      canRoute: (pathname: string) => canAccessRoute(pathname, permissions, role),
      build: (module: ModuleKey, action: PermissionAction) => buildPermission(module, action),
      modules: ADMIN_MODULES,
      refresh: loadUser,
    }),
    [user, role, permissions, loading, isSuperAdmin, loadUser]
  );
}
