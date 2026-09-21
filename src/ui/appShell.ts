/**
 * Layout shell. On a wide screen the parameter panel is a column of the grid; below
 * that, it becomes a drawer sliding over the scene, opened by a floating button.
 *
 * Touch gestures are fixed and need no control of their own: one finger orbits, two
 * fingers pan, pinching zooms. See `Viewer` for the mapping.
 */
const DRAWER_QUERY = '(max-width: 860px)';

export interface AppShellOptions {
  panel: HTMLElement;
  toggle: HTMLButtonElement;
  backdrop: HTMLElement;
}

export interface AppShell {
  /** True while the panel is a drawer rather than a column. */
  isDrawer(): boolean;
  closeDrawer(): void;
}

export function setupAppShell(options: AppShellOptions): AppShell {
  const { panel, toggle, backdrop } = options;
  const drawerMedia = window.matchMedia(DRAWER_QUERY);

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

  return {
    isDrawer: () => drawerMedia.matches,
    closeDrawer
  };
}
