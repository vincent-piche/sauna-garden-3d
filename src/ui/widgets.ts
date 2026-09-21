export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

export function createSection(parent: HTMLElement, title: string): HTMLElement {
  const section = el('section', 'section');
  section.append(el('h2', undefined, title));
  parent.append(section);
  return section;
}

export interface SliderOptions {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit: string;
  onInput(value: number): void;
}

export interface SliderHandle {
  /** Applies a value and returns the one the input actually accepted, after clamping. */
  setValue(value: number): number;
  setEnabled(enabled: boolean): void;
}

export function createSlider(parent: HTMLElement, options: SliderOptions): SliderHandle {
  const field = el('div', 'field');
  const head = el('div', 'field-head');
  const label = el('span', 'field-label', options.label);
  const value = el('span', 'field-value');
  head.append(label, value);

  const input = el('input');
  input.type = 'range';
  input.min = String(options.min);
  input.max = String(options.max);
  input.step = String(options.step);
  input.value = String(options.value);

  const render = (current: number): void => {
    value.textContent = `${formatNumber(current)} ${options.unit}`;
  };
  render(options.value);

  input.addEventListener('input', () => {
    const current = Number(input.value);
    render(current);
    options.onInput(current);
  });

  field.append(head, input);
  parent.append(field);

  return {
    setValue(next: number): number {
      input.value = String(next);
      const accepted = Number(input.value);
      render(accepted);
      return accepted;
    },
    setEnabled(enabled: boolean): void {
      field.classList.toggle('disabled', !enabled);
    }
  };
}

export interface ButtonRowItem<T extends string> {
  id: T;
  label: string;
}

export interface ButtonRowHandle<T extends string> {
  setActive(id: T | null): void;
}

export function createButtonRow<T extends string>(
  parent: HTMLElement,
  items: readonly ButtonRowItem<T>[],
  onSelect: (id: T) => void
): ButtonRowHandle<T> {
  const row = el('div', 'button-row');
  const buttons = new Map<T, HTMLButtonElement>();

  for (const item of items) {
    const button = el('button', undefined, item.label);
    button.type = 'button';
    button.addEventListener('click', () => onSelect(item.id));
    buttons.set(item.id, button);
    row.append(button);
  }

  parent.append(row);

  return {
    setActive(id: T | null): void {
      for (const [key, button] of buttons) {
        button.classList.toggle('active', key === id);
      }
    }
  };
}

export function formatNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function formatMetres(millimetres: number): string {
  return `${(millimetres / 1000).toFixed(2)} m`;
}
