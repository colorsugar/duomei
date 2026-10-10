import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { HOME_SECTION_COVER_VIEWPORTS, HOME_SECTION_DWELL_VIEWPORTS, getHomeSectionHoldLayout } from "../lib/homeSectionHold";
import { useMotion } from "../motion";
import { sectionAccents } from "../lib/sectionAccents";

type HomeSectionHoldProps = {
  id: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  translateContent?: boolean;
};

export function HomeSectionHold({
  id,
  className,
  children,
  ariaLabel,
  ariaLabelledBy,
  translateContent = true,
}: HomeSectionHoldProps) {
  const outerRef = useRef<HTMLElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [travel, setTravel] = useState(0);
  const [holdShare, setHoldShare] = useState(1);
  const { prefersReducedMotion } = useMotion();
  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ["start start", "end end"],
    trackContentSize: true,
  });
  // Pinned for the first part of the track, then the overflow scrolls through the stage.
  // The last viewport of the track is the cover phase: the content is parked (y = -travel) and the
  // card shrinks and dims while the next section slides over it (stacked cards).
  const coverShare = HOME_SECTION_COVER_VIEWPORTS / (1 + HOME_SECTION_DWELL_VIEWPORTS + HOME_SECTION_COVER_VIEWPORTS);
  const travelEnd = 1 - coverShare;
  const y = useTransform(scrollYProgress, [0, Math.min(holdShare * travelEnd, 0.999), travelEnd, 1], [0, 0, -travel, -travel]);
  const { scrollYProgress: cover } = useScroll({
    target: outerRef,
    offset: ["end end", "end start"],
  });
  // Entering: the section arrives as a rounded card, slightly small, and opens to full bleed as it docks.
  const { scrollYProgress: enter } = useScroll({
    target: outerRef,
    offset: ["start end", "start start"],
  });
  const cardScale = useTransform([enter, cover], ([e, c]: number[]) => (0.95 + 0.05 * e) * (1 - 0.1 * c));
  const cardY = useTransform(cover, [0, 1], ["0svh", "-8svh"]);
  const cardRadius = useTransform([enter, cover], ([e, c]: number[]) => `${(1 - e) * 2.2 + c * 2.2}rem`);
  const cardVeil = useTransform(cover, [0, 1], [0, 0.58]);
  // A huge, faint English watermark in the card's corner drifts a little as the card is covered.
  const accent = sectionAccents.find((entry) => entry.id === id);
  const markY = useTransform(cover, [0, 1], ["0rem", "-4rem"]);
  const markX = useTransform(enter, [0, 1], ["3rem", "0rem"]);

  useLayoutEffect(() => {
    if (!translateContent) {
      setTravel(0);
      setHoldShare(1);
      return;
    }

    const measure = () => {
      const next = getHomeSectionHoldLayout({
        viewportHeight: window.innerHeight,
        contentHeight: contentRef.current?.scrollHeight ?? 0,
        innerHeight: innerRef.current?.clientHeight ?? window.innerHeight,
      });
      setTravel((current) => (current === next.travel ? current : next.travel));
      setHoldShare((current) => (current === next.holdShare ? current : next.holdShare));
    };

    measure();
    window.addEventListener("resize", measure);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (innerRef.current) observer?.observe(innerRef.current);
    if (contentRef.current) observer?.observe(contentRef.current);
    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, [translateContent]);

  const contentStyle = prefersReducedMotion || !translateContent ? undefined : { y };
  // Plain 2D transform on a layer that stays put: toggling will-change or using rotateX made Safari
  // rebuild the layer at every hand-over (a visible hitch).
  const cardStyle = prefersReducedMotion
    ? undefined
    : ({
        scale: cardScale,
        y: cardY,
        borderRadius: cardRadius,
        willChange: "transform",
        "--cover-veil": cardVeil,
      } as Record<string, unknown>);

  return (
    <section
      id={id}
      className="home-section-hold"
      data-home-section-hold
      data-home-section-static={translateContent ? undefined : "true"}
      ref={outerRef}
      style={translateContent && travel > 0 ? { blockSize: `calc(${100 + (HOME_SECTION_DWELL_VIEWPORTS + HOME_SECTION_COVER_VIEWPORTS) * 100}svh + ${travel}px)` } : undefined}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
    >
      <div ref={innerRef} className="home-section-hold-stage">
        <motion.div className="home-section-hold-card" style={cardStyle}>
          {accent ? (
            <motion.span className="home-section-watermark" style={prefersReducedMotion ? undefined : { x: markX, y: markY }} aria-hidden="true">
              {accent.english}
            </motion.span>
          ) : null}
          <motion.div ref={contentRef} className={`home-section-hold-content ${className ?? ""}`} style={contentStyle}>
            {children}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
