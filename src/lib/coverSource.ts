// Bundled default covers ship as WebP (≈100 KB) with the original PNG (≈2.3 MB) kept
// only as a fallback. Notes saved before the switch still point at the PNG, so every
// cover goes through this mapping before it is rendered.
const DEFAULT_COVER_PNG = /(\/note-default-covers\/duomei-default-cover-\d{2})\.png(?=$|[?#])/u;

export function optimizeCoverSrc(src: string) {
  if (!src) return src;
  return src.replace(DEFAULT_COVER_PNG, "$1.webp");
}
