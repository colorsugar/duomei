import { useEffect } from "react";
import "../skills.css";

const skills = [
  {
    number: "01",
    title: "电子画册",
    name: "pdf-to-immersive-flipbook",
    description: "把扫描 PDF 映射成正确的逻辑书页，并把翻页、触摸、预加载、隐私与真机验收收进同一套流程。",
    tags: ["PDF", "翻页", "隐私交付"],
  },
  {
    number: "02",
    title: "研究后再做",
    name: "research-before-build",
    description: "在复杂功能开工前，先核对项目现有能力、官方资料与成熟方案，再选择成本最低且可回退的实现。",
    tags: ["研究", "技术选型", "兼容性"],
  },
  {
    number: "03",
    title: "角色提示词包",
    name: "prompt-pack",
    description: "为角色图片、表情包网格、图生视频和无缝循环短片生成可复用的中文提示词与一致性规则。",
    tags: ["角色一致性", "图片", "视频"],
  },
] as const;

const repositoryUrl = "https://github.com/colorsugar/agent-skills";

export function DuomeiSkillsPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "技能 | 多美小记";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <main className="duomei-skills-page">
      <header className="duomei-skills-intro">
        <h1>技能</h1>
        <div>
          <p>把反复做过、真正踩过坑的工作流，整理成可以被不同编码代理读取的 Skill。</p>
          <a href={repositoryUrl} target="_blank" rel="noreferrer">
            查看 GitHub 仓库 <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      <section className="duomei-skills-directory" aria-labelledby="duomei-skills-directory-title">
        <h2 id="duomei-skills-directory-title" className="duomei-skills-sr-only">技能目录</h2>
        <ol>
          {skills.map((skill) => (
            <li key={skill.name}>
              <a
                href={`${repositoryUrl}/tree/main/.agents/skills/${skill.name}`}
                target="_blank"
                rel="noreferrer"
              >
                <span className="duomei-skill-number" aria-hidden="true">{skill.number}</span>
                <span className="duomei-skill-copy">
                  <strong>{skill.title}</strong>
                  <small>{skill.name}</small>
                  <span>{skill.description}</span>
                  <span className="duomei-skill-tags" aria-label={`标签：${skill.tags.join("、")}`}>
                    {skill.tags.map((tag) => <i key={tag}>{tag}</i>)}
                  </span>
                </span>
                <span className="duomei-skill-open">查看 Skill <b aria-hidden="true">↗</b></span>
              </a>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
