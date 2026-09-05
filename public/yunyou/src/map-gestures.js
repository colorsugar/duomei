import { TOUCH } from 'three';

// OrbitControls is the sole camera/zoom owner. Keep a two-finger sequence
// latched until every finger leaves, including cancel/capture-loss paths.
export function installMapGestures(controls, canvas, host = window) {
  controls.enableZoom = true;
  controls.zoomToCursor = false;
  controls.enableDamping = false;
  controls.rotateSpeed = .35;
  controls.zoomSpeed = .55;
  controls.panSpeed = .55;
  controls.screenSpacePanning = false;
  controls.touches.ONE = TOUCH.ROTATE;
  controls.touches.TWO = TOUCH.DOLLY_PAN;
  const pointers = new Map();
  let multi = false, cancelling = false;
  const down = e => {
    if (e.pointerType !== 'touch' || !controls.enabled) return;
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.size > 1) { multi = true; controls.touches.ONE = null; }
    if (pointers.size === 2) { const [a,b]=[...pointers.values()]; if(Math.hypot(a[0]-b[0],a[1]-b[1])<12)controls.touches.TWO=null; }
    if (pointers.size > 2) controls.touches.TWO = null;
  };
  const move = e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    // Reject coincident contacts before the native dolly ratio can divide by 0.
    if (pointers.size === 2) {
      const [a,b] = [...pointers.values()];
      if (Math.hypot(a[0]-b[0], a[1]-b[1]) < 12) e.stopImmediatePropagation();
    }
  };
  const up = e => {
    pointers.delete(e.pointerId);
    if (!pointers.size) {
      multi = false;
      controls.touches.ONE = TOUCH.ROTATE;
      controls.touches.TWO = TOUCH.DOLLY_PAN;
    }
  };
  const cancel = id => canvas.dispatchEvent(new host.PointerEvent('pointercancel', { pointerId:id, pointerType:'touch', bubbles:true }));
  const lost = e => { if (pointers.has(e.pointerId) && !cancelling) cancel(e.pointerId); };
  const blur = () => { cancelling=true; for (const id of [...pointers.keys()]) cancel(id); cancelling=false; };
  for (const [name,fn] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['lostpointercapture',lost]]) canvas.addEventListener(name,fn,true);
  host.addEventListener('blur',blur);
  return {
    get active() { return pointers.size > 0; },
    get multi() { return multi; },
    dispose() {
      blur(); host.removeEventListener('blur',blur);
      for (const [name,fn] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['lostpointercapture',lost]]) canvas.removeEventListener(name,fn,true);
    },
  };
}
