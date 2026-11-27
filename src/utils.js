export const norm = (s) =>
  (s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// Identifiant unique d'une personne = prénom + nom normalisés (anti-doublons)
export const keyOf = (prenom, nom) => `${norm(prenom)}_${norm(nom)}`;

export const propre = (s) =>
  (s || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(^|[\s'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

export async function hashPin(pin, key) {
  const data = new TextEncoder().encode(`${key}:${pin}:noel-santa`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const fmtDate = (iso) =>
  iso
    ? new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

export const fmtDateCourt = (iso) =>
  iso
    ? new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : '';

export const participationDe = (p) =>
  p.repas && p.santa ? 'deux' : p.santa ? 'santa' : 'repas';

// Tirage : on mélange la liste puis chacun offre au suivant (boucle).
// Personne ne peut tomber sur soi-même.
export function tirage(ids) {
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  const res = {};
  a.forEach((id, i) => {
    res[id] = a[(i + 1) % a.length];
  });
  return res;
}

export const nomComplet = (p) => `${p.prenom} ${p.nom}`;

// Date du jour au format AAAA-MM-JJ (heure locale)
export const aujourdhui = () => new Date().toLocaleDateString('sv-SE');

// Inscriptions fermées : fermées à la main, ou date limite dépassée
export const inscriptionsFermees = (settings) =>
  !settings.inscriptionsOuvertes || (settings.dateLimite && aujourdhui() > settings.dateLimite);
