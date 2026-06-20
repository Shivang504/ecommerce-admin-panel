export const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete'] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const ADMIN_MODULES = [
  { key: 'dashboard', label: 'Dashboard', route: '/admin' },
  { key: 'products', label: 'Products', route: '/admin/products' },
  { key: 'orders', label: 'Orders', route: '/admin/orders' },
  { key: 'payments', label: 'Payments', route: '/admin/payments' },
  { key: 'warehouses', label: 'Warehouses', route: '/admin/warehouses' },
  { key: 'support', label: 'Support Tickets', route: '/admin/support/tickets' },
  { key: 'chat', label: 'Live Chat', route: '/admin/chat' },
  { key: 'coupons', label: 'Coupons', route: '/admin/coupons' },
  { key: 'users', label: 'Admin Users', route: '/admin/users' },
  { key: 'customers', label: 'Customers', route: '/admin/customers' },
  { key: 'reviews', label: 'Reviews', route: '/admin/reviews' },
  { key: 'vendors', label: 'Vendors', route: '/admin/vendors' },
  { key: 'withdrawals', label: 'Withdrawals', route: '/admin/withdrawals' },
  { key: 'vendor-requests', label: 'Vendor Requests', route: '/admin/vendor-requests' },
  { key: 'reports', label: 'Reports & Analytics', route: '/admin/seo' },
  { key: 'cms', label: 'CMS', route: '/admin/cms' },
  { key: 'settings', label: 'Settings', route: '/admin/settings' },
] as const;

export type ModuleKey = (typeof ADMIN_MODULES)[number]['key'];
export type Permission = `${ModuleKey}.${PermissionAction}`;

export const SUPERADMIN_ROLE = 'superadmin';
export const ADMIN_ROLE = 'admin';

export function buildPermission(module: ModuleKey, action: PermissionAction): Permission {
  return `${module}.${action}`;
}

export const ALL_PERMISSIONS: Permission[] = ADMIN_MODULES.flatMap(module =>
  PERMISSION_ACTIONS.map(action => buildPermission(module.key, action))
);

export function isSuperAdminRole(role?: string | null): boolean {
  return role === SUPERADMIN_ROLE;
}

export function hasPermission(
  permissions: string[] | undefined | null,
  permission: Permission,
  role?: string | null
): boolean {
  if (isSuperAdminRole(role)) return true;
  if (!permissions?.length) return false;
  return permissions.includes(permission);
}

export function hasAnyPermission(
  permissions: string[] | undefined | null,
  checks: Permission[],
  role?: string | null
): boolean {
  if (isSuperAdminRole(role)) return true;
  return checks.some(permission => hasPermission(permissions, permission, role));
}

export function canAccessModule(
  permissions: string[] | undefined | null,
  module: ModuleKey,
  role?: string | null
): boolean {
  return hasPermission(permissions, buildPermission(module, 'view'), role);
}

const ROUTE_MODULE_RULES: Array<{ prefix: string; module: ModuleKey }> = [
  { prefix: '/admin/products', module: 'products' },
  { prefix: '/admin/attributes', module: 'products' },
  { prefix: '/admin/categories', module: 'products' },
  { prefix: '/admin/subcategories', module: 'products' },
  { prefix: '/admin/child-categories', module: 'products' },
  { prefix: '/admin/brands', module: 'products' },
  { prefix: '/admin/tags', module: 'products' },
  { prefix: '/admin/positions', module: 'products' },
  { prefix: '/admin/orders', module: 'orders' },
  { prefix: '/admin/payments', module: 'payments' },
  { prefix: '/admin/warehouses', module: 'warehouses' },
  { prefix: '/admin/support', module: 'support' },
  { prefix: '/admin/chat', module: 'chat' },
  { prefix: '/admin/coupons', module: 'coupons' },
  { prefix: '/admin/users', module: 'users' },
  { prefix: '/admin/roles', module: 'users' },
  { prefix: '/admin/customers', module: 'customers' },
  { prefix: '/admin/reviews', module: 'reviews' },
  { prefix: '/admin/vendors', module: 'vendors' },
  { prefix: '/admin/withdrawals', module: 'withdrawals' },
  { prefix: '/admin/vendor-requests', module: 'vendor-requests' },
  { prefix: '/admin/seo', module: 'reports' },
  { prefix: '/admin/cms', module: 'cms' },
  { prefix: '/admin/banners', module: 'cms' },
  { prefix: '/admin/policies', module: 'cms' },
  { prefix: '/admin/blog', module: 'cms' },
  { prefix: '/admin/settings', module: 'settings' },
  { prefix: '/admin/profile', module: 'dashboard' },
];

export function getModuleForPath(pathname: string): ModuleKey {
  if (pathname === '/admin') return 'dashboard';

  const match = ROUTE_MODULE_RULES.find(rule => pathname.startsWith(rule.prefix));
  return match?.module ?? 'dashboard';
}

export function canAccessRoute(
  pathname: string,
  permissions: string[] | undefined | null,
  role?: string | null
): boolean {
  if (isSuperAdminRole(role)) return true;
  if (role === 'vendor') return true;

  const module = getModuleForPath(pathname);
  return canAccessModule(permissions, module, role);
}

export function getModuleLabel(module: ModuleKey): string {
  return ADMIN_MODULES.find(item => item.key === module)?.label ?? module;
}

export function formatPermissionLabel(permission: string): string {
  const [module, action] = permission.split('.');
  const moduleLabel = getModuleLabel(module as ModuleKey);
  const actionLabel = action ? action.charAt(0).toUpperCase() + action.slice(1) : '';
  return `${moduleLabel} — ${actionLabel}`;
}
