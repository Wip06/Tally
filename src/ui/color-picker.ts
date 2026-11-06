import { FALLBACK_COLOR } from '../constants';
import { teamPalette } from '../themes';
import { button, byId } from './dom';
import { closeModal, openModal } from './modals';

type ColorHandler = (color: string) => void;

let onPick: ColorHandler | null = null;

/** Ouvre le sélecteur ; `handler` reçoit chaque couleur choisie. */
export function openColorPicker(currentColor: string, handler: ColorHandler): void {
  onPick = handler;
  renderSwatches(currentColor);
  byId<HTMLInputElement>('custom-color-input').value = toHexColor(currentColor);
  openModal('modal-color-picker');
}

export function initColorPicker(): void {
  byId('btn-close-color-picker').addEventListener('click', () => closeModal('modal-color-picker'));
  const custom = byId<HTMLInputElement>('custom-color-input');
  custom.addEventListener('input', () => pick(custom.value));
}

function renderSwatches(activeColor: string): void {
  byId('color-swatches').replaceChildren(
    ...teamPalette().map(color =>
      button(
        {
          className: color.toLowerCase() === activeColor.toLowerCase() ? 'swatch active' : 'swatch',
          style: { background: color },
          label: `Choisir la couleur ${color}`,
        },
        () => pick(color),
      ),
    ),
  );
}

function pick(color: string): void {
  if (!onPick) return;
  onPick(color);
  closeModal('modal-color-picker');
}

function toHexColor(color: string): string {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : FALLBACK_COLOR;
}
