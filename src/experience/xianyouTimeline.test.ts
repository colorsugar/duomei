import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Node's strip-types test runner needs the explicit source extension.
import {swordTimeline,orientationOffset} from './xianyouTimeline.ts';
test('sword poses return to rest and can be scrubbed in either direction',()=>{
 for(const p of [0,.38,.7,1])assert.ok(Math.abs(swordTimeline(p).attack)<1e-10);
 const forward=Array.from({length:101},(_,i)=>swordTimeline(i/100));
 const backward=Array.from({length:101},(_,i)=>swordTimeline((100-i)/100)).reverse();
 assert.deepEqual(forward,backward);
 assert.ok(forward.some(p=>p.attack>.1));assert.ok(forward.some(p=>p.attack<-.1));
 for(const p of forward){assert.ok(p.reveal>=0&&p.reveal<=1);assert.ok(Math.abs(p.attack)<=.18);}
 assert.equal(forward[100].reveal,1);
});
test('sensor uses initial grip and clamps extreme rotation',()=>{
 assert.deepEqual(orientationOffset(50,12,50,12,0),{x:0,y:0});
 assert.deepEqual(orientationOffset(180,90,50,12,0),{x:1,y:1});
 const landscape=orientationOffset(50,34,50,12,90);
 assert.ok(Math.abs(landscape.x)<1e-10);assert.equal(landscape.y,-1);
});
