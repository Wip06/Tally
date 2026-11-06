import { byId } from './dom';

export type ModalId =
  | 'modal-new-counter'
  | 'modal-counter-settings'
  | 'modal-history'
  | 'modal-timer-settings'
  | 'modal-color-picker'
  | 'modal-confirm'
  | 'modal-theme';

/** Émis sur l'overlay à chaque fermeture, quelle qu'en soit la cause (bouton, clic à côté…). */
const MODAL_CLOSED = 'modal:closed';

export function openModal(id: ModalId): void {
  byId(id).hidden = false;
  document.body.classList.add('modal-open');
}

export function closeModal(id: ModalId): void {
  const overlay = byId(id);
  overlay.hidden = true;
  document.body.classList.remove('modal-open');
  overlay.dispatchEvent(new Event(MODAL_CLOSED));
}

/** Associe un bouton à l'ouverture ou la fermeture d'une modale. */
export function bindModalButton(buttonId: string, modalId: ModalId, action: 'open' | 'close'): void {
  byId(buttonId).addEventListener('click', () => (action === 'open' ? openModal(modalId) : closeModal(modalId)));
}

/** Un clic sur le fond assombri ferme la modale. */
export function initModals(): void {
  document.querySelectorAll<HTMLElement>('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id as ModalId);
    });
  });
}

export interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
}

/** Boîte de confirmation. Résout `false` sur « Annuler » comme sur un clic à côté. */
export function confirmDialog(
  message: string,
  { title = 'Confirmer', confirmLabel = 'Confirmer' }: ConfirmOptions = {},
): Promise<boolean> {
  return new Promise(resolve => {
    const overlay = byId('modal-confirm');
    const okBtn = byId<HTMLButtonElement>('btn-confirm-ok');
    const cancelBtn = byId<HTMLButtonElement>('btn-confirm-cancel');
    byId('confirm-title').textContent = title;
    byId('confirm-message').textContent = message;
    okBtn.textContent = confirmLabel;

    const settle = (result: boolean) => {
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      overlay.removeEventListener(MODAL_CLOSED, onCancel);
      closeModal('modal-confirm');
      resolve(result);
    };
    const onOk = () => settle(true);
    const onCancel = () => settle(false);

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    overlay.addEventListener(MODAL_CLOSED, onCancel);
    openModal('modal-confirm');
  });
}
