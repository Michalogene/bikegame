// @ts-check

import { RECIPES } from '../data/recipes.js';

export class CraftingSystem {
  /** @param {import('../state/GameState.js').GameState} state */
  constructor(state) {
    this.state = state;
  }

  list() {
    return RECIPES.map((recipe) => ({
      ...recipe,
      canCraft: this.state.inventory.hasCost(recipe.cost)
    }));
  }

  /** @param {string} recipeId */
  craft(recipeId) {
    const recipe = RECIPES.find((entry) => entry.id === recipeId);
    if (!recipe) return false;
    if (!this.state.inventory.hasCost(recipe.cost)) {
      this.state.bus.emit('toast', 'Missing materials for that recipe.');
      return false;
    }
    if (!this.state.inventory.canAdd(recipe.output.id, recipe.output.qty)) {
      this.state.bus.emit('toast', 'Your pack is too heavy.');
      return false;
    }
    this.state.inventory.spend(recipe.cost);
    this.state.inventory.add(recipe.output.id, recipe.output.qty);
    this.state.inventory.assignFirstOpenHotbar(recipe.output.id);
    this.state.bus.emit('craft:complete', recipe);
    this.state.bus.emit('inventory:changed');
    this.state.bus.emit('toast', `Crafted ${recipe.name}`);
    this.state.bus.emit('audio:craft');
    return true;
  }
}
