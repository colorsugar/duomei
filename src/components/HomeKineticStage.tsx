import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { IllustrationLayer } from "./IllustrationLayer";
import "../home-kinetic.css";

function useCompactMotion() {
  const [compact, setCompact] = useState(() => window.matchMedia("(max-width: 48rem)").matches);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 48rem)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return compact;
}

function useHeroScrollProgress() {
  const { scrollY } = useScroll();
  const [viewportHeight, setViewportHeight] = useState(() => Math.max(window.innerHeight, 1));

  useEffect(() => {
    const update = () => setViewportHeight(Math.max(window.innerHeight, 1));
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const rawProgress = useTransform(scrollY, [0, viewportHeight * 0.94], [0, 1], { clamp: true });
  return useSpring(rawProgress, { stiffness: 150, damping: 30, mass: 0.38 });
}

export function KineticHeroStage() {
  const progress = useHeroScrollProgress();
  const compact = useCompactMotion();
  const reduceMotion = useReducedMotion();

  const echoX = useTransform(progress, [0, 0.16, 0.62, 1], compact ? ["-22vw", "-4vw", "12vw", "42vw"] : ["-28vw", "-6vw", "18vw", "48vw"]);
  const echoY = useTransform(progress, [0, 0.4, 1], compact ? ["18svh", "2svh", "-34svh"] : ["28svh", "-2svh", "-46svh"]);
  const echoScale = useTransform(progress, [0, 0.45, 1], compact ? [0.72, 1.08, 1.82] : [0.66, 1.16, 2.28]);
  const echoRotate = useTransform(progress, [0, 1], compact ? [-12, 12] : [-14, 18]);
  const echoOpacity = useTransform(progress, [0, 0.12, 0.7, 1], [0, 0.13, 0.09, 0]);

  const sashX = useTransform(progress, [0, 0.18, 0.72, 1], ["-92%", "-22%", "24%", "108%"]);
  const sashY = useTransform(progress, [0, 1], compact ? ["56svh", "12svh"] : ["64svh", "8svh"]);
  const sashRotate = useTransform(progress, [0, 0.5, 1], compact ? [-10, 4, 15] : [-12, 5, 18]);
  const sashOpacity = useTransform(progress, [0, 0.08, 0.82, 1], [0, 0.96, 0.82, 0]);

  const foldX = useTransform(progress, [0, 1], ["-36%", "92%"]);
  const foldScale = useTransform(progress, [0, 0.6, 1], [0.72, 1.15, 1.48]);
  const foldRotate = useTransform(progress, [0, 1], compact ? [-20, 22] : [-24, 28]);
  const foldOpacity = useTransform(progress, [0, 0.14, 0.76, 1], [0, 0.7, 0.46, 0]);

  return (
    <>
      {!reduceMotion ? (
        <div className="duomei-kinetic-hero-canvas" aria-hidden="true">
          <motion.div
            className="duomei-kinetic-echo"
            style={{ x: echoX, y: echoY, scale: echoScale, rotate: echoRotate, opacity: echoOpacity }}
          >
            DUOMEI
          </motion.div>
          <motion.div
            className="duomei-kinetic-sash"
            style={{ x: sashX, y: sashY, rotate: sashRotate, opacity: sashOpacity }}
          >
            <span>多美小记 · DUOMEI JOURNAL · 多美小记 · DUOMEI JOURNAL</span>
          </motion.div>
          <motion.div
            className="duomei-kinetic-paper-fold"
            style={{ x: foldX, scale: foldScale, rotate: foldRotate, opacity: foldOpacity }}
          />
        </div>
      ) : null}
      <IllustrationLayer />
    </>
  );
}

type KineticNotesStageProps = {
  children: ReactNode;
  noteCount: number;
};

export function KineticNotesStage({ children, noteCount }: KineticNotesStageProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const compact = useCompactMotion();
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 94%", "end 6%"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 125, damping: 29, mass: 0.42 });

  const contentX = useTransform(progress, [0, 0.2, 0.78, 1], compact ? ["12vw", "0vw", "0vw", "-7vw"] : ["30vw", "0vw", "0vw", "-18vw"]);
  const contentScale = useTransform(progress, [0, 0.22, 0.78, 1], compact ? [0.92, 1, 1, 1.015] : [0.76, 1, 1, 1.055]);
  const contentRotate = useTransform(progress, [0, 0.22, 0.78, 1], compact ? [3, 0, 0, -1] : [7, 0, 0, -2.4]);
  const contentOpacity = useTransform(progress, [0, 0.17, 0.84, 1], [0.12, 1, 1, 0.64]);

  const titleX = useTransform(progress, [0, 1], compact ? ["-34vw", "24vw"] : ["-58vw", "44vw"]);
  const titleY = useTransform(progress, [0, 1], ["22svh", "-20svh"]);
  const titleRotate = useTransform(progress, [0, 1], compact ? [-8, 7] : [-11, 10]);
  const titleOpacity = useTransform(progress, [0, 0.16, 0.8, 1], [0, 0.085, 0.06, 0]);

  const railX = useTransform(progress, [0, 1], ["-92%", "92%"]);
  const railRotate = useTransform(progress, [0, 0.5, 1], [-9, 3, 12]);
  const railOpacity = useTransform(progress, [0, 0.12, 0.88, 1], [0, 0.72, 0.52, 0]);
  const countY = useTransform(progress, [0, 1], ["44svh", "-38svh"]);
  const countRotate = useTransform(progress, [0, 1], [-90, -76]);

  const contentStyle = reduceMotion ? undefined : { x: contentX, scale: contentScale, rotate: contentRotate, opacity: contentOpacity };

  return (
    <section ref={sectionRef} className="notes-dream-notes-panel duomei-kinetic-notes-stage" aria-label="多美的小记">
      {!reduceMotion ? (
        <div className="duomei-kinetic-notes-canvas" aria-hidden="true">
          <motion.div className="duomei-kinetic-notes-title" style={{ x: titleX, y: titleY, rotate: titleRotate, opacity: titleOpacity }}>
            多美的小记
          </motion.div>
          <motion.div className="duomei-kinetic-notes-rail" style={{ x: railX, rotate: railRotate, opacity: railOpacity }} />
          <motion.div className="duomei-kinetic-notes-count" style={{ y: countY, rotate: countRotate }}>
            共 {noteCount} 篇
          </motion.div>
        </div>
      ) : null}
      <motion.div className="notes-dream-notes-content" style={contentStyle}>
        {children}
      </motion.div>
    </section>
  );
}
