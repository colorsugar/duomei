import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { getHomeSectionHoldLayout } from "../lib/homeSectionHold";
import { useMotion } from "../motion";

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
  const { prefersReducedMotion } = useMotion();
  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ["start start", "end end"],
    trackContentSize: true,
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, -travel]);

  useLayoutEffect(() => {
    if (!translateContent) {
      setTravel(0);
      return;
    }

    const measure = () => {
      const next = getHomeSectionHoldLayout({
        viewportHeight: window.innerHeight,
        contentHeight: contentRef.current?.scrollHeight ?? 0,
        innerHeight: innerRef.current?.clientHeight ?? window.innerHeight,
      });
      setTravel((current) => (current === next.travel ? current : next.travel));
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

  return (
    <section
      id={id}
      className="home-section-hold"
      data-home-section-hold
      data-home-section-static={translateContent ? undefined : "true"}
      ref={outerRef}
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
