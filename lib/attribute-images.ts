/** Helpers for color / image-style attribute values */

export function isColorAttribute(name?: string, style?: string): boolean {
  const n = (name || '').trim().toLowerCase();
  if (style === 'image' || style === 'circle') return true;
  return n.includes('color') || n.includes('colour');
}

export function sanitizeValueImages(
  values: string[],
  valueImages?: Record<string, string> | null
): Record<string, string> {
  if (!valueImages || typeof valueImages !== 'object') return {};
  const out: Record<string, string> = {};
  for (const v of values) {
    const trimmed = v.trim();
    const url = valueImages[trimmed] || valueImages[v];
    if (typeof url === 'string' && url.trim()) {
      out[trimmed] = url.trim();
    }
  }
  return out;
}

export function getValueImage(
  valueImages: Record<string, string> | undefined,
  value: string
): string | undefined {
  if (!valueImages) return undefined;
  const trimmed = value.trim();
  return valueImages[trimmed] || valueImages[value];
}

export type ColorGalleryMap = Record<string, string[]>;

export function getColorKeyInCombination(
  combination: Record<string, string>,
  colorAttributeName?: string
): string | undefined {
  if (!combination || typeof combination !== 'object') return undefined;
  const keys = Object.keys(combination);
  if (colorAttributeName) {
    const exact = keys.find(k => k === colorAttributeName);
    if (exact) return exact;
    const caseInsensitive = keys.find(k => k.toLowerCase() === colorAttributeName.toLowerCase());
    if (caseInsensitive) return caseInsensitive;
  }
  return keys.find(k => {
    const lower = k.toLowerCase();
    return lower.includes('color') || lower.includes('colour');
  });
}

export function variantHasColor(
  combination: Record<string, string>,
  color: string,
  colorAttributeName?: string
): boolean {
  const key = getColorKeyInCombination(combination, colorAttributeName);
  if (!key) return false;
  return combination[key]?.trim() === color.trim();
}

export function uniqueImages(urls: (string | undefined | null)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const url of urls) {
    const trimmed = url?.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}
