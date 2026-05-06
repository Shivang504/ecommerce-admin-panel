'use client';

import * as React from 'react';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';

type ImportRow = {
  rowNumber: number;
  categoryName: string;
  categorySlug?: string;
  categoryStatus?: 'active' | 'inactive';
  categoryPosition?: number;
  categoryFeatured?: boolean;

  subcategoryName?: string;
  subcategorySlug?: string;
  subcategoryStatus?: 'active' | 'inactive';
  subcategoryPosition?: number;
};

const RowSchema = z.object({
  rowNumber: z.number().int().positive(),
  categoryName: z.string().trim().min(1, 'Category Name is required'),
  categorySlug: z.string().trim().optional().or(z.literal('')).transform(v => (v ? v : undefined)),
  categoryStatus: z
    .enum(['active', 'inactive'])
    .optional()
    .or(z.literal(''))
    .transform(v => (v ? v : undefined)),
  categoryPosition: z.number().int().nonnegative().optional(),
  categoryFeatured: z.boolean().optional(),

  subcategoryName: z.string().trim().optional().or(z.literal('')).transform(v => (v ? v : undefined)),
  subcategorySlug: z.string().trim().optional().or(z.literal('')).transform(v => (v ? v : undefined)),
  subcategoryStatus: z
    .enum(['active', 'inactive'])
    .optional()
    .or(z.literal(''))
    .transform(v => (v ? v : undefined)),
  subcategoryPosition: z.number().int().nonnegative().optional(),
});

function normalizeHeader(h: unknown): string {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function toNumberOrUndefined(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v).trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function toBooleanOrUndefined(v: unknown): boolean | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  if (!s) return undefined;
  if (['1', 'true', 'yes', 'y'].includes(s)) return true;
  if (['0', 'false', 'no', 'n'].includes(s)) return false;
  return undefined;
}

function toStatusOrUndefined(v: unknown): 'active' | 'inactive' | undefined {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return undefined;
  if (s === 'active') return 'active';
  if (s === 'inactive') return 'inactive';
  return undefined;
}

function getCurrentRole(): string | null {
  const userStr = typeof window !== 'undefined' ? localStorage.getItem('adminUser') : null;
  if (!userStr) return null;
  try {
    const u = JSON.parse(userStr);
    return u?.role || null;
  } catch {
    return null;
  }
}

