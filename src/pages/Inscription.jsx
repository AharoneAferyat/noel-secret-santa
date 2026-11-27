import { useState } from 'react';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.js';
import { PARTICIPATIONS } from '../config.js';
import { hashPin, inscriptionsFermees, keyOf, propre } from '../utils.js';
import { ChoixDispos, ChoixParticipation } from '../components.jsx';

export default function Inscription({ settings, go }) {
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [titre, setTitre] = useState('');
  const [participation, setParticipation] = useState('');
  const [dispos, setDispos] = useState([]);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  if (inscriptionsFermees(settings)) {
    return (
      <section className="bloc">
        <h1 className="titre-page">Inscription</h1>
        <div className="alerte">Les inscriptions sont fermées. Si tu es déjà inscrit·e, va dans « Mon espace ».</div>
      </section>
    );
  }

  const choix = PARTICIPATIONS.find((p) => p.id === participation);

  const valider = async (e) => {
    e.preventDefault();
    setErreur('');
    if (!prenom.trim() || !nom.trim() || !titre.trim()) return setErreur('Merci de remplir prénom, nom et poste.');
    if (!choix) return setErreur('Choisis à quoi tu participes.');
    if (!/^\d{4}$/.test(pin)) return setErreur('Le code PIN doit contenir 4 chiffres.');
    if (pin !== pin2) return setErreur('Les deux codes PIN ne sont pas identiques.');
    if (choix.santa && settings.tirageFait) return setErreur("Le tirage a déjà eu lieu, impossible de rejoindre le Secret Santa.");

    const key = keyOf(prenom, nom);
    setEnvoi(true);
    try {
      const pinHash = await hashPin(pin, key);
      const ref = doc(db, 'participants', key);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists()) throw new Error('DOUBLON');
        tx.set(ref, {
          prenom: propre(prenom),
          nom: nom.trim().toUpperCase(),
          titre: titre.trim(),
          repas: choix.repas,
          santa: choix.santa,
          dispos: choix.repas ? dispos : [],
          pinHash,
          cible: null,
          creeLe: serverTimestamp(),
        });
      });
      localStorage.setItem('noel_session', JSON.stringify({ key, pinHash }));
      go('espace');
    } catch (err) {
      if (err.message === 'DOUBLON') {
        setErreur('Une personne avec ce prénom et ce nom est déjà inscrite. Connecte-toi dans « Mon espace » pour modifier ton inscription.');
      } else {
        setErreur("Erreur lors de l'inscription : " + err.message);
      }
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <section className="bloc">
      <h1 className="titre-page">Inscription</h1>
      <form onSubmit={valider} className="formulaire">
        <div className="ligne2">
          <label>Prénom<input value={prenom} onChange={(e) => setPrenom(e.target.value)} autoComplete="given-name" /></label>
          <label>Nom<input value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="family-name" /></label>
        </div>
        <label>
          Poste
          <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="ex. Infirmière, Secrétaire médical, Interne…" />
          <span className="aide">Pour savoir qui est qui le jour du tirage.</span>
        </label>

        <fieldset>
          <legend>Je participe à…</legend>
          <p className="aide">Secret Santa : budget {settings.budget || '—'} € maximum.</p>
          <ChoixParticipation valeur={participation} onChange={setParticipation} santaBloque={settings.tirageFait} />
        </fieldset>

        {choix?.repas && (
          <fieldset>
            <legend>Mes disponibilités pour le repas</legend>
            <ChoixDispos settings={settings} dispos={dispos} onChange={setDispos} />
          </fieldset>
        )}

        <fieldset>
          <legend>Mon code PIN (4 chiffres)</legend>
          <p className="aide">Il te servira à revenir modifier ton inscription et à découvrir ton Secret Santa. Garde-le bien !</p>
          <div className="ligne2">
            <label>Code PIN<input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" type="password" autoComplete="new-password" /></label>
            <label>Confirmer<input value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" type="password" autoComplete="new-password" /></label>
          </div>
        </fieldset>

        {erreur && <div className="alerte erreur">{erreur}</div>}
        <button className="btn rouge large" disabled={envoi}>{envoi ? 'Inscription…' : "Valider mon inscription"}</button>
      </form>
    </section>
  );
}
