import { Link } from "react-router-dom";
import { DuomeiCompanion } from "../components/companion";
import { AnimatedButton, AnimatedParagraph, AnimatedTitle, RevealSection } from "../motion";

export function DuomeiNotFoundPage() {
  return (
    <RevealSection as="main" className="duomei-about duomei-not-found-page">
      <AnimatedParagraph>NOT FOUND</AnimatedParagraph>
      <AnimatedTitle as="h1">旅行中……页面不存在</AnimatedTitle>
      <AnimatedButton as={Link} to="/">
        返回首页
      </AnimatedButton>
      <DuomeiCompanion placement="not-found" />
    </RevealSection>
  );
}
