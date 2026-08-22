// @ts-check

import { Random } from '../core/Random.js';
import { MISSION_DEFINITIONS } from '../data/missions.js';

const BUILDINGS = [
  { id: 'food-mart', x: 19, z: -5, width: 25, depth: 15, rotation: 0, tone: '#3c4644' },
  { id: 'west-home', x: -27, z: -10, width: 13, depth: 10, rotation: 0, tone: '#4d5149' },
  { id: 'east-home', x: 39, z: 24, width: 14, depth: 10.5, rotation: Math.PI, tone: '#4b504b' },
  { id: 'north-home', x: -38, z: 29, width: 12.5, depth: 9.5, rotation: Math.PI, tone: '#444c49' },
  { id: 'old-barn', x: -24, z: 39, width: 17, depth: 15, rotation: Math.PI, tone: '#55473d' }
];

export class MinimapRenderer {
  /** @param {{ state: import('../state/GameState.js').GameState, world: import('../world/WorldBuilder.js').WorldBuilder, building: import('../game/BuildingSystem.js').BuildingSystem, missions: import('../game/MissionSystem.js').MissionSystem, enemies: import('../entities/EnemySystem.js').EnemySystem }} options */
  constructor(options) {
    Object.assign(this, options);
    this.random = new Random(0x4d415031);
    this.forestPoints = this.createForestPoints();
    this.groundMarks = this.createGroundMarks();
  }

  createForestPoints() {
    const points = [];
    for (let attempt = 0; attempt < 900 && points.length < 235; attempt += 1) {
      const edge = this.random.chance(0.68);
      const x = edge ? this.random.pick([-1, 1]) * this.random.range(45, 86) : this.random.range(-84, 84);
      const z = edge ? this.random.range(-84, 84) : this.random.pick([-1, 1]) * this.random.range(47, 86);
      if (Math.abs(x) < 10 || Math.abs(z - 8) < 8) continue;
      if (Math.hypot(x - 19, z + 5) < 25 || Math.hypot(x + 27, z + 10) < 18) continue;
      points.push({ x, z, size: this.random.range(0.65, 1.45), tone: this.random.int(0, 2) });
    }
    return points;
  }

  createGroundMarks() {
    const marks = [];
    for (let index = 0; index < 82; index += 1) {
      marks.push({
        x: this.random.range(-84, 84),
        z: this.random.range(-84, 84),
        radius: this.random.range(1.2, 4.8),
        alpha: this.random.range(0.018, 0.055)
      });
    }
    return marks;
  }

  /** @param {HTMLCanvasElement} canvas @param {boolean} large */
  draw(canvas, large) {
    const context = canvas.getContext('2d');
    if (!context) return;
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const view = large
      ? { x: 0, z: 0, rangeX: 96, rangeZ: 82 }
      : { x: this.state.player.x, z: this.state.player.z, rangeX: 46, rangeZ: 46 };
    const margin = large ? 24 : 7;
    const radius = Math.min(width, height) * 0.5 - margin;
    const bounds = large
      ? { left: margin, top: margin, width: width - margin * 2, height: height - margin * 2 }
      : { left: centerX - radius, top: centerY - radius, width: radius * 2, height: radius * 2 };
    const map = (x, z) => ({
      x: centerX + ((x - view.x) / view.rangeX) * bounds.width * 0.5,
      y: centerY + ((z - view.z) / view.rangeZ) * bounds.height * 0.5
    });
    const worldLength = (value, axis = 'x') => value / (axis === 'x' ? view.rangeX : view.rangeZ) * (axis === 'x' ? bounds.width : bounds.height) * 0.5;

    context.clearRect(0, 0, width, height);
    context.save();
    if (large) {
      this.roundRect(context, bounds.left, bounds.top, bounds.width, bounds.height, 11);
    } else {
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    }
    context.clip();

    this.drawGround(context, bounds, centerX, centerY, radius, large);
    this.drawGrid(context, map, view, large);
    this.drawForest(context, map, worldLength, view, large);
    this.drawRoads(context, map, worldLength, large);
    this.drawTerrainEdits(context, map, worldLength);
    this.drawBuildings(context, map, worldLength, large);
    this.drawStructures(context, map, worldLength, large);
    this.drawMissionMarkers(context, map, worldLength, large);
    this.drawPoi(context, map, large);
    this.drawEnemies(context, map, worldLength, view, large);
    this.drawPlayer(context, map, worldLength, large);
    this.drawFog(context, bounds, centerX, centerY, radius, large);
    context.restore();

    this.drawFrame(context, bounds, centerX, centerY, radius, large);
  }

