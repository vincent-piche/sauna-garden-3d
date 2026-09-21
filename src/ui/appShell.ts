/**
 * Layout shell. On a wide screen the parameter panel is a column of the grid; below
 * that, it becomes a drawer sliding over the scene, opened by a floating button.
 *
 * The second floating button switches what a single finger does on the canvas, since
 * there is no right mouse button on a phone: orbiting around the sauna, or panning the
 * view. Two fingers always pinch to zoom and pan, whichever is selected.
 */
export type OneFingerGesture = 'orbit' | 'pan';

const DRAWER_QUERY = '(max-width: 860px)';

export interface AppShellOptions {
  panel: HTMLElement;
  toggle: HTMLButtonElement;
  backdrop: HTMLElement;
  gestureButton: HTMLButtonElement;
  onGestureChange(gesture: OneFingerGesture): void;
}

export interface AppShell {
  /** True while the panel is a drawer rather than a column. */
  isDrawer(): boolean;
  closeDrawer(): void;
}

export function setupAppShell(options: AppShellOptions): AppShell {
  const { panel, toggle, backdrop, gestureButton } = options;
  const drawerMedia = window.matchMedia(DRAWER_QUERY);
  let gesture: OneFingerGesture = 'orbit';

  const setOpen = (open: boolean): void => {
    panel.classList.toggle('open', open);
    backdrop.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Fermer' : 'Paramètres';
  };

  const closeDrawer = (): void => {
    if (drawerMedia.matches) {
      setOpen(false);
    }
  };

  toggle.addEventListener('click', () => setOpen(!panel.classList.contains('open')));
  backdrop.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
    }
  });

  // Leaving the drawer width must not strand the panel in its open state.
  drawerMedia.addEventListener('change', () => setOpen(false));
  setOpen(false);

  gestureButton.addEventListener('click', () => {
    gesture = gesture === 'orbit' ? 'pan' : 'orbit';
    gestureButton.textContent = gesture === 'orbit' ? 'Orbite' : 'Déplacer';
    gestureButton.setAttribute('aria-pressed', String(gesture === 'pan'));
    options.onGestureChange(gesture);
  });

  return {
    isDrawer: () => drawerMedia.matches,
    closeDrawer
  };
}
