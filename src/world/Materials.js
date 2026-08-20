// @ts-check

import * as THREE from '../core/three.js';
import { Random } from '../core/Random.js';

/** @param {string} kind @param {number} seed */
function makeTexture(kind, seed = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const random = new Random(seed);

  const palettes = {
    ground: ['#414236', '#34372f', '#555044'],
    asphalt: ['#292c2b', '#202322', '#3a3a35'],
    wood: ['#755236', '#543824', '#8d6744'],
    roof: ['#303944', '#242b34', '#46505b'],
    wall: ['#9c927d', '#837866', '#b0a58e'],
    metal: ['#667076', '#4c555b', '#7b8588']
  };
  const palette = palettes[kind] ?? palettes.ground;
  context.fillStyle = palette[0];
  context.fillRect(0, 0, 256, 256);

  for (let index = 0; index < 3800; index += 1) {
    const size = random.range(0.5, kind === 'ground' ? 3.5 : 2.2);
    context.globalAlpha = random.range(0.035, 0.22);
    context.fillStyle = random.pick(palette);
    context.fillRect(random.range(0, 256), random.range(0, 256), size, size);
  }

  context.globalAlpha = 0.22;
  context.strokeStyle = palette[2];
  if (kind === 'wood') {
    for (let x = 0; x < 256; x += 32) {
      context.beginPath();
      context.moveTo(x + random.range(-2, 2), 0);
      context.lineTo(x + random.range(-2, 2), 256);
      context.stroke();
    }
  } else if (kind === 'roof') {
    for (let y = 0; y < 256; y += 24) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(256, y);
      context.stroke();
    }
  } else if (kind === 'asphalt') {
    context.globalAlpha = 0.2;
    for (let index = 0; index < 16; index += 1) {
      context.beginPath();
      let x = random.range(0, 256);
      let y = random.range(0, 256);
      context.moveTo(x, y);
      for (let step = 0; step < 5; step += 1) {
        x += random.range(-14, 14);
        y += random.range(5, 18);
        context.lineTo(x, y);
      }
      context.stroke();
    }
  }
  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export class MaterialLibrary {
  constructor() {
    this.textures = {
      ground: makeTexture('ground', 11),
      asphalt: makeTexture('asphalt', 22),
      wood: makeTexture('wood', 33),
      roof: makeTexture('roof', 44),
      wall: makeTexture('wall', 55),
      metal: makeTexture('metal', 66)
    };
    this.textures.ground?.repeat.set(18, 18);
    this.textures.asphalt?.repeat.set(8, 18);
    this.textures.wood?.repeat.set(3, 3);
    this.textures.roof?.repeat.set(4, 4);
    this.textures.wall?.repeat.set(3, 2);
    this.textures.metal?.repeat.set(3, 3);

    this.ground = new THREE.MeshStandardMaterial({ map: this.textures.ground, vertexColors: true, roughness: 1, metalness: 0 });
    this.asphalt = new THREE.MeshStandardMaterial({ map: this.textures.asphalt, color: 0x69706a, roughness: 0.96, metalness: 0.03 });
    this.roadLine = new THREE.MeshStandardMaterial({ color: 0xd2ba77, roughness: 0.85, emissive: 0x2a210f, emissiveIntensity: 0.18 });
    this.wall = new THREE.MeshStandardMaterial({ map: this.textures.wall, color: 0xb5aa93, roughness: 0.93 });
    this.darkWall = new THREE.MeshStandardMaterial({ map: this.textures.wall, color: 0x586067, roughness: 0.96 });
    this.wood = new THREE.MeshStandardMaterial({ map: this.textures.wood, color: 0xa07852, roughness: 0.94 });
    this.darkWood = new THREE.MeshStandardMaterial({ map: this.textures.wood, color: 0x4f3929, roughness: 0.97 });
    this.roof = new THREE.MeshStandardMaterial({ map: this.textures.roof, color: 0x4b5864, roughness: 0.93 });
    this.metal = new THREE.MeshStandardMaterial({ map: this.textures.metal, color: 0x8b9290, roughness: 0.72, metalness: 0.46 });
    this.rust = new THREE.MeshStandardMaterial({ color: 0x743e2c, roughness: 0.9, metalness: 0.26 });
    this.glass = new THREE.MeshPhysicalMaterial({ color: 0x9fc1c8, roughness: 0.18, metalness: 0.08, transmission: 0.12, transparent: true, opacity: 0.62 });
    this.windowGlow = new THREE.MeshStandardMaterial({ color: 0xffd285, emissive: 0xffa23d, emissiveIntensity: 2.3, roughness: 0.7 });
    this.foliage = new THREE.MeshStandardMaterial({ color: 0x1c3826, roughness: 0.96 });
    this.foliageLight = new THREE.MeshStandardMaterial({ color: 0x31482c, roughness: 0.96 });
    this.trunk = new THREE.MeshStandardMaterial({ color: 0x4a3325, roughness: 1 });
    this.rock = new THREE.MeshStandardMaterial({ color: 0x4a4b46, roughness: 1 });
    this.dirt = new THREE.MeshStandardMaterial({ color: 0x4b3628, roughness: 1 });
    this.redPaint = new THREE.MeshStandardMaterial({ color: 0x7d2c27, roughness: 0.78, metalness: 0.08 });
    this.bluePaint = new THREE.MeshStandardMaterial({ color: 0x294a66, roughness: 0.78, metalness: 0.08 });
    this.whitePaint = new THREE.MeshStandardMaterial({ color: 0xc3beb0, roughness: 0.85 });
    this.black = new THREE.MeshStandardMaterial({ color: 0x111514, roughness: 0.83 });
  }
}
