import { useEffect } from "react";
import { SkillsDirectory, skillsRepositoryUrl } from "../components/SkillsDirectory";

export function DuomeiSkillsPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Skill | 多美小记";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <main className="duomei-skills-page">
      <header className="duomei-skills-intro">
        <h1>Skill</h1>
        <div>
          <p>把反复做过、真正踩过坑的工作流，整理成可以被不同编码代理读取的 Skill。</p>
          <a href={skillsRepositoryUrl} target="_blank" rel="noreferrer">
            查看 GitHub 仓库 <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      <SkillsDirectory headingId="duomei-skills-directory-title" />
    </main>
  );
}
