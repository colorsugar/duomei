// Map-style wheel handling for OrbitControls, matching Apple / Google Maps on a Mac:
//   trackpad two-finger scroll  -> pan across the ground
//   trackpad pinch (ctrl+wheel) -> zoom (left to OrbitControls)
//   Option/Alt + two-finger scroll -> rotate (horizontal) and tilt (vertical)
//   mouse wheel (line-sized notches) -> zoom (left to OrbitControls)
// Registered in the capture phase so it runs before OrbitControls' own wheel listener.
import * as THREE from 'three';

export function installTrackpadGestures(controls, { onChange = () => {} } = {}) {
  const el = controls.domElement, camera = controls.object;
  const offset = new THREE.Vector3(), right = new THREE.Vector3(), forward = new THREE.Vector3(), spherical = new THREE.Spherical();
  let lastWheelAt = 0, trackpadRun = false;
  // A wheel "run" (events < 150 ms apart) keeps the classification of its first event, so inertial
  // scrolling that decays to tiny integer deltas is not misread as a mouse notch mid-gesture.
  const looksLikeTrackpad = (e) => e.deltaMode === 0 && (e.deltaX !== 0 || !Number.isInteger(e.deltaY) || Math.abs(e.deltaY) < 40);

  el.addEventListener('wheel', (e) => {
    if (!controls.enabled || e.ctrlKey) return; // pinch-zoom: let OrbitControls dolly
    const now = performance.now();
    if (now - lastWheelAt > 150) trackpadRun = looksLikeTrackpad(e);
    lastWheelAt = now;
    if (!trackpadRun) return; // real mouse wheel: keep zooming
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.altKey) {
      offset.copy(camera.position).sub(controls.target);
      spherical.setFromVector3(offset);
      spherical.theta -= e.deltaX * 0.004 * controls.rotateSpeed;
      spherical.phi = THREE.MathUtils.clamp(spherical.phi + e.deltaY * 0.004 * controls.rotateSpeed, controls.minPolarAngle, controls.maxPolarAngle);
      offset.setFromSpherical(spherical);
      camera.position.copy(controls.target).add(offset);
    } else {
      // Pan on the ground plane; scale with distance so the map moves with the fingers at any zoom.
      const distance = camera.position.distanceTo(controls.target);
      const unitsPerPixel = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / el.clientHeight;
      right.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
      forward.set(-right.z, 0, right.x); // ground-plane "down the screen" (towards the camera)
      const move = right.multiplyScalar(e.deltaX * unitsPerPixel * controls.panSpeed).add(forward.multiplyScalar(e.deltaY * unitsPerPixel * controls.panSpeed));
      camera.position.add(move);
      controls.target.add(move);
    }
    controls.update();
    onChange();
  }, { capture: true, passive: false });
}
