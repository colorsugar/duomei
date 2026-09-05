import * as THREE from 'three';
import {GLTFLoader} from '../vendor/three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from '../vendor/three/addons/loaders/DRACOLoader.js';
let library, detailed=true;
export function setTreeDetail(value){detailed=value;}
export function treeLibrary(){
 if(!library){const draco=new DRACOLoader();draco.setDecoderPath(new URL('../vendor/three/addons/libs/draco/gltf/',import.meta.url).href);draco.setWorkerLimit(1);const loader=new GLTFLoader().setDRACOLoader(draco);
 library=loader.loadAsync(new URL('../assets/blender/urban-vegetation.glb',import.meta.url).href).then(g=>{
  const models=new Map();g.scene.updateMatrixWorld(true);g.scene.traverse(o=>{if(o.userData.species&&o.userData.lod!==undefined){const parts=[];o.traverse(m=>{if(m.isMesh){m.material.side=THREE.DoubleSide;m.material.roughness=1;parts.push({geometry:m.geometry,material:m.material});}});models.set(o.userData.species+':'+o.userData.lod,parts);}});draco.dispose();return models;
 }).catch(e=>{library=null;throw e;});}return library;
}
// A small number of GPU instance batches per 120 m cell. Near branches and
// opaque leaf surfaces share the silhouette/palette of the lower detail meshes.
export async function createUrbanTrees(points){
 const assets=await treeLibrary(),root=new THREE.Group(),cells=new Map(),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),p=new THREE.Vector3(),scale=new THREE.Vector3();
 for(const point of points){const key=Math.floor(point[0]/120)+':'+Math.floor(point[1]/120);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(point);}
 for(const pts of cells.values()){
  const cx=pts.reduce((s,p)=>s+p[0],0)/pts.length,cz=pts.reduce((s,p)=>s+p[1],0)/pts.length,cy=pts.reduce((s,p)=>s+p[2],0)/pts.length;
  const lod=new THREE.LOD();lod.position.set(cx,cy,cz);lod.autoUpdate=false;
  for(let level=0;level<3;level++){
   const layer=new THREE.Group();
   for(const species of ['camphor','banyan']){
    const selected=pts.filter((p)=>p[4]===species || (!p[4]&&species==='camphor'));if(!selected.length)continue;
    for(const part of assets.get(species+':'+level)||[]){
     const mesh=new THREE.InstancedMesh(part.geometry,part.material,selected.length);
     selected.forEach(([x,z,y,size],i)=>{p.set(x-cx,y-cy,z-cz);q.setFromAxisAngle(up,(x*3.13+z*.37)%6.28);scale.set(size,size,size);matrix.compose(p,q,scale);mesh.setMatrixAt(i,matrix);});
     mesh.castShadow=false;mesh.receiveShadow=false;mesh.userData.sharedTree=true;mesh.computeBoundingSphere();layer.add(mesh);
    }
   }
   lod.addLevel(layer,[0,90,270][level],.16);
  }
  root.add(lod);
 }
 root.name='Blender 分枝乔木';
 root.userData.update=camera=>{root.updateWorldMatrix(true,false);for(const lod of root.children){lod.levels[1].distance=detailed?90:0;lod.updateWorldMatrix(true,false);lod.update(camera);}};
 root.userData.dispose=()=>{root.traverse(o=>{if(o.isInstancedMesh)o.dispose();});root.removeFromParent();};
 return root;
}
