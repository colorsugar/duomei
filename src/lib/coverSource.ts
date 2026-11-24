// Bundled default covers ship as WebP (≈100 KB). Notes saved before the switch may
// still point at the old PNG path, so every cover goes through this mapping before
// it is rendered.
const DEFAULT_COVER_PNG = /(\/note-default-covers\/duomei-default-cover-\d{2})\.png(?=$|[?#])/u;

export function optimizeCoverSrc(src: string) {
  if (!src) return src;
  return src.replace(DEFAULT_COVER_PNG, "$1.webp");
}
