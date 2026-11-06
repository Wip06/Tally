import { counterHash, navigate } from '../routes';
import { createCounter, createTimer } from '../store';
import type { CounterType } from '../types';
import { byId } from './dom';
import { closeModal, openModal } from './modals';

/** Modale « Nouveau » : compteur de score ou minuteur. */
export function initNewCounterModal(): void {
  const nameInput = byId<HTMLInputElement>('new-counter-name');
  const durationInput = byId<HTMLInputElement>('new-timer-duration-input');
  const durationRow = byId('new-timer-duration-row');
  const typeButtons = document.querySelectorAll<HTMLButtonElement>('.new-type-btn');
  let selectedType: CounterType = 'score';

  const selectType = (type: CounterType) => {
    selectedType = type;
    typeButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.type === type));
    durationRow.hidden = type !== 'timer';
  };

  const open = () => {
    nameInput.value = '';
    durationInput.value = '';
    selectType('score');
    openModal('modal-new-counter');
    window.setTimeout(() => nameInput.focus(), 50);
  };

  const create = () => {
    const item =
      selectedType === 'timer'
        ? createTimer(nameInput.value, parseInt(durationInput.value.trim(), 10))
        : createCounter(nameInput.value);
    closeModal('modal-new-counter');
    navigate(counterHash(item.id));
  };

  byId('btn-new-counter').addEventListener('click', open);
  byId('btn-new-counter-empty').addEventListener('click', open);
  typeButtons.forEach(btn => {
    btn.addEventListener('click', () => selectType(btn.dataset.type === 'timer' ? 'timer' : 'score'));
  });
  byId('btn-cancel-new-counter').addEventListener('click', () => closeModal('modal-new-counter'));
  byId('btn-confirm-new-counter').addEventListener('click', create);
  for (const input of [nameInput, durationInput]) {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') create();
    });
  }
}
