// @ts-check

import { rotate2D } from '../core/math.js';

/** @param {any} world @param {any} object */
function prepareTargets(world, object) {
  if (!object) return [];
  if (typeof world.prepareFadeObject === 'function') return world.prepareFadeObject(object);
  const targets = [];
  object.traverse?.((child) => {
    if (!child.isMesh || !child.material) return;
    const original = Array.isArray(child.material) ? child.material : [child.material];
    const cloned = original.map((material) => {
      const copy = material.clone();
      copy.transparent = material.transparent === true;
      return copy;
    });
    child.material = Array.isArray(child.material) ? cloned : cloned[0];
    for (const material of cloned) {
      targets.push({
        material,
        mesh: child,
        baseOpacity: Number.isFinite(material.opacity) ? material.opacity : 1,
        baseTransparent: material.transparent === true,
        baseDepthWrite: material.depthWrite !== false,
        baseDepthTest: material.depthTest !== false,
        baseCastShadow: child.castShadow !== false,
        baseReceiveShadow: child.receiveShadow !== false,
        baseVisible: child.visible !== false
      });
    }
  });
  return targets;
}

/** @param {any} descriptor @param {any} mesh */
function inferWallNormal(descriptor, mesh) {
  const worldPosition = mesh.getWorldPosition?.({ x: 0, y: 0, z: 0 }) ?? null;
  let localX = mesh.position?.x ?? 0;
  let localZ = mesh.position?.z ?? 0;
  if (worldPosition && Number.isFinite(worldPosition.x) && Number.isFinite(worldPosition.z)) {
    const local = rotate2D(
      worldPosition.x - descriptor.x,
      worldPosition.z - descriptor.z,
      -(descriptor.angle ?? 0)
    );
    localX = local.x;
    localZ = local.z;
  }
  if (Math.abs(localX) > Math.abs(localZ)) return { x: Math.sign(localX || 1), z: 0 };
  return { x: 0, z: Math.sign(localZ || 1) };
}

/**
 * Normalize runtime world APIs without rebuilding the renderer or map.
 * @param {import('./WorldBuilder.js').WorldBuilder} world
 */
export function installWorldReliabilityAdapter(world) {
  if (world.__reliabilityAdapterInstalled) return world;
  world.__reliabilityAdapterInstalled = true;

  const originalRegister = world.registerBuilding.bind(world);
  world.registerBuilding = (metadata, factory = null) => {
    if (factory) return originalRegister(metadata, factory);
    if (!metadata?.id) return null;
    if (world.buildings.has(metadata.id)) return world.buildings.get(metadata.id);

    const descriptor = {
      ...metadata,
      label: metadata.label ?? metadata.name ?? metadata.id,
      width: metadata.width ?? metadata.bounds?.width,
      depth: metadata.depth ?? metadata.bounds?.depth,
      angle: metadata.angle ?? 0,
      interiorZoom: metadata.interiorZoom ?? 0.9
    };
    const roofObject = metadata.roofGroup ?? metadata.roof ?? null;
    descriptor.roofFadeTargets = Array.isArray(metadata.roofFadeTargets)
      ? metadata.roofFadeTargets
      : prepareTargets(world, roofObject);

    if (Array.isArray(metadata.wallFadeSides)) {
      descriptor.wallFadeSides = metadata.wallFadeSides;
    } else {
      const wallMeshes = metadata.wallMeshes ?? metadata.walls ?? metadata.occluders ?? [];
      descriptor.wallFadeSides = wallMeshes.map((mesh) => ({
        normal: inferWallNormal(descriptor, mesh),
        targets: prepareTargets(world, mesh)
      }));
    }
    descriptor.occlusionTargets = descriptor.wallFadeSides.flatMap((side) => side.targets ?? []);
    descriptor.interiorVolumes = metadata.interiorVolumes ?? metadata.volumes ?? [{
      x: descriptor.x,
      z: descriptor.z,
      width: descriptor.width,
      depth: descriptor.depth,
      angle: descriptor.angle
    }];
    descriptor.group?.userData && (descriptor.group.userData.buildingId = descriptor.id);
    world.buildings.set(descriptor.id, descriptor);
    if (Array.isArray(metadata.lights)) world.warmLights.push(...metadata.lights);
    return descriptor;
  };

  const originalNearest = world.getNearestInteractable.bind(world);
  world.getNearestInteractable = (x, z, maxDistance = 3.4, options = {}) => {
    const excluded = new Set(options.excludeTypes ?? []);
    let nearest = null;
    let nearestDistance = maxDistance;
    for (const interactable of world.interactables) {
      if (excluded.has(interactable.type)) continue;
      if (interactable.type === 'container' && interactable.items.length === 0) continue;
      if (interactable.used || interactable.collected) continue;
      const distance = Math.hypot(x - interactable.x, z - interactable.z);
      if (distance < nearestDistance) {
        nearest = interactable;
        nearestDistance = distance;
      }
    }
    return nearest ?? (excluded.size ? null : originalNearest(x, z, maxDistance));
  };

  world.getWalkableHeight = (x, z) => world.terrain.getHeight(x, z);
  return world;
}
