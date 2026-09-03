export const HOME_SECTION_DWELL_VIEWPORTS = 1.3;

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
  trackHeight: number;
};

const normalizeDimension = (value: number) => (Number.isFinite(value) && value > 0 ? Math.round(value) : 0);

export function getHomeSectionHoldLayout(measure: HomeSectionHoldMeasure): HomeSectionHoldLayout {
  const viewportHeight = normalizeDimension(measure.viewportHeight);
  const contentHeight = normalizeDimension(measure.contentHeight);
  const innerHeight = normalizeDimension(measure.innerHeight);
  const stageHeight = innerHeight || viewportHeight;
  const dwell = Math.round(stageHeight * HOME_SECTION_DWELL_VIEWPORTS);
  const travel = Math.max(0, contentHeight - stageHeight);

  return {
    viewportHeight,
    contentHeight,
    innerHeight,
    dwell,
    travel,
    trackHeight: stageHeight + dwell,
  };
}
