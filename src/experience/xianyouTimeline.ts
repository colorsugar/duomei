export const clamp01=(value:number)=>Math.max(0,Math.min(1,value));
export const smooth=(from:number,to:number,value:number)=>{const t=clamp01((value-from)/(to-from));return t*t*(3-2*t);};
/** Two bounded, reversible strikes. Scrolling never starts an uninterruptible video. */
export function swordTimeline(progress:number){
  const p=clamp01(progress);
  const first=Math.sin(smooth(.08,.38,p)*Math.PI);
  const second=Math.sin(smooth(.40,.70,p)*Math.PI);
  return {attack:first*.18-second*.12,flash:first*.45+second*.6,reveal:smooth(.65,.98,p),dolly:smooth(.04,.8,p)};
}
/** Calibrate at the visitor's natural grip; clamp to a comfortable photo-parallax range. */
export function orientationOffset(beta:number,gamma:number,baseBeta:number,baseGamma:number,angle:number){
  const x=(gamma-baseGamma)/22,y=(beta-baseBeta)/22,r=angle*Math.PI/180;
  return {x:Math.max(-1,Math.min(1,x*Math.cos(r)+y*Math.sin(r))),y:Math.max(-1,Math.min(1,y*Math.cos(r)-x*Math.sin(r)))};
}
