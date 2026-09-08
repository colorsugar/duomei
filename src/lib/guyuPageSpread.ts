/** StPageFlip with showCover: cover, (1, 2), (3, 4), …, back cover. */
export function getGuyuPageSpread(target: number, pageCount: number) {
  const lastIndex = Math.max(0, pageCount - 1);
  const bounded = Math.min(lastIndex, Math.max(0, Number.isFinite(target) ? Math.trunc(target) : 0));
  if (bounded === 0 || bounded === lastIndex) {
    return { pageIndex: bounded, visiblePages: [bounded] };
  }
  const pageIndex = bounded % 2 === 0 ? bounded - 1 : bounded;
  return { pageIndex, visiblePages: [pageIndex, Math.min(pageIndex + 1, lastIndex)] };
}

/** Atlas sections and printed folios count the front cover as physical page 1. */
export function formatGuyuPhysicalPageNumber(pageIndex: number, pageCount: number) {
  const lastIndex = Math.max(0, pageCount - 1);
  if (pageIndex <= 0) return "封面";
  if (pageIndex >= lastIndex) return "封底";
  const first = pageIndex + 1;
  const second = Math.min(pageIndex + 2, lastIndex);
  return `${first === second ? first : `${first}–${second}`} / ${pageCount}`;
}
