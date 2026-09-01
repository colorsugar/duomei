import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  HOME_SECTION_HOLD_LAYOUT_EVENT,
  getHomeSectionHoldLayout,
  type HomeSectionHoldLayout,
} from "../lib/homeSectionHold";
import { useMotion } from "../motion";

type HomeSectionHoldProps = {
  id: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
  ariaLabelledBy?: string;
};

const initialLayout = (): HomeSectionHoldLayout => {
  const viewportHeight = typeof window === "undefined" ? 1 : Math.max(window.innerHeight, 1);
  return getHomeSectionHoldLayout({ viewportHeight, contentHeight: viewportHeight, innerHeight: viewportHeight });
};

export function HomeSectionHold({ id, className, children, ariaLabel, ariaLabelledBy }: HomeSectionHoldProps) {
  const outerRef = useRef<HTMLElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState(initialLayout);
  const [measured, setMeasured] = useState(false);
  const { prefersReducedMotion } = useMotion();
  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ["start start", "end end"],
    trackContentSize: true,
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, -layout.travel]);

  useLayoutEffect(() => {
    const measure = () => {
      const next = getHomeSectionHoldLayout({
        viewportHeight: window.innerHeight,
        contentHeight: contentRef.current?.scrollHeight ?? 0,
        innerHeight: innerRef.current?.clientHeight ?? window.innerHeight,
      });
      setLayout((current) => (
        current.viewportHeight === next.viewportHeight &&
        current.contentHeight === next.contentHeight &&
        current.innerHeight === next.innerHeight &&
        current.travel === next.travel &&
        current.trackHeight === next.trackHeight
          ? current
          : next
      ));
      setMeasured(true);
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
  }, []);

  useLayoutEffect(() => {
    if (!measured) return;
    window.dispatchEvent(new Event(HOME_SECTION_HOLD_LAYOUT_EVENT));
  }, [layout.trackHeight, measured]);

  const sectionStyle: CSSProperties | undefined = prefersReducedMotion ? undefined : { blockSize: layout.trackHeight };
  const contentStyle = prefersReducedMotion ? undefined : { y };

  return (
    <section
      id={id}
      className="home-section-hold"
      data-home-section-hold
      data-home-section-ready={measured ? "true" : undefined}
      ref={outerRef}
      style={sectionStyle}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
    >
      <div
        ref={innerRef}
        className="home-section-hold-stage"
      >
        <motion.div ref={contentRef} className={`home-section-hold-content ${className ?? ""}`} style={contentStyle}>
          {children}
        </motion.div>
      </div>
    </section>
  );
}
