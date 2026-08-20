// @ts-check

import { MISSION_DEFINITIONS } from '../data/missions.js';

export class MissionSystem {
  /** @param {import('../state/GameState.js').GameState} state */
  constructor(state) {
    this.state = state;
    this.disposers = [];
    for (const mission of MISSION_DEFINITIONS) {
      this.disposers.push(state.bus.on(mission.event, () => this.advance(mission.id, 1)));
    }
  }

  /** @param {string} id @param {number} amount */
  advance(id, amount) {
    const definition = MISSION_DEFINITIONS.find((mission) => mission.id === id);
    const progress = this.state.missions[id];
    if (!definition || !progress || progress.complete) return;
    progress.progress = Math.min(definition.target, progress.progress + amount);
    if (progress.progress >= definition.target) {
      progress.complete = true;
      this.state.experience += 125;
      this.state.bus.emit('mission:complete', definition);
      this.state.bus.emit('toast', `Objective complete: ${definition.title}`);
    } else {
      this.state.bus.emit('mission:progress', { definition, progress: { ...progress } });
    }
  }

  list() {
    return MISSION_DEFINITIONS.map((definition) => ({
      ...definition,
      progress: this.state.missions[definition.id]?.progress ?? 0,
      complete: this.state.missions[definition.id]?.complete ?? false
    }));
  }

  dispose() {
    for (const dispose of this.disposers) dispose();
  }
}
