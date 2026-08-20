// @ts-check

export const RECIPES = Object.freeze([
  {
    id: 'sterile_bandage', name: 'Sterile Bandage', category: 'Medicine', glyph: '✚',
    output: { id: 'bandage', qty: 2 }, cost: { cloth: 2, alcohol: 1 },
    description: 'Clean field dressing for wounds and bleeding.'
  },
  {
    id: 'campfire_kit', name: 'Campfire Kit', category: 'Camp', glyph: '♨',
    output: { id: 'campfire_kit', qty: 1 }, cost: { wood: 4, stone: 4 },
    description: 'Warmth, light and a defensible center for a temporary camp.'
  },
  {
    id: 'barricade_kit', name: 'Barricade Kit', category: 'Defense', glyph: '▥',
    output: { id: 'barricade_kit', qty: 1 }, cost: { wood: 6, nails: 2 },
    description: 'A waist-high reinforced obstacle that blocks enemies.'
  },
  {
    id: 'storage_kit', name: 'Storage Crate', category: 'Camp', glyph: '□',
    output: { id: 'storage_kit', qty: 1 }, cost: { wood: 5, nails: 2, rope: 1 },
    description: 'Persistent storage for supplies recovered from the county.'
  },
  {
    id: 'snare_kit', name: 'Noise Snare', category: 'Defense', glyph: '⌾',
    output: { id: 'snare_kit', qty: 1 }, cost: { rope: 2, scrap_metal: 2 },
    description: 'A crude trap that slows and wounds enemies.'
  }
]);

export const BUILDABLES = Object.freeze({
  campfire: {
    id: 'campfire', name: 'Campfire', kit: 'campfire_kit', radius: 1.4, footprint: [2.4, 2.4],
    description: 'Warm light, a small safe radius and a rally point.'
  },
  barricade: {
    id: 'barricade', name: 'Wood Barricade', kit: 'barricade_kit', radius: 2.0, footprint: [4.2, 1.0],
    description: 'Blocks movement and channels enemies.'
  },
  storage: {
    id: 'storage', name: 'Storage Crate', kit: 'storage_kit', radius: 1.25, footprint: [2.2, 1.8],
    description: 'A persistent container for spare supplies.'
  },
  snare: {
    id: 'snare', name: 'Noise Snare', kit: 'snare_kit', radius: 1.5, footprint: [2.5, 2.5],
    description: 'Damages the first enemy that crosses its wire.'
  }
});
