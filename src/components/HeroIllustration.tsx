export function HeroIllustration() {
  const basePath = typeof window !== "undefined" && window.location.pathname.startsWith("/duomei") ? "/duomei/" : "/";
  const heroImageSrc = `${basePath}images/duomei-hero.png`;

  return (
    <figure className="duomei-hero-illustration duomei-hero-image-frame" aria-label="多美坐在旅途中记录生活的手绘插画">
      <img src={heroImageSrc} alt="" draggable={false} />
    </figure>
  );
}
