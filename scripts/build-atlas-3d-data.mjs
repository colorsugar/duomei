// Trims docs/dalu/atlas-data.json into the entity list the 3D atlas runtime loads.
// Coordinates stay in the source's 3256×1024 canvas; galleries point at the exported WebP files.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = JSON.parse(readFileSync(join(root, "docs/dalu/atlas-data.json"), "utf8"));
const assets = join(root, "public/atlas/v6/assets");

const PROFILE_LABELS = {
  geography: "地理",
  importance: "分量",
  routes: "往来",
  customs: "风俗",
  conflicts: "冲突",
  formation: "成因",
  history: "历史",
  economy: "生计",
  landscape: "景观",
  limits: "边界",
  story: "传说",
};

function webp(src) {
  const file = src.replace(/^\/assets\//, "").replace(/\.png$/, ".webp");
  if (!existsSync(join(assets, file))) throw new Error(`missing export ${file}`);
  return `/atlas/v6/assets/${file}`;
}

function gallery(id) {
  return (source.galleries[id]?.images ?? []).map((image) => ({
    src: webp(image.src),
    title: image.title,
    caption: image.caption ?? "",
    view: image.view ?? "",
  }));
}

function facts(profile = {}) {
  return Object.entries(profile)
    .filter(([, value]) => typeof value === "string" && value.trim())
    .map(([key, value]) => ({ label: PROFILE_LABELS[key] ?? key, text: value }));
}

function entity(kind, item, extra = {}) {
  return {
    id: item.id,
    kind,
    name: item.name,
    shortName: item.shortName ?? item.name,
    tag: item.tag ?? "",
    color: item.color ?? "#e6c886",
    category: item.category ?? "",
    x: Math.round(item.x),
    y: Math.round(item.y),
    description: item.description ?? "",
    detail: item.detail ?? "",
    facts: facts(item.profile),
    gallery: gallery(item.id),
    ...extra,
  };
}

const byId = new Map();
const entities = [
  ...source.kingdoms.map((item) => entity("kingdom", item)),
  ...source.cities.map((item) => entity("city", item, { country: item.country })),
  ...source.sites.map((item) => entity("site", item)),
  ...source.legends.map((item) => entity("legend", item)),
];
for (const item of entities) byId.set(item.id, item);

// Palaces and manors share their parent's anchor; fan them out slightly so labels never stack.
const siblings = new Map();
for (const item of source.architecture) {
  const parent = byId.get(item.parent) ?? byId.get(item.related?.[0]);
  if (!parent) throw new Error(`architecture ${item.id} has no anchor`);
  const index = siblings.get(parent.id) ?? 0;
  siblings.set(parent.id, index + 1);
  const angle = -Math.PI / 3 + index * (Math.PI / 3);
  entities.push({
    id: item.id,
    kind: "architecture",
    name: item.name,
    shortName: item.name.split(" · ").pop(),
    tag: item.kind,
    color: "#f1d9a6",
    category: "宫堡庄园",
    x: Math.round(parent.x + Math.cos(angle) * 34),
    y: Math.round(parent.y + Math.sin(angle) * 34),
    description: item.where,
    detail: item.story,
    facts: [
      { label: "营造", text: item.formation },
      { label: "往来", text: item.routes },
    ],
    gallery: item.images.map((id) => ({ src: webp(`/assets/architecture/${id}.png`), title: item.name, caption: "", view: "" })),
    parent: parent.id,
  });
}

const output = {
  sourceCommit: source.sourceCommit ?? "",
  canvas: { width: 3256, height: 1024 },
  tiles: [
    { src: "/atlas/v6/assets/seven-kingdoms-basemap.webp", x: 0, y: 0, width: 1536, height: 1024 },
    { src: "/atlas/v6/assets/eastern-continent.webp", x: 1720, y: 0, width: 1536, height: 1024 },
  ],
  entities,
};

writeFileSync(join(root, "public/atlas/v6/3d/data.json"), JSON.stringify(output));
console.log(`atlas 3d data: ${entities.length} entities, ${entities.reduce((n, e) => n + e.gallery.length, 0)} plates`);