export function CategoryBulkImport() {
  const router = useRouter();
  const { toast } = useToast();

  const [fileName, setFileName] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<ImportRow[]>([]);
  const [rowErrors, setRowErrors] = React.useState<Array<{ rowNumber: number; message: string }>>([]);
  const [isParsing, setIsParsing] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [updateExisting, setUpdateExisting] = React.useState(false);

  React.useEffect(() => {
    const role = getCurrentRole();
    if (role && !['admin', 'superadmin'].includes(role)) {
      router.replace('/admin');
    }
  }, [router]);

  const parseFile = async (file: File) => {
    setIsParsing(true);
    setFileName(file.name);
    setRows([]);
    setRowErrors([]);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        setRowErrors([{ rowNumber: 0, message: 'No sheets found in the uploaded file' }]);
        return;
      }

      const sheet = workbook.Sheets[sheetName];
      const raw: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const mapped: ImportRow[] = [];
      const errors: Array<{ rowNumber: number; message: string }> = [];

      for (let i = 0; i < raw.length; i++) {
        const source = raw[i] ?? {};
        const rowNumber = i + 2; // header is row 1

        const normalized: Record<string, any> = {};
        for (const [k, v] of Object.entries(source)) normalized[normalizeHeader(k)] = v;

        const candidate: ImportRow = {
          rowNumber,
          categoryName: String(normalized['category name'] ?? '').trim(),
          categorySlug: String(normalized['category slug'] ?? '').trim() || undefined,
          categoryStatus: toStatusOrUndefined(normalized['category status']),
          categoryPosition: toNumberOrUndefined(normalized['category position']),
          categoryFeatured: toBooleanOrUndefined(normalized['category featured']),

          subcategoryName: String(normalized['subcategory name'] ?? '').trim() || undefined,
          subcategorySlug: String(normalized['subcategory slug'] ?? '').trim() || undefined,
          subcategoryStatus: toStatusOrUndefined(normalized['subcategory status']),
          subcategoryPosition: toNumberOrUndefined(normalized['subcategory position']),
        };

        const parsed = RowSchema.safeParse(candidate);
        if (!parsed.success) {
          errors.push({
            rowNumber,
            message: parsed.error.issues.map(x => x.message).join('; '),
          });
          continue;
        }

        mapped.push(parsed.data);
      }

      setRows(mapped);
      setRowErrors(errors);

      if (mapped.length === 0) {
        toast({
          title: 'No valid rows found',
          description: 'Please check your sheet columns and data.',
          variant: 'destructive',
        });
      }
    } catch (e: any) {
      setRowErrors([{ rowNumber: 0, message: e?.message || 'Failed to parse file' }]);
    } finally {
      setIsParsing(false);
    }
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const template = [
      {
        'Category Name': 'Men',
        'Category Slug': 'men',
        'Category Status': 'active',
        'Category Position': 0,
        'Category Featured': 'true',
        'Subcategory Name': 'T-Shirts',
        'Subcategory Slug': 't-shirts',
        'Subcategory Status': 'active',
        'Subcategory Position': 0,
      },
      {
        'Category Name': 'Men',
        'Category Slug': 'men',
        'Category Status': 'active',
        'Category Position': 0,
        'Category Featured': 'true',
        'Subcategory Name': 'Jeans',
        'Subcategory Slug': 'jeans',
        'Subcategory Status': 'active',
        'Subcategory Position': 1,
      },
      {
        'Category Name': 'Accessories',
        'Category Slug': 'accessories',
        'Category Status': 'active',
        'Category Position': 10,
        'Category Featured': 'false',
        'Subcategory Name': '',
        'Subcategory Slug': '',
        'Subcategory Status': '',
        'Subcategory Position': '',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    XLSX.utils.book_append_sheet(wb, ws, 'Import');
    XLSX.writeFile(wb, 'category-subcategory-import-template.xlsx');
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setIsImporting(true);

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/categories/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ rows, options: { updateExisting } }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({
          title: 'Import failed',
          description: data?.error || 'Failed to import.',
          variant: 'destructive',
        });
        return;
      }

      const errCount = Array.isArray(data?.errors) ? data.errors.length : 0;
      toast({
        title: errCount ? 'Imported with warnings' : 'Import complete',
        description: `Categories: +${data.createdCategories || 0} (skipped ${data.skippedCategories || 0}), Subcategories: +${data.createdSubcategories || 0} (skipped ${data.skippedSubcategories || 0}).`,
        variant: errCount ? 'destructive' : 'success',
      });

      if (errCount) setRowErrors(data.errors);
    } catch (e: any) {
      toast({
        title: 'Import failed',
        description: e?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const role = getCurrentRole();
  const isAllowed = !role || ['admin', 'superadmin'].includes(role);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Bulk Import</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload an Excel file to create Categories and Subcategories. One row can create a category-only entry or a
            subcategory under the given category.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            Download Template
          </Button>
          <Button variant="outline" onClick={() => router.push('/admin/categories')}>
            Back to Categories
          </Button>
        </div>
      </div>

      {!isAllowed ? (
        <Card className="p-6 border border-red-200 bg-red-50">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-red-700">Access denied</p>
              <p className="text-sm text-red-700/80">Only Admin and Super Admin users can access bulk import.</p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <Card className="p-6 shadow-md border border-gray-200 space-y-4">
            <div className="flex flex-col md:flex-row md:items-end gap-3 justify-between">
              <div className="space-y-2">
                <div className="text-sm font-medium">Upload Excel</div>
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) void parseFile(f);
                  }}
                  disabled={isParsing || isImporting}
                />
                {fileName ? <div className="text-xs text-muted-foreground">Selected: {fileName}</div> : null}
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={updateExisting}
                    onChange={e => setUpdateExisting(e.target.checked)}
                    disabled={isParsing || isImporting}
                  />
                  Update existing (by slug)
                </label>
                <Button
                  onClick={handleImport}
                  disabled={isParsing || isImporting || rows.length === 0}
                  className="bg-[#22c55e]"
                >
                  {isImporting ? <Spinner className="h-4 w-4 mr-2" /> : null}
                  Import
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Required column: <Badge variant="secondary">Category Name</Badge>. Optional columns:{' '}
              <Badge variant="secondary">Category Slug</Badge>, <Badge variant="secondary">Category Status</Badge>,{' '}
              <Badge variant="secondary">Category Position</Badge>, <Badge variant="secondary">Category Featured</Badge>,{' '}
              <Badge variant="secondary">Subcategory Name</Badge>, <Badge variant="secondary">Subcategory Slug</Badge>,{' '}
              <Badge variant="secondary">Subcategory Status</Badge>, <Badge variant="secondary">Subcategory Position</Badge>.
            </div>
          </Card>

          {rowErrors.length ? (
            <Card className="p-6 shadow-md border border-red-200 bg-red-50 space-y-2">
              <div className="font-semibold text-red-700">Validation / Import Issues</div>
              <div className="space-y-1 text-sm text-red-700/90">
                {rowErrors.slice(0, 20).map((e, idx) => (
                  <div key={`${e.rowNumber}-${idx}`}>
                    Row {e.rowNumber}: {e.message}
                  </div>
                ))}
                {rowErrors.length > 20 ? (
                  <div className="text-xs text-red-700/80">Showing first 20 of {rowErrors.length} issues.</div>
                ) : null}
              </div>
            </Card>
          ) : null}

          <Card className="shadow-md border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="font-semibold">Preview</div>
              <div className="text-sm text-muted-foreground">
                {isParsing ? 'Parsing…' : `${rows.length} valid row(s)`}
              </div>
            </div>
            <div className="overflow-x-auto p-4">
              {isParsing ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner className="h-6 w-6" />
                  <span className="ml-2">Parsing file…</span>
                </div>
              ) : rows.length === 0 ? (
                <div className="py-8 text-center text-gray-500">Upload a template-filled sheet to preview rows.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 border-b border-gray-200 hover:bg-gray-50">
                      <TableHead className="py-3">Row</TableHead>
                      <TableHead className="py-3">Category</TableHead>
                      <TableHead className="py-3">Cat Slug</TableHead>
                      <TableHead className="py-3">Cat Status</TableHead>
                      <TableHead className="py-3">Cat Pos</TableHead>
                      <TableHead className="py-3">Featured</TableHead>
                      <TableHead className="py-3">Subcategory</TableHead>
                      <TableHead className="py-3">Sub Slug</TableHead>
                      <TableHead className="py-3">Sub Status</TableHead>
                      <TableHead className="py-3">Sub Pos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 20).map(r => (
                      <TableRow key={r.rowNumber} className="border-b border-gray-200">
                        <TableCell className="py-3">{r.rowNumber}</TableCell>
                        <TableCell className="py-3 font-medium">{r.categoryName}</TableCell>
                        <TableCell className="py-3">{r.categorySlug || ''}</TableCell>
                        <TableCell className="py-3">{r.categoryStatus || ''}</TableCell>
                        <TableCell className="py-3">{r.categoryPosition ?? ''}</TableCell>
                        <TableCell className="py-3">{r.categoryFeatured === undefined ? '' : String(r.categoryFeatured)}</TableCell>
                        <TableCell className="py-3">{r.subcategoryName || ''}</TableCell>
                        <TableCell className="py-3">{r.subcategorySlug || ''}</TableCell>
                        <TableCell className="py-3">{r.subcategoryStatus || ''}</TableCell>
                        <TableCell className="py-3">{r.subcategoryPosition ?? ''}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {rows.length > 20 ? (
                <div className="pt-3 text-xs text-muted-foreground">Showing first 20 of {rows.length} rows.</div>
              ) : null}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

