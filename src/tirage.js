import { collection, doc, getDocs, runTransaction } from 'firebase/firestore';
import { db } from './firebase.js';
import { tirage } from './utils.js';

// Effectue le tirage pour tous les participants au Secret Santa.
// La transaction garantit qu'il n'est fait qu'une seule fois,
// même si plusieurs personnes ouvrent le site au même moment.
export async function effectuerTirage({ auto = false } = {}) {
  const snap = await getDocs(collection(db, 'participants'));
  const ids = snap.docs.filter((d) => d.data().santa).map((d) => d.id);
  if (ids.length < 3) throw new Error('MOINS_DE_3');
  const res = tirage(ids);
  const ref = doc(db, 'settings', 'main');
  await runTransaction(db, async (tx) => {
    const s = await tx.get(ref);
    if (s.exists() && s.data().tirageFait) throw new Error('DEJA_FAIT');
    ids.forEach((id) => tx.update(doc(db, 'participants', id), { cible: res[id], gratte: false }));
    tx.set(ref, { tirageFait: true, tirageLe: new Date().toISOString(), tirageAuto: auto }, { merge: true });
  });
}

// Moment du tirage automatique : la date choisie à 00h01 (heure de Paris / du téléphone)
export const momentTirageAuto = (dateTirage) => (dateTirage ? new Date(`${dateTirage}T00:01:00`) : null);
