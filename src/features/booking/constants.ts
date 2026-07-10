import type { BookingStage, ExchangeType } from '../../types/models';

/** Colonnes actives du board (dans l'ordre du pipeline). */
export const BOARD_STAGES: { id: BookingStage; label: string; cls: string }[] = [
  { id: 'a_contacter', label: 'À contacter', cls: 'st-todo' },
  { id: 'contacte', label: 'Contacté', cls: 'st-contacte' },
  { id: 'relance', label: 'Relancé', cls: 'st-relance' },
  { id: 'en_discussion', label: 'En discussion', cls: 'st-discussion' },
];

export const STAGE_LABEL: Record<BookingStage, string> = {
  a_contacter: 'À contacter',
  contacte: 'Contacté',
  relance: 'Relancé',
  en_discussion: 'En discussion',
  confirme: 'Confirmé',
  refuse: 'Refusé / sans suite',
};

/** Classe CSS de pastille de statut. */
export const STAGE_CLS: Record<BookingStage, string> = {
  a_contacter: 'st-todo',
  contacte: 'st-contacte',
  relance: 'st-relance',
  en_discussion: 'st-discussion',
  confirme: 'st-confirme',
  refuse: 'st-refuse',
};

export const EXCHANGE_TYPES: { id: ExchangeType; label: string; icon: string }[] = [
  { id: 'appel', label: 'Appel', icon: '📞' },
  { id: 'mail', label: 'Mail', icon: '✉' },
  { id: 'sms', label: 'SMS', icon: '💬' },
  { id: 'autre', label: 'Autre', icon: '•' },
];

export function exchangeIcon(t: ExchangeType): string {
  return EXCHANGE_TYPES.find((e) => e.id === t)?.icon ?? '•';
}
