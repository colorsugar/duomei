const svgNS = "http://www.w3.org/2000/svg";
const app = document.querySelector("#app");

app.innerHTML = `
<div class="shell">
  <aside class="side">
    <div class="eyebrow">SUPER CONTINENT · SATELLITE V1</div>
    <h1>超级大陆</h1>
    <p class="sub">卫星骨架第一版：大陆轮廓、七国色带、十二战略点可点。与奇幻大陆 V6 不是同一套世界。赤脊入侵走廊只留通道。</p>
    <div class="stat">
      <div><b>7</b><span>主要国家</span></div>
      <div><b>12</b><span>战略节点</span></div>
      <div><b>1</b><span>入侵走廊</span></div>
      <div><b>1</b><span>深渊海沟</span></div>
    </div>
    <div class="controls">
      <button type="button" id="reset">重置视图</button>
      <button type="button" id="toggle-labels">标签</button>
    </div>
    <div class="layers">
      <button type="button" class="layer" data-layer="countries">七国色带 <span>●</span></button>
      <button type="button" class="layer" data-layer="terrain">山脉 / 森林 <span>●</span></button>
      <button type="button" class="layer" data-layer="hydro">河流 / 海沟 <span>●</span></button>
      <button type="button" class="layer" data-layer="routes">贸易 / 军道 <span>●</span></button>
    </div>
    <div class="site-list" id="site-list"></div>
    <div class="legend">逻辑：板块 → 地形 → 气候 → 水文 → 生态 → 资源 → 魔法 → 城市 → 贸易 → 战争 → 国界。<br><br>拖动平移，滚轮缩放，点击地标或左侧名单。</div>
  </aside>
  <main class="map">
    <div class="hud">远景卫星骨架 · 拖动 / 滚轮 · 点战略点</div>
    <div class="zoom">
      <button type="button" id="zin" aria-label="放大">＋</button>
      <button type="button" id="zout" aria-label="缩小">－</button>
    </div>
    <svg id="svg" viewBox="0 0 1100 720" role="img" aria-label="超级大陆卫星骨架地图"></svg>
    <section class="info hidden" id="info" aria-live="polite">
      <button type="button" class="close" id="close" aria-label="关闭">×</button>
      <div class="tag" id="tag"></div>
      <h2 id="title"></h2>
      <div class="country" id="country"></div>
      <p id="desc"></p>
      <p id="reason"></p>
      <dl class="meta" id="meta"></dl>
    </section>
  </main>
</div>`;

const world = await fetch("./world.json").then((response) => response.json());
const svg = document.querySelector("#svg");
const info = document.querySelector("#info");
const siteList = document.querySelector("#site-list");

