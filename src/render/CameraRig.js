// @ts-check

import * as THREE from '../core/three.js';
import { clamp, damp, dampAngle } from '../core/math.js';

export class CameraRig {
  /** @param {HTMLElement} viewport */
  constructor(viewport) {
    this.viewport = viewport;
    this.camera = new THREE.OrthographicCamera(-20, 20, 12, -12, 0.1, 300);
    this.target = new THREE.Vector3();
    this.smoothedTarget = new THREE.Vector3();
    this.yaw = -Math.PI * 0.25;
    this.targetYaw = this.yaw;
    this.zoom = 32.5;
    this.targetZoom = 32.5;
    this.height = 37;
    this.framingOffset = 12;
    this.lateralFraming = 3.2;
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.tempPoint = new THREE.Vector3();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(viewport);
    this.resize();
  }

  resize() {
    const aspect = Math.max(0.5, this.viewport.clientWidth / Math.max(1, this.viewport.clientHeight));
    const halfHeight = this.zoom * 0.5;
    this.camera.left = -halfHeight * aspect;
    this.camera.right = halfHeight * aspect;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
  }

  /** @param {{ x: number, y?: number, z: number }} target @param {number} dt */
  update(target, dt) {
    this.yaw = dampAngle(this.yaw, this.targetYaw, 8, dt);
    this.zoom = damp(this.zoom, this.targetZoom, 10, dt);
    this.height = damp(this.height, this.targetZoom * 1.14, 8, dt);
    const forwardX = -Math.sin(this.yaw);
    const forwardZ = -Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);
    const framing = this.framingOffset * (this.zoom / 32.5);
    const lateral = this.lateralFraming * (this.zoom / 32.5);
    this.target.set(
      target.x + forwardX * framing + rightX * lateral,
      target.y ?? 0,
      target.z + forwardZ * framing + rightZ * lateral
    );
    this.smoothedTarget.x = damp(this.smoothedTarget.x, this.target.x, 7.5, dt);
    this.smoothedTarget.y = damp(this.smoothedTarget.y, this.target.y + 1.35, 7.5, dt);
    this.smoothedTarget.z = damp(this.smoothedTarget.z, this.target.z, 7.5, dt);
    this.resize();

    const distance = this.zoom * 1.04;
    const horizontal = distance * 0.9;
    this.camera.position.set(
      this.smoothedTarget.x + Math.sin(this.yaw) * horizontal,
      this.smoothedTarget.y + this.height,
      this.smoothedTarget.z + Math.cos(this.yaw) * horizontal
    );
    this.camera.lookAt(this.smoothedTarget);
    this.camera.updateMatrixWorld();
  }

  /** @param {number} direction */
  rotate(direction) {
    this.targetYaw += direction * Math.PI * 0.5;
  }

  /** @param {number} delta */
  changeZoom(delta) {
    this.targetZoom = clamp(this.targetZoom + delta * 2.5, 23, 42);
  }

  /** @param {{ x: number, y: number }} pointer @param {number} height */
  pointerToGround(pointer, height = 0) {
    this.groundPlane.constant = -height;
    this.raycaster.setFromCamera(pointer, this.camera);
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, this.tempPoint);
    return hit ? { x: hit.x, y: hit.y, z: hit.z } : null;
  }

  /** Convert local input axes to world motion using the camera orientation. */
  inputToWorld(x, z) {
    const forwardX = -Math.sin(this.yaw);
    const forwardZ = -Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);
    const worldX = rightX * x + forwardX * -z;
    const worldZ = rightZ * x + forwardZ * -z;
    const length = Math.hypot(worldX, worldZ) || 1;
    return { x: worldX / length, z: worldZ / length };
  }

  dispose() {
    this.resizeObserver.disconnect();
  }
}
