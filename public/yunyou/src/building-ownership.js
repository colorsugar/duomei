import {PARK_BUILDINGS} from '../data/modelled-footprints.js';
export {PARK_BUILDINGS};
export function parkBuildingOwner(ring){
 const xs=ring.map(p=>p[0]),zs=ring.map(p=>p[1]);const box=[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)];
 return PARK_BUILDINGS.find(b=>b.box.every((v,i)=>Math.abs(v-box[i])<3))?.region||null;
}
