// @ts-check

export const MISSION_DEFINITIONS = Object.freeze([
  {
    id: 'search_pine_ridge', title: 'Search Pine Ridge for supplies',
    description: 'Loot three containers in the Pine Ridge district.', target: 3, event: 'loot:container',
    marker: { x: 13, z: -8 }, priority: 1
  },
  {
    id: 'dig_defenses', title: 'Dig a trench for defensive cover',
    description: 'Excavate four sections of terrain with the trenching shovel.', target: 4, event: 'terrain:dug',
    marker: { x: -13, z: 19 }, priority: 2
  },
  {
    id: 'establish_camp', title: 'Establish a safe camp',
    description: 'Craft and place a campfire.', target: 1, event: 'build:campfire',
    marker: { x: -19, z: 21 }, priority: 3
  },
  {
    id: 'survive_nightfall', title: 'Survive Nightfall',
    description: 'Remain alive until the Nightfall surge ends.', target: 1, event: 'nightfall:survived',
    marker: null, priority: 4
  }
]);
