// @ts-check

export const ITEM_DEFINITIONS = Object.freeze({
  flashlight: {
    id: 'flashlight', name: 'Heavy Flashlight', category: 'tool', glyph: '◉',
    weight: 0.7, stack: 1, description: 'A battered steel flashlight. Toggle it to reveal threats at night.', color: '#d9d0bd'
  },
  hunting_knife: {
    id: 'hunting_knife', name: 'Hunting Knife', category: 'weapon', glyph: '†',
    weight: 0.45, stack: 1, description: 'Fast, quiet melee weapon. Effective at close range.', damage: 34, range: 2.25, color: '#d6d7d2'
  },
  water_bottle: {
    id: 'water_bottle', name: 'Clean Water', category: 'consumable', glyph: '◒',
    weight: 0.75, stack: 4, description: 'Restores 32 hydration.', hydration: 32, color: '#78bddd'
  },
  canned_beans: {
    id: 'canned_beans', name: 'Canned Beans', category: 'consumable', glyph: '▣',
    weight: 0.48, stack: 6, description: 'Restores 28 hunger and a little health.', hunger: 28, healing: 3, color: '#d37846'
  },
  canned_soup: {
    id: 'canned_soup', name: 'Canned Soup', category: 'consumable', glyph: '▤',
    weight: 0.52, stack: 6, description: 'Restores 22 hunger and 8 hydration.', hunger: 22, hydration: 8, color: '#b8794d'
  },
  energy_bar: {
    id: 'energy_bar', name: 'Energy Bar', category: 'consumable', glyph: '▬',
    weight: 0.12, stack: 8, description: 'Restores 14 hunger and 22 stamina.', hunger: 14, stamina: 22, color: '#c99b4d'
  },
  bandage: {
    id: 'bandage', name: 'Sterile Bandage', category: 'medical', glyph: '✚',
    weight: 0.18, stack: 6, description: 'Stops bleeding and restores 18 health.', healing: 18, bleeding: -100, color: '#d8ded5'
  },
  medkit: {
    id: 'medkit', name: 'Field Medkit', category: 'medical', glyph: '✚',
    weight: 1.2, stack: 2, description: 'Restores 55 health and stops bleeding.', healing: 55, bleeding: -100, color: '#d8e0d8'
  },
  antiseptic: {
    id: 'antiseptic', name: 'Antiseptic', category: 'medical', glyph: '⌁',
    weight: 0.35, stack: 4, description: 'Useful for medicine recipes.', color: '#c8d5cf'
  },
  ammo_9mm: {
    id: 'ammo_9mm', name: '9mm Ammunition', category: 'ammo', glyph: '➤',
    weight: 0.016, stack: 48, description: 'A box of worn 9mm cartridges.', color: '#d6a35c'
  },
  revolver: {
    id: 'revolver', name: 'County Revolver', category: 'weapon', glyph: '⌐',
    weight: 1.05, stack: 1, description: 'Loud but dependable. Uses 9mm ammunition.', damage: 62, range: 34, color: '#aeb0aa'
  },
  shovel: {
    id: 'shovel', name: 'Trenching Shovel', category: 'tool', glyph: '⌁',
    weight: 2.1, stack: 1, description: 'Right-click the ground to excavate a real defensive trench.', damage: 28, range: 2.45, color: '#af9270'
  },
  crowbar: {
    id: 'crowbar', name: 'Crowbar', category: 'weapon', glyph: '⌒',
    weight: 1.9, stack: 1, description: 'Heavy improvised melee weapon.', damage: 46, range: 2.6, color: '#a66f57'
  },
  rope: {
    id: 'rope', name: 'Utility Rope', category: 'material', glyph: '◎',
    weight: 0.65, stack: 8, description: 'Used for traps and reinforced structures.', color: '#b79769'
  },
  wood: {
    id: 'wood', name: 'Salvaged Lumber', category: 'material', glyph: '▥',
    weight: 0.8, stack: 48, description: 'Core construction material.', color: '#a5794d'
  },
  scrap_metal: {
    id: 'scrap_metal', name: 'Scrap Metal', category: 'material', glyph: '⚙',
    weight: 0.7, stack: 48, description: 'Metal plates, bolts and machine fragments.', color: '#8e9898'
  },
  stone: {
    id: 'stone', name: 'Field Stone', category: 'material', glyph: '◆',
    weight: 0.9, stack: 32, description: 'Useful for fires and foundations.', color: '#8e8b7d'
  },
  cloth: {
    id: 'cloth', name: 'Clean Cloth', category: 'material', glyph: '▧',
    weight: 0.12, stack: 24, description: 'Fabric for bandages and improvised equipment.', color: '#c1bbaa'
  },
  alcohol: {
    id: 'alcohol', name: 'Medical Alcohol', category: 'material', glyph: '◫',
    weight: 0.35, stack: 8, description: 'Disinfectant and crafting component.', color: '#d9d9c9'
  },
  nails: {
    id: 'nails', name: 'Box of Nails', category: 'material', glyph: '⋮',
    weight: 0.35, stack: 24, description: 'Essential for durable wooden construction.', color: '#a8acaa'
  },
  battery: {
    id: 'battery', name: 'Battery', category: 'component', glyph: '▰',
    weight: 0.25, stack: 8, description: 'Keeps portable lights and electronics running.', color: '#d6c45c'
  },
  gear_parts: {
    id: 'gear_parts', name: 'Mechanical Parts', category: 'component', glyph: '⚙',
    weight: 0.5, stack: 16, description: 'Gears and bearings for advanced blueprints.', color: '#abb0aa'
  },
  fuel_can: {
    id: 'fuel_can', name: 'Fuel Can', category: 'component', glyph: '▣',
    weight: 4.5, stack: 2, description: 'Heavy vehicle and generator fuel.', color: '#b34f37'
  },
  gym_key: {
    id: 'gym_key', name: 'Gym Key', category: 'mission', glyph: '⚿',
    weight: 0.04, stack: 1, description: 'A brass key tagged PINE RIDGE GYM.', color: '#d7bd6b'
  },
  siphon_notes: {
    id: 'siphon_notes', name: 'Fuel Siphon Notes', category: 'mission', glyph: '▤',
    weight: 0.03, stack: 1, description: 'Handwritten instructions describing a safe fuel siphon.', color: '#d8c89d'
  },
  campfire_kit: {
    id: 'campfire_kit', name: 'Campfire Kit', category: 'buildable', glyph: '♨',
    weight: 3.2, stack: 3, description: 'Place from the Camp panel to create warmth and light.', buildable: 'campfire', color: '#df8843'
  },
  barricade_kit: {
    id: 'barricade_kit', name: 'Barricade Kit', category: 'buildable', glyph: '▥',
    weight: 5.2, stack: 4, description: 'Place a sturdy wooden obstacle.', buildable: 'barricade', color: '#a98159'
  },
  storage_kit: {
    id: 'storage_kit', name: 'Storage Crate Kit', category: 'buildable', glyph: '□',
    weight: 4.4, stack: 2, description: 'Place a persistent storage crate.', buildable: 'storage', color: '#b88b58'
  },
  snare_kit: {
    id: 'snare_kit', name: 'Noise Snare', category: 'buildable', glyph: '⌾',
    weight: 2.0, stack: 3, description: 'Slows and damages enemies that cross it.', buildable: 'snare', color: '#b49b72'
  },
  blueprint_workbench: {
    id: 'blueprint_workbench', name: 'Workbench Blueprint', category: 'blueprint', glyph: '⌘',
    weight: 0.05, stack: 1, description: 'Unlocks the reinforced workbench recipe.', unlocks: 'workbench', color: '#5ca9c7'
  }
});

