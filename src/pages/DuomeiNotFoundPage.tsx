import { Link } from "react-router-dom";
import { AnimatedButton, AnimatedParagraph, AnimatedTitle, RevealSection } from "../motion";

export function DuomeiNotFoundPage() {
  return (
    <RevealSection as="main" className="duomei-about">
      <AnimatedParagraph>NOT FOUND</AnimatedParagraph>
      <AnimatedTitle as="h1">旅行中……页面不存在</AnimatedTitle>
      <AnimatedButton as={Link} to="/">
        返回首页
      </AnimatedButton>
    </RevealSection>
  );
}
