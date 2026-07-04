import { AnimatedImage } from "../motion";

export function HeroIllustration() {
  const basePath = typeof window !== "undefined" && window.location.pathname.startsWith("/duomei") ? "/duomei/" : "/";
  const heroImageSrc = `${basePath}images/duomei-hero.png`;

  return (
    <AnimatedImage className="duomei-hero-illustration-wrap" aria-label="DUOMEI hero illustration">
      <div className="duomei-hero-cover-motion">
        <figure className="duomei-hero-illustration duomei-hero-image-frame duomei-motion-ambient-hero">
          <img src={heroImageSrc} alt="" draggable={false} />
        </figure>
      </div>
    </AnimatedImage>
  );
}
