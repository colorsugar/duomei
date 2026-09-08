import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const dir=resolve('public/yunyou/assets/xiaoyaolou');
const manifest=JSON.parse(await readFile(dir+'/manifest.json','utf8'));
assert.deepEqual(Object.keys(manifest.assets),['xiaoyaolou']);
const entry=manifest.assets.xiaoyaolou,bytes=await readFile(dir+'/'+entry.file);
assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);
const asset=JSON.parse(gunzipSync(bytes));
assert.equal(asset.object.userData.architectureRevision,'xiaoyaolou-blender-2');
assert.equal(asset.object.userData.lightingRevision,'xiaoyaolou-night-1');
assert.equal(asset.object.userData.ambientOcclusion.engine,'Blender Cycles');
for(const image of asset.images){assert.match(image.url,/^textures\/[a-f0-9]{16}\.webp$/);assert.ok((await readFile(dir+'/'+image.url)).length>0);}
assert.ok(asset.materials.some(m=>m.name.includes('architectural LED')&&m.userData.prebuiltNight.night.intensity>1));
console.log('PASS: isolated Xiaoyao asset, SHA-256, texture files, baked geometry and day/night states');
if(process.env.YUNYOU_VERIFY_ORIGIN){
 const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
 const browser=await chromium.launch({channel:'msedge',headless:true});const output=resolve('tmp/xiaoyaolou-release');await mkdir(output,{recursive:true});
 try{for(const [name,width,height]of [['desktop',1440,1000],['phone',390,844]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:name==='phone',reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.YUNYOU_VERIFY_ORIGIN+'/yunyou/index.html?standalone=1');
  await page.waitForFunction(()=>window.__gl&&document.querySelector('#loading').hidden,null,{timeout:90000});
  if(await page.locator('#panel-toggle').getAttribute('aria-expanded')!=='true')await page.locator('#panel-toggle').click();
  await page.locator('#place-search').fill('逍遥楼');
  await page.locator('[data-id="xiaoyaolou"]').click();
  await page.waitForFunction(()=>{const o=__gl.scene.getObjectByName('detail:xiaoyaolou');return o?.visible&&o.userData.architectureRevision==='xiaoyaolou-blender-2';},null,{timeout:90000});
  if(await page.locator('#panel-toggle').getAttribute('aria-expanded')==='true')await page.locator('#panel-toggle').click();
  await page.locator('#card-close').click();
  await page.mouse.move(width*.5,height*.5);await page.mouse.wheel(0,-500);await page.waitForTimeout(500);
  await page.screenshot({path:resolve(output,name+'-day.png')});
  const position=await page.evaluate(()=>__gl.camera.position.toArray());
  await page.mouse.move(width*.60,height*.55);await page.mouse.down();await page.mouse.move(width*.74,height*.6,{steps:10});await page.mouse.up();
  assert.ok(await page.evaluate(p=>__gl.camera.position.toArray().some((x,i)=>Math.abs(x-p[i])>.05),position));
  if(await page.locator('#panel-toggle').getAttribute('aria-expanded')!=='true')await page.locator('#panel-toggle').click();
  if(await page.locator('#map-settings').getAttribute('open')===null)await page.locator('#map-settings summary').click();
  await page.locator('#t-night').click();
  await page.waitForFunction(()=>__gl.scene.getObjectByName('detail:xiaoyaolou')?.userData.nativeNight===true);
  await page.waitForFunction(()=>__gl.scene.background.getHexString()==='0d1830',null,{timeout:45000});
  await page.locator('#panel-toggle').click();
  const lit=await page.evaluate(()=>{let found=false;__gl.scene.getObjectByName('detail:xiaoyaolou').traverse(o=>{if(o.material?.name.includes('architectural LED')&&o.material.emissiveIntensity>1)found=true;});return found;});
  assert.ok(lit);assert.deepEqual(errors,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:resolve(output,name+'-night.png')});await page.close();console.log('PASS '+name+': real model selection, new Xiaoyao, rotation, night light and layout');
 }}finally{await browser.close();}
}
