import { sanitizeAttributeSelections } from '@/lib/product-attributes';

/** Empty urlSlug breaks unique sparse index (only one "" allowed). Omit when blank. */
export function sanitizeUrlSlugForDb(urlSlug: unknown): string | undefined {
  if (typeof urlSlug !== 'string') return undefined;
  const trimmed = urlSlug.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeProductPayload(
  payload: Record<string, unknown> | null | undefined,
  opts?: { applyDefaults?: boolean }
) {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const applyDefaults = opts?.applyDefaults !== false;
  const has = (key: string) => Object.prototype.hasOwnProperty.call(payload, key);

  const normalized: Record<string, unknown> = {
    ...payload,
    ...(applyDefaults ? { wholesalePriceType: payload.wholesalePriceType || 'Fixed' } : {}),
    ...(applyDefaults ? { sizeChartImage: payload.sizeChartImage ?? '' } : {}),
    ...((applyDefaults || has('jewelleryWeight'))
      ? { jewelleryWeight: typeof payload.jewelleryWeight === 'number' ? payload.jewelleryWeight : 0 }
      : {}),
    ...((applyDefaults || has('jewelleryPurity')) ? { jewelleryPurity: payload.jewelleryPurity ?? '' } : {}),
    ...((applyDefaults || has('jewelleryMakingCharges'))
      ? {
          jewelleryMakingCharges:
            typeof payload.jewelleryMakingCharges === 'number' ? payload.jewelleryMakingCharges : 0,
        }
      : {}),
    ...((applyDefaults || has('jewelleryStoneDetails'))
      ? { jewelleryStoneDetails: payload.jewelleryStoneDetails ?? '' }
      : {}),
    ...((applyDefaults || has('jewelleryCertification'))
      ? { jewelleryCertification: payload.jewelleryCertification ?? '' }
      : {}),
    ...(has('attributes') || applyDefaults
      ? { attributes: sanitizeAttributeSelections(payload.attributes as Record<string, string[]> | undefined) }
      : {}),
  };

  if (applyDefaults || has('urlSlug')) {
    const slug = sanitizeUrlSlugForDb(payload.urlSlug);
    if (slug) {
      normalized.urlSlug = slug;
    } else {
      delete normalized.urlSlug;
    }
  }

  return normalized;
}

export function mongoWriteErrorMessage(error: unknown): string | null {
  const err = error as { code?: number; keyPattern?: Record<string, unknown>; keyValue?: Record<string, unknown> };
  if (err?.code !== 11000) return null;
  if (err.keyPattern?.urlSlug !== undefined) {
    const val = err.keyValue?.urlSlug;
    if (val === '' || val === undefined) {
      return 'Could not save product: URL slug is missing. Open the SEO tab, enter a unique URL slug, then save again.';
    }
    return `URL slug "${val}" is already used by another product. Please choose a different slug in the SEO tab.`;
  }
  if (err.keyPattern?.sku !== undefined) {
    return `SKU "${err.keyValue?.sku ?? ''}" is already used. Please use a unique SKU.`;
  }
  return 'A product with the same unique identifier already exists.';
}
