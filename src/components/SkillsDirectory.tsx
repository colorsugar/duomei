import { Link } from "react-router-dom";
import "../skills.css";

export const skills = [
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

export const skillsRepositoryUrl = "https://github.com/colorsugar/agent-skills";

export function SkillsDirectory({ headingId }: { headingId: string }) {
  return (
    <section className="duomei-skills-directory" aria-labelledby={headingId}>
      <h2 id={headingId} className="duomei-skills-sr-only">技能目录</h2>
      <ol>
        {skills.map((skill) => (
          <li key={skill.name}>
            <a
              href={`${skillsRepositoryUrl}/tree/main/.agents/skills/${skill.name}`}
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
  );
}

export function HomeSkillsSection() {
  return (
    <section className="duomei-home-skills" id="skills" aria-labelledby="duomei-home-skills-title">
      <header className="duomei-home-skills-heading">
        <h2 id="duomei-home-skills-title">技能</h2>
        <div>
          <p>把真正走过的流程，整理成可以继续使用的 Skill。</p>
          <Link to="/skills">查看技能页 <span aria-hidden="true">→</span></Link>
        </div>
      </header>
      <SkillsDirectory headingId="duomei-home-skills-directory-title" />
    </section>
  );
}
