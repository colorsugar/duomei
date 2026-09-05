import * as THREE from 'three';
import {GLTFLoader} from '../vendor/three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from '../vendor/three/addons/loaders/DRACOLoader.js';
import {DetailStream} from './detail-stream.js';
import {mergeStatic} from './mesh-utils.js';
import {createUrbanTrees} from './urban-trees.js';
import {compactStaticModel} from './static-model.js';
const PARKS={qixing:['qixing','putuoshan','yueyashan','luotuoshan','qixiasi'],chuanshan:['chuanshan','tashan'],xishan:['xishan','yinshan'],yushan:['yushan']};
const EXISTING=['xiangbishan','xiaoyaolou','rita','yueta','wangcheng','fuboshan','diecaishan','gunanmen','mulongta','jiefangqiao','shelita','huaqiao'];
export function installBlenderModels({scene,camera,landmarks,models,detail,pickables,invalidate,paused,mobile,onRegions=()=>{}}){
 const loader=new GLTFLoader(),draco=new DRACOLoader();draco.setDecoderPath(new URL('../vendor/three/addons/libs/draco/gltf/',import.meta.url).href);draco.setWorkerLimit(1);loader.setDRACOLoader(draco);
 const sharedSources=new Map();
 const addons=[];let addonIndex=0,addonPending=false;const addonIds=['city-night','park-furnishings','city-ground'];
 let enabled=true,night=0,far=null,farPending=false,nextFarAttempt=0,lastVisibility='';const group=new THREE.Group();scene.add(group);
 const find=id=>landmarks.find(l=>l.id===id);
 const key=lm=>EXISTING.includes(lm?.id)?lm.id:lm?.region&&PARKS[lm.region]?lm.region:null;
 const tint=root=>{root.traverse(o=>{if(!o.isMesh||o.userData.sharedTree)return;for(const mat of [].concat(o.material)){
  const role=mat.userData.role||'',name=mat.name;let strength=mat.userData.nightStrength??(role==='wood'?.06:role==='roof'?.025:role==='paint'?.04:0);
  if(/bark|leaf|叶|树|岩|草/.test(name))strength=0;
  if(!mat.userData.originalEmission)mat.userData.originalEmission=mat.emissive.clone();
  if(mat.userData.nightStrength)mat.emissive.copy(mat.userData.originalEmission);else mat.emissive.setHex(0xffbd72);mat.emissiveIntensity=strength*night;
  if(mat.userData.nightStrength==null&&(role==='wood'||role==='roof'))mat.emissiveMap=mat.map;
 }});};
 async function load(id){
  const gltf=await loader.loadAsync(new URL('../assets/blender/'+id+'.glb',import.meta.url).href),root=gltf.scene;
  // Share decoded pixels across distance levels while keeping independent UV transforms.
  root.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material))for(const value of Object.values(m))if(value?.isTexture){
   const index=gltf.parser.associations.get(value)?.textures;const definition=gltf.parser.json.textures?.[index];const uri=gltf.parser.json.images?.[definition?.source]?.uri;
   if(uri){if(sharedSources.has(uri))value.source=sharedSources.get(uri);else sharedSources.set(uri,value.source);}
  }});
  root.updateMatrixWorld(true);const subgroups=new Map(),meshes=[],treePoints=[];root.traverse(o=>{if(o.isMesh)meshes.push(o);});
  for(const o of meshes){
   let tag=o.userData.lmId;for(let p=o.parent;!tag&&p;p=p.parent)tag=p.userData.lmId;
   const lm=find(tag)||find(id);if(!lm&&!addonIds.includes(id))continue;
   if(id==='city-night'||id==='city-ground'){o.castShadow=false;o.receiveShadow=id==='city-ground';continue;}
   const names=[].concat(o.material).map(m=>m.name);
   if(names.some(n=>n.includes('乔木叶簇'))){const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();o.matrixWorld.decompose(p,q,s);treePoints.push([p.x,p.z,p.y-s.y*.25,s.y*.85,treePoints.length%4?'camphor':'banyan']);o.removeFromParent();continue;}
   if(names.includes('树皮')){o.removeFromParent();continue;}
   let sub=subgroups.get(lm.id);if(!sub){sub=new THREE.Group();sub.userData.lmId=lm.id;root.add(sub);subgroups.set(lm.id,sub);}sub.attach(o);
   for(const mat of [].concat(o.material)){mat.envMapIntensity=.55;mat.side=/leaf|叶/.test(mat.name)?THREE.DoubleSide:THREE.FrontSide;}
  }
  for(const [tag,sub] of subgroups){mergeStatic(sub);sub.traverse(o=>{if(o.isMesh){o.userData.lm=find(tag);o.castShadow=!/bark|leaf|叶|树/.test(String(o.material?.name));o.receiveShadow=true;pickables.push(o);}});}
  if(treePoints.length){const trees=await createUrbanTrees(treePoints);root.add(trees);root.userData.trees=trees;}
  root.userData.parts=subgroups;root.userData.replaces=PARKS[id]||[id];root.userData.key=id;root.visible=false;group.add(root);root.userData.compaction=compactStaticModel(root);tint(root);invalidate(true);return root;
 }
 const release=(_id,root)=>{
  const removed=new Set();root.traverse(o=>removed.add(o));root.removeFromParent();for(let i=pickables.length-1;i>=0;i--)if(removed.has(pickables[i]))pickables.splice(i,1);
  root.userData.trees?.userData.dispose();
  const geos=new Set(),materials=new Set(),textures=new Set();root.traverse(o=>{if(o.userData.sharedTree)return;if(o.geometry)geos.add(o.geometry);if(o.isInstancedMesh)o.dispose();for(const m of [].concat(o.material||[]))materials.add(m);});for(const m of materials){for(const v of Object.values(m))if(v?.isTexture)textures.add(v);m.dispose();}for(const g of geos)g.dispose();for(const t of textures)t.dispose();invalidate(true);
 };
 const stream=new DetailStream({limit:mobile()?2:3,paused:()=>!enabled||paused()||farPending||addonPending,load,dispose:release});

 return {stream,supports:id=>EXISTING.includes(id)||Object.values(PARKS).some(ids=>ids.includes(id)),get enabled(){return enabled;},get ready(){return !!far||nextFarAttempt>0;},
 setNight(value){if(Math.abs(night-value)<.001)return;night=value;if(far)tint(far);for(const root of addons)tint(root);for(const e of stream.cache.values())tint(e.value);},
 setEnabled(value){enabled=value;group.visible=value;if(!value){onRegions(new Set());stream.update([]);for(const model of Object.values(models))model.visible=true;}invalidate(true);},
 update(active){
  if(enabled&&far&&!farPending&&!addonPending&&!paused()&&addonIndex<addonIds.length){
   addonPending=true;const id=addonIds[addonIndex++];
   load(id).then(root=>{root.visible=true;addons.push(root);invalidate();}).catch(e=>console.warn('Landscape fixtures',e)).finally(()=>{addonPending=false;});
  }
  if(enabled&&!far&&!farPending&&!paused()&&performance.now()>nextFarAttempt){farPending=true;load('city-far').then(root=>{far=root;invalidate(true);}).catch(e=>{nextFarAttempt=performance.now()+15000;console.warn('City model overview',e);}).finally(()=>farPending=false);}
  const wanted=[];
  if(enabled){const k=key(active);if(k&&(!EXISTING.includes(k)||camera.position.distanceTo(new THREE.Vector3(active.x,active.h||0,active.z))<550))wanted.push(k);
   const nearest=landmarks.filter(l=>EXISTING.includes(l.id)).map(l=>[l,Math.hypot(camera.position.x-l.x,camera.position.z-l.z,camera.position.y-(l.h||0))]).sort((a,b)=>a[1]-b[1]);
   for(const [lm,d] of nearest)if(d<270)wanted.push(lm.id);
   for(const id of Object.keys(PARKS)){const lm=find(id);if(lm&&Math.hypot(camera.position.x-lm.x,camera.position.z-lm.z)<1200&&camera.position.y<1100)wanted.push(id);}}
  stream.limit=mobile()?2:3;stream.update(wanted);
 },applyVisibility(){
  const regions=new Set();
  if(far){far.visible=enabled;for(const [id,part] of far.userData.parts){part.visible=true;if(enabled&&models[id])models[id].visible=false;}}
  for(const [id,e] of stream.cache){const show=enabled&&stream.wanted.includes(id);e.value.visible=show;if(show){if(PARKS[id])regions.add(id);e.value.userData.trees?.userData.update(camera);for(const old of e.value.userData.replaces){if(models[old])models[old].visible=false;if(detail.cache[old])detail.cache[old].visible=false;if(far?.userData.parts.has(old))far.userData.parts.get(old).visible=false;}}}
 const visibility=[enabled,!!far,...[...stream.cache].filter(([,e])=>e.value.visible).map(([id])=>id).sort()].join('|');
 if(visibility!==lastVisibility){lastVisibility=visibility;invalidate(true);}
 onRegions(regions);
 }};
}