svg.innerHTML = `
<defs>
  <radialGradient id="ocean" cx="55%" cy="45%" r="75%">
    <stop offset="0%" stop-color="#1a5c6a"/>
    <stop offset="55%" stop-color="#0d3342"/>
    <stop offset="100%" stop-color="#061820"/>
  </radialGradient>
  <linearGradient id="land" x1="0" y1="0" x2="1" y2="1">
    <stop stop-color="#5f7358"/>
    <stop offset=".45" stop-color="#8f8a62"/>
    <stop offset="1" stop-color="#3f5548"/>
  </linearGradient>
  <filter id="soft"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity=".4"/></filter>
  <pattern id="grain" width="24" height="24" patternUnits="userSpaceOnUse">
    <path d="M0 18L10 8M10 24L24 10M16 24L24 16" stroke="#d8c792" stroke-opacity=".07"/>
  </pattern>
</defs>
<rect width="1100" height="720" fill="url(#ocean)"/>
<path d="M0 70C140 20 230 80 320 40C420 0 500 70 600 45C720 12 820 70 1100 30V0H0Z" fill="#2a6b7a" opacity=".16"/>
<g id="world">
  <path d="M150 190C200 120 290 95 380 115C450 70 530 90 590 130C650 105 720 130 760 175C830 175 880 230 905 280C980 290 1030 350 1040 420C1065 480 1020 545 950 565C970 640 890 680 810 655C740 710 650 690 585 650C515 710 425 700 360 655C295 695 220 660 195 600C120 600 80 530 110 470C55 420 55 340 110 295C70 245 100 200 150 190Z" fill="url(#land)" filter="url(#soft)"/>
  <path d="M165 200C250 140 320 160 390 125C470 95 540 140 610 135C700 125 760 185 820 210C880 250 950 310 980 380C990 440 945 505 885 525C850 575 790 610 725 590C650 630 575 600 515 575C440 630 360 590 320 545C250 555 190 500 220 445C160 400 175 340 210 310C165 270 130 225 165 200Z" fill="url(#grain)"/>
  <path class="ice" d="M260 40C360 5 470 10 560 35C630 15 700 45 740 90C640 120 520 95 440 110C350 95 280 115 260 40Z"/>
  <g id="countries"></g>
  <path id="corridor" class="danger" d="${world.corridor.path}"></path>
  <g id="terrain">
    <path class="mountain" d="M290 150l40-48 28 38 40-52 30 58 40-40 24 54 44-40 30 48 32-34 32 54-52 28-54-18-46 28-48-18-42 24-50-32Z"/>
    <path class="mountain" d="M560 200l30-40 30 36 28-56 30 52 34-36 28 56 38-46 32 52-46 26-52-16-46 22-42-16-42 20-36-24Z"/>
    <path class="forest" d="M190 430q40-75 95-40t75 70q-45 80-115 65t-55-95ZM270 510q58-60 110-18t18 76q-58 42-108 4t-20-62Z"/>
    <path class="forest" d="M700 360q65-58 125 10t42 108q-70 44-126-8t-41-110Z"/>
  </g>
  <g id="hydro">
    <path class="river" d="M330 155C360 230 340 295 375 350C400 395 445 430 475 500C495 545 525 580 580 605"/>
    <path class="river" d="M530 140C520 215 555 265 545 325C535 385 580 430 610 480C640 530 665 575 700 605"/>
    <path class="river" d="M720 210C685 275 685 325 715 370C745 415 770 450 790 495"/>
    <path class="trench" d="M900 545C955 505 1030 540 1080 605C1045 650 975 680 900 665C860 635 865 580 900 545Z"/>
  </g>
  <g id="routes">
    <path class="route" d="M360 340C430 320 500 325 560 310C620 295 680 290 720 290"/>
    <path class="route" d="M360 340C400 390 450 430 520 520"/>
    <path class="route" d="M720 290C760 330 800 360 850 370"/>
    <path class="route" d="M780 470C800 430 830 400 850 370"/>
    <path class="route" d="M390 185C420 240 450 300 480 340"/>
  </g>
  <g id="labels"></g>
</g>`;

const worldGroup = svg.querySelector("#world");
const countriesLayer = svg.querySelector("#countries");
const labelsLayer = svg.querySelector("#labels");

for (const state of world.states) {
  const path = document.createElementNS(svgNS, "path");
  path.setAttribute("d", state.path);
  path.setAttribute("fill", state.color);
  path.setAttribute("class", "country-fill");
  path.addEventListener("click", (event) => {
    event.stopPropagation();
    showState(state);
  });
  countriesLayer.appendChild(path);
}

for (const site of world.sites) {
  labelsLayer.appendChild(makeMarker(site));
  const button = document.createElement("button");
  button.type = "button";
  button.className = "site-btn";
  button.textContent = site.name;
  button.addEventListener("click", () => {
    showSite(site);
    focusSite(site);
  });
  siteList.appendChild(button);
}

function makeMarker(site) {
  const group = document.createElementNS(svgNS, "g");
  group.classList.add("marker");
  group.dataset.id = site.id;
  group.setAttribute("transform", `translate(${site.x} ${site.y})`);
  const kind = site.kind;
  const cls = /海|港|海峡/.test(kind)
    ? "port"
    : /要塞|渡口|通道|山口/.test(kind)
      ? "fort"
      : /核心|海沟|遗迹/.test(kind)
        ? "core"
        : "city";
  const radius = /核心|海沟|走廊/.test(kind) ? 8 : 6;
  group.innerHTML = `<circle r="${radius}" class="${cls}"/><text x="11" y="4">${site.name}</text>`;
  group.addEventListener("click", (event) => {
    event.stopPropagation();
    showSite(site);
  });
  return group;
}