  drawGround(context, bounds, centerX, centerY, radius, large) {
    const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, large ? Math.max(bounds.width, bounds.height) * 0.65 : radius);
    gradient.addColorStop(0, '#3f4539');
    gradient.addColorStop(0.55, '#30382f');
    gradient.addColorStop(1, '#171e19');
    context.fillStyle = gradient;
    context.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);
    for (const mark of this.groundMarks) {
      const x = bounds.left + ((mark.x + 86) / 172) * bounds.width;
      const y = bounds.top + ((mark.z + 86) / 172) * bounds.height;
      context.fillStyle = `rgba(174,155,112,${mark.alpha})`;
      context.beginPath();
      context.ellipse(x, y, mark.radius * (large ? 1.4 : 0.75), mark.radius * (large ? 0.72 : 0.42), mark.x * 0.03, 0, Math.PI * 2);
      context.fill();
    }
  }

  drawGrid(context, map, view, large) {
    if (!large) return;
    context.save();
    context.strokeStyle = 'rgba(218,210,185,.08)';
    context.lineWidth = 1;
    context.setLineDash([3, 7]);
    for (let coordinate = -80; coordinate <= 80; coordinate += 20) {
      let a = map(coordinate, -90);
      let b = map(coordinate, 90);
      context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke();
      a = map(-96, coordinate);
      b = map(96, coordinate);
      context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke();
    }
    context.setLineDash([]);
    context.fillStyle = 'rgba(223,215,194,.35)';
    context.font = '600 10px Arial Narrow, sans-serif';
    context.textAlign = 'left';
    const label = map(-88, -72);
    context.fillText(`SECTOR ${Math.round((view.x + 96) / 24)}-${Math.round((view.z + 82) / 20)}`, label.x, label.y);
    context.restore();
  }

  drawForest(context, map, worldLength, view, large) {
    const tones = ['#1d2a21', '#263328', '#303a2c'];
    for (const tree of this.forestPoints) {
      if (!large && (Math.abs(tree.x - view.x) > view.rangeX || Math.abs(tree.z - view.z) > view.rangeZ)) continue;
      const point = map(tree.x, tree.z);
      const size = Math.max(1.2, worldLength(tree.size) * (large ? 0.9 : 1.1));
      context.fillStyle = tones[tree.tone];
      context.beginPath();
      context.arc(point.x, point.y, size, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = 'rgba(7,12,9,.42)';
      context.beginPath();
      context.arc(point.x + size * 0.25, point.y + size * 0.3, size * 0.48, 0, Math.PI * 2);
      context.fill();
    }
  }

  drawRoads(context, map, worldLength, large) {
    const drawRoad = (x1, z1, x2, z2, widthWorld) => {
      const a = map(x1, z1);
      const b = map(x2, z2);
      context.lineCap = 'butt';
      context.strokeStyle = '#56574f';
      context.lineWidth = Math.max(6, worldLength(widthWorld));
      context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke();
      context.strokeStyle = '#292e2b';
      context.lineWidth = Math.max(4, worldLength(widthWorld - 1.8));
      context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke();
      context.strokeStyle = 'rgba(204,181,112,.62)';
      context.lineWidth = large ? 1.6 : 1.1;
      context.setLineDash(large ? [9, 11] : [5, 7]);
      context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke();
      context.setLineDash([]);
    };
    drawRoad(0, -92, 0, 92, 14.4);
    drawRoad(-67, 8, 61, 8, 12.7);

    const tracks = [[-60, 36, -33, 36], [-31, 39, -12, 42], [40, 27, 65, 42]];
    context.strokeStyle = 'rgba(121,106,75,.55)';
    context.lineWidth = large ? 6 : 3;
    context.setLineDash([3, 5]);
    for (const [x1, z1, x2, z2] of tracks) {
      const a = map(x1, z1);
      const b = map(x2, z2);
      context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke();
    }
    context.setLineDash([]);
  }

  drawTerrainEdits(context, map, worldLength) {
    for (const edit of this.state.terrainEdits) {
      const point = map(edit.x, edit.z);
      const radius = Math.max(2, worldLength(edit.radius));
      context.fillStyle = 'rgba(35,25,19,.82)';
      context.beginPath(); context.arc(point.x, point.y, radius, 0, Math.PI * 2); context.fill();
      context.strokeStyle = 'rgba(157,117,76,.72)';
      context.lineWidth = Math.max(1, radius * 0.15);
      context.beginPath(); context.arc(point.x, point.y, radius * 1.07, 0, Math.PI * 2); context.stroke();
    }
  }

  drawBuildings(context, map, worldLength, large) {
    for (const building of BUILDINGS) {
      const point = map(building.x, building.z);
      const width = Math.max(4, worldLength(building.width));
      const depth = Math.max(4, worldLength(building.depth, 'z'));
      context.save();
      context.translate(point.x, point.y);
      context.rotate(-building.rotation);
      context.fillStyle = 'rgba(0,0,0,.38)';
      context.fillRect(-width * 0.5 + 2, -depth * 0.5 + 2, width, depth);
      context.fillStyle = building.tone;
      context.fillRect(-width * 0.5, -depth * 0.5, width, depth);
      context.strokeStyle = 'rgba(224,214,190,.36)';
      context.lineWidth = large ? 1.4 : 1;
      context.strokeRect(-width * 0.5, -depth * 0.5, width, depth);
      context.fillStyle = building.id === 'food-mart' ? '#9c4a31' : '#222a28';
      context.fillRect(-width * 0.5, -depth * 0.5, width, Math.max(1.5, depth * 0.13));
      context.restore();
    }

    const pumps = [[14.5, 7.6], [20.4, 7.6]];
    context.fillStyle = '#8b4d38';
    for (const [x, z] of pumps) {
      const point = map(x, z);
      const size = large ? 4.5 : 3;
      context.fillRect(point.x - size * 0.5, point.y - size * 0.5, size, size);
    }
  }

  drawStructures(context, map, worldLength, large) {
    for (const structure of this.building.structures.values()) {
      const point = map(structure.x, structure.z);
      if (structure.kind === 'campfire') {
        const radius = Math.max(4, worldLength(1.4));
        const glow = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius * 2.8);
        glow.addColorStop(0, 'rgba(255,171,73,.75)');
        glow.addColorStop(1, 'rgba(255,129,40,0)');
        context.fillStyle = glow;
        context.beginPath(); context.arc(point.x, point.y, radius * 2.8, 0, Math.PI * 2); context.fill();
        context.fillStyle = '#f0a14b';
        context.beginPath(); context.arc(point.x, point.y, radius * 0.55, 0, Math.PI * 2); context.fill();
      } else if (structure.kind === 'barricade') {
        context.save();
        context.translate(point.x, point.y);
        context.rotate(-structure.rotation);
        context.fillStyle = '#b28a58';
        context.fillRect(-Math.max(5, worldLength(2.25)), -1.5, Math.max(10, worldLength(4.5)), 3);
        context.restore();
      } else {
        context.fillStyle = structure.kind === 'snare' ? '#d7c27e' : '#a07852';
        context.strokeStyle = 'rgba(0,0,0,.55)';
        context.lineWidth = 1;
        context.beginPath();
        context.rect(point.x - (large ? 4 : 3), point.y - (large ? 4 : 3), large ? 8 : 6, large ? 8 : 6);
        context.fill(); context.stroke();
      }
    }
  }

  drawMissionMarkers(context, map, worldLength, large) {
    const definitions = MISSION_DEFINITIONS.filter((definition) => definition.marker && !this.state.missions[definition.id]?.complete);
    for (const [index, mission] of definitions.entries()) {
      const marker = mission.marker;
      if (!marker) continue;
      const point = map(marker.x, marker.z);
      const pulse = 5 + Math.sin(performance.now() * 0.004 + index) * 1.5;
      context.save();
      context.translate(point.x, point.y);
      context.rotate(Math.PI * 0.25);
      context.fillStyle = 'rgba(232,106,24,.17)';
      context.fillRect(-pulse, -pulse, pulse * 2, pulse * 2);
      context.strokeStyle = '#e66c20';
      context.lineWidth = large ? 2.2 : 1.6;
      context.strokeRect(-pulse * 0.58, -pulse * 0.58, pulse * 1.16, pulse * 1.16);
      context.restore();
      if (large) {
        context.fillStyle = '#e9d9c0';
        context.font = '700 10px Arial Narrow, sans-serif';
        context.textAlign = 'left';
        context.fillText(mission.title.toUpperCase(), point.x + 10, point.y - 8);
      }
    }
  }

  drawPoi(context, map, large) {
    for (const poi of this.world.poi) {
      const point = map(poi.x, poi.z);
      context.fillStyle = '#e5ddca';
      context.strokeStyle = '#161b18';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(point.x, point.y, large ? 6 : 4.2, 0, Math.PI * 2);
      context.fill(); context.stroke();
      context.fillStyle = '#202720';
      context.font = `900 ${large ? 8 : 6}px Arial Narrow, sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(poi.glyph, point.x, point.y + 0.5);
      if (large) {
        context.textBaseline = 'alphabetic';
        context.fillStyle = '#d7cfbc';
        context.font = '800 11px Arial Narrow, sans-serif';
        context.fillText(poi.name, point.x, point.y + 20);
      }
    }
  }

  drawEnemies(context, map, worldLength, view, large) {
    for (const enemy of this.enemies.enemies) {
      if (enemy.dead) continue;
      const distance = Math.hypot(enemy.position.x - this.state.player.x, enemy.position.z - this.state.player.z);
      if (!large && distance > (this.state.clock.nightfallActive ? 38 : 22)) continue;
      if (!large && (Math.abs(enemy.position.x - view.x) > view.rangeX || Math.abs(enemy.position.z - view.z) > view.rangeZ)) continue;
      const point = map(enemy.position.x, enemy.position.z);
      const radius = Math.max(2.2, worldLength(enemy.tier >= 2 ? 0.9 : 0.6));
      context.fillStyle = enemy.tier >= 2 ? '#ef553d' : '#bc4435';
      context.beginPath(); context.arc(point.x, point.y, radius, 0, Math.PI * 2); context.fill();
      context.strokeStyle = 'rgba(46,5,4,.8)';
      context.lineWidth = 1;
      context.stroke();
    }
  }

  drawPlayer(context, map, worldLength, large) {
    const point = map(this.state.player.x, this.state.player.z);
    const yaw = this.state.player.rotation;
    const coneLength = large ? worldLength(9) : worldLength(12);
    context.save();
    context.translate(point.x, point.y);
    context.rotate(-yaw);
    if (this.state.flashlightOn) {
      const gradient = context.createLinearGradient(0, 0, 0, -coneLength);
      gradient.addColorStop(0, 'rgba(255,226,157,.25)');
      gradient.addColorStop(1, 'rgba(255,226,157,0)');
      context.fillStyle = gradient;
      context.beginPath();
      context.moveTo(0, -3);
      context.lineTo(coneLength * 0.38, -coneLength);
      context.lineTo(-coneLength * 0.38, -coneLength);
      context.closePath();
      context.fill();
    }
    context.fillStyle = '#f5eee0';
    context.strokeStyle = '#151916';
    context.lineWidth = large ? 2.5 : 2;
    context.beginPath();
    context.moveTo(0, large ? -11 : -9);
    context.lineTo(large ? 8 : 6.5, large ? 8 : 6.5);
    context.lineTo(0, large ? 5 : 4);
    context.lineTo(large ? -8 : -6.5, large ? 8 : 6.5);
    context.closePath();
    context.fill(); context.stroke();
    context.restore();
    context.strokeStyle = 'rgba(235,226,204,.4)';
    context.lineWidth = 1;
    context.beginPath(); context.arc(point.x, point.y, large ? 14 : 11, 0, Math.PI * 2); context.stroke();
  }

  drawFog(context, bounds, centerX, centerY, radius, large) {
    const gradient = context.createRadialGradient(centerX, centerY, large ? Math.min(bounds.width, bounds.height) * 0.16 : radius * 0.45, centerX, centerY, large ? Math.max(bounds.width, bounds.height) * 0.64 : radius);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.74, large ? 'rgba(4,8,6,.08)' : 'rgba(4,8,6,.12)');
    gradient.addColorStop(1, large ? 'rgba(2,5,4,.5)' : 'rgba(1,4,3,.72)');
    context.fillStyle = gradient;
    context.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);
  }

  drawFrame(context, bounds, centerX, centerY, radius, large) {
    context.save();
    context.strokeStyle = 'rgba(205,190,158,.76)';
    context.lineWidth = large ? 3 : 3.5;
    if (large) {
      this.roundRect(context, bounds.left, bounds.top, bounds.width, bounds.height, 11);
      context.stroke();
      context.fillStyle = 'rgba(7,11,10,.78)';
      context.fillRect(bounds.left + 16, bounds.top + 14, 166, 31);
      context.fillStyle = '#ded6c4';
      context.font = '900 15px Arial Narrow, sans-serif';
      context.textAlign = 'left';
      context.fillText('PINE RIDGE DISTRICT', bounds.left + 27, bounds.top + 35);
      context.fillStyle = '#d8ceba';
      context.font = '900 13px Arial Narrow, sans-serif';
      context.textAlign = 'center';
      context.fillText('N', centerX, bounds.top + 19);
      context.beginPath();
      context.moveTo(centerX, bounds.top + 25);
      context.lineTo(centerX - 4, bounds.top + 33);
      context.lineTo(centerX + 4, bounds.top + 33);
      context.closePath();
      context.fill();
    } else {
      context.beginPath();
      context.arc(centerX, centerY, radius - 1.5, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = 'rgba(255,255,255,.08)';
      context.lineWidth = 1;
      context.beginPath(); context.arc(centerX, centerY, radius - 7, 0, Math.PI * 2); context.stroke();
      context.fillStyle = '#d9d0bd';
      context.font = '900 12px Arial Narrow, sans-serif';
      context.textAlign = 'center';
      context.fillText('N', centerX, centerY - radius + 35);
      context.fillStyle = 'rgba(4,8,7,.72)';
      context.fillRect(centerX - 48, centerY + radius - 31, 96, 20);
      context.fillStyle = '#b9b09d';
      context.font = '700 9px Arial Narrow, sans-serif';
      context.fillText(`${Math.round(this.state.player.x)}, ${Math.round(this.state.player.z)}`, centerX, centerY + radius - 17);
    }
    context.restore();
  }

  roundRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width * 0.5, height * 0.5);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }
}
