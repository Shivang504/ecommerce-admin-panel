'use client';

import { ADMIN_MODULES, buildPermission, PERMISSION_ACTIONS, PermissionAction } from '@/lib/permissions';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ModulePermissionsPickerProps {
  value: string[];
  onChange: (permissions: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export function ModulePermissionsPicker({
  value,
  onChange,
  disabled = false,
  className,
}: ModulePermissionsPickerProps) {
  const selected = new Set(value);

  const togglePermission = (permission: string) => {
    const next = new Set(selected);
    if (next.has(permission)) {
      next.delete(permission);
    } else {
      next.add(permission);
    }
    onChange(Array.from(next));
  };

  const toggleModuleRow = (moduleKey: string, checked: boolean) => {
    const next = new Set(selected);
    PERMISSION_ACTIONS.forEach(action => {
      const permission = buildPermission(moduleKey as any, action);
      if (checked) {
        next.add(permission);
      } else {
        next.delete(permission);
      }
    });
    onChange(Array.from(next));
  };

  const isModuleFullySelected = (moduleKey: string) =>
    PERMISSION_ACTIONS.every(action => selected.has(buildPermission(moduleKey as any, action)));

  const isModulePartiallySelected = (moduleKey: string) => {
    const count = PERMISSION_ACTIONS.filter(action =>
      selected.has(buildPermission(moduleKey as any, action))
    ).length;
    return count > 0 && count < PERMISSION_ACTIONS.length;
  };

  const selectAll = () => {
    onChange(
      ADMIN_MODULES.flatMap(module =>
        PERMISSION_ACTIONS.map(action => buildPermission(module.key, action))
      )
    );
  };

  const clearAll = () => onChange([]);

  return (
    <div className={cn('space-y-4', className)}>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h3 className='text-lg font-semibold text-slate-900'>Module Access</h3>
          <p className='text-sm text-slate-500'>Assign which modules this admin can view and manage.</p>
        </div>
        <div className='flex gap-2'>
          <button
            type='button'
            onClick={selectAll}
            disabled={disabled}
            className='text-sm text-primary hover:underline disabled:opacity-50'>
            Select All
          </button>
          <span className='text-slate-300'>|</span>
          <button
            type='button'
            onClick={clearAll}
            disabled={disabled}
            className='text-sm text-slate-600 hover:underline disabled:opacity-50'>
            Clear All
          </button>
        </div>
      </div>

      <div className='overflow-x-auto border rounded-lg'>
        <table className='w-full text-sm'>
          <thead className='bg-slate-50 border-b'>
            <tr>
              <th className='text-left px-4 py-3 font-medium text-slate-700'>Module</th>
              {PERMISSION_ACTIONS.map(action => (
                <th key={action} className='text-center px-3 py-3 font-medium text-slate-700 capitalize'>
                  {action}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ADMIN_MODULES.filter(module => module.key !== 'users').map(module => (
              <tr key={module.key} className='border-b last:border-b-0'>
                <td className='px-4 py-3'>
                  <div className='flex items-center gap-2'>
                    <Checkbox
                      checked={isModuleFullySelected(module.key)}
                      data-state={isModulePartiallySelected(module.key) ? 'indeterminate' : undefined}
                      onCheckedChange={checked => toggleModuleRow(module.key, checked === true)}
                      disabled={disabled}
                    />
                    <Label className='font-medium text-slate-900'>{module.label}</Label>
                  </div>
                </td>
                {PERMISSION_ACTIONS.map(action => {
                  const permission = buildPermission(module.key, action as PermissionAction);
                  return (
                    <td key={permission} className='text-center px-3 py-3'>
                      <Checkbox
                        checked={selected.has(permission)}
                        onCheckedChange={() => togglePermission(permission)}
                        disabled={disabled}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className='text-xs text-slate-500'>
        Admin user management is restricted to Super Admin only and is not assignable here.
      </p>
    </div>
  );
}
