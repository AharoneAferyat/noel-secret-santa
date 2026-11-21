// Code pour accéder à la page Admin (en bas du site, lien "Admin").
// ⚠️ Change-le avant de mettre le site en ligne.
export const ADMIN_CODE = 'noel2026';

// Réglages par défaut (modifiables ensuite depuis la page Admin)
export const DEFAULT_SETTINGS = {
  budget: '15',
  dateLimite: '2026-12-03',
  lieu: '',
  dateTirage: '2026-12-04',
  inscriptionsOuvertes: true,
  dates: [],
  dateRetenue: '',
  tirageFait: false,
  tirageLe: '',
};

// Précision affichée sur le site à propos du repas
export const INFO_REPAS = 'Le repas aura lieu le midi.';

export const PARTICIPATIONS = [
  { id: 'repas', label: 'Le repas seulement', repas: true, santa: false },
  { id: 'santa', label: 'Le Secret Santa seulement', repas: false, santa: true },
  { id: 'deux', label: 'Les deux !', repas: true, santa: true },
];
