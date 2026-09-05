// Two occupied floors / three eaves. Photo-guided close-view reconstruction.
// Overall height, footprint anchor and corrected river-side boundary are retained.
import * as THREE from 'three';
import { applyNight, dougong, plaque } from './kit.js';
import { ringAngle } from '../lib.js';
import { heritageMaterials } from '../surface-materials.js';
import { solidBox, member, metricUV } from './architectural.js';
import { tiledRoof } from './tiled-roof.js';

export function build({ F, TEX }) {
  const g = new THREE.Group(), P = heritageMaterials(TEX);
  const wood = P.wood, stone = P.dressedStone, wall = P.plaster, tile = P.roof;
  const shadow = new THREE.MeshStandardMaterial({ color: 0x19221e, roughness: .95 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x495950, roughness: .38, metalness: .05 });
  const rail = wood.clone(); rail.color.setHex(0xb4a697);
  const brass = new THREE.MeshStandardMaterial({ color: 0xa98d4f, metalness: .7, roughness: .48 });
  const add = (parent, w, h, d, m, x, y, z, b) => solidBox(parent, w, h, d, m, x, y, z, b);
  const box = (w, h, d, m, x, y, z, b) => add(g, w, h, d, m, x, y, z, b);

  function column(parent, x, y, z, height, radius = .28) {
    const shape = new THREE.CylinderGeometry(radius * .88, radius, height - .3, 20, 1);
    metricUV(shape, .6, 1);
    const post = new THREE.Mesh(shape, wood); post.position.set(x, y + .3 + (height - .3) / 2, z);
    parent.add(post);
    const profile = [[0,0],[radius*1.52,0],[radius*1.62,.06],[radius*1.48,.16],[radius*1.12,.25],[radius*1.06,.32],[0,.32]].map(p=>new THREE.Vector2(...p));
    const foot = new THREE.Mesh(metricUV(new THREE.LatheGeometry(profile, 16), .75), stone);
    foot.position.set(x, y, z); parent.add(foot);
  }

  function facade(half, y, height, ground = false) {
    for (let side = 0; side < 4; side++) {
      const face = new THREE.Group(); face.rotation.y = side * Math.PI / 2; g.add(face);
      const width = half * 2, bays = 5, step = width / bays;
      for (let i = 0; i <= bays; i++) column(face, -half + i * step, y, half, height, .22);
      add(face, width + .5, .34, .42, wood, 0, y + height - .22, half);
      add(face, width, .22, .29, wood, 0, y + height - 1.08, half + .025);
      for (let bay = 0; bay < bays; bay++) {
        const x = -half + (bay + .5) * step, w = step - .34;
        add(face, w, .65, .26, wall, x, y + height - .66, half - .16, .015);
        add(face, w, .52, .3, stone, x, y + .26, half - .15);
        const bottom = y + .59, opening = height - 1.78;
        // The glazing/back plane is behind solid jambs, sills and rails.
        add(face, w - .08, opening, .1, shadow, x, bottom + opening / 2, half - .34, 0);
        if (ground && side === 0 && bay === 2) {
          add(face, w - .4, .16, .48, stone, x, y + .16, half - .08);
          for (const sign of [-1, 1]) add(face, .52, opening - .12, .13, wood, x + sign * (w / 2 - .32), bottom + opening / 2, half - .15);
          continue;
        }
        const leaves = 3, leafWidth = (w - .18) / leaves;
        for (let j = 0; j < leaves; j++) {
          const cx = x - (w - .18) / 2 + (j + .5) * leafWidth;
          add(face, leafWidth - .035, opening - .06, .075, glass, cx, bottom + opening / 2, half - .29, 0);
          for (const sign of [-1, 1]) add(face, .065, opening, .13, wood, cx + sign * leafWidth / 2, bottom + opening / 2, half - .08, .008);
          add(face, leafWidth - .075, .67, .11, wood, cx, bottom + .34, half - .095);
          add(face, leafWidth - .17, .48, .045, rail, cx, bottom + .34, half - .018, .009);
          for (const yy of [.71, opening - .07]) add(face, leafWidth, .075, .13, wood, cx, bottom + yy, half - .07, .007);
          for (let v = 1; v < 4; v++) add(face, .028, opening - .95, .048, wood, cx - leafWidth / 2 + v * leafWidth / 4, bottom + (opening + .7) / 2, half - .125, 0);
          for (let row = 1; row < 6; row++) add(face, leafWidth - .07, .031, .046, wood, cx, bottom + .73 + row * (opening - .9) / 6, half - .1, 0);
          add(face, .035, .16, .045, brass, cx + leafWidth * .28, bottom + .91, half + .005, .004);
        }
      }
    }
  }

  function veranda(half, y, h, radius, pitch) {
    const n = Math.round(half * 2 / pitch);
    for (let side = 0; side < 4; side++) {
      const face = new THREE.Group(); face.rotation.y = side * Math.PI / 2; g.add(face);
      for (let i = 0; i < n; i++) column(face, -half + i * half * 2 / n, y, half, h, radius);
      add(face, half * 2 + .42, .42, .52, wood, 0, y + h - .18, half);
      add(face, half * 2 + .12, .23, .36, wood, 0, y + h - .7, half);
      for (let i = 0; i < n; i++) {
        const x = -half + (i + .5) * half * 2 / n;
        add(face, half * 2 / n - .16, .2, .22, rail, x, y + h - 1.02, half);
        for (const direction of [-1, 1]) member(face, [x + direction * .45, y + h - .94, half], [x + direction * .8, y + h - .42, half], .1, .15, wood);
      }
    }
    g.add(dougong({sides:4,rx:half,rz:half,y:y+h-.45,pitch:pitch/2,mats:{lacquer:wood},scale:.66}));
  }

  function balcony(half, y) {
    for (let side = 0; side < 4; side++) {
      const face = new THREE.Group(); face.rotation.y = side * Math.PI / 2; g.add(face);
      const n = 12, step = half * 2 / n;
      for (let i = 0; i <= n; i++) {
        const x = -half + i * step;
        add(face, .16, 1.1, .17, wood, x, y + .55, half, .015);
        add(face, .22, .11, .24, rail, x, y + 1.11, half, .025);
      }
      add(face, half * 2 + .18, .14, .23, rail, 0, y + 1.03, half, .025);
      add(face, half * 2, .11, .13, wood, 0, y + .18, half, .012);
      add(face, half * 2, .07, .12, wood, 0, y + .71, half, .01);
      for (let i = 0; i < n; i++) {
        const x = -half + (i + .5) * step;
        for (const dx of [-.28, .28]) add(face, .056, .51, .072, wood, x + dx, y + .45, half, .006);
        add(face, .57, .053, .072, wood, x, y + .51, half, .006);
        add(face, .055, .17, .072, wood, x, y + .615, half, .006);
      }
    }
  }

  // Individual dressed-stone steps and open terrace rails.
  box(29, 1.5, 29, P.paving, 0, .75, 0, .06);
  box(29.25, .14, 29.25, stone, 0, 1.48, 0, .025);
  for (let side = 0; side < 4; side++) {
    const face = new THREE.Group(); face.rotation.y = side * Math.PI / 2; g.add(face);
    for (let x = -14; x <= 14; x += 2) {
      if (side === 0 && Math.abs(x) < 5) continue;
      add(face, .23, 1.04, .23, stone, x, 2.08, 14, .025);
      add(face, .31, .13, .31, stone, x, 2.62, 14, .03);
    }
    const sections = side === 0 ? [[-9.35,9.3],[9.35,9.3]] : [[0,28]];
    for (const [x,w] of sections) {
      add(face, w, .16, .26, stone, x, 2.48, 14, .025);
      add(face, w, .13, .19, stone, x, 1.9, 14, .025);
    }
  }
  for (let i = 0; i < 9; i++) {
    const depth = 4.5 - i * .46;
    box(9, .17, depth, stone, 0, .085 + i * .17, 14.7 + depth / 2, .024);
    box(9.06, .055, .12, stone, 0, .17 + i * .17, 14.7 + depth, .012);
  }

  // Deep shaded colonnades reveal separate ceilings, beams, walls and glazing.
  facade(7.8, 1.57, 6.5, true);
  veranda(10, 1.57, 5.15, .32, 3.3);
  box(19.2, .22, 19.2, wood, 0, 7.1, 0);
  g.add(tiledRoof({rx:9.6,rz:9.6,h:1.65,ridge:8,over:1.7,curl:.58,y:7.05,material:tile,wood}));
  box(19.35, .34, 19.35, wood, 0, 8.38, 0);
  balcony(9.35, 8.55);
  facade(7.55, 8.55, 5.4);
  veranda(9, 8.55, 4.95, .285, 3);
  box(17.3, .16, 17.3, wood, 0, 13.72, 0);
  g.add(tiledRoof({rx:9,rz:9,h:1.78,ridge:7,over:2.1,curl:.73,y:13.82,material:tile,wood}));

  box(13.6, 2.35, 13.6, shadow, 0, 15.85, 0);
  veranda(7.7, 14.85, 2.5, .23, 2.6);
  const top = tiledRoof({rx:8.1,rz:8.1,h:4.1,ridge:7,over:2.8,curl:.92,y:17.15,material:tile,wood});
  top.rotation.y = Math.PI / 2; g.add(top);
  // Front/back gable, with layered masonry trim and vertical ventilation slats.
  const triangle = new THREE.Shape(); triangle.moveTo(-3.4,0); triangle.lineTo(3.4,0); triangle.lineTo(0,3.2); triangle.closePath();
  for (const side of [-1,1]) {
    const face = new THREE.Group(); face.position.set(0,18,side*4.7); if(side<0)face.rotation.y=Math.PI; g.add(face);
    const panel = new THREE.Mesh(metricUV(new THREE.ExtrudeGeometry(triangle,{depth:.2,bevelEnabled:true,bevelThickness:.035,bevelSize:.04,bevelSegments:1,steps:1}),.8),tile); face.add(panel);
    for (const direction of [-1,1]) {
      member(face,[direction*3.52,-.07,.26],[0,3.35,.26],.2,.23,stone);
      member(face,[direction*3.13,.11,.4],[0,3.05,.4],.075,.075,tile);
    }
    for (let i=-5;i<=5;i++) {
      const x=i*.33,height=2.5-Math.abs(x)*.8;
      add(face,.18,height,.08,shadow,x,height/2+.19,.235,0);
      add(face,.055,height+.08,.07,wood,x+.12,height/2+.19,.31,.006);
    }
  }

  // The small projecting front gable is visible in the supplied real photograph.
  const porch = tiledRoof({rx:2.9,rz:2.4,h:1.65,ridge:2.4,over:1.15,curl:.45,y:6.5,material:tile,wood});
  porch.rotation.y = Math.PI / 2; porch.position.z = 10.2; g.add(porch);
  for (const x of [-2.7,2.7]) column(g,x,1.57,11.5,4.9,.26);
  box(6.1,.36,.46,wood,0,6.15,11.5);
  for (const x of [-2.7,2.7]) {
    member(g,[x,5.45,11.5],[x-Math.sign(x)*.65,6.08,11.5],.12,.19,wood);
    g.add(dougong({sides:4,rx:.25,rz:.25,y:6.04,pitch:.7,mats:{lacquer:wood},scale:.45}).translateX(x).translateZ(11.5));
  }
  const sign = plaque('逍遥楼',3.8,.95); sign.position.set(0,5.46,11.78); g.add(sign);
  box(4.02,.095,.23,rail,0,5.97,11.78);
  box(4.02,.095,.23,rail,0,4.95,11.78);
  for(const x of [-1.97,1.97])box(.095,1.09,.23,rail,x,5.46,11.78);

  // Lights illuminate surfaces locally; opaque timber/stone do not self-glow.
  for(const [x,y,z,power] of [[0,6,11,175],[-7,10.5,8,120],[7,10.5,8,120]]) {
    const lamp = new THREE.PointLight(0xffce93,power,36,2); lamp.position.set(x,y,z); g.add(lamp);
  }
  g.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(g);
  g.scale.y = 21 / (bounds.max.y - bounds.min.y);
  g.position.set(F.xiaoyaolou.c[0],3,F.xiaoyaolou.c[1]);
  g.rotation.y = ringAngle(F.xiaoyaolou.o)-Math.PI/2;
  const root = new THREE.Group(); root.add(g);
  const podium = new THREE.Group(); podium.position.set(F.xiaoyaolou.c[0],0,F.xiaoyaolou.c[1]); podium.rotation.y=g.rotation.y; root.add(podium);
  add(podium,37,3,42,stone,0,1.5,0,.055);
  // Real mortar reveals and slightly rounded stone block edges on the podium.
  for(let side=0;side<4;side++) {
    const face=new THREE.Group(); face.rotation.y=side*Math.PI/2; podium.add(face);
    const length=side%2?42:37,halfDepth=side%2?18.5:21;
    for(let row=0;row<6;row++) {
      const count=row%2?18:17,step=length/count;
      for(let col=0;col<count;col++)add(face,step-.024,.472,.09,stone,-length/2+(col+.5)*step,.252+row*.493,halfDepth+.025,.013);
    }
    add(face,length+.13,.16,.31,stone,0,2.91,halfDepth,.025);
  }
  for(let i=0;i<12;i++)add(root,2.2,.25*(i+1),18,stone,F.xiaoyaolou.c[0]-43+i*2.2,.125*(i+1),F.xiaoyaolou.c[1],.025);
  root.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});
  root.name='逍遥楼 · 木构与青瓦近景';
  root.userData.top=24;
  root.userData.modelRevision='material-study-20260905';
  return root;
}
export const night=applyNight;
