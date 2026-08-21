// @ts-check

/**
 * Install a small shared overlay contract around the existing HUD.
 * @param {import('./Hud.js').Hud} hud
 * @param {import('../game/InteractionSystem.js').InteractionSystem} interaction
 * @param {HTMLElement} canvas
 */
export function installMenuReliability(hud, interaction, canvas) {
  if (hud.__menuReliabilityInstalled) return hud;
  hud.__menuReliabilityInstalled = true;
  let closing = false;

  const hideBackdrop = () => {
    hud.elements.backdrop.classList.remove('visible');
    hud.elements.backdrop.setAttribute('aria-hidden', 'true');
    hud.lastPanelSignature = '';
  };

  hud.closePanel = () => {
    if (closing) return false;
    const closingPanel = hud.activePanel;
    const backdropVisible = hud.elements.backdrop.classList.contains('visible');
    if (!closingPanel && !backdropVisible && !interaction.activeContainer) {
      canvas.focus?.();
      return false;
    }

    closing = true;
    hud.activePanel = null;
    hideBackdrop();
    if (closingPanel === 'loot' && interaction.activeContainer) interaction.closeContainer();
    closing = false;
    canvas.focus?.();
    return true;
  };

  hud.closeTopPanel = () => hud.closePanel();
  hud.closeAllGameplayPanels = () => {
    const hadState = Boolean(hud.activePanel || interaction.activeContainer || hud.elements.backdrop.classList.contains('visible'));
    hud.activePanel = null;
    hideBackdrop();
    if (interaction.activeContainer) interaction.closeContainer();
    canvas.focus?.();
    return hadState;
  };

  const closeOnEscape = (event) => {
    if (event.code !== 'Escape' || !hud.activePanel) return;
    event.preventDefault();
    event.stopPropagation();
    hud.closeTopPanel();
  };
  window.addEventListener('keydown', closeOnEscape, true);

  const disposers = [
    hud.state.bus.on('player:died', () => hud.closeAllGameplayPanels()),
    hud.state.bus.on('player:respawned', () => hud.closeAllGameplayPanels())
  ];
  const originalDispose = hud.dispose.bind(hud);
  hud.dispose = () => {
    window.removeEventListener('keydown', closeOnEscape, true);
    for (const dispose of disposers) dispose();
    originalDispose();
  };
  return hud;
}
