// Every home section owns a hue. The CSS custom properties live in src/colorful.css
// (--accent-<id>, --accent-<id>-ink, --accent-<id>-soft); this table is the shared index
// for components that need the list (hero palette dots, section progress, cursor).
export type SectionAccentId =
  | "home"
  | "zaobao"
  | "notes"
  | "kuaihuo"
  | "guyu"
  | "xunji"
  | "dalu"
  | "yunyou"
  | "color"
  | "weiyan"
  | "skills";

export type SectionAccent = {
  id: SectionAccentId;
  label: string;
  english: string;
};

export const sectionAccents: SectionAccent[] = [
  { id: "home", label: "首页", english: "Home" },
  { id: "zaobao", label: "早报", english: "Morning" },
  { id: "notes", label: "小记", english: "Notes" },
  { id: "kuaihuo", label: "快活", english: "Joy" },
  { id: "guyu", label: "故语", english: "Old Words" },
  { id: "xunji", label: "寻迹", english: "Traces" },
  { id: "dalu", label: "大陆", english: "Continent" },
  { id: "yunyou", label: "云游", english: "Wander" },
  { id: "color", label: "颜色", english: "Color" },
  { id: "weiyan", label: "微言", english: "Few Words" },
  { id: "skills", label: "Skill", english: "Skill" },
];

export const accentVar = (id: SectionAccentId) => `var(--accent-${id})`;
