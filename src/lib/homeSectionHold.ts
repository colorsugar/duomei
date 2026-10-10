export const HOME_SECTION_DWELL_VIEWPORTS = 0.55;
/** Extra track after the dwell during which the stage stays pinned while the next section slides over it. */
export const HOME_SECTION_COVER_VIEWPORTS = 1;

export type HomeSectionHoldMeasure = {
  viewportHeight: number;
  contentHeight: number;
  innerHeight: number;
};

export type HomeSectionHoldLayout = {
  viewportHeight: number;
  contentHeight: number;
  innerHeight: number;
  dwell: number;
  travel: number;
  cover: number;
  trackHeight: number;
  /** Share of the sticky scroll during which the content stays put before the overflow scrolls. */
  holdShare: number;
};

const normalizeDimension = (value: number) => (Number.isFinite(value) && value > 0 ? Math.round(value) : 0);

export function getHomeSectionHoldLayout(measure: HomeSectionHoldMeasure): HomeSectionHoldLayout {
  const viewportHeight = normalizeDimension(measure.viewportHeight);
  const contentHeight = normalizeDimension(measure.contentHeight);
  const innerHeight = normalizeDimension(measure.innerHeight);
  const stageHeight = innerHeight || viewportHeight;
  const dwell = Math.round(stageHeight * HOME_SECTION_DWELL_VIEWPORTS);
  const travel = Math.max(0, contentHeight - stageHeight);
  const cover = Math.round(stageHeight * HOME_SECTION_COVER_VIEWPORTS);

  // Sections taller than the stage used to slide for the whole dwell, so they never felt pinned.
  // The track now grows by the overflow: the section holds for `dwell`, then scrolls `travel`,
  // then stays pinned for `cover` while the next section stacks on top of it.
  return {
    viewportHeight,
    contentHeight,
    innerHeight,
    dwell,
    travel,
    cover,
    trackHeight: stageHeight + dwell + travel + cover,
    holdShare: dwell + travel > 0 ? dwell / (dwell + travel) : 1,
  };
}