function showState(state) {
  document.querySelector("#tag").textContent = "国家色带";
  document.querySelector("#title").textContent = state.name;
  document.querySelector("#country").textContent = state.coastal ? "拥有海岸线" : "内陆政体";
  document.querySelector("#desc").textContent = `核心地貌：${state.core}`;
  document.querySelector("#reason").textContent = "边界优先贴合山脉、河流、森林与海岸；战争与条约可造成飞地与走廊。";
  document.querySelector("#meta").innerHTML = "";
  info.classList.remove("hidden");
}

function showSite(site) {
  document.querySelector("#tag").textContent = site.kind;
  document.querySelector("#title").textContent = site.name;
  document.querySelector("#country").textContent = site.country;
  document.querySelector("#desc").textContent = site.function;
  document.querySelector("#reason").textContent = site.history;
  document.querySelector("#meta").innerHTML = [
    ["年代", site.age],
    ["风格", site.style],
    ["战争", site.wars],
    ["现状", site.currentState],
    ["人物", site.characters],
    ["传说", site.legend],
  ].map(([key, value]) => `<div><dt>${key}</dt><dd>${value}</dd></div>`).join("");
  info.classList.remove("hidden");
  for (const node of labelsLayer.querySelectorAll(".marker")) {
    node.classList.toggle("is-active", node.dataset.id === site.id);
  }
}

function focusSite(site) {
  const targetScale = Math.max(scale, 1.45);
  tx = 550 - site.x * targetScale;
  ty = 360 - site.y * targetScale;
  scale = targetScale;
  apply();
}

document.querySelector("#close").addEventListener("click", () => info.classList.add("hidden"));
svg.addEventListener("click", () => info.classList.add("hidden"));

let labelsOn = true;
const visible = { countries: true, terrain: true, hydro: true, routes: true };
document.querySelector("#toggle-labels").addEventListener("click", () => {
  labelsOn = !labelsOn;
  labelsLayer.style.display = labelsOn ? "" : "none";
});
for (const button of document.querySelectorAll(".layer")) {
  button.addEventListener("click", () => {
    const key = button.dataset.layer;
    visible[key] = !visible[key];
    button.classList.toggle("off", !visible[key]);
    const layer = svg.querySelector(`#${key}`);
    if (layer) layer.style.display = visible[key] ? "" : "none";
    if (key === "countries") {
      const corridor = svg.querySelector("#corridor");
      if (corridor) corridor.style.display = visible.countries ? "" : "none";
    }
  });
}

let scale = 1;
let tx = 0;
let ty = 0;
function apply() {
  worldGroup.setAttribute("transform", `translate(${tx} ${ty}) scale(${scale})`);
}
function zoomAt(factor, cx = 550, cy = 360) {
  const next = Math.max(0.75, Math.min(3.4, scale * factor));
  tx = cx - (cx - tx) * (next / scale);
  ty = cy - (cy - ty) * (next / scale);
  scale = next;
  apply();
}
document.querySelector("#zin").addEventListener("click", () => zoomAt(1.25));
document.querySelector("#zout").addEventListener("click", () => zoomAt(0.8));
document.querySelector("#reset").addEventListener("click", () => {
  scale = 1;
  tx = 0;
  ty = 0;
  apply();
});
svg.addEventListener("wheel", (event) => {
  event.preventDefault();
  const rect = svg.getBoundingClientRect();
  zoomAt(
    event.deltaY < 0 ? 1.12 : 0.89,
    ((event.clientX - rect.left) / rect.width) * 1100,
    ((event.clientY - rect.top) / rect.height) * 720,
  );
}, { passive: false });

let dragging = false;
let startX = 0;
let startY = 0;
let originX = 0;
let originY = 0;
svg.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".marker")) return;
  dragging = true;
  startX = event.clientX;
  startY = event.clientY;
  originX = tx;
  originY = ty;
  svg.classList.add("dragging");
  svg.setPointerCapture(event.pointerId);
});
svg.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  const rect = svg.getBoundingClientRect();
  tx = originX + ((event.clientX - startX) / rect.width) * 1100;
  ty = originY + ((event.clientY - startY) / rect.height) * 720;
  apply();
});
svg.addEventListener("pointerup", () => {
  dragging = false;
  svg.classList.remove("dragging");
});

const boot = new URLSearchParams(location.search).get("entry");
if (boot) {
  const site = world.sites.find((item) => item.id === boot);
  if (site) {
    showSite(site);
    focusSite(site);
  }
}
