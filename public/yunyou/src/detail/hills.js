// Lookouts and a stepped approach add scale to the existing OSM mountain meshes.
import * as THREE from 'three';
import { kitMats, polyRoof, colonnade, balustrade, applyNight } from './kit.js';
export const mode='augment';
export function build({TEX,lm}) {
  const K=kitMats(TEX),g=new THREE.Group();
  // Positions are interpretive details anchored to the source peaks, not survey data.
  const peak=lm.id==='diecaishan'?[543,73,-1132]:[598,63,-398];
  const pavilion=new THREE.Group();
  const base=new THREE.Mesh(new THREE.CylinderGeometry(3.6,3.9,.5,6),K.stoneBase);base.position.y=.25;pavilion.add(base);
  if (lm.id === 'diecaishan') pavilion.add(colonnade({sides:6,rx:2.5,y:.5,h:2.8,r:.13,mats:K}));
  if (lm.id === 'diecaishan') pavilion.add(polyRoof({sides:6,rx:2.6,h:1.8,over:.65,curl:.3,y:3.3,mats:{roof:K.tile,ridge:K.ridge,eaveWood:K.woodDark}}));
  if (lm.id === 'fuboshan') pavilion.add(balustrade({sides:6,rx:3.3,y:.5,mats:K,post:1,panel:.55,pitch:1.5}));
  pavilion.position.set(peak[0],peak[1]-.6,peak[2]);g.add(pavilion);
  g.userData.top=peak[1]+5;return g;
}
export const night=applyNight;
