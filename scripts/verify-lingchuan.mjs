import './prepare-lingchuan.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {parseCampusGLB} from '../public/lingchuan/load-glb.js';
const report=[];
for(const region of ['whole','courtyard','academic','athletics']){
 const source=new URL('../public/lingchuan/models/lingchuan-'+region+'.glb',import.meta.url),bytes=await fs.readFile(source),gz=await fs.readFile(source.pathname+'.gz');assert.deepEqual(gunzipSync(gz),bytes,'Gzip roundtrip');
 let decoded=0,closed=0;
 const asset=await parseCampusGLB(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),{decodeImage:async(bytes)=>{const png=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);assert.equal(png.getUint32(0),0x89504e47);decoded++;return {width:png.getUint32(16),height:png.getUint32(20),close(){closed++;}};}});
 let meshes=0,tris=0,verts=0;asset.root.updateMatrixWorld(true);asset.root.traverse(o=>{if(!o.isMesh)return;meshes++;const g=o.geometry;verts+=g.attributes.position.count;tris+=(g.index?.count??g.attributes.position.count)/3;assert.ok(g.attributes.position.count>0);for(const n of g.attributes.position.array)assert.ok(Number.isFinite(n));for(const m of [o.material])if(m.map){assert.equal(m.map.flipY,false);assert.ok(m.map.image.width>0);}});
 assert.ok(tris>10000&&tris<600000,'Geometry budget exceeded');assert.ok(meshes<200,'Draw call budget exceeded');asset.dispose();asset.dispose();assert.equal(closed,decoded,'Decoded images not released');
 report.push({region,meshes,triangles:tris,vertices:verts,textures:decoded,rawBytes:bytes.length,downloadBytes:gz.length,dispose:'pass'});
}
console.log(JSON.stringify(report,null,2));

const manifest=JSON.parse(await fs.readFile(new URL('../public/lingchuan/deployment.json',import.meta.url)));
const {createHash}=await import('node:crypto');
for(const file of manifest.files){const bytes=await fs.readFile(new URL('../public/lingchuan/'+file.path,import.meta.url));assert.equal(bytes.length,file.size);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,file.path);}
console.log('Campus manifest and four decoded models verified.');

if(process.argv.includes('--production')){
 const origin='https://duomei.site/lingchuan/';
 for(const file of manifest.files){
  const response=await fetch(new URL(file.path,origin),{signal:AbortSignal.timeout(60000)});
  assert.equal(response.status,200,file.path);
  const bytes=Buffer.from(await response.arrayBuffer());
  const expected=file.path.endsWith('.gz')&&bytes.subarray(0,4).toString()==='glTF'?manifest.files.find(x=>x.path===file.path.slice(0,-3)):file;
  assert.equal(createHash('sha256').update(bytes).digest('hex'),expected.sha256,'Production '+file.path);
 }
 console.log('Production campus: every runtime asset matches the reviewed source.');
}
