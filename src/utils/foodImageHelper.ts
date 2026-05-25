// foodImageHelper.ts
// Generates beautiful local SVG food cards — works 100% offline, never broken.

const CATEGORY_CONFIG: Record<string, { bg1: string; bg2: string; emoji: string; accent: string }> = {
  'Lẩu':       { bg1: '#FFF1F2', bg2: '#FFE4E6', emoji: '🍲', accent: '#E11D48' },
  'Nướng':     { bg1: '#FFF7ED', bg2: '#FFEDD5', emoji: '🥩', accent: '#EA580C' },
  'Trà sữa':   { bg1: '#F0F9FF', bg2: '#E0F2FE', emoji: '🧋', accent: '#0284C7' },
  'Cafe':       { bg1: '#FDF6EE', bg2: '#F5E6D5', emoji: '☕', accent: '#92400E' },
  'Bánh ngọt': { bg1: '#FDF4FF', bg2: '#FAE8FF', emoji: '🧁', accent: '#A21CAF' },
  'Ăn vặt':    { bg1: '#FFFBEB', bg2: '#FEF3C7', emoji: '🍿', accent: '#D97706' },
  'Món Việt':  { bg1: '#F0FDF4', bg2: '#DCFCE7', emoji: '🍜', accent: '#16A34A' },
  'Món Hàn':   { bg1: '#EFF6FF', bg2: '#DBEAFE', emoji: '🍱', accent: '#2563EB' },
  'Món Nhật':  { bg1: '#F5F3FF', bg2: '#EDE9FE', emoji: '🍣', accent: '#7C3AED' },
  'Món Âu':    { bg1: '#ECFDF5', bg2: '#D1FAE5', emoji: '🥗', accent: '#059669' },
  'Khác':       { bg1: '#F8FAFC', bg2: '#F1F5F9', emoji: '🍽️', accent: '#64748B' },
};

const DEFAULT_CONFIG = { bg1: '#EFF6FF', bg2: '#DBEAFE', emoji: '🍽️', accent: '#3B82F6' };

function getConfig(category?: string) {
  if (!category) return DEFAULT_CONFIG;
  return CATEGORY_CONFIG[category] ?? DEFAULT_CONFIG;
}

/** Escape HTML special chars for safe SVG embedding */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Trim food name to fit nicely inside SVG */
function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

/**
 * Generate a beautiful SVG food card as a data URL.
 * Always works locally, no network required.
 */
export function generateFoodSVG(foodName: string, category?: string): string {
  const cfg = getConfig(category);
  const safeName = escapeXml(truncate(foodName, 22));
  const safeCategory = escapeXml(category ?? 'Món ăn');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${cfg.bg1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${cfg.bg2};stop-opacity:1" />
    </linearGradient>
    <linearGradient id="badge" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${cfg.accent};stop-opacity:0.15" />
      <stop offset="100%" style="stop-color:${cfg.accent};stop-opacity:0.08" />
    </linearGradient>
    <clipPath id="rounded">
      <rect width="400" height="240" rx="16" ry="16"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="400" height="240" rx="16" ry="16" fill="url(#bg)" clip-path="url(#rounded)"/>

  <!-- Decorative circles -->
  <circle cx="340" cy="50" r="70" fill="${cfg.accent}" fill-opacity="0.06"/>
  <circle cx="60" cy="200" r="50" fill="${cfg.accent}" fill-opacity="0.05"/>
  <circle cx="380" cy="200" r="40" fill="${cfg.accent}" fill-opacity="0.04"/>

  <!-- Center emoji -->
  <text x="200" y="118" font-size="72" text-anchor="middle" dominant-baseline="middle" font-family="Apple Color Emoji, Segoe UI Emoji, sans-serif">${cfg.emoji}</text>

  <!-- Food name -->
  <text x="200" y="158" font-size="18" font-weight="700" fill="${cfg.accent}" text-anchor="middle" font-family="'Be Vietnam Pro', Arial, sans-serif">${safeName}</text>

  <!-- Category badge -->
  <rect x="138" y="175" width="124" height="26" rx="13" fill="url(#badge)"/>
  <text x="200" y="192" font-size="12" font-weight="600" fill="${cfg.accent}" text-anchor="middle" font-family="'Be Vietnam Pro', Arial, sans-serif" fill-opacity="0.9">${safeCategory}</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Get an image URL for a food item.
 * If imageUrl is provided, return it.
 * Otherwise, generate a local SVG placeholder (always works, always pretty).
 */
export function getAutofilledImageUrl(foodName: string, category?: string, existingUrl?: string): string {
  if (existingUrl && existingUrl.trim() !== '') {
    return existingUrl.trim();
  }
  return generateFoodSVG(foodName, category);
}
