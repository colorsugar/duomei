import * as THREE from 'three';
import { EYE, RADIUS, STEP, heightAt, resolveXZ } from './colliders.js';

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export class Player {
  constructor(camera, dom, world) {
    this.camera = camera;
    this.dom = dom;
    this.world = world;
    this.spawn = { pos: new THREE.Vector3(0, 0, 22), yaw: Math.PI, pitch: -0.08 };
    this.pos = this.spawn.pos.clone();
    this.yaw = this.spawn.yaw;
    this.pitch = this.spawn.pitch;
    this.vel = new THREE.Vector3();
    this.bob = 0;
    this.locked = false;
    this.keys = new Set();
    this.walkSpeed = 2.55;
    this.runSpeed = 5.1;
    this.sensitivity = 0.0022;
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._wish = new THREE.Vector3();
    this.touchMove = { active: false, id: null, x: 0, y: 0 };
    this.touchLook = { active: false, id: null, x: 0, y: 0 };
    /** Playwright / 脚本：允许不锁定指针也读 keys */
    this.forceKeys = false;
    this._bind();
    this.applyCamera(0);
  }

  _bind() {
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * this.sensitivity;
      this.pitch -= e.movementY * this.sensitivity;
      this.pitch = clamp(this.pitch, -1.1, 0.95);
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
      if (!this.locked) this.keys.clear();
    });
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code) && this.locked) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    this.dom.addEventListener('click', () => {
      if (!this.locked && !('ontouchstart' in window)) this.lock();
    });
  }

  bindTouch(joystickEl, lookEl) {
    joystickEl.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      this.touchMove = { active: true, id: t.identifier, x: t.clientX, y: t.clientY };
    }, { passive: false });
    joystickEl.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== this.touchMove.id) continue;
        const dx = t.clientX - this.touchMove.x;
        const dy = t.clientY - this.touchMove.y;
        this.touchMove.x = t.clientX;
        this.touchMove.y = t.clientY;
        this._joyX = clamp((this._joyX || 0) + dx * 0.004, -1, 1);
        this._joyY = clamp((this._joyY || 0) + dy * 0.004, -1, 1);
      }
    }, { passive: false });
    const endJoy = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.touchMove.id) {
          this.touchMove.active = false;
          this._joyX = 0;
          this._joyY = 0;
        }
      }
    };
    joystickEl.addEventListener('touchend', endJoy);
    joystickEl.addEventListener('touchcancel', endJoy);

    lookEl.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      this.touchLook = { active: true, id: t.identifier, x: t.clientX, y: t.clientY };
    }, { passive: false });
    lookEl.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== this.touchLook.id) continue;
        const dx = t.clientX - this.touchLook.x;
        const dy = t.clientY - this.touchLook.y;
        this.touchLook.x = t.clientX;
        this.touchLook.y = t.clientY;
        this.yaw -= dx * this.sensitivity * 2.2;
        this.pitch -= dy * this.sensitivity * 2.2;
        this.pitch = clamp(this.pitch, -1.1, 0.95);
      }
    }, { passive: false });
    const endLook = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.touchLook.id) this.touchLook.active = false;
      }
    };
    lookEl.addEventListener('touchend', endLook);
    lookEl.addEventListener('touchcancel', endLook);
  }

  lock() {
    this.dom.requestPointerLock?.();
  }

  teleport(pos, yaw, pitch) {
    this.pos.set(pos[0], pos[1] ?? this.world.feetY(pos[0], pos[2]), pos[2]);
    if (yaw !== undefined) this.yaw = yaw;
    if (pitch !== undefined) this.pitch = pitch;
    this.vel.set(0, 0, 0);
    this.applyCamera(0);
  }

  applyCamera(moving) {
    const amp = Math.min(moving / this.walkSpeed, 1) * 0.012;
    this.bob += 0.016 * moving * 6;
    const eye = this.pos.y + EYE + Math.sin(this.bob) * amp;
    this.camera.position.set(this.pos.x, eye, this.pos.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  update(dt) {
    const k = this.keys;
    const sprint = k.has('ShiftLeft') || k.has('ShiftRight');
    const speed = sprint ? this.runSpeed : this.walkSpeed;
    let fwd = 0;
    let side = 0;
    if (this.locked || this.forceKeys) {
      if (k.has('KeyW') || k.has('ArrowUp')) fwd += 1;
      if (k.has('KeyS') || k.has('ArrowDown')) fwd -= 1;
      if (k.has('KeyD') || k.has('ArrowRight')) side += 1;
      if (k.has('KeyA') || k.has('ArrowLeft')) side -= 1;
    }
    if (this.touchMove.active) {
      fwd += -(this._joyY || 0);
      side += this._joyX || 0;
    }

    this._forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this._right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this._wish
      .copy(this._forward)
      .multiplyScalar(fwd)
      .addScaledVector(this._right, side);
    if (this._wish.lengthSq() > 1e-6) this._wish.normalize().multiplyScalar(speed);

    const accel = this._wish.lengthSq() > 1e-6 ? 13 : 16;
    const a = 1 - Math.exp(-accel * dt);
    this.vel.x += (this._wish.x - this.vel.x) * a;
    this.vel.z += (this._wish.z - this.vel.z) * a;

    const feetY = this.world.feetY(this.pos.x, this.pos.z);
    const stepX = this.vel.x * dt;
    const stepZ = this.vel.z * dt;
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(stepX), Math.abs(stepZ)) / 0.18));
    for (let i = 0; i < n; i++) {
      this.pos.x += stepX / n;
      resolveXZ(this.pos, this.world.colliders, feetY);
      this.pos.z += stepZ / n;
      resolveXZ(this.pos, this.world.colliders, feetY);
    }

    const targetY = heightAt(this.pos.x, this.pos.z, this.world.platforms, this.pos.y);
    this.pos.y += (targetY - this.pos.y) * (1 - Math.exp(-18 * dt));

    const moving = Math.hypot(this.vel.x, this.vel.z);
    this.applyCamera(moving);
  }

  /** Playwright / 脚本：模拟按键（无需 pointer lock） */
  simulateInput({ w = 0, a = 0, s = 0, d = 0, dt = 1 / 60, steps = 1, yaw, pitch } = {}) {
    if (yaw !== undefined) this.yaw = yaw;
    if (pitch !== undefined) this.pitch = pitch;
    const codes = [];
    if (w) codes.push('KeyW');
    if (a) codes.push('KeyA');
    if (s) codes.push('KeyS');
    if (d) codes.push('KeyD');
    this.forceKeys = true;
    for (const c of codes) this.keys.add(c);
    for (let i = 0; i < steps; i++) this.update(dt);
    for (const c of codes) this.keys.delete(c);
    this.forceKeys = false;
    return { y: this.camera.position.y, x: this.pos.x, z: this.pos.z, feetY: this.pos.y };
  }
}
