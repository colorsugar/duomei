import * as THREE from 'three';
import {stoneBridge} from '../expanded-landmarks.js';
import {heritageMaterials} from '../surface-materials.js';
export function build({lm,M,TEX}) {
 // Only the bridge replaces its overview model. Its rails and arch bevels are
 // built on demand; the city-wide view keeps the compact bridge instead.
 const H=heritageMaterials(TEX);
 return stoneBridge({...M,stone:H.stone||M.stone,wood:H.wood||M.wood},true);
}
