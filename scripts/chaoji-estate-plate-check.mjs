import { existsSync, readFileSync } from "node:fs";

const js = readFileSync("public/atlas/chaoji/3d/main.js", "utf8");
if (js.includes("function estateView(")) throw new Error("wheat zoom estateView still present");
if (!js.includes("function buildEstateDetail(")) throw new Error("missing estate aerial builder");
if (!js.includes("estateAerialUrl")) throw new Error("missing estate plate url");
if (js.includes("addLandmark(estate")) throw new Error("estate still plants a single 3D landmark");

const plate = "public/atlas/chaoji/assets/cities/estates/aivernor-capital--house-aurelia.webp";
if (!existsSync(plate)) throw new Error("missing 奥瑞莉亚王宫 plate");
console.log("estate-plate-check ok");
