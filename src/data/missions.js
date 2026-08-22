// @ts-check

export const MISSION_DEFINITIONS = Object.freeze([
  {
    id: 'search_pine_ridge', title: 'Search Pine Ridge for supplies',
    description: 'Loot three containers in the Pine Ridge district.', target: 3, event: 'loot:container',
    marker: { x: 13, z: -8 }, priority: 1
  },
  {
    id: 'find_canned_food', title: 'Find canned food',
    description: 'Recover five physical cans from shops, homes or the school.', target: 5, event: 'world-loot:canned-food',
    marker: { x: 19, z: -5 }, priority: 2
  },
  {
    id: 'find_siphon_notes', title: 'Find fuel siphon notes',
    description: 'Locate the handwritten siphon instructions in the Food Mart.', target: 1, event: 'world-loot:siphon-notes',
    marker: { x: 27, z: -10 }, priority: 3
  },
  {
    id: 'find_gym_key', title: 'Find the gym key',
    description: 'Search the abandoned school for the key to the gym storage area.', target: 1, event: 'world-loot:gym-key',
    marker: { x: 42, z: -42 }, priority: 4
  },
  {
    id: 'dig_defenses', title: 'Dig a trench for defensive cover',
    description: 'Excavate four sections of terrain with the trenching shovel.', target: 4, event: 'terrain:dug',
    marker: { x: -13, z: 19 }, priority: 5
  },
  {
    id: 'establish_camp', title: 'Establish a safe camp',
    description: 'Craft and place a campfire.', target: 1, event: 'build:campfire',
    marker: { x: -19, z: 21 }, priority: 6
  },
  {
    id: 'survive_nightfall', title: 'Survive Nightfall',
    description: 'Remain alive until the Nightfall surge ends.', target: 1, event: 'nightfall:survived',
    marker: null, priority: 7
  }
]);