export const HOTBAR_DEFAULT = Object.freeze([
  'flashlight', 'hunting_knife', 'water_bottle', 'canned_beans',
  'bandage', 'revolver', 'rope', 'shovel'
]);

export const LOOT_TABLES = Object.freeze({
  house: [
    ['canned_beans', 1, 3, 0.82], ['water_bottle', 1, 2, 0.75], ['cloth', 1, 4, 0.72],
    ['bandage', 1, 2, 0.42], ['rope', 1, 2, 0.26], ['energy_bar', 1, 3, 0.5]
  ],
  gas_station: [
    ['water_bottle', 1, 3, 0.92], ['canned_soup', 1, 3, 0.82], ['energy_bar', 1, 4, 0.9],
    ['battery', 1, 3, 0.66], ['fuel_can', 1, 1, 0.35], ['gear_parts', 1, 3, 0.5],
    ['ammo_9mm', 5, 14, 0.46], ['revolver', 1, 1, 0.18]
  ],
  workshop: [
    ['wood', 3, 8, 0.94], ['scrap_metal', 2, 7, 0.9], ['nails', 2, 6, 0.84],
    ['gear_parts', 1, 4, 0.7], ['crowbar', 1, 1, 0.3], ['rope', 1, 3, 0.55]
  ],
  medical: [
    ['bandage', 1, 3, 0.95], ['antiseptic', 1, 2, 0.72], ['alcohol', 1, 3, 0.8],
    ['medkit', 1, 1, 0.26], ['cloth', 1, 4, 0.62]
  ],
  forest: [
    ['wood', 2, 6, 0.82], ['stone', 1, 4, 0.65], ['rope', 1, 2, 0.25]
  ],
  enemy: [
    ['cloth', 1, 2, 0.55], ['energy_bar', 1, 1, 0.16], ['ammo_9mm', 1, 4, 0.17]
  ]
});

/** @param {string} id */
export function getItem(id) {
  return ITEM_DEFINITIONS[id] ?? null;
}
